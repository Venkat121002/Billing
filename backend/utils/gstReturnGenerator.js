/**
 * GST Return Preparation & Excel Exporter
 * Feature 10 of Phase 2 Automation.
 *
 * Compiles and generates official GSTR-1 and GSTR-3B monthly/quarterly summaries
 * directly from GstBill invoices, with ready-to-file multi-sheet Excel export.
 */
const XLSX = require('xlsx');
const platformStore = require('./platformStore');
const { listStoreRecords } = require('./storeRecords');

/**
 * Parses date filter bounds from month/year or explicit range
 */
function getGstPeriodBounds({ month, year, startDate, endDate }) {
    if (startDate && endDate) {
        return {
            start: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
            end: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
            label: `${startDate} to ${endDate}`
        };
    }

    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-indexed

    const start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${monthNames[currentMonth]} ${currentYear}`
    };
}

/**
 * Generate GSTR-1 and GSTR-3B summary object
 */
async function generateGstReturnsSummary({ ownerId, tenantId, month, year, startDate, endDate }) {
    const { start, end, label } = getGstPeriodBounds({ month, year, startDate, endDate });

    const owner = ownerId ? await platformStore.getOwner(ownerId) : null;
    const businessName = owner?.companyDetails?.name || owner?.businessName || 'Taxpayer Business';
    const storeGstin = owner?.companyDetails?.gstNumber || owner?.gstin || '';
    const state = owner?.companyDetails?.state || 'Tamil Nadu';

    const bills = (await listStoreRecords(ownerId, 'gstBills', { since: start, until: end }))
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

    const b2bInvoices = [];
    const b2cSmallMap = {}; // key: `${pos}_${rate}`
    const hsnMap = {};       // key: hsnCode
    const docNumbers = [];

    let totalInvoiceValue = 0;
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const bill of bills) {
        const invNo = bill.invoiceNo || bill.billNumber || 'INV-000';
        docNumbers.push(invNo);

        const billDate = bill.date || (bill.createdAt ? bill.createdAt.split('T')[0] : '');
        const custGstin = String(bill.customerGstin || '').trim().toUpperCase();
        const custName = bill.customerName || 'Walk-in Customer';
        const placeOfSupply = bill.placeOfSupply || state;
        const grandTotal = Number(bill.grandTotal || bill.totalAmount || 0);

        let billTaxable = 0;
        let billCgst = Number(bill.cgst || 0);
        let billSgst = Number(bill.sgst || 0);
        let billIgst = Number(bill.igst || 0);

        // Process line items
        const items = Array.isArray(bill.items) ? bill.items : [];
        for (const it of items) {
            const qty = Number(it.quantity || it.qty || 1);
            const rate = Number(it.price || it.rate || 0);
            const itemTaxable = +(qty * rate).toFixed(2);
            const gstRate = Number(it.gstRate || it.salesGst || it.gst || 0);

            billTaxable += itemTaxable;

            // HSN breakdown
            const hsnCode = String(it.hsn || it.hsnCode || '9999').trim();
            if (!hsnMap[hsnCode]) {
                hsnMap[hsnCode] = {
                    hsnCode,
                    description: it.name || it.productName || 'Goods/Services',
                    uqc: it.unit || 'NOS',
                    totalQuantity: 0,
                    totalValue: 0,
                    taxableValue: 0,
                    cgst: 0,
                    sgst: 0,
                    igst: 0
                };
            }

            const itemTax = +(itemTaxable * (gstRate / 100)).toFixed(2);
            hsnMap[hsnCode].totalQuantity += qty;
            hsnMap[hsnCode].taxableValue += itemTaxable;
            hsnMap[hsnCode].totalValue += +(itemTaxable + itemTax).toFixed(2);

            if (billIgst > 0) {
                hsnMap[hsnCode].igst += itemTax;
            } else {
                hsnMap[hsnCode].cgst += +(itemTax / 2).toFixed(2);
                hsnMap[hsnCode].sgst += +(itemTax / 2).toFixed(2);
            }

            // B2C Small aggregation if unregistered
            if (!custGstin || custGstin.length < 15) {
                const b2cKey = `${placeOfSupply}_${gstRate}`;
                if (!b2cSmallMap[b2cKey]) {
                    b2cSmallMap[b2cKey] = {
                        placeOfSupply,
                        rate: gstRate,
                        taxableValue: 0,
                        cgst: 0,
                        sgst: 0,
                        igst: 0,
                        cess: 0
                    };
                }
                b2cSmallMap[b2cKey].taxableValue += itemTaxable;
                if (billIgst > 0) {
                    b2cSmallMap[b2cKey].igst += itemTax;
                } else {
                    b2cSmallMap[b2cKey].cgst += +(itemTax / 2).toFixed(2);
                    b2cSmallMap[b2cKey].sgst += +(itemTax / 2).toFixed(2);
                }
            }
        }

        if (billTaxable === 0) {
            billTaxable = Number(bill.subTotal || (grandTotal - (billCgst + billSgst + billIgst)));
        }

        totalInvoiceValue += grandTotal;
        totalTaxableValue += billTaxable;
        totalCgst += billCgst;
        totalSgst += billSgst;
        totalIgst += billIgst;

        // If customer has a valid 15-character GSTIN, it belongs in GSTR-1 Table 4 (B2B)
        if (custGstin && custGstin.length === 15) {
            b2bInvoices.push({
                gstin: custGstin,
                customerName: custName,
                invoiceNo: invNo,
                invoiceDate: billDate,
                invoiceValue: +grandTotal.toFixed(2),
                placeOfSupply,
                reverseCharge: 'N',
                applicablePercentTaxRate: '',
                invoiceType: 'Regular',
                ecommerceGstin: '',
                rate: items[0]?.gstRate || 18,
                taxableValue: +billTaxable.toFixed(2),
                cgst: +billCgst.toFixed(2),
                sgst: +billSgst.toFixed(2),
                igst: +billIgst.toFixed(2),
                cess: 0
            });
        }
    }

    const b2cSmallList = Object.values(b2cSmallMap).map(i => ({
        ...i,
        taxableValue: +i.taxableValue.toFixed(2),
        cgst: +i.cgst.toFixed(2),
        sgst: +i.sgst.toFixed(2),
        igst: +i.igst.toFixed(2)
    }));

    const hsnList = Object.values(hsnMap).map(h => ({
        ...h,
        totalQuantity: +h.totalQuantity.toFixed(2),
        totalValue: +h.totalValue.toFixed(2),
        taxableValue: +h.taxableValue.toFixed(2),
        cgst: +h.cgst.toFixed(2),
        sgst: +h.sgst.toFixed(2),
        igst: +h.igst.toFixed(2)
    }));

    // Document Summary (Table 13)
    const docSummary = {
        natureOfDocument: 'Invoices for outward supply',
        srNoFrom: docNumbers.length ? docNumbers[0] : 'N/A',
        srNoTo: docNumbers.length ? docNumbers[docNumbers.length - 1] : 'N/A',
        totalNumber: docNumbers.length,
        cancelled: 0,
        netIssued: docNumbers.length
    };

    // GSTR-3B Table 3.1
    const gstr3b = {
        outwardTaxableSupplies: {
            description: '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)',
            taxableValue: +totalTaxableValue.toFixed(2),
            igst: +totalIgst.toFixed(2),
            cgst: +totalCgst.toFixed(2),
            sgst: +totalSgst.toFixed(2),
            cess: 0
        },
        zeroRatedSupplies: {
            description: '(b) Outward taxable supplies (zero rated)',
            taxableValue: 0,
            igst: 0,
            cess: 0
        },
        nilRatedExempted: {
            description: '(c) Other outward supplies (Nil rated, exempted)',
            taxableValue: 0
        },
        totalTaxPayable: +(totalIgst + totalCgst + totalSgst).toFixed(2)
    };

    return {
        businessName,
        storeGstin,
        period: label,
        summary: {
            totalBills: bills.length,
            totalInvoiceValue: +totalInvoiceValue.toFixed(2),
            totalTaxableValue: +totalTaxableValue.toFixed(2),
            totalCgst: +totalCgst.toFixed(2),
            totalSgst: +totalSgst.toFixed(2),
            totalIgst: +totalIgst.toFixed(2),
            totalTax: +(totalCgst + totalSgst + totalIgst).toFixed(2),
            b2bCount: b2bInvoices.length,
            b2cCount: bills.length - b2bInvoices.length
        },
        gstr1: {
            b2b: b2bInvoices,
            b2cSmall: b2cSmallList,
            hsn: hsnList,
            documents: [docSummary]
        },
        gstr3b
    };
}

/**
 * Builds a multi-sheet formatted Excel workbook (.xlsx) ready for download
 */
function buildGstExcelWorkbook(data) {
    const wb = XLSX.utils.book_new();

    // 1. Executive Summary Sheet
    const summaryRows = [
        ['GST RETURNS SUMMARY REPORT', ''],
        ['Business Name', data.businessName],
        ['GSTIN', data.storeGstin || 'Not Configured'],
        ['Return Period', data.period],
        ['Generated At', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['', ''],
        ['METRIC', 'AMOUNT (INR)'],
        ['Total Invoices Issued', data.summary.totalBills],
        ['Total B2B Invoices (Registered)', data.summary.b2bCount],
        ['Total B2C Invoices (Consumers)', data.summary.b2cCount],
        ['Total Invoice Value', data.summary.totalInvoiceValue],
        ['Total Taxable Value', data.summary.totalTaxableValue],
        ['Central GST (CGST)', data.summary.totalCgst],
        ['State GST (SGST)', data.summary.totalSgst],
        ['Integrated GST (IGST)', data.summary.totalIgst],
        ['Total Tax Liability', data.summary.totalTax],
        ['', ''],
        ['Note: This file contains official tables for GSTR-1 and GSTR-3B filings prepared by SwordNex Billing ERP.', '']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // 2. GSTR-1 B2B Sheet
    const b2bHeader = [
        'GSTIN/UIN of Recipient',
        'Receiver Name',
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Place Of Supply',
        'Reverse Charge',
        'Applicable % of Tax Rate',
        'Invoice Type',
        'E-Commerce GSTIN',
        'Rate (%)',
        'Taxable Value',
        'Cess Amount'
    ];
    const b2bData = (data.gstr1.b2b || []).map(b => [
        b.gstin,
        b.customerName,
        b.invoiceNo,
        b.invoiceDate,
        b.invoiceValue,
        b.placeOfSupply,
        b.reverseCharge,
        b.applicablePercentTaxRate,
        b.invoiceType,
        b.ecommerceGstin,
        b.rate,
        b.taxableValue,
        b.cess
    ]);
    const wsB2B = XLSX.utils.aoa_to_sheet([b2bHeader, ...b2bData]);
    XLSX.utils.book_append_sheet(wb, wsB2B, 'GSTR-1 B2B');

    // 3. GSTR-1 B2C Small Sheet
    const b2cHeader = [
        'Type',
        'Place Of Supply',
        'Applicable % of Tax Rate',
        'Rate (%)',
        'Taxable Value',
        'Cess Amount',
        'E-Commerce GSTIN'
    ];
    const b2cData = (data.gstr1.b2cSmall || []).map(b => [
        'OE (Other than E-Commerce)',
        b.placeOfSupply,
        '',
        b.rate,
        b.taxableValue,
        b.cess,
        ''
    ]);
    const wsB2C = XLSX.utils.aoa_to_sheet([b2cHeader, ...b2cData]);
    XLSX.utils.book_append_sheet(wb, wsB2C, 'GSTR-1 B2C Small');

    // 4. HSN Summary Sheet (Table 12)
    const hsnHeader = [
        'HSN',
        'Description',
        'UQC',
        'Total Quantity',
        'Total Value',
        'Taxable Value',
        'Integrated Tax Amount',
        'Central Tax Amount',
        'State/UT Tax Amount',
        'Cess Amount'
    ];
    const hsnData = (data.gstr1.hsn || []).map(h => [
        h.hsnCode,
        h.description,
        h.uqc,
        h.totalQuantity,
        h.totalValue,
        h.taxableValue,
        h.igst,
        h.cgst,
        h.sgst,
        0
    ]);
    const wsHsn = XLSX.utils.aoa_to_sheet([hsnHeader, ...hsnData]);
    XLSX.utils.book_append_sheet(wb, wsHsn, 'HSN Summary');

    // 5. GSTR-3B Summary Sheet
    const g3b = data.gstr3b.outwardTaxableSupplies;
    const g3bRows = [
        ['Table 3.1 Details of Outward Supplies and inward supplies liable to reverse charge'],
        ['Nature of Supplies', 'Total Taxable Value', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'Cess'],
        [g3b.description, g3b.taxableValue, g3b.igst, g3b.cgst, g3b.sgst, g3b.cess],
        ['(b) Outward taxable supplies (zero rated)', 0, 0, '', '', 0],
        ['(c) Other outward supplies (Nil rated, exempted)', 0, '', '', '', ''],
        ['(d) Inward supplies (liable to reverse charge)', 0, 0, 0, 0, 0],
        ['(e) Non-GST outward supplies', 0, '', '', '', ''],
        ['', '', '', '', '', ''],
        ['Total Tax Payable', '', g3b.igst, g3b.cgst, g3b.sgst, data.gstr3b.totalTaxPayable]
    ];
    const ws3B = XLSX.utils.aoa_to_sheet(g3bRows);
    XLSX.utils.book_append_sheet(wb, ws3B, 'GSTR-3B');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
}

module.exports = {
    generateGstReturnsSummary,
    buildGstExcelWorkbook
};
