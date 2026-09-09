const { db, admin } = require('../config/firebase');
const { getCollection } = require('../utils/dbUtils');
const { MongoBatch } = require('../utils/mongoAdapter');
const { parseExcel } = require('../utils/excelParser');
const { validateProductSchema, validateCashbookSchema, validateCustomerSchema, validateCreditSchema, validateGstBillSchema } = require('../utils/validator');
const { mapFields } = require('../utils/fieldMapper');

// Determine which database to use
const DB_TYPE = process.env.DB_TYPE || 'firestore';

// Helper function to remove undefined values from an object recursively
const removeUndefined = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }
    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value !== undefined) {
                newObj[key] = removeUndefined(value);
            }
        }
    }
    return newObj;
};

/**
 * Step 1: Parse file and return headers + sample data
 */
exports.getPreview = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
        
        const { headers, rows } = parseExcel(req.file.buffer);
        res.status(200).json({ headers, sampleData: rows.slice(0, 5), totalRows: rows.length, rawRows: rows });
    } catch (err) {
        console.error("Import Preview Error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Step 2: Apply user mapping and validate against Firestore schema
 */
exports.mapAndValidate = async (req, res) => {
    try {
        const { mapping, rawData, type = 'products' } = req.body;
        
        if (!mapping || !rawData) {
            return res.status(400).json({ msg: "Missing mapping or raw data" });
        }

        const mappedData = mapFields(rawData, mapping);
        
        const results = {
            validRows: [],
            invalidRows: [],
            errors: []
        };

        mappedData.forEach((row, index) => {
            let validation = { isValid: true, errors: [] };
            
            if (type === 'products') {
                validation = validateProductSchema(row);
            } else if (type === 'cashbook') {
                validation = validateCashbookSchema(row);
            } else if (type === 'customers') {
                validation = validateCustomerSchema(row);
            } else if (type === 'credit') {
                validation = validateCreditSchema(row);
            } else if (type === 'gst-bills') {
                validation = validateGstBillSchema(row);
            } else if (!row || Object.keys(row).length === 0) {
                validation = { isValid: false, errors: ["No fields mapped for this row"] };
            }

            if (validation.isValid) {
                results.validRows.push({ ...row, rowIndex: index + 1 });
            } else {
                results.invalidRows.push({ ...row, rowIndex: index + 1 });
                results.errors.push({ row: index + 1, details: validation.errors });
            }
        });

        res.status(200).json(results);
    } catch (err) {
        console.error("Map and Validate Error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Step 3: Final Import using Batch Writes
 */
exports.confirmImport = async (req, res) => {
    try {
        const { products, data, rows, skipDuplicates, type = 'products' } = req.body;
        // Defensive: Check multiple possible field names for the data array
        const itemsToImport = products || data || rows;

        if (!Array.isArray(itemsToImport)) {
            return res.status(400).json({ msg: "Import data is missing or not an array" });
        }

        const collectionRef = getCollection(req, type);
        const userId = req.user?.uid || req.user?.userId || 'unknown'; // Ensure userId is always a string

        // Fetch existing records for type-specific duplicate detection
        const existingRecords = await collectionRef.get();
        const existingKeys = new Set();

        existingRecords.forEach(doc => {
            const data = doc.data();
            if (type === 'products') {
                if (data.sku) existingKeys.add(String(data.sku || '').toLowerCase());
                if (data.barcode) existingKeys.add(String(data.barcode || '').toLowerCase());
            } else if (type === 'gst-bills') {
                if (data.invoiceNumber) existingKeys.add(String(data.invoiceNumber || '').toLowerCase());
            } else if (type === 'customers') {
                if (data.mobile) existingKeys.add(String(data.mobile || ''));
            } else if (type === 'credit') {
                if (data.phone) existingKeys.add(String(data.phone || ''));
            }
        });

        let batch = DB_TYPE === 'mongodb' ? new MongoBatch() : db.batch();
        let count = 0;
        let importedCount = 0;
        let skippedCount = 0;

        for (const item of itemsToImport) {
            // Type-specific duplicate check
            let isDuplicate = false;
            if (skipDuplicates) {
                if (type === 'products' && (item.sku || item.barcode)) {
                    isDuplicate = (item.sku && existingKeys.has(String(item.sku || '').toLowerCase())) || (item.barcode && existingKeys.has(String(item.barcode || '').toLowerCase()));
                } else if (type === 'gst-bills') {
                    isDuplicate = item.invoiceNumber && existingKeys.has(String(item.invoiceNumber || '').toLowerCase());
                } else if ((type === 'customers' || type === 'credit') && (item.mobile || item.phone)) {
                    isDuplicate = (item.mobile && existingKeys.has(String(item.mobile || ''))) || (item.phone && existingKeys.has(String(item.phone || '')));
                }
            }

            if (isDuplicate) {
                skippedCount++;
                continue;
            }

            const newDocRef = collectionRef.doc();
            let payload = {
                ...item,
                id: newDocRef.id,
                createdBy: userId || null,
                source: "Owner",
                createdAt: DB_TYPE === 'mongodb'
                    ? new Date().toISOString()
                    : (admin?.firestore?.FieldValue?.serverTimestamp() || new Date().toISOString()),
                updatedAt: new Date().toISOString()
            };
            
            // Auto-detect and convert numeric fields
            const numericFields = [
                'purchasePrice', 'salePrice', 'quantity', 'reorderLevel', 
                'purchaseGst', 'salesGst', 'amount', 'total', 'credit', 
                'balance', 'grandTotal', 'loyaltyPoints', 'walletBalance',
                'taxRate', 'qty', 'unitPrice', 'discountAmount'
            ];

            Object.keys(payload).forEach(key => {
                if (numericFields.includes(key)) {
                    payload[key] = Number(payload[key]) || 0;
                }
            });

            // Sanitize payload to remove undefined values before setting to Firestore
            const sanitizedPayload = removeUndefined(payload);
            batch.set(newDocRef, sanitizedPayload);
            count++;
            importedCount++;

            // Firestore batch limit is 500 (MongoDB batches are sequential, but we chunk the same way for consistency)
            if (count === 500) {
                await batch.commit();
                batch = DB_TYPE === 'mongodb' ? new MongoBatch() : db.batch();
                count = 0;
            }
        }

        if (count > 0) await batch.commit();

        res.status(200).json({ 
            msg: "Import successful", 
            imported: importedCount, 
            skipped: skippedCount 
        });
    } catch (err) {
        console.error("Confirm Import FULL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};