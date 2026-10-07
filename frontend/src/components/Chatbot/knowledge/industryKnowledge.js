// Isolated knowledge bases for each industry in SwordNex Billing.
// Strict security rule: A user in one industry MUST NEVER be able to query or receive data from another industry.

export const INDUSTRY_KNOWLEDGE = {
  pharmacy: {
    name: "Pharmacy",
    emoji: "💊",
    tagline: "Pharmacy & Healthcare Management",
    description: "Specialized for retail medical stores, chemist shops, and pharmacy distribution.",
    keyConcepts: [
      "Batch numbers and expiry date management",
      "Drug schedule compliance (Schedule H, H1, X, OTC)",
      "Doctor and prescription tracking on bills",
      "Strip, tablet, box, and bottle packaging with unit conversion",
      "Low stock and near-expiry medication alerts",
      "Customer credit ledger for regular patients",
      "GST tax invoices with HSN codes for pharmaceuticals",
    ],
    commonWorkflows: [
      {
        topic: "Adding Medicines to Inventory",
        steps: [
          "Navigate to Inventory from the sidebar.",
          "Click Add Product and enter the medicine brand name and generic salt composition.",
          "Enter the batch number, expiry date (month and year), and manufacturing date.",
          "Set the purchase price, MRP, and selling rate per strip or unit.",
          "Specify the shelf or rack number for easy physical retrieval in your store.",
          "Save the item to track batch-level stock quantities.",
        ],
      },
      {
        topic: "Tracking Expiry Dates and Alerts",
        steps: [
          "Open the Expiry Alerts page from the sidebar.",
          "View medicines classified by Near Expiry (within 30, 60, or 90 days) and Expired.",
          "Review affected batch numbers to initiate returns to suppliers or offer clearance.",
          "Receive automated reminders so expired medicines are never sold accidentally.",
        ],
      },
      {
        topic: "Billing Medicines with Prescriptions",
        steps: [
          "Open POS Billing from the sidebar.",
          "Optionally add doctor name and patient details for scheduled drugs.",
          "Scan the barcode or search the medicine by name or generic salt.",
          "Select the exact batch to dispense, ensuring the earliest expiry batch is sold first (FEFO principle).",
          "Choose payment mode (Cash, UPI, Card, or Credit for regular customers) and generate invoice.",
        ],
      },
      {
        topic: "Customer Credit & Khata Book",
        steps: [
          "For regular patients purchasing on credit, select the customer in POS Billing.",
          "Choose Credit as the payment method to update their outstanding balance.",
          "Open Credit from the sidebar to review pending balances and record partial settlements.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I sell a partial medicine strip or loose tablets?",
        answer: "When setting up or billing the medicine, you can configure unit conversions or sell individual units by dividing strip price accordingly.",
      },
      {
        question: "Where can I view medicines expiring this month?",
        answer: "Go to Expiry Alerts in the sidebar to review all batches nearing expiry within your configured alert window.",
      },
      {
        question: "How can I record supplier returns for expired stock?",
        answer: "Check the Expiry Alerts tab for the batch details, then adjust stock in Inventory with a return note to your medicine distributor.",
      },
    ],
  },

  mobile_shop: {
    name: "Mobile Shop",
    emoji: "📱",
    tagline: "Mobile Sales & Service Center",
    description: "Designed for smartphone retail, accessories, gadgets, and device repair centers.",
    keyConcepts: [
      "Single and Dual IMEI tracking for phones and cellular devices",
      "Device serial numbers for tablets, smartwatches, and accessories",
      "Job sheet and repair ticket management for hardware and software issues",
      "IMEI lookup tool to verify purchase date, warranty, and repair history",
      "Brand, RAM, ROM, and color variant tracking",
      "Customer warranty tracking and repair status updates",
      "Barcode scanning for quick gadget accessories billing",
    ],
    commonWorkflows: [
      {
        topic: "Adding Phones with IMEI Numbers",
        steps: [
          "Navigate to Inventory and click Add Product.",
          "Select Mobile / Smartphone item type.",
          "Enter Brand, Model, Storage (RAM/ROM), and Color.",
          "Scan or enter IMEI 1 and optional IMEI 2 for dual SIM smartphones.",
          "Enter purchase cost, selling price, and warranty duration.",
          "Save the handset to ensure unique serial tracking.",
        ],
      },
      {
        topic: "Creating a Repair Ticket",
        steps: [
          "Open Repair Tickets from the sidebar.",
          "Click New Repair Ticket.",
          "Enter customer phone number, name, and device model.",
          "Record received condition, pattern/PIN lock, physical scratches, and reported fault (e.g., cracked display, charging port issue, water damage).",
          "Provide estimated cost and completion time, then print or send the job sheet acknowledgment to the customer.",
        ],
      },
      {
        topic: "Using the IMEI Lookup Tool",
        steps: [
          "Click IMEI Lookup from the sidebar.",
          "Type or scan any 15-digit IMEI number.",
          "Instant lookup retrieves the customer who purchased it, sale invoice number, warranty status, and past repair history.",
        ],
      },
      {
        topic: "Billing Accessories and Phones",
        steps: [
          "Open POS Billing.",
          "Scan barcode on charger, tempered glass, or cover, or scan the IMEI barcode on the phone box.",
          "The system automatically captures the specific IMEI sold and marks it unavailable in stock.",
          "Select payment method (Cash, UPI, Card, or Credit / EMI) and print invoice.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I track repair status for a customer phone?",
        answer: "Yes, go to Repair Tickets where you can update stages like Received, In Progress, Waiting for Spare Parts, Repaired, and Delivered.",
      },
      {
        question: "How does IMEI lookup help during warranty claims?",
        answer: "Open IMEI Lookup and enter the 15-digit number to instantly view the original sale date, customer invoice, and warranty validity.",
      },
      {
        question: "How do I print barcodes for mobile covers and tempered glass?",
        answer: "Go to Barcodes in the sidebar, select your accessory items, pick your sticker label size, and print barcodes in bulk.",
      },
    ],
  },

  clothing: {
    name: "Clothing & Apparel",
    emoji: "👗",
    tagline: "Fashion, Textile & Boutique Hub",
    description: "Built for garment boutiques, clothing stores, tailoring shops, and textile retailers.",
    keyConcepts: [
      "Apparel matrix variants: Size (XS, S, M, L, XL, XXL) and Color",
      "Fabric, material type, and brand categorization",
      "Tailoring, alterations, and custom stitching job sheets",
      "Clothing Automation Hub for batch label printing and catalog management",
      "Hangtag barcode generation for fast checkout scanning",
      "Seasonal collections and clearance discounts",
    ],
    commonWorkflows: [
      {
        topic: "Adding Apparel with Size and Color Variants",
        steps: [
          "Open Inventory and select Add Garment / Product.",
          "Enter design code, brand, fabric, and style name.",
          "Select applicable sizes (such as S, M, L, XL) and available colors.",
          "Specify quantity per variant matrix so each size and color pair has tracked stock.",
          "Generate and print hangtag barcodes for each piece.",
        ],
      },
      {
        topic: "Managing Alterations and Tailoring",
        steps: [
          "Open Alterations from the sidebar.",
          "Create an Alteration Ticket linked to the customer bill or brought-in garment.",
          "Record specific measurements and fitting notes (e.g., shorten length by 2 inches, waist taper).",
          "Assign a tailor and set delivery promise date.",
          "Update status as Fitting Done, Altered, or Delivered.",
        ],
      },
      {
        topic: "Using the Clothing Automation Hub",
        steps: [
          "Click Clothing Hub from the sidebar.",
          "Access automated catalog features, bulk hangtag barcode printing, and size grids.",
          "Filter by seasonal collections or brand categories to quickly audit apparel stock.",
        ],
      },
      {
        topic: "Fast Checkout Scanning",
        steps: [
          "Open POS Billing.",
          "Scan the garment hangtag barcode with your barcode scanner.",
          "The item, along with its specific size and color, is instantly added to the bill.",
          "Apply any festive or bulk discounts and complete checkout.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I manage different sizes for the same shirt or dress?",
        answer: "Use the variant matrix in Inventory to enter quantities for each size and color under a single parent design.",
      },
      {
        question: "Where can I track tailoring and fitting orders?",
        answer: "Use the Alterations tab in the sidebar to create, track, and close alteration tickets with customer measurements.",
      },
      {
        question: "Can I print hangtag price tags with barcodes?",
        answer: "Yes, use either Barcodes or the Clothing Hub to print price and barcode hangtags formatted for your thermal or label printer.",
      },
    ],
  },

  petshop: {
    name: "Pet Shop",
    emoji: "🐾",
    tagline: "Pet Care, Grooming & Supplies",
    description: "Designed for pet stores, animal clinics, grooming spas, and pet boarding centers.",
    keyConcepts: [
      "Pet profiles: breed, species, age, microchip ID, and vaccination records",
      "Pet Services & Spa: grooming, bath, haircut, nail clipping, flea treatments",
      "Pet Passport: shareable QR profile holding medical and vaccination histories",
      "Pet food, treats, and healthcare products with batch and expiry tracking",
      "Appointment scheduling for pet grooming sessions",
      "Retail supplies: toys, leashes, cages, aquariums, and accessories",
    ],
    commonWorkflows: [
      {
        topic: "Registering a Pet and Owner",
        steps: [
          "Open Pets from the sidebar.",
          "Click Add Pet and enter pet name, species (Dog, Cat, Bird, etc.), breed, gender, and age.",
          "Link to pet owner contact information.",
          "Record microchip number, vaccination dates, and dietary notes.",
          "Generate Pet Passport QR code for the pet parent.",
        ],
      },
      {
        topic: "Booking and Managing Pet Grooming Services",
        steps: [
          "Open Pet Services from the sidebar.",
          "Select the pet and owner.",
          "Choose service package: Basic Grooming, Full Spa, Bath & Blow Dry, Nail Trim, or Coat Styling.",
          "Assign groomer and schedule appointment slot.",
          "Record special instructions like sensitive skin or ear cleaning needs.",
        ],
      },
      {
        topic: "Sharing the Pet Passport",
        steps: [
          "Open Pets and select the pet.",
          "Click View Passport to review vaccination log, past grooming visits, and weight tracker.",
          "Share the unique public passport link with boarding kennels or veterinarians.",
        ],
      },
      {
        topic: "Billing Pet Food and Supplies",
        steps: [
          "Open POS Billing.",
          "Scan barcodes on pet kibble, toys, or collars, or select grooming service charges.",
          "Confirm batch and expiry details for perishable pet foods or vitamins.",
          "Collect payment and issue printed receipt.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the Pet Passport feature?",
        answer: "The Pet Passport is a digital profile holding the pet breed, vaccination records, and grooming logs that pet parents can view via QR code.",
      },
      {
        question: "How do I book a grooming appointment for a dog or cat?",
        answer: "Go to Pet Services in the sidebar, choose the pet profile, select the grooming package, and schedule the slot.",
      },
      {
        question: "Can I track expiry dates on pet food bags and supplements?",
        answer: "Yes, when adding pet food to Inventory, enable batch and expiry tracking to receive notifications before packages expire.",
      },
    ],
  },

  academy: {
    name: "Academy & Coaching",
    emoji: "🎓",
    tagline: "Education, Courses & Institutes",
    description: "Tailored for coaching classes, tuition centers, dance/music schools, and training institutes.",
    keyConcepts: [
      "Course catalog with fee structures and duration",
      "Student enrollment profiles and batch allocation",
      "Trainer and faculty assignment to courses",
      "Instalment and term fee collection plans",
      "Fee dues tracking with WhatsApp reminders",
      "Student attendance and session records",
      "Tuition fee receipts with GST compliance",
    ],
    commonWorkflows: [
      {
        topic: "Enrolling a Student",
        steps: [
          "Open Students from the sidebar.",
          "Click Add Student and enter student name, parent phone number, email, and address.",
          "Select enrolled course and batch timings.",
          "Assign instalment or one-time payment structure.",
          "Save the profile to generate student roll number.",
        ],
      },
      {
        topic: "Managing Trainers and Faculty",
        steps: [
          "Open Trainers from the sidebar.",
          "Add trainer details, specialization, contact info, and assigned courses.",
          "Track classes conducted, subject schedules, and trainer compensation.",
        ],
      },
      {
        topic: "Collecting Course Fees and Dues",
        steps: [
          "Open POS Billing or navigate to Fee Dues in Record.",
          "Search for the student by name or roll number.",
          "Select the instalment or term fee being paid.",
          "Choose payment mode (Cash, UPI, Card, or Bank Transfer).",
          "Generate and print official tuition fee receipt or send via WhatsApp.",
        ],
      },
      {
        topic: "Tracking Attendance",
        steps: [
          "Open Attendance or Session Records.",
          "Select the batch date and mark students present, absent, or on leave.",
          "Review attendance percentage across course terms.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do instalment fee payment schedules work?",
        answer: "When enrolling a student, you can split total course fees into term instalments, tracking pending balances under Fee Dues.",
      },
      {
        question: "Where do I add new trainers or instructors?",
        answer: "Go to Trainers in the sidebar to add instructors, assign them to courses, and manage their contact profiles.",
      },
      {
        question: "Can I send fee receipts to parents on WhatsApp?",
        answer: "Yes, fee receipts generated in Billing can be shared directly with registered parent phone numbers.",
      },
    ],
  },

  software_development: {
    name: "Software Development",
    emoji: "💻",
    tagline: "IT Services, Agencies & Tech Firms",
    description: "Designed for web agencies, software consultancies, mobile app studios, and IT freelancers.",
    keyConcepts: [
      "Client directory and company contact records",
      "Software service catalog (Web, Mobile App, Cloud, UI/UX, Maintenance)",
      "Project milestone billing: Phase 1, Phase 2, Deliverables, UAT, Final Launch",
      "Milestone progress tracking (Planned, In Progress, Completed, Invoiced)",
      "Advance payments, retainers, and milestone release invoices",
      "GST tax invoices for digital services and consultancy",
      "Project expense tracking in Cash Book",
    ],
    commonWorkflows: [
      {
        topic: "Adding Clients and Projects",
        steps: [
          "Open Clients from the sidebar.",
          "Click Add Client and enter company name, contact person, email, GSTIN, and address.",
          "Record project title, scope summary, and agreed budget.",
        ],
      },
      {
        topic: "Setting Up Project Milestones",
        steps: [
          "Open Milestones from the sidebar.",
          "Select the client and project.",
          "Define milestone stages (e.g., Wireframes 20%, Backend MVP 30%, Client UAT 30%, Final Deployment 20%).",
          "Set target completion dates and billing amounts for each deliverable.",
        ],
      },
      {
        topic: "Generating Milestone Invoices",
        steps: [
          "When a project phase is signed off, open Milestones.",
          "Click Generate Invoice on the completed milestone.",
          "Verify tax rates (e.g., 18% GST for software services) and client billing address.",
          "Download official GST tax invoice PDF or email it directly to the client accounts team.",
        ],
      },
      {
        topic: "Adding Software Services to Catalog",
        steps: [
          "Open Service in the sidebar (Inventory route for IT companies).",
          "Add service items such as Annual Maintenance, Hourly Consultation, or Cloud Setup.",
          "Specify standard billing rates and tax SAC codes.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I bill a client when a project milestone is finished?",
        answer: "Go to Milestones, locate the completed phase, and click Generate Invoice to create an itemized milestone tax invoice.",
      },
      {
        question: "Can I manage retainer or recurring maintenance contracts?",
        answer: "Yes, add retainer services to your Service catalog and bill clients monthly or quarterly through Billing.",
      },
      {
        question: "Where do I track project expenses like server hosting or third-party APIs?",
        answer: "Use Cash Book from the sidebar to record company and project expenses, categorizing them under software or infrastructure costs.",
      },
    ],
  },

  grocery: {
    name: "Grocery & Supermarket",
    emoji: "🛒",
    tagline: "Retail Grocery, FMCG & Mart",
    description: "Engineered for supermarkets, grocery stores, provision shops, and FMCG marts.",
    keyConcepts: [
      "High-speed barcode scanning for rapid checkout counters",
      "Weight-based loose items (kg, grams, liters) and packaged goods (pcs, boxes)",
      "Reorder levels and low-stock alerts to prevent stockouts",
      "Multiple cash counters and sub-user sales tracking",
      "Daily cash register closing and cashbook reconciliations",
      "Customer loyalty points and purchase history",
      "Barcode label printing for loose packaged pulses and spices",
    ],
    commonWorkflows: [
      {
        topic: "Fast Barcode Checkout at Counter",
        steps: [
          "Open POS Billing from the sidebar.",
          "Scan barcode on packaged FMCG items.",
          "For loose goods like grains or vegetables, search by name or item code and enter weight.",
          "Press Enter to add items with quantity modifiers.",
          "Select payment method (Cash, UPI, Card) and auto-print thermal receipt.",
        ],
      },
      {
        topic: "Stocking FMCG Products and Reorder Levels",
        steps: [
          "Open Inventory and click Add Product.",
          "Scan barcode on package or generate a fresh barcode.",
          "Enter purchase cost, selling MRP, and pack size.",
          "Set a Reorder Level (e.g., 10 units) so the system warns you before running out.",
        ],
      },
      {
        topic: "Printing Barcodes for Repackaged Items",
        steps: [
          "Open Barcodes from the sidebar.",
          "Select loose commodities packed in-house (such as dry fruits, pulses, spices).",
          "Specify number of labels needed and print barcode stickers.",
        ],
      },
      {
        topic: "Daily Register Closing with Cash Book",
        steps: [
          "Open Cash Book at the end of the shift.",
          "Review total cash collected vs UPI and card transactions.",
          "Record petty cash payouts (such as milk supplier, cleaning, repairs) to balance the cash drawer.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I sell loose items like rice or sugar by weight?",
        answer: "In POS Billing, enter the item name and input weight in kilograms or grams; the total calculates automatically based on unit price.",
      },
      {
        question: "How can I see products running low on stock?",
        answer: "Check the low stock notification bell in the top header or filter items in Inventory where quantity is below the reorder level.",
      },
      {
        question: "Can I use a barcode scanner with SwordNex?",
        answer: "Yes, standard USB and wireless barcode scanners work seamlessly with POS Billing without requiring extra drivers.",
      },
    ],
  },

  restaurant: {
    name: "Restaurant",
    emoji: "🍽️",
    tagline: "Restaurant, Cafe & Dining",
    description: "Built for eateries, cafes, fast food outlets, and cloud kitchens.",
    keyConcepts: [
      "Menu item management with food categories and pricing",
      "Dine-in, takeaway, and home delivery bill settlements",
      "Quick receipt printing for customers and kitchen orders",
      "Daily sales reporting and payment breakup (Cash, UPI, Card)",
      "Daily expenses tracking in Cash Book",
    ],
    commonWorkflows: [
      {
        topic: "Taking Food Orders and Billing",
        steps: [
          "Open POS Billing.",
          "Select or search menu items requested by the diner.",
          "Confirm quantities and order type (Dine-in or Takeaway).",
          "Collect payment and issue printed customer receipt.",
        ],
      },
      {
        topic: "Reviewing Daily Sales Reports",
        steps: [
          "Open Reports in the sidebar.",
          "View day-end sales summary, peak hours, and top-selling food items.",
          "Cross-verify cash drawer against UPI totals in Cash Book.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I categorize menu items by Starters, Mains, and Drinks?",
        answer: "Yes, in Inventory you can categorize food items into distinct categories for organized billing.",
      },
      {
        question: "How do I balance the cash drawer at night?",
        answer: "Open Cash Book to see total cash recorded, subtract any supplier payouts, and verify the closing cash balance.",
      },
    ],
  },

  others: {
    name: "General Retail & Services",
    emoji: "🏬",
    tagline: "Multi-Purpose Business Management",
    description: "Adaptable for general retail stores, traders, wholesale dealers, and service providers.",
    keyConcepts: [
      "Universal product and service catalog management",
      "Barcode generation and scanner support",
      "POS billing with multi-mode payment (Cash, UPI, Card, Credit)",
      "GST compliant tax invoice generation",
      "Customer credit ledger and balance tracking",
      "Daily income and expense tracking in Cash Book",
      "Business performance and sales reports",
    ],
    commonWorkflows: [
      {
        topic: "Universal Inventory Management",
        steps: [
          "Open Inventory from the sidebar.",
          "Click Add Product to input item name, barcode, purchase price, and selling price.",
          "Set stock quantity and minimum reorder threshold.",
        ],
      },
      {
        topic: "POS Billing and Invoicing",
        steps: [
          "Open POS Billing.",
          "Search item by barcode or title.",
          "Add customer details if providing invoice or credit.",
          "Choose payment option and generate bill.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I create a GST invoice?",
        answer: "Go to GST Bill or select GST invoice during checkout, enter customer GSTIN, and print tax invoice.",
      },
      {
        question: "Where can I view profit and loss reports?",
        answer: "Go to Reports in the sidebar to review overall sales, margins, and expense summaries.",
      },
    ],
  },
};
