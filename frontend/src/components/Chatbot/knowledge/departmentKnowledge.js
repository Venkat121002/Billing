// Department / Screen Knowledge Base for SwordNex.
// Provides screen-aware guidance so SwordNexi knows exactly where the user is currently working.

export const DEPARTMENT_MAP = {
  "/billing": {
    name: "POS Billing",
    emoji: "🧾",
    description: "Point of Sale billing screen for scanning items, calculating taxes, applying discounts, and generating customer receipts.",
    tips: [
      "Scan barcodes or type item names to instantly add items to the current cart.",
      "Use keyboard shortcuts to swiftly switch payment modes between Cash, UPI, and Card.",
      "Select a customer profile if you need to offer store credit or record their purchase history.",
      "Click print or download to generate formatted invoices for thermal or A4 printers.",
    ],
    industrySpecialNotes: {
      pharmacy: "Select specific medicine batch numbers to ensure the earliest expiry batches are dispensed first.",
      mobile_shop: "When billing a smartphone, make sure the unique 15-digit IMEI number is recorded.",
      clothing: "Scan hangtag barcodes to automatically add the exact size and color variant.",
      academy: "Select student roll numbers to record course term and instalment tuition fees.",
      software_development: "Choose milestone invoices or consulting service retainers.",
      petshop: "Confirm pet owner details to link vaccination or grooming histories.",
      grocery: "Supports high-speed barcode scanning and loose commodity weight entries.",
    },
  },

  "/inventory": {
    name: "Inventory & Item Master",
    emoji: "📦",
    description: "Central repository for cataloging products, courses, or services, tracking stock levels, and setting reorder points.",
    tips: [
      "Click Add Product/Item to register new items into your catalog.",
      "Set a Reorder Level so the system alerts you before stock runs completely empty.",
      "Update purchase prices and selling prices anytime to maintain accurate profit reporting.",
    ],
    industrySpecialNotes: {
      pharmacy: "Tracks batch numbers, expiry dates, drug schedules, and rack numbers.",
      mobile_shop: "Tracks IMEI numbers, storage specs, brand models, and device warranties.",
      clothing: "Organizes items into size matrix (XS-XXL) and color variations.",
      academy: "This screen serves as your Course Catalog, showing syllabus, durations, and fee tiers.",
      software_development: "This screen serves as your Services Catalog, showing consulting, development, and maintenance rates.",
      petshop: "Includes pet food batches, toys, accessories, and pet healthcare supplies.",
      grocery: "Manages FMCG items, loose weight items, and barcode association.",
    },
  },

  "/cashbook": {
    name: "Cash Book",
    emoji: "💵",
    description: "Daily accounting book to monitor cash in, cash out, business expenses, and shift closing balances.",
    tips: [
      "Log every petty expense (chai, electricity, supplies, maintenance) as Cash Out.",
      "Sales from POS Billing automatically register as Cash In when settled via cash.",
      "Compare system calculated cash with physical drawer cash at the end of each day.",
    ],
  },

  "/credit": {
    name: "Credit & Khata",
    emoji: "💳",
    description: "Customer credit ledger to track unpaid balances, credit limits, and partial payment settlements.",
    tips: [
      "Search for customers by name or phone number to view their current outstanding balance.",
      "Record partial repayments when customers pay back their credit.",
      "Review customer transaction histories to prevent exceeding safe credit limits.",
    ],
  },

  "/reports": {
    name: "Reports & Analytics",
    emoji: "📊",
    description: "Business analytics dashboard presenting total revenue, profit margins, sales trends, and tax breakdowns.",
    tips: [
      "Filter reports by date range (Today, This Week, This Month, or Custom Dates).",
      "Export reports to Excel or PDF for accounting audits and tax filing.",
      "Identify top-selling items to plan smarter restocking.",
    ],
  },

  "/barcodes": {
    name: "Barcode Generator",
    emoji: "🏷️",
    description: "Tool to generate and print custom barcode stickers for products and accessories.",
    tips: [
      "Select the items you want to print stickers for and choose label sheet dimensions.",
      "Supports standard thermal sticker printers and multi-label A4 sheets.",
      "Ensure barcode scanner can clearly scan the printed sample before mass printing.",
    ],
  },

  "/gst": {
    name: "GST Invoices",
    emoji: "📄",
    description: "Official tax invoicing module with CGST, SGST, IGST calculations and HSN/SAC codes.",
    tips: [
      "Ensure your company GSTIN is configured in Settings.",
      "Enter customer GSTIN for B2B invoices to allow input tax credit claims.",
      "Downloads compliant tax invoices ready for GST returns filing.",
    ],
  },

  "/repair-tickets": {
    name: "Repair Tickets",
    emoji: "🔧",
    description: "Service center ticketing system for mobile phones, gadgets, and hardware repairs.",
    tips: [
      "Record device physical condition, pattern locks, and customer complaint thoroughly upon intake.",
      "Update ticket status as In Progress, Waiting for Parts, or Repaired to keep customer informed.",
      "Generate printed repair job sheets with estimated cost and terms.",
    ],
    industrySpecialNotes: {
      mobile_shop: "Dedicated repair workshop workflow exclusively for mobile and device repairs.",
    },
  },

  "/imei-lookup": {
    name: "IMEI Lookup",
    emoji: "🔍",
    description: "Fast serial search tool to inspect device origin, invoice history, warranty status, and past repairs.",
    tips: [
      "Input or scan any 15-digit IMEI number.",
      "Instantly view sale date, customer name, warranty validity, and repair logs.",
    ],
    industrySpecialNotes: {
      mobile_shop: "Exclusive mobile shop tool to verify customer warranty claims.",
    },
  },

  "/expiry-alerts": {
    name: "Expiry Alerts",
    emoji: "⚠️",
    description: "Batch expiry monitor displaying medications or perishable products nearing their expiration.",
    tips: [
      "View products expiring within 30, 60, or 90 days.",
      "Filter out expired stock immediately to prevent accidental dispensing.",
      "Coordinate with distributors for credit notes and returns on expiring batches.",
    ],
    industrySpecialNotes: {
      pharmacy: "Crucial regulatory screen for chemist and pharmacy compliance.",
    },
  },

  "/students": {
    name: "Students Management",
    emoji: "🎓",
    description: "Student directory tracking admissions, enrolled courses, roll numbers, and parent contacts.",
    tips: [
      "Register new admissions with course allocations.",
      "Review fee payment status and attendance performance.",
      "Access student roll numbers and guardian contact details.",
    ],
    industrySpecialNotes: {
      academy: "Core education management portal for coaching centers and academies.",
    },
  },

  "/trainers": {
    name: "Trainers & Faculty",
    emoji: "👨‍🏫",
    description: "Instructor directory to manage trainers, assign batches, and track class schedules.",
    tips: [
      "Add faculty members and link them to courses they teach.",
      "Keep faculty contact information and teaching schedules organized.",
    ],
    industrySpecialNotes: {
      academy: "Faculty coordination tool for academies and coaching institutes.",
    },
  },

  "/clients": {
    name: "Clients Directory",
    emoji: "🤝",
    description: "Corporate client directory for software projects, IT consultancies, and digital agencies.",
    tips: [
      "Save client company names, contact persons, emails, and GSTIN numbers.",
      "Track active projects and billing history per client.",
    ],
    industrySpecialNotes: {
      software_development: "Client relationship management for software firms.",
    },
  },

  "/milestones": {
    name: "Project Milestones",
    emoji: "🎯",
    description: "Milestone-based project billing tracker for software sprints, deliverables, and retainers.",
    tips: [
      "Break projects into deliverables with agreed target dates and payment amounts.",
      "Generate milestone tax invoices upon client sign-off.",
      "Keep track of unpaid milestone disbursements.",
    ],
    industrySpecialNotes: {
      software_development: "Specialized project billing engine for IT companies.",
    },
  },

  "/alterations": {
    name: "Alterations & Tailoring",
    emoji: "✂️",
    description: "Tailoring and garment alteration ticketing module with measurement tracking and due dates.",
    tips: [
      "Record custom customer measurements and fitting requirements.",
      "Assign alteration jobs to specific tailors.",
      "Track delivery target dates so customers receive altered clothes on time.",
    ],
    industrySpecialNotes: {
      clothing: "Boutique and tailoring workshop management.",
    },
  },

  "/clothing-hub": {
    name: "Clothing Automation Hub",
    emoji: "👕",
    description: "Apparel catalog automation hub for bulk hangtag printing, size matrix audits, and fashion stocks.",
    tips: [
      "Manage bulk apparel labels and price hangtags.",
      "Audit variant matrices across color and size lines.",
    ],
    industrySpecialNotes: {
      clothing: "Advanced textile and fashion store automation.",
    },
  },

  "/pets": {
    name: "Pets Directory",
    emoji: "🐕",
    description: "Pet database holding pet profiles, breeds, vaccination history, and Pet Passports.",
    tips: [
      "Register pets with breed, age, species, and parent contact details.",
      "Generate Pet Passport QR links for pet owners.",
      "Track vaccination schedules and medical notes.",
    ],
    industrySpecialNotes: {
      petshop: "Pet registry for pet stores and grooming centers.",
    },
  },

  "/pet-services": {
    name: "Pet Services & Spa",
    emoji: "🛁",
    description: "Grooming salon appointment scheduler for pet baths, haircuts, nail trimming, and spa packages.",
    tips: [
      "Book grooming slots with specific groomers.",
      "Record pet temperament notes or sensitive skin requirements.",
      "Bill grooming packages directly upon completion.",
    ],
    industrySpecialNotes: {
      petshop: "Spa and grooming management for pet shops.",
    },
  },

  "/settings": {
    name: "Settings & Configuration",
    emoji: "⚙️",
    description: "Store profile configuration, tax settings, staff management, and billing preferences.",
    tips: [
      "Update business address, contact numbers, and store logo for invoice headers.",
      "Configure tax percentages and default invoice formats.",
      "Manage sub-users, cashiers, and salesman permissions under Sub-users tab.",
    ],
  },

  "/dashboard": {
    name: "Dashboard",
    emoji: "📊",
    description: "Executive overview showing today's sales, active orders, recent transactions, and low stock alerts.",
    tips: [
      "Check daily revenue counters to track today's business progress.",
      "Review the notification bell for instant low stock reminders.",
      "Access quick links to jump directly to billing or inventory.",
    ],
  },
};

/**
 * Resolve department metadata based on the current URL pathname.
 */
export function resolveDepartment(pathname) {
  if (!pathname) return DEPARTMENT_MAP["/dashboard"];

  // Exact match
  if (DEPARTMENT_MAP[pathname]) {
    return DEPARTMENT_MAP[pathname];
  }

  // Prefix match (e.g. /barcode/123 -> /barcodes, /tenants/xyz, etc.)
  for (const [route, meta] of Object.entries(DEPARTMENT_MAP)) {
    if (route !== "/dashboard" && pathname.startsWith(route)) {
      return meta;
    }
  }

  return {
    name: "Workspace",
    emoji: "💼",
    description: "General workspace navigation and business operations.",
    tips: [
      "Use the sidebar to navigate between your business modules.",
      "Need help with any screen? Ask me anytime for step-by-step guidance.",
    ],
  };
}
