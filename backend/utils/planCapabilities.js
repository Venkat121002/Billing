// The fixed catalog of plan capabilities. This list is code, not data —
// superadmin can only set a VALUE for one of these keys (a number for a
// 'limit' capability, on/off for a 'toggle' one) from the Plans page. That's
// what keeps "add a capability" always mapping to something the app actually
// enforces or displays: a new capability only exists once a developer adds
// it here (and wires up enforcement for it), never by someone typing free text.
//
// `enforced: true` means real code checks this (blocks a create, or blocks a
// screen). `enforced: false` means it's shown on the pricing card only —
// there's nowhere in the app that could meaningfully block it yet.
const CAPABILITIES = [
    {
        key: 'products',
        label: 'Products limit',
        type: 'limit',
        unit: 'products',
        enforced: true,
        help: 'Blank = unlimited. Counts products created by the owner and all their staff together.',
    },
    {
        key: 'bills',
        label: 'Bills & invoices limit',
        type: 'limit',
        unit: 'bills',
        enforced: true,
        help: 'Blank = unlimited. Counts POS bills + GST bills together, owner and staff combined.',
    },
    {
        key: 'staffLogins',
        label: 'Staff logins',
        type: 'limit',
        unit: 'logins',
        enforced: true,
        help: 'Blank = unlimited. Extra logins can still be bought as an add-on on top of this.',
    },
    {
        key: 'barcodes',
        label: 'Barcode generation',
        type: 'toggle',
        enforced: true,
        help: 'Turns the Barcodes screen on or off for this plan.',
    },
    {
        key: 'reports',
        label: 'Reports & analytics module',
        type: 'toggle',
        enforced: true,
        help: 'Turns the dedicated Reports screen on or off (the Dashboard itself stays available either way).',
    },
    {
        key: 'payLinks',
        label: 'Online payment links for dues (Cashfree)',
        type: 'toggle',
        enforced: true,
        help: 'Turns the pay-link / email-link buttons on the Credit screen on or off.',
    },
    {
        key: 'whatsappInvoices',
        label: 'Send bills on WhatsApp',
        type: 'toggle',
        enforced: true,
        help: 'Shows the "Send bill on WhatsApp" option at POS checkout. Each message is billed to SwordNex by Meta.',
    },
    {
        key: 'aiAssistant',
        label: 'AI Assistant / Chatbot (SwordNexi)',
        type: 'toggle',
        enforced: true,
        help: 'Turns the intelligent AI Assistant / Chatbot on or off for stores on this plan.',
    },
    {
        key: 'dataExport',
        label: 'Data export (Excel / PDF)',
        type: 'toggle',
        enforced: false,
        help: "Shown on the pricing card only — nothing in the app blocks export yet.",
    },
    {
        key: 'prioritySupport',
        label: 'Priority support',
        type: 'toggle',
        enforced: false,
        help: 'Shown on the pricing card only — support priority is a human process, not code.',
    },
];

const CAPABILITY_MAP = Object.fromEntries(CAPABILITIES.map((c) => [c.key, c]));
const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key);

module.exports = { CAPABILITIES, CAPABILITY_MAP, CAPABILITY_KEYS };
