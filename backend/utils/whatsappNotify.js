/**
 * Business events -> WhatsApp messages. Every function here is best-effort:
 * it logs and returns false on failure, never throws.
 */
const wa = require('./whatsappService');
const { money } = require('./paymentService');

const formatDate = (value) => {
    const d = value ? new Date(value) : new Date();
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
};

// Meta rejects template params containing newlines, tabs or 4+ spaces in a row.
const oneLine = (text) => String(text).replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();

// The PDF is named after what was printed: the GST formats are a tax invoice
// (or a bill of supply when the shop has no GSTIN); everything else (thermal,
// plain A4/A5) is a bill. bill.printFormat is saved by the billing screen.
const documentKind = (bill, ownerGstin) => {
    if (!/gst/i.test(String(bill.printFormat || ''))) return 'Bill';
    return /^\d{2}[A-Z0-9]{13}$/i.test(String(ownerGstin || '').trim()) ? 'Tax_Invoice' : 'Bill_of_Supply';
};
exports.documentKind = documentKind;

// bill_created (names the shop, says "bill") replaces invoice_created once Meta
// approves it. See WHATSAPP_BILL_CREATED_ENABLED and utils/whatsappTemplates.js.
const useBillCreated = () => process.env.WHATSAPP_BILL_CREATED_ENABLED === 'true';

/**
 * Send a saved POS bill to the customer's WhatsApp with its PDF attached.
 * The PDF is the receipt the browser renders, so the customer gets exactly
 * what was printed. Throws so the caller can show why it failed.
 */
exports.sendInvoicePdf = async (bill, pdfBuffer, { businessName, ownerGstin } = {}) => {
    const invoiceNumber = bill.receiptNo && bill.receiptNo !== 'N/A' ? String(bill.receiptNo) : '';
    const safeName = (invoiceNumber || 'receipt').replace(/[^\w.-]+/g, '_');
    const filename = `${documentKind(bill, ownerGstin)}_${safeName}.pdf`;
    const documentId = await wa.uploadMedia(pdfBuffer, { filename });

    const common = {
        customer_name: oneLine(bill.customerName || 'Customer'),
        amount: money(bill.totals?.grandTotal ?? 0),
        document_id: documentId,
        document_filename: filename
    };
    if (useBillCreated()) {
        return wa.sendTemplate({
            to: bill.customerPhone,
            type: 'BILL_CREATED',
            data: {
                ...common,
                business_name: oneLine(businessName || 'our store'),
                bill_number: invoiceNumber || '-',
                bill_date: formatDate(bill.receiptDate || bill.createdAt)
            }
        });
    }
    return wa.sendTemplate({
        to: bill.customerPhone,
        type: 'INVOICE_CREATED',
        data: {
            ...common,
            invoice_number: invoiceNumber || '-',
            invoice_date: formatDate(bill.receiptDate || bill.createdAt)
        }
    });
};

// "Milk x2 (₹100.00), Curd x1 (₹40.00) +3 more", kept under ~600 characters.
const summarizeItems = (items = []) => {
    const parts = items.map((i) => `${oneLine(i.name || 'Item')} x${Number(i.qty) || 1} (${money((Number(i.price) || 0) * (Number(i.qty) || 1))})`);
    let text = '';
    for (let n = 0; n < parts.length; n++) {
        const next = text ? `${text}, ${parts[n]}` : parts[n].slice(0, 600);
        if (next.length > 600) return `${text} +${parts.length - n} more`;
        text = next;
    }
    return text || '-';
};

/**
 * Send a saved POS bill as a text message (bill_summary template): no PDF,
 * the store name, bill number, items and total are in the message body.
 * Throws so the caller can show why it failed.
 */
exports.sendInvoiceText = async (bill, businessName) => {
    const invoiceNumber = bill.receiptNo && bill.receiptNo !== 'N/A' ? String(bill.receiptNo) : '-';
    return wa.sendTemplate({
        to: bill.customerPhone,
        type: 'BILL_SUMMARY',
        data: {
            customer_name: oneLine(bill.customerName || 'Customer'),
            business_name: oneLine(businessName || 'our store'),
            invoice_number: invoiceNumber,
            invoice_date: formatDate(bill.receiptDate || bill.createdAt),
            items: summarizeItems(bill.items),
            amount: money(bill.totals?.grandTotal ?? 0)
        }
    });
};

/** Dues pay link. Throws on failure so the staff member sees the reason. */
exports.sendDuesPayLink = async ({ to, customerName, business, balance, url }) =>
    wa.sendTemplate({
        to,
        type: 'DUES_PAY_LINK',
        data: {
            customer_name: customerName || 'Customer',
            business_name: business,
            amount: money(balance),
            pay_link: url
        }
    });
