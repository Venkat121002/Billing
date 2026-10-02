/**
 * Expense Categorization Engine (AI + Heuristic)
 * Feature 9 of Phase 2 Automation.
 *
 * Automatically infers the business expense category from natural descriptions
 * typed into Cashbook or Transaction entry.
 */
const { getGeminiModel, isGeminiConfigured } = require('../config/gemini');

// Standardized business expense categories
const STANDARD_CATEGORIES = [
    'Utilities',
    'Rent & Lease',
    'Salaries & Wages',
    'Packaging & Delivery',
    'Inventory & Supplies',
    'Repairs & Maintenance',
    'Food & Refreshments',
    'Marketing & Advertising',
    'Taxes & Compliance',
    'Office & Stationery',
    'Travel & Logistics',
    'Miscellaneous'
];

// Comprehensive keyword dictionary for fast, offline classification
const KEYWORD_RULES = [
    {
        category: 'Utilities',
        keywords: [/\belectricity\b/i, /\beb\s*bill\b/i, /\bpower\b/i, /\bcurrent\s*bill\b/i, /\bwater\b/i, /\binternet\b/i, /\bwifi\b/i, /\bbroadband\b/i, /\bphone\b/i, /\bmobile\s*recharge\b/i, /\bgas\s*cylinder\b/i]
    },
    {
        category: 'Rent & Lease',
        keywords: [/\bshop\s*rent\b/i, /\bstore\s*rent\b/i, /\brent\b/i, /\bgodown\s*rent\b/i, /\bwarehouse\s*rent\b/i, /\blease\b/i, /\badvance\s*rent\b/i]
    },
    {
        category: 'Salaries & Wages',
        keywords: [/\bsalary\b/i, /\bsalaries\b/i, /\bwages\b/i, /\bworker\b/i, /\bstaff\b/i, /\bhelper\b/i, /\bboy\b/i, /\bcleaning\s*lady\b/i, /\bbonus\b/i, /\badvance\s*salary\b/i, /\bot\b/i, /\bovertime\b/i]
    },
    {
        category: 'Packaging & Delivery',
        keywords: [/\bpacking\b/i, /\bpackaging\b/i, /\bcardboard\b/i, /\bbox\b/i, /\btape\b/i, /\bbags?\b/i, /\bcovers?\b/i, /\bbubble\s*wrap\b/i, /\bcourier\b/i, /\bparcel\b/i, /\bdelivery\s*charges?\b/i, /\bfreight\b/i]
    },
    {
        category: 'Inventory & Supplies',
        keywords: [/\bpurchase\b/i, /\brestock\b/i, /\bstock\b/i, /\bwholesale\b/i, /\bgoods\b/i, /\bvendor\s*payment\b/i, /\bsupplier\b/i, /\braw\s*material\b/i]
    },
    {
        category: 'Repairs & Maintenance',
        keywords: [/\brepair\b/i, /\bfixing\b/i, /\bservicing\b/i, /\bac\s*service\b/i, /\bplumb/i, /\bpainting\b/i, /\bcarpenter\b/i, /\belectrical\s*work\b/i, /\bmechanic\b/i, /\bwelding\b/i, /\bmaintenance\b/i]
    },
    {
        category: 'Food & Refreshments',
        keywords: [/\btea\b/i, /\bcoffee\b/i, /\bsnacks?\b/i, /\blunch\b/i, /\btiffin\b/i, /\bwater\s*can\b/i, /\bbiscuits?\b/i, /\brefreshment\b/i, /\bstaff\s*food\b/i]
    },
    {
        category: 'Marketing & Advertising',
        keywords: [/\bad\b/i, /\bads\b/i, /\badvertis/i, /\bpamphlet/i, /\bflex\b/i, /\bbanner\b/i, /\bfacebook\s*ad\b/i, /\bgoogle\s*ad\b/i, /\binstagram\b/i, /\bpromo/i, /\bboard\s*making\b/i]
    },
    {
        category: 'Taxes & Compliance',
        keywords: [/\bgst\s*pay/i, /\bgst\s*challan/i, /\btax\b/i, /\baudit/i, /\bca\s*fee/i, /\baccountant\s*fee/i, /\blicense\b/i, /\btrade\s*license\b/i, /\bprofessional\s*tax\b/i]
    },
    {
        category: 'Office & Stationery',
        keywords: [/\bprint/i, /\bpaper\b/i, /\ba4\s*sheets?\b/i, /\bbill\s*book\b/i, /\bpen\b/i, /\bregister\b/i, /\bstapler\b/i, /\bink\b/i, /\btoner\b/i, /\bstationery\b/i]
    },
    {
        category: 'Travel & Logistics',
        keywords: [/\bpetrol\b/i, /\bdiesel\b/i, /\bfuel\b/i, /\bauto\s*fare\b/i, /\bbus\s*fare\b/i, /\bcab\b/i, /\btaxi\b/i, /\btravel\b/i, /\btoll\b/i]
    }
];

/**
 * Keyword-based heuristic classifier
 */
function classifyHeuristic(description = '') {
    const text = String(description).trim();
    if (!text) {
        return { category: 'Miscellaneous', confidence: 0.1, reason: 'Empty description' };
    }

    for (const rule of KEYWORD_RULES) {
        for (const pattern of rule.keywords) {
            if (pattern.test(text)) {
                return {
                    category: rule.category,
                    confidence: 0.88,
                    reason: `Matched keyword pattern: ${pattern.source}`,
                    method: 'heuristic'
                };
            }
        }
    }

    return {
        category: 'Miscellaneous',
        confidence: 0.35,
        reason: 'No standard expense pattern matched',
        method: 'heuristic'
    };
}

/**
 * AI-based classifier using Google Gemini
 */
async function classifyWithGemini(description, amount, businessType = 'Retail/General') {
    const model = getGeminiModel('gemini-1.5-flash');
    if (!model) return classifyHeuristic(description);

    const prompt = `You are an AI financial accountant for Indian small businesses (${businessType}).
Given this expense entry:
Description: "${description}"
Amount: Rs. ${amount || 0}

Classify it into EXACTLY ONE of the following standard categories:
${STANDARD_CATEGORIES.join(', ')}

Output STRICT JSON only with NO markdown or explanation:
{
  "category": "one of the standard categories above",
  "confidence": 0.95,
  "reason": "short explanation in 8 words or less"
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonText = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonText);

        const matchedCategory = STANDARD_CATEGORIES.find(
            c => c.toLowerCase() === (parsed.category || '').toLowerCase()
        ) || parsed.category || 'Miscellaneous';

        return {
            category: matchedCategory,
            confidence: parsed.confidence || 0.9,
            reason: parsed.reason || 'Classified by Gemini AI',
            method: 'gemini'
        };
    } catch (err) {
        console.warn('⚠️ [ExpenseCategorization] Gemini failed, falling back to heuristic:', err.message);
        return classifyHeuristic(description);
    }
}

/**
 * Main categorizeExpense entry point
 */
async function categorizeExpense({ description, amount, businessType }) {
    if (!description || !description.trim()) {
        return {
            category: 'Miscellaneous',
            confidence: 0,
            reason: 'Please enter a description',
            standardCategories: STANDARD_CATEGORIES
        };
    }

    let result;
    if (isGeminiConfigured()) {
        result = await classifyWithGemini(description, amount, businessType);
    } else {
        result = classifyHeuristic(description);
    }

    return {
        ...result,
        standardCategories: STANDARD_CATEGORIES
    };
}

module.exports = {
    categorizeExpense,
    STANDARD_CATEGORIES
};
