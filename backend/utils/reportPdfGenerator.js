const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

/**
 * Standard money formatting helper for Helvetica PDFKit:
 * Replaces any unicode Rupee symbol with clean, universally supported 'Rs. '
 */
function formatMoney(val) {
    if (typeof val === 'number') {
        return `Rs. ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (typeof val === 'string') {
        const cleaned = val.replace(/^[₹\s]|^(?:Rs\.?|INR)\s*/gi, '').trim();
        return `Rs. ${cleaned || '0.00'}`;
    }
    return 'Rs. 0.00';
}

/**
 * Generates a clean, professional Daily Closing & Store Performance PDF Report.
 * Dynamically paces layout so data determines page count with zero accidental blank pages.
 *
 * @param {Object} data Report metrics and store details
 * @returns {Promise<Buffer>} Resolves to PDF Buffer
 */
function generateDailyReportPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
            const buffers = [];

            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));

            const storeName = data.storeName || 'SwordNex Store';
            const ownerName = data.ownerName || 'Store Owner';
            const displayDate = data.date || new Date().toISOString().split('T')[0];
            const websiteUrl = data.websiteUrl || process.env.FRONTEND_URL || 'https://swordnex-billing-app.web.app';

            // ================= HEADER =================
            doc.rect(40, 40, 515, 66).fill('#0F172A'); // Slate 900 banner

            doc
                .fillColor('#FFFFFF')
                .fontSize(17)
                .font('Helvetica-Bold')
                .text(storeName.toUpperCase(), 55, 52, { width: 360, ellipsis: true })
                .fontSize(9.5)
                .font('Helvetica')
                .fillColor('#94A3B8')
                .text('Daily Store Performance & Closing Summary', 55, 74);

            doc
                .fillColor('#F8FAFC')
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(displayDate, 410, 52, { width: 130, align: 'right' })
                .fontSize(9)
                .font('Helvetica')
                .fillColor('#94A3B8')
                .text(`Owner: ${ownerName}`, 410, 74, { width: 130, align: 'right' });

            let y = 122;

            // ================= KPI SUMMARY CARDS =================
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#0F172A')
                .text('Financial & Performance Overview', 40, y);

            y += 18;

            const cards = [
                { label: 'Total Revenue', value: formatMoney(data.totalSales), color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Total Invoices', value: String(data.totalBills || 0), color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Today\'s Dues', value: formatMoney(data.duesIncurred), color: '#DC2626', bg: '#FEF2F2' }
            ];

            const cardWidth = 165;
            cards.forEach((card, idx) => {
                const x = 40 + idx * (cardWidth + 10);
                doc.rect(x, y, cardWidth, 48).fillAndStroke(card.bg, '#E2E8F0');
                doc
                    .fontSize(8.5)
                    .font('Helvetica-Bold')
                    .fillColor('#64748B')
                    .text(card.label.toUpperCase(), x + 10, y + 8)
                    .fontSize(13.5)
                    .font('Helvetica-Bold')
                    .fillColor(card.color)
                    .text(card.value, x + 10, y + 23);
            });

            y += 60;

            // ================= PAYMENT BREAKDOWN =================
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#0F172A')
                .text('Collections by Payment Mode', 40, y);

            y += 16;

            const payments = [
                { mode: 'Cash Collected', amount: formatMoney(data.paymentBreakdown?.cash) },
                { mode: 'Digital / UPI', amount: formatMoney(data.paymentBreakdown?.upi || data.paymentBreakdown?.digital) },
                { mode: 'Card Payments', amount: formatMoney(data.paymentBreakdown?.card) }
            ];

            payments.forEach((p, idx) => {
                const x = 40 + idx * (cardWidth + 10);
                doc.rect(x, y, cardWidth, 40).fillAndStroke('#F8FAFC', '#E2E8F0');
                doc
                    .fontSize(8.5)
                    .font('Helvetica')
                    .fillColor('#64748B')
                    .text(p.mode, x + 10, y + 7)
                    .fontSize(11.5)
                    .font('Helvetica-Bold')
                    .fillColor('#0F172A')
                    .text(p.amount, x + 10, y + 21);
            });

            y += 52;

            // ================= TOP SELLING PRODUCTS =================
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#0F172A')
                .text('Top Performing Products Today', 40, y);

            y += 16;

            // Table Header
            doc.rect(40, y, 515, 20).fill('#F1F5F9');
            doc
                .fontSize(8.5)
                .font('Helvetica-Bold')
                .fillColor('#475569')
                .text('#', 50, y + 5)
                .text('Product Name', 80, y + 5)
                .text('Quantity Sold', 360, y + 5, { width: 80, align: 'right' })
                .text('Total Value', 460, y + 5, { width: 85, align: 'right' });

            y += 22;

            const topProducts = Array.isArray(data.topProducts) ? data.topProducts : [];
            if (topProducts.length === 0) {
                doc
                    .fontSize(8.5)
                    .font('Helvetica-Oblique')
                    .fillColor('#94A3B8')
                    .text('No sales recorded for individual products today.', 50, y + 5);
                y += 20;
            } else {
                topProducts.slice(0, 5).forEach((p, idx) => {
                    const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                    doc.rect(40, y, 515, 18).fill(rowBg);
                    doc
                        .fontSize(8.5)
                        .font('Helvetica-Bold')
                        .fillColor('#0F172A')
                        .text(String(idx + 1), 50, y + 4)
                        .font('Helvetica')
                        .text(p.name || 'Unnamed Product', 80, y + 4, { width: 270, ellipsis: true })
                        .text(String(p.qty || 0), 360, y + 4, { width: 80, align: 'right' })
                        .font('Helvetica-Bold')
                        .text(formatMoney(p.revenue), 460, y + 4, { width: 85, align: 'right' });
                    y += 20;
                });
            }

            y += 12;

            // ================= INVENTORY HEALTH & LOW STOCK =================
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#0F172A')
                .text('Inventory Health & Restock Warnings', 40, y);

            y += 16;

            doc.rect(40, y, 515, 20).fill('#FEF2F2');
            doc
                .fontSize(8.5)
                .font('Helvetica-Bold')
                .fillColor('#991B1B')
                .text('Product Name', 50, y + 5)
                .text('Current Stock', 300, y + 5, { width: 80, align: 'right' })
                .text('Min Threshold', 390, y + 5, { width: 75, align: 'right' })
                .text('Status', 480, y + 5, { width: 65, align: 'center' });

            y += 22;

            const lowStockItems = Array.isArray(data.lowStockItems) ? data.lowStockItems : [];
            if (lowStockItems.length === 0) {
                doc
                    .fontSize(8.5)
                    .font('Helvetica')
                    .fillColor('#16A34A')
                    .text('✓ All inventory is healthy. No items are currently below reorder thresholds.', 50, y + 5);
                y += 20;
            } else {
                lowStockItems.slice(0, 6).forEach((item, idx) => {
                    const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FFF5F5';
                    doc.rect(40, y, 515, 18).fill(rowBg);

                    const isOut = Number(item.quantity || 0) <= 0;
                    doc
                        .fontSize(8.5)
                        .font('Helvetica')
                        .fillColor('#0F172A')
                        .text(item.name || 'Product', 50, y + 4, { width: 240, ellipsis: true })
                        .font('Helvetica-Bold')
                        .fillColor(isOut ? '#DC2626' : '#D97706')
                        .text(`${item.quantity || 0} ${item.unit || ''}`, 300, y + 4, { width: 80, align: 'right' })
                        .font('Helvetica')
                        .fillColor('#64748B')
                        .text(String(item.minStockThreshold || 5), 390, y + 4, { width: 75, align: 'right' })
                        .font('Helvetica-Bold')
                        .fillColor(isOut ? '#DC2626' : '#D97706')
                        .text(isOut ? 'OUT OF STOCK' : 'LOW STOCK', 480, y + 4, { width: 65, align: 'center' });
                    y += 20;
                });
                if (lowStockItems.length > 6) {
                    doc
                        .fontSize(8)
                        .font('Helvetica-Oblique')
                        .fillColor('#64748B')
                        .text(`+ ${lowStockItems.length - 6} more low stock products. Check web portal for full list.`, 50, y + 4);
                    y += 16;
                }
            }

            // ================= WEBSITE LINK & DASHBOARD CTA FOOTER =================
            const ctaHeight = 52;
            const ctaY = Math.min(Math.max(y + 14, 730), 745);
            doc.rect(40, ctaY, 515, ctaHeight).fillAndStroke('#F8FAFC', '#CBD5E1');

            doc
                .fontSize(8.5)
                .font('Helvetica-Bold')
                .fillColor('#0F172A')
                .text('NEED MORE DETAILED REPORTS OR STOCK REORDERS?', 55, ctaY + 9)
                .font('Helvetica')
                .fontSize(8.5)
                .fillColor('#475569')
                .text('Access complete transaction logs, customer ledgers, and manage stock on your web dashboard:', 55, ctaY + 22)
                .font('Helvetica-Bold')
                .fontSize(9.5)
                .fillColor('#2563EB')
                .text(websiteUrl, 55, ctaY + 36, {
                    link: websiteUrl,
                    underline: true
                });

            // ================= EXACT FOOTER ON EVERY PAGE =================
            const pageRange = doc.bufferedPageRange();
            const logoPath = path.resolve(__dirname, '../assets/company-logo.png');
            const hasLogo = fs.existsSync(logoPath);

            for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
                doc.switchToPage(i);
                doc.page.margins.bottom = 0; // Prevent PDFKit lineWrapper from triggering unwanted auto-pagebreak
                const bottomY = doc.page.height - 24;
                const pageWidth = doc.page.width;

                // Subtle hairline divider rule
                doc
                    .strokeColor('#E2E8F0')
                    .lineWidth(0.5)
                    .moveTo(40, bottomY - 6)
                    .lineTo(pageWidth - 40, bottomY - 6)
                    .stroke();

                // Left: Generated timestamp
                doc
                    .fontSize(7.5)
                    .font('Helvetica')
                    .fillColor('#94A3B8')
                    .text(
                        `Generated: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
                        40,
                        bottomY,
                        { align: 'left', width: 140, lineBreak: false }
                    );

                // Center: Small Logo + Company Name
                const companyText = '© SwordNex Technologies Pvt. Ltd.';
                doc.fontSize(8.5).font('Helvetica').fillColor('#64748B');
                const textWidth = doc.widthOfString(companyText);
                const logoSize = 13;
                const gap = 5;

                if (hasLogo) {
                    const totalWidth = logoSize + gap + textWidth;
                    const startX = (pageWidth - totalWidth) / 2;
                    doc.image(logoPath, startX, bottomY - 2.5, { width: logoSize, height: logoSize });
                    doc.text(companyText, startX + logoSize + gap, bottomY, { lineBreak: false });
                } else {
                    doc.text(companyText, 40, bottomY, {
                        align: 'center',
                        width: pageWidth - 80,
                        lineBreak: false
                    });
                }

                // Right: Page Numbering
                if (pageRange.count > 1) {
                    doc
                        .fontSize(8)
                        .font('Helvetica')
                        .fillColor('#94A3B8')
                        .text(`Page ${i + 1} of ${pageRange.count}`, 40, bottomY, {
                            align: 'right',
                            width: pageWidth - 80,
                            lineBreak: false
                        });
                }
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateDailyReportPDF
};
