// Single source of truth for "what does this tenant's industry mean" across
// the UI: canonical key + aliases, display label, theme colour, billing
// model, role-label overrides (Customer/Student/Client, Product/Course/
// Service), Item Master field-group defaults, feature flags, payment
// methods, and receipt template.
//
// Replaces the 5-way `currentUser.industry || ... || "grocery"` fallback
// that used to be copy-pasted into every Industry*Router component,
// ModuleRoute, and AdminLayout.
//
// Sidebar module visibility is still owned by config/industryModules.js
// (INDUSTRY_MODULES) for now — this file resolves *which* industry key to
// look up there; a later phase can fold that list in here too. See
// UNIFICATION_PLAN.md.

const RETAIL_DEFAULTS = {
  billingModel: "pos",
  theme: "green",
  roleLabels: { customer: "Customer", item: "Product", inventory: "Inventory" },
  itemFieldGroups: { batchExpiry: false, variants: false, itemType: false, serial: false },
  featureFlags: { barcode: true, loyalty: true, wallet: true, unitStock: true, gst: true, credit: false, trainers: false },
  paymentMethods: ["cash", "upi", "card", "wallet"],
  receipt: "retail-a4",
};

export const PROFILES = {
  grocery: {
    ...RETAIL_DEFAULTS,
    key: "grocery",
    aliases: ["grocery_store", "supermarket"],
    label: "Grocery Store",
  },
  pharmacy: {
    ...RETAIL_DEFAULTS,
    key: "pharmacy",
    aliases: [],
    label: "Pharmacy",
    // Regulatory fields (drug schedule, prescription requirement, licence-on-
    // invoice) are a real vertical feature, not config — see
    // UNIFICATION_PLAN.md §6. For now pharmacy is generic + batch/expiry.
    itemFieldGroups: { ...RETAIL_DEFAULTS.itemFieldGroups, batchExpiry: true },
    featureFlags: { ...RETAIL_DEFAULTS.featureFlags, credit: true },
  },
  mobile_shop: {
    ...RETAIL_DEFAULTS,
    key: "mobile_shop",
    aliases: ["mobile"],
    label: "Mobile Shop",
    itemFieldGroups: { ...RETAIL_DEFAULTS.itemFieldGroups, serial: true },
    featureFlags: { ...RETAIL_DEFAULTS.featureFlags, credit: true },
  },
  clothing: {
    ...RETAIL_DEFAULTS,
    key: "clothing",
    aliases: ["textile", "apparel", "garment", "garments", "fashion", "boutique"],
    label: "Clothing",
    theme: "green",
    itemFieldGroups: { ...RETAIL_DEFAULTS.itemFieldGroups, variants: true },
  },

  petshop: {
    ...RETAIL_DEFAULTS,
    key: "petshop",
    aliases: ["pet_shop"],
    label: "Pet Shop",
    // e.g. pet food/medicine batches, and item type product ("food") vs
    // service ("grooming").
    itemFieldGroups: { ...RETAIL_DEFAULTS.itemFieldGroups, batchExpiry: true, itemType: true },
  },
  academy: {
    key: "academy",
    aliases: ["acadamy", "education"], // "acadamy" = the historical SignUp typo
    label: "Academy",
    theme: "green",
    billingModel: "instalment",
    roleLabels: { customer: "Student", item: "Course", inventory: "Courses" },
    itemFieldGroups: { batchExpiry: false, variants: false, itemType: true, serial: false },
    featureFlags: { barcode: false, loyalty: false, wallet: false, unitStock: false, gst: true, credit: true, trainers: true },
    paymentMethods: ["cash", "upi", "card", "term"],
    receipt: "instalment-a4",
  },
  software_development: {
    key: "software_development",
    aliases: ["software"],
    label: "Software Development",
    theme: "green",
    billingModel: "milestone",
    roleLabels: { customer: "Client", item: "Service", inventory: "Services" },
    itemFieldGroups: { batchExpiry: false, variants: false, itemType: true, serial: false },
    featureFlags: { barcode: false, loyalty: false, wallet: false, unitStock: false, gst: true, credit: false, trainers: false },
    paymentMethods: ["cash", "upi", "card"],
    receipt: "milestone-a4",
  },
  restaurant: {
    ...RETAIL_DEFAULTS,
    key: "restaurant",
    aliases: [],
    label: "Restaurant",
    // No dedicated table/KOT module yet — real workflow difference, not a
    // config flag. Hidden from the industry picker (Phase 1) until it has one.
    hidden: true,
  },
  others: {
    ...RETAIL_DEFAULTS,
    key: "others",
    aliases: [],
    label: "Other",
  },
};

const ALIAS_TO_KEY = Object.values(PROFILES).reduce((map, profile) => {
  map[profile.key] = profile.key;
  for (const alias of profile.aliases || []) map[alias] = profile.key;
  return map;
}, {});

/** Normalize any raw industry string (any case/spacing) to a canonical profile key, or null. */
export function normalizeIndustryKey(raw) {
  const cleaned = String(raw || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!cleaned) return null;
  return ALIAS_TO_KEY[cleaned] || null;
}

/**
 * Resolve the effective industry profile for a user, using the same
 * multi-source fallback every screen used to duplicate. Never returns null —
 * falls back to the generic "others" profile when nothing is set/recognized,
 * so callers never need a null check.
 */
export function resolveIndustryProfile(currentUser) {
  const raw =
    currentUser?.industry ||
    currentUser?.companyDetails?.industry ||
    currentUser?.Tenant?.industry ||
    localStorage.getItem("selectedIndustry") ||
    "";
  const key = normalizeIndustryKey(raw);
  return PROFILES[key] || PROFILES.others;
}

/** True once a tenant has picked a real industry (not just the generic default). */
export function hasChosenIndustry(currentUser) {
  const raw =
    currentUser?.industry ||
    currentUser?.companyDetails?.industry ||
    currentUser?.Tenant?.industry ||
    "";
  return normalizeIndustryKey(raw) !== null;
}

/** Industries selectable in the Company Profile picker (Phase 1). */
export function getSelectableProfiles() {
  return Object.values(PROFILES).filter((p) => !p.hidden && p.key !== "others");
}
