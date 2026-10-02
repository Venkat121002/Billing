/**
 * Branded HTML email templates. Every email the backend sends is built here so
 * they all share one layout: logo header, white card, green (#16A34A) accents,
 * footer with support contact.
 *
 * Email clients ignore <style> blocks and most modern CSS, so everything is
 * table-based with inline styles. Any value that came from a user (names,
 * business names) is escaped.
 *
 * The logo is served by the deployed frontend (frontend/public/email-logo.png).
 * Local FRONTEND_URLs can't be reached by Gmail/Outlook, so the production site
 * is used for images whenever FRONTEND_URL points at localhost.
 */

const BRAND = '#16A34A';
const BRAND_DARK = '#15803D';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const SOFT_BG = '#F0FDF4';
const PAGE_BG = '#F3F4F6';
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const PRODUCTION_SITE = 'https://swordnex-billing-app.web.app';
const SUPPORT_EMAIL = 'support@swordnex.com';
const SUPPORT_PHONE = '+91 94861 06953';
const COMPANY = 'SwordNex Technologies Pvt. Ltd.';

const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const siteUrl = () => (process.env.FRONTEND_URL || PRODUCTION_SITE).replace(/\/$/, '');
const assetUrl = () => {
    const url = siteUrl();
    return /localhost|127\.0\.0\.1/.test(url) ? PRODUCTION_SITE : url;
};
const loginUrl = () => `${siteUrl()}/login`;

const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

const p = (html, style = '') =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${TEXT};${style}">${html}</p>`;

const button = (href, label) => `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
      <tr><td style="border-radius:8px;background:${BRAND}">
        <a href="${esc(href)}" target="_blank"
           style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a>
      </td></tr>
    </table>`;

const codeBox = (code) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px">
      <tr><td align="center" style="background:${SOFT_BG};border:1px dashed ${BRAND};border-radius:10px;padding:20px">
        <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND_DARK}">${esc(code)}</span>
      </td></tr>
    </table>`;

/** rows: [[label, value, {bold}]] — values are escaped unless {html:true}. */
const detailsTable = (rows) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:4px 0 24px;border:1px solid ${BORDER};border-radius:10px;border-collapse:separate">
      ${rows.map(([label, value, opt = {}], i) => `
      <tr>
        <td style="padding:12px 16px;font-size:14px;color:${MUTED};${i ? `border-top:1px solid ${BORDER};` : ''}">${esc(label)}</td>
        <td align="right" style="padding:12px 16px;font-size:14px;color:${TEXT};${opt.bold ? 'font-weight:700;' : ''}${i ? `border-top:1px solid ${BORDER};` : ''}">${opt.html ? value : esc(value)}</td>
      </tr>`).join('')}
    </table>`;

const steps = (items) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px">
      ${items.map(([title, text], i) => `
      <tr>
        <td width="36" valign="top" style="padding:0 0 14px">
          <div style="width:26px;height:26px;border-radius:13px;background:${BRAND};color:#fff;font-size:13px;font-weight:700;line-height:26px;text-align:center">${i + 1}</div>
        </td>
        <td valign="top" style="padding:2px 0 14px;font-size:14px;line-height:22px;color:${TEXT}">
          <b>${esc(title)}</b><br><span style="color:${MUTED}">${esc(text)}</span>
        </td>
      </tr>`).join('')}
    </table>`;

const note = (html) =>
    `<p style="margin:0;font-size:13px;line-height:20px;color:${MUTED}">${html}</p>`;

/**
 * Full email document.
 *   preheader: inbox preview text (hidden in the body)
 *   onBehalfOf: for emails a business sends its own customers (pay links, receipts);
 *               replaces SwordNex support details with "Sent by <business>".
 */
function layout({ preheader = '', heading, body, onBehalfOf }) {
    const footer = onBehalfOf
        ? `Sent by <b>${esc(onBehalfOf)}</b> using SwordNex Billing.`
        : `Need help? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_DARK};text-decoration:none">${SUPPORT_EMAIL}</a>
           or call <a href="tel:${SUPPORT_PHONE.replace(/\s/g, '')}" style="color:${BRAND_DARK};text-decoration:none">${SUPPORT_PHONE}</a>.`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:${FONT}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG}">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
        <tr><td align="center" style="padding:0 0 20px">
          <a href="${esc(siteUrl())}" target="_blank" style="text-decoration:none">
            <img src="${assetUrl()}/email-logo.png" width="180" alt="SwordNex Billing"
                 style="display:block;width:180px;max-width:180px;height:auto;border:0;font-size:20px;font-weight:700;color:${BRAND_DARK}">
          </a>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden">
          <div style="height:5px;background:${BRAND};line-height:5px;font-size:0">&nbsp;</div>
          <div style="padding:32px 32px 28px">
            <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:${TEXT}">${esc(heading)}</h1>
            ${body}
          </div>
        </td></tr>
        <tr><td align="center" style="padding:20px 16px 0">
          <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${MUTED}">${footer}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 4px">
            <tr>
              <td valign="middle" align="center" style="padding-right:8px">
                <img src="cid:swordnex-company-logo" width="22" height="22" alt="SwordNex"
                     style="display:block;width:22px;height:22px;border:0;border-radius:4px">
              </td>
              <td valign="middle" align="left" style="font-size:12px;line-height:18px;color:#64748B;font-weight:600">
                &copy; ${new Date().getFullYear()} ${COMPANY}
              </td>
            </tr>
          </table>
          <p style="margin:2px 0 0;font-size:11px;line-height:16px;color:#9CA3AF">All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

exports.signupOtp = ({ otp }) => ({
    subject: `${otp} is your SwordNex Billing verification code`,
    html: layout({
        preheader: `Your email verification code is ${otp}. It expires in 5 minutes.`,
        heading: 'Verify your email',
        body: [
            p('Use this code to finish creating your SwordNex Billing account.'),
            codeBox(otp),
            p('This code expires in <b>5 minutes</b>. You will also receive a separate code on WhatsApp; enter both on the sign-up page.'),
            note("Didn't try to sign up? You can safely ignore this email. Never share this code with anyone.")
        ].join('')
    })
});

exports.welcome = ({ firstName, businessName, trialEndDate }) => ({
    subject: `Welcome to SwordNex Billing, ${firstName || 'there'}!`,
    html: layout({
        preheader: `Your free trial for ${businessName || 'your business'} has started.`,
        heading: `Welcome to SwordNex Billing, ${firstName || 'there'}!`,
        body: [
            p(`Thank you for choosing SwordNex Billing for <b>${esc(businessName || 'your business')}</b>. Your account is ready.`),
            detailsTable([
                ['Plan', 'Free trial', { bold: true }],
                ['Trial ends on', formatDate(trialEndDate), { bold: true }]
            ]),
            button(loginUrl(), 'Go to dashboard'),
            p('<b>Get started in 3 steps</b>', 'margin-bottom:12px'),
            steps([
                ['Set up your company profile', 'Add your logo, address and GSTIN in Settings so they appear on every bill.'],
                ['Add your products', 'Add items one by one or import them from Excel in Inventory.'],
                ['Create your first bill', 'Open POS Billing, add items and finalize. You can print it or share it as a PDF.']
            ]),
            note('You can see the days left in your trial on the dashboard at any time.')
        ].join('')
    })
});

exports.passwordReset = ({ link }) => ({
    subject: 'Reset your SwordNex Billing password',
    html: layout({
        preheader: 'Use this link to choose a new password. It is valid for 30 minutes.',
        heading: 'Reset your password',
        body: [
            p('We received a request to reset the password for your SwordNex Billing account.'),
            button(link, 'Choose a new password'),
            p(`This link is valid for <b>30 minutes</b>. If the button doesn't work, copy this address into your browser:`),
            p(`<a href="${esc(link)}" style="color:${BRAND_DARK};word-break:break-all;font-size:13px">${esc(link)}</a>`),
            note("Didn't request this? You can ignore this email; your password stays the same.")
        ].join('')
    })
});

/** Paid subscription confirmation (the PDF invoice is attached by the caller). */
exports.subscriptionConfirmed = ({ name, plan, amount, startDate, endDate, invoiceNo, test = false }) => ({
    subject: `Subscription confirmed - ${plan} plan${test ? ' (TEST)' : ''}`,
    html: layout({
        preheader: `Your ${plan} plan is active until ${formatDate(endDate)}.`,
        heading: `Your ${plan} plan is active${test ? ' (TEST)' : ''}`,
        body: [
            p(`Hi ${esc(name || 'there')}, thank you for subscribing to SwordNex Billing. Your payment was successful.`),
            detailsTable([
                ['Plan', String(plan).toUpperCase(), { bold: true }],
                ['Amount paid', `₹${Number(amount || 0).toLocaleString('en-IN')}`, { bold: true }],
                ['Start date', formatDate(startDate)],
                ['Valid until', formatDate(endDate)],
                ...(invoiceNo ? [['Invoice no.', invoiceNo]] : [])
            ]),
            button(loginUrl(), 'Open SwordNex Billing'),
            note(test ? 'This is a test email.' : 'Your invoice is attached to this email for your records.')
        ].join('')
    })
});

exports.trialStarted = ({ name, startDate, endDate, trialDays, test = false }) => ({
    subject: `Your ${trialDays}-day free trial has started${test ? ' (TEST)' : ''}`,
    html: layout({
        preheader: `Your free trial runs until ${formatDate(endDate)}.`,
        heading: `Your free trial has started${test ? ' (TEST)' : ''}`,
        body: [
            p(`Hi ${esc(name || 'there')}, you now have full access to SwordNex Billing for ${trialDays} days.`),
            detailsTable([
                ['Plan', `Free trial (${trialDays} days)`, { bold: true }],
                ['Start date', formatDate(startDate)],
                ['Trial ends on', formatDate(endDate), { bold: true }]
            ]),
            button(loginUrl(), 'Go to dashboard'),
            note(test ? 'This is a test email.' : 'Questions? Just reply to this email.')
        ].join('')
    })
});

/** A business asks its customer to pay dues online. */
exports.payLink = ({ business, customerName, amount, url }) => ({
    subject: `Payment request from ${business} - ${amount}`,
    html: layout({
        preheader: `${business} has requested a payment of ${amount}.`,
        heading: 'Payment request',
        onBehalfOf: business,
        body: [
            p(`Hi ${esc(customerName || 'there')},`),
            p(`<b>${esc(business)}</b> has requested a payment of <b>${esc(amount)}</b>.`),
            button(url, `Pay ${amount} securely`),
            note('Payments are processed by Razorpay (UPI, cards, net banking, wallets).')
        ].join('')
    })
});

/** Online dues payment received. audience: 'customer' (payer) or 'owner' (the business). */
exports.paymentReceipt = ({ audience, business, customerName, amount, paymentId, method, remaining }) => {
    const toCustomer = audience === 'customer';
    return {
        subject: toCustomer
            ? `Payment receipt - ${amount} to ${business}`
            : `Payment received from ${customerName || 'customer'} - ${amount}`,
        html: layout({
            preheader: toCustomer ? `Thank you. ${business} received your payment of ${amount}.` : `${customerName || 'A customer'} paid ${amount} online.`,
            heading: toCustomer ? 'Payment received' : 'Online payment received',
            onBehalfOf: toCustomer ? business : undefined,
            body: [
                p(toCustomer
                    ? `Hi ${esc(customerName || 'there')}, thank you. <b>${esc(business)}</b> received your payment.`
                    : `<b>${esc(customerName || 'A customer')}</b> paid online via Razorpay. The dues record has been updated.`),
                detailsTable([
                    ['Amount paid', amount, { bold: true }],
                    ['Payment ID', paymentId || '-'],
                    ['Method', method || 'Online'],
                    ['Remaining balance', remaining, { bold: true }]
                ])
            ].join('')
        })
    };
};

/** Daily summary of low-stock items for store owner. */
exports.lowStockSummary = ({ storeName, ownerName, date, items = [] }) => {
    const rowsHtml = items.map((item) => `
      <tr style="border-bottom:1px solid ${BORDER}">
        <td style="padding:10px 8px;font-size:14px;color:${TEXT};font-weight:600">${esc(item.name)}</td>
        <td style="padding:10px 8px;font-size:14px;color:${MUTED}">${esc(item.category || '-')}</td>
        <td style="padding:10px 8px;font-size:14px;color:#DC2626;font-weight:700;text-align:center">${item.quantity} ${esc(item.unit || '')}</td>
        <td style="padding:10px 8px;font-size:14px;color:${MUTED};text-align:center">${item.minStockThreshold || item.reorderLevel || 5}</td>
      </tr>
    `).join('');

    return {
        subject: `⚠️ Low Stock Summary: ${items.length} item${items.length === 1 ? '' : 's'} need restock - ${storeName}`,
        html: layout({
            preheader: `${items.length} product(s) in ${storeName} have dropped below their minimum stock threshold.`,
            heading: 'Daily Low Stock Alert',
            onBehalfOf: storeName,
            body: [
                p(`Hi ${esc(ownerName || 'Store Owner')},`),
                p(`Here is your daily low-stock inventory report for <b>${esc(storeName)}</b> on <b>${esc(date)}</b>:`),
                `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;border-collapse:collapse;width:100%">
                  <thead>
                    <tr style="background:#F9FAFB;border-bottom:2px solid ${BORDER}">
                      <th align="left" style="padding:10px 8px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase">Product</th>
                      <th align="left" style="padding:10px 8px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase">Category</th>
                      <th align="center" style="padding:10px 8px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase">Current Stock</th>
                      <th align="center" style="padding:10px 8px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase">Min Threshold</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>`,
                p(`We recommend placing purchase orders with your suppliers soon to avoid stockouts.`),
                button(loginUrl(), 'Open Inventory Management')
            ].join('')
        })
    };
};

/** Daily sales summary email for store owner with both rich HTML and complete Plain Text details. */
exports.dailySalesSummary = ({ storeName, ownerName, date, totalSales, totalBills, paymentBreakdown = {}, topProducts = [], duesIncurred = '₹0', lowStockItems = [] }) => {
    const dashboardUrl = siteUrl();

    // Top products HTML table rows
    const topProductsHtml = topProducts.length ? topProducts.map((p, idx) => `
      <tr style="border-bottom:1px solid ${BORDER}">
        <td style="padding:8px;font-size:13px;color:${MUTED};width:30px">#${idx + 1}</td>
        <td style="padding:8px;font-size:14px;color:${TEXT};font-weight:600">${esc(p.name)}</td>
        <td style="padding:8px;font-size:14px;color:${TEXT};text-align:center">${p.qty} sold</td>
        <td style="padding:8px;font-size:14px;color:${BRAND_DARK};font-weight:600;text-align:right">₹${Number(p.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" style="padding:12px;color:${MUTED};text-align:center">No items recorded today</td></tr>`;

    // Low stock HTML table rows
    const lowStockHtml = lowStockItems.length ? lowStockItems.map((p) => {
        const isOut = Number(p.quantity || 0) <= 0;
        return `
          <tr style="border-bottom:1px solid ${BORDER};background:${isOut ? '#FEF2F2' : '#FFFFFF'}">
            <td style="padding:8px;font-size:14px;color:${TEXT};font-weight:600">${esc(p.name)}</td>
            <td style="padding:8px;font-size:13px;color:${isOut ? '#DC2626' : '#D97706'};font-weight:700;text-align:center">${p.quantity} ${esc(p.unit || '')}</td>
            <td style="padding:8px;font-size:13px;color:${MUTED};text-align:center">${p.minStockThreshold}</td>
            <td style="padding:8px;font-size:12px;color:${isOut ? '#DC2626' : '#D97706'};font-weight:700;text-align:center">${isOut ? '🔴 OUT OF STOCK' : '⚠️ LOW STOCK'}</td>
          </tr>
        `;
    }).join('') : `<tr><td colspan="4" style="padding:12px;color:#16A34A;text-align:center;font-weight:600">✓ All products healthy. No low-stock items.</td></tr>`;

    // Complete plain text version for email clients
    const topProductsText = topProducts.length
        ? topProducts.map((p, idx) => `  ${idx + 1}. ${p.name} — ${p.qty} sold (₹${Number(p.revenue || 0).toFixed(2)})`).join('\n')
        : '  • No items recorded today';

    const lowStockText = lowStockItems.length
        ? lowStockItems.map((p) => `  • ${p.name}: ${p.quantity} ${p.unit || ''} remaining (Threshold: ${p.minStockThreshold}) [${Number(p.quantity) <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}]`).join('\n')
        : '  • All products healthy. No low-stock warnings.';

    const plainText = [
        `===================================================`,
        `DAILY STORE PERFORMANCE & CLOSING REPORT`,
        `===================================================`,
        `Store: ${storeName}`,
        `Owner: ${ownerName || 'Store Owner'}`,
        `Date: ${date}`,
        `Website Dashboard: ${dashboardUrl}`,
        `---------------------------------------------------`,
        `FINANCIAL OVERVIEW:`,
        `• Total Revenue: ${totalSales}`,
        `• Total Invoices Generated: ${totalBills}`,
        `• Cash Collected: ${paymentBreakdown.cash || '₹0'}`,
        `• UPI / Digital Payments: ${paymentBreakdown.upi || paymentBreakdown.digital || '₹0'}`,
        `• Card Payments: ${paymentBreakdown.card || '₹0'}`,
        `• Customer Dues Incurred: ${duesIncurred}`,
        `---------------------------------------------------`,
        `TOP SELLING PRODUCTS TODAY:`,
        topProductsText,
        `---------------------------------------------------`,
        `INVENTORY HEALTH & RESTOCK WARNINGS:`,
        lowStockText,
        `---------------------------------------------------`,
        `ACCESS DETAILED REPORTS ONLINE:`,
        `Visit: ${dashboardUrl}`,
        `---------------------------------------------------`,
        `📎 NOTE: A complete, branded PDF copy of this daily report is attached to this email.`,
        `===================================================`
    ].join('\n');

    return {
        subject: `📊 Daily Business Summary: ${totalSales} (${totalBills} bills) - ${storeName}`,
        text: plainText,
        html: layout({
            preheader: `Daily sales report for ${storeName} on ${date}. Total Sales: ${totalSales}.`,
            heading: 'Daily Sales & Closing Report',
            onBehalfOf: storeName,
            body: [
                p(`Hi ${esc(ownerName || 'Store Owner')},`),
                p(`Here is the business performance summary for <b>${esc(storeName)}</b> on <b>${esc(date)}</b>:`),
                detailsTable([
                    ['Total Revenue', totalSales, { bold: true }],
                    ['Total Bills Generated', String(totalBills)],
                    ['Cash Collected', paymentBreakdown.cash || '₹0'],
                    ['UPI / Digital Payments', paymentBreakdown.upi || paymentBreakdown.digital || '₹0'],
                    ['Cards', paymentBreakdown.card || '₹0'],
                    ['Credit / Dues Created', duesIncurred, { bold: true }]
                ]),
                `<h3 style="margin:24px 0 12px;font-size:16px;color:${TEXT};border-bottom:2px solid ${BRAND};padding-bottom:6px">Top Selling Products Today</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:collapse;width:100%">
                  <thead>
                    <tr style="background:#F9FAFB;border-bottom:1px solid ${BORDER}">
                      <th align="left" style="padding:8px;font-size:12px;color:${MUTED}">Rank</th>
                      <th align="left" style="padding:8px;font-size:12px;color:${MUTED}">Product</th>
                      <th align="center" style="padding:8px;font-size:12px;color:${MUTED}">Quantity</th>
                      <th align="right" style="padding:8px;font-size:12px;color:${MUTED}">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>${topProductsHtml}</tbody>
                </table>`,
                `<h3 style="margin:24px 0 12px;font-size:16px;color:${TEXT};border-bottom:2px solid #DC2626;padding-bottom:6px">Inventory Health & Low Stock Alerts</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:collapse;width:100%">
                  <thead>
                    <tr style="background:#FEF2F2;border-bottom:1px solid ${BORDER}">
                      <th align="left" style="padding:8px;font-size:12px;color:#991B1B">Product</th>
                      <th align="center" style="padding:8px;font-size:12px;color:#991B1B">Stock Left</th>
                      <th align="center" style="padding:8px;font-size:12px;color:#991B1B">Min Level</th>
                      <th align="center" style="padding:8px;font-size:12px;color:#991B1B">Status</th>
                    </tr>
                  </thead>
                  <tbody>${lowStockHtml}</tbody>
                </table>`,
                button(loginUrl(), 'View Detailed Reports & Analytics'),
                note('📎 A comprehensive PDF copy of today\'s closing report is attached to this email for your records.')
            ].join('')
        })
    };
};

exports.esc = esc;
