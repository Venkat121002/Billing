/**
 * Smart Billing Assistant AI
 * Feature 6 of Phase 2 Automation.
 *
 * Parses natural language or speech-transcribed order texts into structured
 * bill line items matching the store's product catalog.
 */
const { getGeminiModel, isGeminiConfigured } = require('../config/gemini');

// Common unit normalizing dictionary
const UNIT_MAP = {
    kg: 'kg', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
    g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
    l: 'l', ltr: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
    ml: 'ml', millilitre: 'ml', millilitres: 'ml',
    pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs', nos: 'pcs', unit: 'pcs', units: 'pcs',
    pkt: 'pkt', pack: 'pkt', packet: 'pkt', packets: 'pkt', packs: 'pkt',
    box: 'box', boxes: 'box',
    bottle: 'bottle', bottles: 'bottle', can: 'can', cans: 'can',
    doz: 'dozen', dozen: 'dozen',
    strip: 'strip', strips: 'strip', tablet: 'tablet', tablets: 'tablet'
};

/**
 * Standardize text for loose comparison
 */
function cleanText(str = '') {
    return String(str)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate token overlap score between two strings
 */
function computeMatchScore(query, target) {
    const qTokens = cleanText(query).split(' ').filter(t => t.length > 1);
    const tTokens = cleanText(target).split(' ').filter(t => t.length > 1);
    if (!qTokens.length || !tTokens.length) return 0;

    let hits = 0;
    for (const q of qTokens) {
        if (tTokens.some(t => t === q || t.startsWith(q) || q.startsWith(t))) {
            hits++;
        }
    }
    return hits / Math.max(qTokens.length, 1);
}

/**
 * Find best matching product from the catalog
 */
function findBestProduct(queryName, catalog = []) {
    if (!queryName || !catalog.length) return null;
    const cleanQ = cleanText(queryName);

    // 1. Exact or starts-with match
    const exact = catalog.find(p => {
        const cName = cleanText(p.name);
        return cName === cleanQ || (p.barcode && String(p.barcode) === queryName.trim());
    });
    if (exact) return { product: exact, score: 1.0 };

    // 2. Contains match
    const contains = catalog.find(p => {
        const cName = cleanText(p.name);
        return cName.includes(cleanQ) || cleanQ.includes(cName);
    });
    if (contains) return { product: contains, score: 0.85 };

    // 3. Token similarity
    let best = null;
    let maxScore = 0.35; // minimum threshold

    for (const p of catalog) {
        const score = computeMatchScore(cleanQ, p.name);
        if (score > maxScore) {
            maxScore = score;
            best = p;
        }
    }

    return best ? { product: best, score: maxScore } : null;
}

/**
 * Heuristic fallback parser when Gemini is unavailable
 * Handles inputs like: "2 kg basmati rice, 1 butter, 500g sugar, 3 colgate paste"
 */
function parseHeuristic(orderText, catalog = []) {
    if (!orderText || typeof orderText !== 'string') return [];

    // Split on commas, newlines, "and", or "+"
    const clauses = orderText
        .split(/(?:,|\n|\band\b|\+)/i)
        .map(s => s.trim())
        .filter(Boolean);

    const parsedItems = [];
    const unmatched = [];

    // Regex to extract quantity, unit, and item name
    // e.g. "2.5 kg basmati rice" or "10 pcs soaps" or "3 milk" or "sugar 1kg"
    const prefixRegex = /^([\d]+(?:\.[\d]+)?)\s*([a-zA-Z]+)?\s+(.+)$/i;
    const suffixRegex = /^(.+?)\s+([\d]+(?:\.[\d]+)?)\s*([a-zA-Z]+)?$/i;

    for (const clause of clauses) {
        let qty = 1;
        let unit = 'pcs';
        let rawName = clause;

        let match = clause.match(prefixRegex);
        if (match) {
            qty = parseFloat(match[1]) || 1;
            const potentialUnit = match[2] ? match[2].toLowerCase() : '';
            if (UNIT_MAP[potentialUnit]) {
                unit = UNIT_MAP[potentialUnit];
                rawName = match[3];
            } else if (potentialUnit) {
                // If not a recognized unit, it is part of product name (e.g., "1 iphone")
                rawName = `${potentialUnit} ${match[3]}`;
            } else {
                rawName = match[3];
            }
        } else {
            match = clause.match(suffixRegex);
            if (match) {
                rawName = match[1];
                qty = parseFloat(match[2]) || 1;
                const potentialUnit = match[3] ? match[3].toLowerCase() : '';
                if (UNIT_MAP[potentialUnit]) unit = UNIT_MAP[potentialUnit];
            }
        }

        const matchResult = findBestProduct(rawName, catalog);
        if (matchResult && matchResult.product) {
            const prod = matchResult.product;
            const validSku = prod.sku || prod.id;
            const unitPrice = Number(prod.salePrice || prod.salesPrice || prod.price || 0);
            const gstRate = Number(prod.salesGst || prod.gstRate || prod.gst || 0);
            const availableStock = Number(prod.quantity || 0) * (Number(prod.unit) || 1);

            parsedItems.push({
                productId: prod.id || prod._id,
                productSku: validSku,
                productName: prod.name,
                requestedName: rawName.trim(),
                quantity: qty,
                unit: prod.unitType || unit,
                price: unitPrice,
                gstRate: gstRate,
                availableStock,
                total: +(qty * unitPrice).toFixed(2),
                confidence: matchResult.score,
                matched: true,
                category: prod.category || 'General'
            });
        } else {
            unmatched.push({
                requestedName: rawName.trim(),
                quantity: qty,
                unit: unit,
                matched: false
            });
        }
    }

    return { parsedItems, unmatched, method: 'heuristic' };
}

/**
 * Parse natural language order using Google Gemini AI, with catalog grounding
 */
async function parseWithGemini(orderText, catalog = []) {
    const model = getGeminiModel('gemini-1.5-flash');
    if (!model) {
        return parseHeuristic(orderText, catalog);
    }

    // Keep catalog compact for prompt context
    const compactCatalog = catalog.slice(0, 300).map(p => ({
        id: p.id || p._id,
        sku: p.sku || p.id,
        name: p.name,
        price: Number(p.salePrice || p.salesPrice || p.price || 0),
        stock: Number(p.quantity || 0),
        unit: p.unitType || 'pcs',
        gst: Number(p.salesGst || p.gstRate || p.gst || 0)
    }));

    const prompt = `You are an expert POS billing assistant for an Indian retail and business ERP.
A cashier or customer has typed or spoken the following order:
"${orderText}"

Match the requested items against the store's inventory catalog provided below.
INVENTORY CATALOG (JSON):
${JSON.stringify(compactCatalog)}

TASK:
1. Extract each distinct item requested with its quantity and unit (e.g. 2 kg, 1 pc, 500g = 0.5kg).
2. Match it to the closest product in the INVENTORY CATALOG.
3. If an item does not exist in the catalog, mark it as unmatched.
4. Output STRICT JSON format only, matching this structure with NO markdown or explanations:
{
  "parsedItems": [
    {
      "productId": "string or catalog id",
      "productSku": "string or catalog sku",
      "productName": "matched product name",
      "requestedName": "original requested name",
      "quantity": 2,
      "unit": "kg/pcs",
      "price": 120.00,
      "gstRate": 5,
      "confidence": 0.95
    }
  ],
  "unmatched": [
    {
      "requestedName": "item not found",
      "quantity": 1,
      "unit": "pcs"
    }
  ]
}`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        // Remove code block markdown if present
        const jsonText = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonText);

        const parsedItems = (parsed.parsedItems || []).map(item => {
            const matchedProd = catalog.find(p => (p.id && p.id === item.productId) || (p.sku && p.sku === item.productSku) || p.name === item.productName);
            const unitPrice = matchedProd ? Number(matchedProd.salePrice || matchedProd.salesPrice || matchedProd.price || item.price) : Number(item.price || 0);
            const gstRate = matchedProd ? Number(matchedProd.salesGst || matchedProd.gstRate || matchedProd.gst || 0) : Number(item.gstRate || 0);
            const availableStock = matchedProd ? Number(matchedProd.quantity || 0) * (Number(matchedProd.unit) || 1) : 0;

            return {
                productId: item.productId || (matchedProd && matchedProd.id),
                productSku: item.productSku || (matchedProd && (matchedProd.sku || matchedProd.id)),
                productName: item.productName || (matchedProd && matchedProd.name),
                requestedName: item.requestedName || item.productName,
                quantity: Number(item.quantity) || 1,
                unit: item.unit || 'pcs',
                price: unitPrice,
                gstRate: gstRate,
                availableStock,
                total: +(Number(item.quantity || 1) * unitPrice).toFixed(2),
                confidence: item.confidence || 0.9,
                matched: true,
                category: (matchedProd && matchedProd.category) || 'General'
            };
        });

        return {
            parsedItems,
            unmatched: parsed.unmatched || [],
            method: 'gemini'
        };
    } catch (err) {
        console.warn('⚠️ [SmartBillingAI] Gemini parsing failed, using heuristic fallback:', err.message);
        return parseHeuristic(orderText, catalog);
    }
}

/**
 * Main entry point for Smart Billing NLP
 */
async function parseNaturalLanguageBill({ orderText, catalog = [] }) {
    if (!orderText || !orderText.trim()) {
        return { parsedItems: [], unmatched: [], method: 'none', message: 'Empty order text' };
    }

    if (isGeminiConfigured()) {
        return await parseWithGemini(orderText, catalog);
    } else {
        return parseHeuristic(orderText, catalog);
    }
}

module.exports = {
    parseNaturalLanguageBill,
    findBestProduct,
    cleanText
};
