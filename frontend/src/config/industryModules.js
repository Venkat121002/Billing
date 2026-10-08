import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardCheck,
  PrinterCheck,
  CreditCard,
  CirclePercent,
  BarChart3,
  Barcode,
  ClipboardList,
  Wrench,
  ScanSearch,
  PawPrint,
  Scissors,
  AlertTriangle,
  Milestone,
  Shirt,
  Sparkles
} from "lucide-react";

export const MODULES = {
  dashboard: { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  billing: { label: "POS Billing", path: "/billing", icon: Users },
  cashbook: { label: "Cash Book", path: "/cashbook", icon: Briefcase },
  inventory: { label: "Inventory", path: "/inventory", icon: ClipboardCheck },
  gst: { label: "GST Bill", path: "/gst", icon: PrinterCheck },
  credit: { label: "Credit", path: "/credit", icon: CreditCard },
  record: { label: "Record", path: "/record", icon: CirclePercent },
  reports: { label: "Reports", path: "/reports", icon: BarChart3 },
  barcodes: { label: "Barcodes", path: "/barcodes", icon: Barcode },
  staff_management: { label: "Subusers", path: "/settings?section=sub_users", icon: Users },
  staff_records: { label: "Subuser Records", path: "/staff-records", icon: ClipboardList },
  // add_product intentionally excluded from default sidebar; access via Inventory CTA
  trainers: { label: "Trainers", path: "/trainers", icon: Users },
  students: { label: "Students", path: "/students", icon: Users },
  clients: { label: "Clients", path: "/clients", icon: Users },
  repair_tickets: { label: "Repairs", path: "/repair-tickets", icon: Wrench },
  imei_lookup: { label: "IMEI Lookup", path: "/imei-lookup", icon: ScanSearch },
  pets: { label: "Pets", path: "/pets", icon: PawPrint },
  pet_services: { label: "Grooming & Spa", path: "/pet-services", icon: Scissors },
  expiry_alerts: { label: "Expiry Alerts", path: "/expiry-alerts", icon: AlertTriangle },
  milestones: { label: "Milestones", path: "/milestones", icon: Milestone },
  ai_proposal: { label: "AI Proposals", path: "/ai-proposal", icon: Sparkles },
  alterations: { label: "Tailoring & Alterations", path: "/alterations", icon: Scissors },
  clothing_hub: { label: "Clothing Automation", path: "/clothing-hub", icon: Shirt },
};

export const INDUSTRY_MODULES = {
  grocery: ["dashboard", "inventory", "billing", "barcodes", "record", "reports", "gst", "cashbook", "staff_records"],
  grocery_store: ["dashboard", "inventory", "barcodes", "billing", "record", "reports", "gst", "cashbook", "staff_records"],
  restaurant: ["dashboard", "billing", "reports", "staff_records"],
  mobile_shop: ["dashboard", "inventory", "barcodes", "billing", "record", "reports", "gst", "cashbook", "credit", "repair_tickets", "imei_lookup", "staff_records"],
  academy: ["dashboard", "inventory", "billing", "record", "credit", "cashbook", "gst", "students", "trainers", "staff_records",],
  software_development: ["dashboard", "inventory", "billing", "record", "clients", "milestones", "ai_proposal", "gst", "cashbook", "staff_records"],
  clothing: ["dashboard", "inventory", "barcodes", "billing", "clothing_hub", "alterations", "record", "gst", "cashbook", "staff_records"],
  garments: ["dashboard", "inventory", "barcodes", "billing", "clothing_hub", "alterations", "record", "gst", "cashbook", "staff_records"],
  garment: ["dashboard", "inventory", "barcodes", "billing", "clothing_hub", "alterations", "record", "gst", "cashbook", "staff_records"],
  textile: ["dashboard", "inventory", "barcodes", "billing", "clothing_hub", "alterations", "record", "gst", "cashbook", "staff_records"],
  apparel: ["dashboard", "inventory", "barcodes", "billing", "clothing_hub", "alterations", "record", "gst", "cashbook", "staff_records"],


  pharmacy: ["dashboard", "inventory", "billing", "record", "gst", "cashbook", "credit", "expiry_alerts", "staff_records"],

  petshop: ["dashboard", "inventory", "barcodes", "billing", "record", "reports", "gst", "cashbook", "pets", "pet_services", "staff_records"],

  others: ["dashboard", "billing", "inventory", "gst", "record", "reports", "cashbook", "credit", "staff_records"],
};

export function getAllowedModules(industryKey) {
  const normalizedKey = industryKey ? industryKey.toLowerCase() : "";
  const key = normalizedKey && INDUSTRY_MODULES[normalizedKey] ? normalizedKey : "others";
  return INDUSTRY_MODULES[key].filter((k) => MODULES[k]);
}

export function getSidebarItems(industryKey) {
  const normalizedKey = industryKey ? industryKey.toLowerCase() : "";
  return getAllowedModules(normalizedKey).map((k) => {
    const module = { ...MODULES[k], moduleKey: k };
    if (normalizedKey === "academy" && k === "inventory") {
      return { ...module, label: "Courses" };
    }
    else if (normalizedKey === "software_development" && k === "inventory") {
      return { ...module, label: "Service" };
    }
    else if (normalizedKey === "academy" && k === "credit") {
      return { ...module, label: "Fee Dues", path: "/record", state: { activeTab: "credit" } };
    }
    return module;
  });
}

export function isModuleAllowed(industryKey, moduleKey) {
  const normalizedKey = industryKey ? industryKey.toLowerCase() : "";
  const key = normalizedKey && INDUSTRY_MODULES[normalizedKey] ? normalizedKey : "others";
  return (INDUSTRY_MODULES[key] || []).includes(moduleKey);
}
