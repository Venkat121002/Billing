const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const generateInvoicePDF = (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
            let buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // --- Header ---
            doc
                .fillColor('#444444')
                .fontSize(20)
                .text('SwordNex Technology', 160, 57) // Assuming company name
                .fontSize(10)
                .text('Billing Software Solutions', 200, 65, { align: 'right' })
                .moveDown();

            // --- Invoice Title ---
            doc
                .fillColor('#000000')
                .fontSize(20)
                .text('INVOICE', 50, 160);

            // --- Invoice Details ---
            generateHr(doc, 185);
            const customerInformationTop = 200;

            doc
                .fontSize(10)
                .text("Invoice Number:", 50, customerInformationTop)
                .font("Helvetica-Bold")
                .text(data.invoiceNo, 150, customerInformationTop)
                .font("Helvetica")
                .text("Invoice Date:", 50, customerInformationTop + 15)
                .text(formatDate(new Date()), 150, customerInformationTop + 15)
                .text("Balance Due:", 50, customerInformationTop + 30)
                .text(formatCurrency(0), 150, customerInformationTop + 30) // Paid in full

                .font("Helvetica-Bold")
                .text(data.ownerName, 300, customerInformationTop)
                .font("Helvetica")
                .text(data.ownerEmail, 300, customerInformationTop + 15)
                .moveDown();

            generateHr(doc, 252);

            // --- Table Header ---
            const invoiceTableTop = 330;
            doc.font("Helvetica-Bold");
            generateTableRow(
                doc,
                invoiceTableTop,
                "Item",
                "Description",
                "Unit Cost",
                "Quantity",
                "Line Total"
            );
            generateHr(doc, invoiceTableTop + 20);
            doc.font("Helvetica");

            // --- Table Rows ---
            const position = invoiceTableTop + 30;
            generateTableRow(
                doc,
                position,
                "Subscription",
                `${data.plan} Plan - ${data.billingCycle}`,
                formatCurrency(data.amount),
                1,
                formatCurrency(data.amount)
            );

            generateHr(doc, position + 20);

            // --- Totals ---
            const subtotalPosition = position + 30;
            generateTableRow(
                doc,
                subtotalPosition,
                "",
                "",
                "Subtotal",
                "",
                formatCurrency(data.amount)
            );

            const paidToDatePosition = subtotalPosition + 20;
            generateTableRow(
                doc,
                paidToDatePosition,
                "",
                "",
                "Paid To Date",
                "",
                formatCurrency(data.amount)
            );

            const duePosition = paidToDatePosition + 25;
            doc.font("Helvetica-Bold");
            generateTableRow(
                doc,
                duePosition,
                "",
                "",
                "Balance Due",
                "",
                formatCurrency(0)
            );
            doc.font("Helvetica");

            // --- Footer ---
            doc
                .fontSize(10)
                .text(
                    "Payment ID: " + data.paymentId,
                    50,
                    700,
                    { align: "center", width: 500 }
                );
            doc
                .text(
                    "Thank you for your business.",
                    50,
                    715,
                    { align: "center", width: 500 }
                );

            // Apply copyright notice & pagination on every page
            const pageRange = doc.bufferedPageRange();
            const logoPath = path.resolve(__dirname, '../assets/company-logo.png');
            const hasLogo = fs.existsSync(logoPath);

            for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
                doc.switchToPage(i);
                const bottomY = doc.page.height - 28;
                const pageWidth = doc.page.width;

                // Subtle hairline divider rule
                doc
                    .strokeColor("#E2E8F0")
                    .lineWidth(0.5)
                    .moveTo(50, bottomY - 8)
                    .lineTo(pageWidth - 50, bottomY - 8)
                    .stroke();

                // Copyright Notice with small logo on every page
                const companyText = "© SwordNex Technologies Pvt. Ltd.";
                doc.fontSize(8.5).font("Helvetica").fillColor("#64748B");
                const textWidth = doc.widthOfString(companyText);
                const logoSize = 13;
                const gap = 5;

                if (hasLogo) {
                    const totalWidth = logoSize + gap + textWidth;
                    const startX = (pageWidth - totalWidth) / 2;
                    doc.image(logoPath, startX, bottomY - 2.5, { width: logoSize, height: logoSize });
                    doc.text(companyText, startX + logoSize + gap, bottomY);
                } else {
                    doc.text(companyText, 50, bottomY, {
                        align: "center",
                        width: pageWidth - 100
                    });
                }

                if (pageRange.count > 1) {
                    doc
                        .fontSize(8)
                        .font("Helvetica")
                        .fillColor("#94A3B8")
                        .text(`Page ${i + 1} of ${pageRange.count}`, 50, bottomY, {
                            align: "right",
                            width: pageWidth - 100
                        });
                }
            }

            doc.end();


        } catch (err) {
            reject(err);
        }
    });
};

function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

function formatCurrency(cents) {
    return "Rs " + (cents).toFixed(2);
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return year + "/" + month + "/" + day;
}

function generateTableRow(
    doc,
    y,
    item,
    description,
    unitCost,
    quantity,
    lineTotal
) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(description, 150, y)
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
}

module.exports = { generateInvoicePDF };
