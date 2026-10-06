import { Boxes, LayoutGrid, Receipt, Users, Wallet, Wrench } from "lucide-react";

// Sidebar/tile grouping for the datasets returned by /superadmin/datasets
// (the group names come from the backend registry in utils/superAdminData.js).
export const GROUP_ORDER = ["Platform", "Sales", "Inventory", "Customers", "Finance", "Operations"];

export const GROUP_ICONS = {
  Platform: LayoutGrid,
  Sales: Receipt,
  Inventory: Boxes,
  Customers: Users,
  Finance: Wallet,
  Operations: Wrench,
};
