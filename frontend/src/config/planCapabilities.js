// Mirrors backend/utils/planCapabilities.js — the fixed catalog of plan
// capabilities. Kept as a small manual copy rather than an API round-trip
// since it's static app code (only a developer adds a new entry here, which
// is what keeps every capability guaranteed to correspond to something real).
export const CAPABILITIES = [
  {
    key: "products",
    label: "Products limit",
    type: "limit",
    unit: "products",
    help: "Blank = unlimited. Counts products created by the owner and all their staff together.",
    describe: (limit) => (limit == null ? "Unlimited products" : `Up to ${limit.toLocaleString("en-IN")} products`),
  },
  {
    key: "bills",
    label: "Bills & invoices limit",
    type: "limit",
    unit: "bills",
    help: "Blank = unlimited. Counts POS bills + GST bills together, owner and staff combined.",
    describe: (limit) => (limit == null ? "Unlimited bills & invoices" : `Up to ${limit.toLocaleString("en-IN")} bills & invoices`),
  },
  {
    key: "staffLogins",
    label: "Staff logins",
    type: "limit",
    unit: "logins",
    help: "Blank = unlimited. Extra logins can still be bought as an add-on on top of this.",
    describe: (limit) => (limit == null ? "Unlimited staff logins" : `${limit} staff login${limit === 1 ? "" : "s"}`),
  },
  {
    key: "barcodes",
    label: "Barcode generation",
    type: "toggle",
    help: "Turns the Barcodes screen on or off for this plan.",
    describe: () => "Barcode generation",
  },
  {
    key: "reports",
    label: "Reports & analytics module",
    type: "toggle",
    help: "Turns the dedicated Reports screen on or off (the Dashboard itself stays available either way).",
    describe: () => "Reports & analytics module",
  },
  {
    key: "payLinks",
    label: "Online payment links for dues (Cashfree)",
    type: "toggle",
    help: "Turns the pay-link / email-link buttons on the Credit screen on or off.",
    describe: () => "Online payment links (Cashfree) for dues",
  },
  {
    key: "whatsappInvoices",
    label: "Send bills on WhatsApp",
    type: "toggle",
    help: 'Shows the "Send bill on WhatsApp" option at POS checkout. Each message is billed to Meta.',
    describe: () => "Send bills to customers on WhatsApp",
  },
  {
    key: "aiAssistant",
    label: "AI Assistant / Chatbot (SwordNexi)",
    type: "toggle",
    help: "Turns the intelligent AI Assistant / Chatbot on or off for stores on this plan.",
    describe: () => "AI Assistant & Chatbot (SwordNexi)",
  },
  {
    key: "dataExport",
    label: "Data export (Excel / PDF)",
    type: "toggle",
    help: "Shown on the pricing card only — nothing in the app blocks export yet.",
    describe: () => "Data export (Excel / PDF)",
  },
  {
    key: "prioritySupport",
    label: "Priority support",
    type: "toggle",
    help: "Shown on the pricing card only — support priority is a human process, not code.",
    describe: () => "Priority support",
  },
];

export const CAPABILITY_MAP = Object.fromEntries(CAPABILITIES.map((c) => [c.key, c]));

/** capabilities: the array a Plan doc carries -> {key: {limit?, enabled?}} */
export const capabilitiesToMap = (capabilities) => {
  const map = {};
  for (const c of capabilities || []) map[c.key] = c;
  return map;
};

/** Display rows for the pricing page, in catalog order. Limits always show
 * (they always have a meaningful value, even "Unlimited"). A disabled toggle
 * capability is left out entirely, rather than shown crossed out — a plan's
 * card only lists what that plan actually includes. */
export const capabilitiesToDisplayList = (capabilities) => {
  const map = capabilitiesToMap(capabilities);
  return CAPABILITIES.filter((def) => def.type === "limit" || map[def.key]?.enabled).map((def) => ({
    text: def.type === "limit" ? def.describe(map[def.key]?.limit ?? null) : def.describe(),
  }));
};
