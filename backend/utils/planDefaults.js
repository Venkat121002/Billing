// Seed content for the three plan rows, used to create them the first time
// /billing/plans (or /superadmin/plans) is read and the collection is empty.
// Paid plans start unpriced (0): checkout refuses them ("not available for
// purchase yet") until the super admin sets real prices on the Plans screen.
// Nothing else here is a business decision except the capability values, which were:
//
//   - Products: Trial 500, Standard 1,000, Premium unlimited.
//   - Bills & invoices: Trial 300, Standard/Premium unlimited (billing itself
//     is never blocked once someone pays).
//   - Staff logins: Trial 1, Standard 3, Premium 6 (unchanged from before).
//   - The Free trial matches Premium on every on/off feature (Barcodes,
//     Reports, Online pay links, Data export, Priority support) — only the
//     numeric usage limits are its own, since it's a time/usage-limited trial,
//     not a cut-down feature set.
//   - Exception: WhatsApp bills (paid per message by SwordNex) are paid plans only.
const cap = (key, value) => (typeof value === 'boolean' ? { key, enabled: value } : { key, limit: value });

module.exports = {
    trial: {
        key: 'trial',
        order: 0,
        name: 'Free',
        tagline: '14 days, starts automatically at signup',
        badge: '',
        monthly: 0,
        yearly: 0,
        capabilities: [
            cap('products', 500),
            cap('bills', 300),
            cap('staffLogins', 1),
            cap('barcodes', true),
            cap('reports', true),
            cap('payLinks', true),
            cap('whatsappInvoices', true),
            cap('aiAssistant', true),
            cap('dataExport', true),
            cap('prioritySupport', true),
        ],
    },
    standard: {
        key: 'standard',
        order: 1,
        name: 'Standard',
        tagline: 'Run the daily business',
        badge: '',
        monthly: 0,
        yearly: 0,
        capabilities: [
            cap('products', 1000),
            cap('bills', null),
            cap('staffLogins', 3),
            cap('barcodes', false),
            cap('reports', false),
            cap('payLinks', false),
            cap('whatsappInvoices', true),
            cap('aiAssistant', false),
            cap('dataExport', true),
            cap('prioritySupport', false),
        ],
    },
    premium: {
        key: 'premium',
        order: 2,
        name: 'Premium',
        tagline: 'Grow and automate',
        badge: 'Best Value',
        monthly: 0,
        yearly: 0,
        capabilities: [
            cap('products', null),
            cap('bills', null),
            cap('staffLogins', 6),
            cap('barcodes', true),
            cap('reports', true),
            cap('payLinks', true),
            cap('whatsappInvoices', true),
            cap('aiAssistant', true),
            cap('dataExport', true),
            cap('prioritySupport', true),
        ],
    },
};
