// Security and Isolation Guards for SwordNexi Chatbot.
// Ensures strict industry isolation, department boundaries, zero cross-tenant leakage,
// and enforces that SwordNexi remains strictly a read-only informational guide.

export const INDUSTRY_EXCLUSIVE_TERMS = {
  pharmacy: {
    label: "Pharmacy",
    emoji: "💊",
    terms: [
      "medicine", "medicines", "drug", "drugs", "prescription", "prescriptions",
      "expiry alert", "expiry alerts", "expired stock", "schedule h", "schedule x",
      "chemist", "salt composition", "syrup", "capsule", "tablet", "tablets",
      "pharmacist", "fefo", "pharma"
    ],
  },
  mobile_shop: {
    label: "Mobile Shop",
    emoji: "📱",
    terms: [
      "imei", "imeis", "imei lookup", "repair ticket", "repair tickets", "repair job",
      "mobile repair", "phone repair", "screen replacement", "display repair",
      "sim lock", "dual sim", "handset", "smartphone", "smartphones", "tempered glass"
    ],
  },
  clothing: {
    label: "Clothing & Apparel",
    emoji: "👗",
    terms: [
      "cloth", "cloth shop", "clothing", "clothing shop", "clothes", "apparel", "garment", "garments",
      "alteration", "alterations", "tailoring", "tailor", "stitching", "fitting",
      "hangtag", "clothing hub", "fabric", "boutique", "textile", "size matrix",
      "pant", "pants", "shirt", "shirts", "saree", "sarees", "dress", "dresses", "pant length", "waist fitting"
    ],
  },
  petshop: {
    label: "Pet Shop",
    emoji: "🐾",
    terms: [
      "pet", "pets", "pet shop", "pet passport", "pet pass", "pet grooming", "grooming spa", "pet spa",
      "grooming", "vaccination", "puppy", "kitten", "dog", "dogs", "cat", "cats", "pet breed", "microchip",
      "flea treatment", "nail trim for pet", "pet bath", "deworming"
    ],
  },
  academy: {
    label: "Academy & Coaching",
    emoji: "🎓",
    terms: [
      "student", "students", "roll number", "trainer", "trainers", "faculty",
      "course fee", "tuition fee", "instalment fee", "term fee", "batch timing",
      "coaching", "syllabus", "student attendance", "admission"
    ],
  },
  software_development: {
    label: "Software Development",
    emoji: "💻",
    terms: [
      "milestone", "milestones", "milestone invoice", "software client",
      "sprint", "uat", "wireframe", "cloud maintenance", "deliverable",
      "it service", "tech retainer", "software development"
    ],
  },
  restaurant: {
    label: "Restaurant",
    emoji: "🍽️",
    terms: [
      "kot", "kitchen order", "dine in", "takeaway", "table booking",
      "menu item", "chef", "food order"
    ],
  },
};

// Injection and unauthorized execution patterns
const JAILBREAK_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /bypass (all )?restrictions/i,
  /act as (an? )?(admin|superadmin|system|developer|unrestricted)/i,
  /pretend you are/i,
  /switch (to |my )?industry/i,
  /change (my )?industry/i,
  /show me other (tenant|industry|store|company) data/i,
  /execute (code|sql|query|command|script)/i,
  /drop table/i,
  /eval\(/i,
  /<script>/i,
];

// Mutation attempt detection
const MUTATION_ATTEMPT_PATTERNS = [
  /delete (this|the|my|all) (product|products|item|items|customer|customers|bill|bills|invoice|invoices|user|users|file|files|database|data|record|records)/i,
  /delete.*from.*(database|system|db|table)/i,
  /delete\s+(everything|all)/i,
  /modify (the|my|this) (code|database|file|setting|config|price|prices|data)/i,
  /upload (a|the|this|my) (file|files|document|documents|image|images|code|script)/i,
  /change (the|my|this) (price|prices|quantity|stock|password|email|phone) for/i,
  /automatically (update|delete|create|change|add|insert)/i,
  /(alter|drop|truncate|remove) (table|collection|database|data)/i,
];

/**
 * Validates a user query against security constraints:
 * 1. Checks for injection/jailbreak attempts.
 * 2. Checks for mutation requests (SwordNexi is strictly informational).
 * 3. Checks for cross-industry inquiries (rejects querying details of another industry).
 *
 * @param {string} query User query
 * @param {string} currentIndustryKey Canonical industry key of the user (e.g. "pharmacy")
 * @param {object} currentIndustryProfile Full industry profile
 * @returns {object} { isBlocked: boolean, reason: string | null, safeResponse: string | null }
 */
export function validateSecurityAndIsolation(query, currentIndustryKey, currentIndustryProfile) {
  if (!query || typeof query !== "string") {
    return { isBlocked: true, reason: "empty_query", safeResponse: "Please enter a valid question." };
  }

  const cleanQuery = query.trim().toLowerCase();

  // 1. Jailbreak & Prompt Injection Check
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        isBlocked: true,
        reason: "jailbreak_attempt",
        safeResponse: `Security Notice 🛡️: SwordNexi is an isolated assistant dedicated exclusively to your ${currentIndustryProfile?.label || "current"} workspace. System instructions, data boundaries, and industry safeguards cannot be bypassed or modified.`,
      };
    }
  }

  // 2. Direct Mutation Attempt Check (Enforce strictly read-only informational behavior)
  for (const pattern of MUTATION_ATTEMPT_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        isBlocked: true,
        reason: "mutation_attempt",
        safeResponse: `Important Note 🔒: SwordNexi works strictly as an informational assistant. I cannot directly alter, upload, delete, or modify your files, data, or system settings. However, you can make these changes yourself directly through the UI. Let me know what you would like to accomplish, and I will gladly provide the step-by-step guidance! 😊`,
      };
    }
  }

  // 3. Cross-Industry Leakage Check
  // Check if query contains strong exclusive terms belonging to other industries
  const currentKey = currentIndustryKey ? currentIndustryKey.toLowerCase() : "others";

  for (const [otherKey, industryData] of Object.entries(INDUSTRY_EXCLUSIVE_TERMS)) {
    if (otherKey === currentKey) continue;

    // Check if the query mentions multiple exclusive terms or strong phrases from another industry
    for (const term of industryData.terms) {
      // Use word boundary to avoid false substring matches
      const wordRegex = new RegExp(`\\b${term}\\b`, "i");
      if (wordRegex.test(cleanQuery)) {
        // Detected attempt to inquire about a foreign industry
        return {
          isBlocked: true,
          reason: "cross_industry_leakage_prevented",
          safeResponse: `Privacy & Security Notice 🛡️: You are currently working in ${currentIndustryProfile?.label || "your dedicated industry"}. To ensure strict data privacy and prevent cross-industry confusion, I can only provide guidance for ${currentIndustryProfile?.label || "your current industry"} operations. I cannot discuss or disclose workflows from the ${industryData.label} module. Let me know how I can assist with your ${currentIndustryProfile?.label || "current"} workspace! ${currentIndustryProfile?.emoji || "✨"}`,
        };
      }
    }
  }

  return { isBlocked: false, reason: null, safeResponse: null };
}

/**
 * Strips out unnecessary bold markdown formatting (e.g. **text**)
 * to satisfy the requirement: "Do not use unnecessary ** markdown formatting in the generated chatbot text."
 *
 * @param {string} text
 * @returns {string} Clean text without **
 */
export function cleanUnnecessaryMarkdown(text) {
  if (!text) return "";
  // Remove ** formatting
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, "$1");
  // Also clean extra stray double asterisks
  cleaned = cleaned.replace(/\*\*/g, "");
  return cleaned;
}
