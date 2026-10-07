// SwordNexi Intelligent Conversational Engine
// Features:
// 1. Strict industry & department sandboxing (zero leakage guarantee).
// 2. Natural, human-like conversational voice.
// 3. Complete absence of unnecessary ** markdown formatting.
// 4. Contextual emojis selected according to the text content.
// 5. Strictly informational - cannot trigger mutations, code changes, or data edits.

import axios from "axios";
import API_URL from "../../../config/api.js";
import { resolveIndustryProfile } from "../../../config/industryProfiles.js";
import { INDUSTRY_KNOWLEDGE } from "../knowledge/industryKnowledge.js";
import { resolveDepartment } from "../knowledge/departmentKnowledge.js";
import {
  validateSecurityAndIsolation,
  cleanUnnecessaryMarkdown,
} from "../knowledge/crossIndustryGuards.js";

/**
 * Common greetings and general conversational triggers
 */
const GREETINGS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "sup", "greetings"];
const IDENTITY_QUESTIONS = ["who are you", "what is your name", "what can you do", "help me", "what is swordnexi", "who is swordnexi"];

/**
 * Generates an intelligent, isolated response from SwordNexi.
 *
 * @param {string} userQuery
 * @param {object} currentUser
 * @param {string} currentPathname
 * @returns {object} { reply: string, industry: object, department: object }
 */
export async function generateSwordNexiResponse(userQuery, currentUser, currentPathname) {
  const profile = resolveIndustryProfile(currentUser);
  const industryKey = profile.key || "others";
  const department = resolveDepartment(currentPathname);
  const industryData = INDUSTRY_KNOWLEDGE[industryKey] || INDUSTRY_KNOWLEDGE.others;

  // 1. Strict Security & Isolation Validation Check
  const securityCheck = validateSecurityAndIsolation(userQuery, industryKey, profile);
  if (securityCheck.isBlocked) {
    return {
      reply: cleanUnnecessaryMarkdown(securityCheck.safeResponse),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  const query = userQuery.trim().toLowerCase();

  // 2. Greetings and Persona Introduction
  if (GREETINGS.some((g) => query === g || query.startsWith(`${g} `) || query.endsWith(` ${g}`))) {
    const greetingText = `Hello there! 👋 I am SwordNexi, your dedicated assistant for ${profile.label}. Right now you are on the ${department.name} screen. How can I help you manage your ${profile.label.toLowerCase()} tasks today? 😊`;
    return {
      reply: cleanUnnecessaryMarkdown(greetingText),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (IDENTITY_QUESTIONS.some((idq) => query.includes(idq))) {
    const introText = `I am SwordNexi 🤖, your smart assistant specifically customized for ${profile.label}! I am here to help you navigate features, explain workflows, and answer questions about ${department.name} and your business operations. Everything I do is secure and isolated to your ${profile.label} workspace. How can I assist you right now? ✨`;
    return {
      reply: cleanUnnecessaryMarkdown(introText),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  // 3. Screen / Department-Specific Guidance
  if (
    query.includes("this screen") ||
    query.includes("this page") ||
    query.includes("how does this work") ||
    query.includes("what is this") ||
    query.includes("what can i do here") ||
    query.includes("help on this page")
  ) {
    let response = `You are currently on the ${department.name} screen ${department.emoji}. ${department.description}\n\nHere are some helpful tips for this section:\n`;
    department.tips.forEach((tip, idx) => {
      response += `• ${tip}\n`;
    });

    if (department.industrySpecialNotes?.[industryKey]) {
      response += `\nSpecial for ${profile.label}: ${department.industrySpecialNotes[industryKey]} 💡`;
    }

    return {
      reply: cleanUnnecessaryMarkdown(response),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  // 4. Live Multi-Tenant Database & Ingested Knowledge Query
  // Grounds queries against live products, real-time stock, bills, and department policies.
  try {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) {
      const cleanBase = API_URL.replace(/\/+$/, "");
      const res = await axios.post(
        `${cleanBase}/chatbot/query`,
        {
          message: userQuery,
          department: department.name || "all",
          industry: industryKey,
        },
        {
          headers: {
            "x-auth-token": token,
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      if (res.data && res.data.success && res.data.reply) {
        return {
          reply: cleanUnnecessaryMarkdown(res.data.reply),
          industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
          department,
          sources: res.data.sources,
        };
      }
    }
  } catch (backendErr) {
    console.warn("⚠️ Live assistant query fell back to offline engine:", backendErr?.message);
  }

  // 5. Industry-Specific FAQs Match (Local Fallback)
  if (industryData.faqs) {
    for (const faq of industryData.faqs) {
      const qWords = faq.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = qWords.filter((w) => query.includes(w)).length;
      if (matchCount >= 2 || query.includes(faq.question.toLowerCase())) {
        const reply = `${faq.answer} 💡 If you need any more details on this, just let me know!`;
        return {
          reply: cleanUnnecessaryMarkdown(reply),
          industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
          department,
        };
      }
    }
  }

  // 5. Industry-Specific Workflows Match
  if (industryData.commonWorkflows) {
    for (const flow of industryData.commonWorkflows) {
      const topicWords = flow.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = topicWords.filter((w) => query.includes(w)).length;
      if (matchCount >= 1 || flow.steps.some((step) => query.includes(step.toLowerCase().slice(0, 15)))) {
        let reply = `Here is how you handle ${flow.topic} in ${profile.label} ${industryData.emoji}:\n\n`;
        flow.steps.forEach((step, i) => {
          reply += `${i + 1}. ${step}\n`;
        });
        reply += `\nFollow these steps in your dashboard to complete the process smoothly! Let me know if you run into any questions. 👍`;
        return {
          reply: cleanUnnecessaryMarkdown(reply),
          industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
          department,
        };
      }
    }
  }

  // 6. Common Universal Questions (Bill, Inventory, GST, Barcode, Cash, Credit, Subusers)
  if (query.includes("bill") || query.includes("checkout") || query.includes("pos") || query.includes("sale")) {
    let reply = `To create a bill in ${profile.label}:\n\n`;
    reply += `1. Go to POS Billing from the sidebar.\n`;
    reply += `2. Search for items or scan barcodes to add them to your cart.\n`;
    if (industryKey === "pharmacy") {
      reply += `3. Verify batch numbers and expiry dates for dispensed medicines.\n`;
    } else if (industryKey === "mobile_shop") {
      reply += `3. Confirm the 15-digit IMEI for smartphones.\n`;
    } else if (industryKey === "clothing") {
      reply += `3. Confirm size and color variants selected.\n`;
    } else if (industryKey === "academy") {
      reply += `3. Select student roll number and fee instalment.\n`;
    } else if (industryKey === "software_development") {
      reply += `3. Pick the milestone deliverable or client contract.\n`;
    }
    reply += `4. Choose payment method (Cash, UPI, Card, or Credit).\n`;
    reply += `5. Click Print or Save to finalize the invoice. 🧾`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (query.includes("product") || query.includes("item") || query.includes("inventory") || query.includes("stock")) {
    let reply = `To manage your inventory in ${profile.label} 📦:\n\n`;
    reply += `1. Click Inventory in the sidebar.\n`;
    reply += `2. Click Add Product / Add Item to register a new item.\n`;
    reply += `3. Fill in name, pricing (cost price & selling price), and quantity.\n`;
    reply += `4. Set a Reorder Level so you get low-stock alerts before items run out.\n`;
    reply += `5. Save to maintain your updated stock catalog. 🚀`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (query.includes("credit") || query.includes("dues") || query.includes("khata") || query.includes("debt") || query.includes("pending")) {
    let reply = `To track customer credit and pending dues in ${profile.label} 💳:\n\n`;
    reply += `1. In POS Billing, select the customer and choose Credit as the payment method.\n`;
    reply += `2. To check outstanding balances, click Credit in the sidebar.\n`;
    reply += `3. Search the customer name to view unpaid bills and record partial repayments.\n`;
    reply += `4. All balances update in real-time. 📊`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (query.includes("gst") || query.includes("tax") || query.includes("invoice") || query.includes("hsn")) {
    let reply = `To generate GST tax invoices 📄:\n\n`;
    reply += `1. Ensure your business GSTIN is configured in Settings.\n`;
    reply += `2. Go to GST Bill in the sidebar.\n`;
    reply += `3. Add customer details (and customer GSTIN if it is a B2B sale).\n`;
    reply += `4. The invoice automatically calculates CGST, SGST, or IGST based on location and HSN codes.\n`;
    reply += `5. Download or print the tax invoice for your tax filings. 🏢`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (query.includes("barcode") || query.includes("label") || query.includes("sticker")) {
    let reply = `To create and print barcode stickers 🏷️:\n\n`;
    reply += `1. Go to Barcodes from the sidebar.\n`;
    reply += `2. Select the items you need barcodes for and specify the quantity of stickers.\n`;
    reply += `3. Choose your label sheet format (A4 sheet or thermal roll).\n`;
    reply += `4. Click Print to print high-clarity barcodes ready for scanning. 🖨️`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (query.includes("cash") || query.includes("expense") || query.includes("petty") || query.includes("drawer")) {
    let reply = `To manage daily cash flow and expenses 💵:\n\n`;
    reply += `1. Click Cash Book in the sidebar.\n`;
    reply += `2. Cash sales are logged automatically as Cash In.\n`;
    reply += `3. Click Add Expense / Cash Out to record daily expenses (such as tea, rent, maintenance, or supplies).\n`;
    reply += `4. Check closing balance at day end to verify cash drawer accuracy. 💰`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  if (query.includes("staff") || query.includes("subuser") || query.includes("employee") || query.includes("salesman") || query.includes("cashier")) {
    let reply = `To manage staff and cashiers 👥:\n\n`;
    reply += `1. Go to Settings and click Sub-users.\n`;
    reply += `2. Create staff accounts with assigned roles (such as Cashier or Salesman).\n`;
    reply += `3. Check Subuser Records to monitor sales and activity per employee.\n`;
    reply += `4. Only owners have permission to edit staff privileges. 🔒`;
    return {
      reply: cleanUnnecessaryMarkdown(reply),
      industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
      department,
    };
  }

  // 7. General Fallback within Current Industry Boundaries
  let fallbackReply = `Here is what I know about that in ${profile.label} ${industryData.emoji}:\n\n`;
  fallbackReply += `As your ${profile.label} guide, I can help you with:\n`;
  industryData.keyConcepts.slice(0, 4).forEach((concept) => {
    fallbackReply += `• ${concept}\n`;
  });
  fallbackReply += `\nYou are currently on the ${department.name} screen. Feel free to ask about how to add items, generate bills, check reports, or perform any task in ${profile.label}! 😊`;

  return {
    reply: cleanUnnecessaryMarkdown(fallbackReply),
    industry: { key: industryKey, label: profile.label, emoji: industryData.emoji },
    department,
  };
}
