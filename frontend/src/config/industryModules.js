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
  ClipboardList
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
};

export const INDUSTRY_MODULES = {
  grocery: ["dashboard", "inventory", "billing", "barcodes", "record", "reports", "gst", "cashbook", "staff_records"],
  grocery_store: ["dashboard", "inventory", "barcodes", "billing", "record", "reports", "gst", "cashbook", "staff_records"],
  restaurant: ["dashboard", "billing", "reports", "staff_records"],
  mobile_shop: ["dashboard", "inventory", "barcodes", "billing", "record", "reports", "gst", "cashbook", "credit", "staff_records"],
  academy: ["dashboard", "inventory", "billing", "record", "cashbook", "gst", "trainers", "staff_records",],
  software_development: ["dashboard", "inventory", "billing", "record", "gst", "cashbook", "staff_records"],
  clothing: ["dashboard", "inventory", "barcodes", "billing", "record", "gst", "cashbook", "staff_records"],

  pharmacy: ["dashboard", "inventory", "billing", "record", "gst", "cashbook", "credit", "staff_records"],

  petshop: ["dashboard", "inventory", "barcodes", "billing", "record", "reports", "gst", "cashbook", "staff_records"],

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
    const module = MODULES[k];
    if (normalizedKey === "academy" && k === "inventory") {
      return { ...module, label: "Courses" };
    }
    else if (normalizedKey === "software_development" && k === "inventory") {
      return { ...module, label: "Service" };
    }
    return module;
  });
}

export function isModuleAllowed(industryKey, moduleKey) {
  const normalizedKey = industryKey ? industryKey.toLowerCase() : "";
  const key = normalizedKey && INDUSTRY_MODULES[normalizedKey] ? normalizedKey : "others";
  return (INDUSTRY_MODULES[key] || []).includes(moduleKey);
}
