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
    describe: (limit) => (limit == null ? "Unlimited products" : `Up to ${limit.toLocaleString("en-IN")} products`),
  },
  {
    key: "bills",
    label: "Bills & invoices limit",
    type: "limit",
    unit: "bills",
    describe: (limit) => (limit == null ? "Unlimited bills & invoices" : `Up to ${limit.toLocaleString("en-IN")} bills & invoices`),
  },
  {
    key: "staffLogins",
    label: "Staff logins",
    type: "limit",
    unit: "logins",
    describe: (limit) => (limit == null ? "Unlimited staff logins" : `${limit} staff login${limit === 1 ? "" : "s"}`),
  },
  {
    key: "barcodes",
    label: "Barcode generation",
    type: "toggle",
    describe: () => "Barcode generation",
  },
  {
    key: "reports",
    label: "Reports & analytics module",
    type: "toggle",
    describe: () => "Reports & analytics module",
  },
  {
    key: "payLinks",
    label: "Online payment links for dues (Cashfree)",
    type: "toggle",
    describe: () => "Online payment links (Cashfree) for dues",
  },
  {
    key: "whatsappInvoices",
    label: "Send bills on WhatsApp",
    type: "toggle",
    describe: () => "Send bills to customers on WhatsApp",
  },
  {
    key: "dataExport",
    label: "Data export (Excel / PDF)",
    type: "toggle",
    describe: () => "Data export (Excel / PDF)",
  },
  {
    key: "prioritySupport",
    label: "Priority support",
    type: "toggle",
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
