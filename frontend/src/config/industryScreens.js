// Single registry of "which component renders module X for industry Y",
// replacing the 8 near-identical Industry*Router.jsx files that each
// re-implemented the same `resolveIndustryProfile` + switch boilerplate.
// See UNIFICATION_PLAN.md Phase 7.
//
// Each entry may have:
// - `default`  (required) — rendered when nothing more specific matches.
// - `byModel`  — keyed by `profile.billingModel` (checked first).
// - `byKey`    — keyed by `profile.key` (checked after byModel).
//
// <IndustryScreen kind="..."/> (./components/Billing/IndustryScreen.jsx)
// resolves the current user's profile and picks from this table.

import IndustryBilling from "../components/Billing/IndustryBilling";
import AcademyBilling from "../industry/academy/academybilling";
import SDBilling from "../industry/SoftwareDevelopment/SoftwareBilling";

import IndustryInventory from "../components/Billing/IndustryInventory";
import MobileInventory from "../industry/mobile/mobileinventory";
import AcademyInventory from "../industry/academy/academyinventry";
import SoftwareDevelopmentInventory from "../industry/SoftwareDevelopment/SoftwareDevelopmentInventory";

import GroceryRecord from "../industry/grocery/groceryRecord";
import MobileRecord from "../industry/mobile/mobilerecord";
import AcademyRecords from "../industry/academy/academyRecord";
import SDRecord from "../industry/SoftwareDevelopment/SDRecord";
import ClothingRecord from "../industry/Clothing/ClothingRecord";
import PharmacyRecord from "../industry/Pharmacy/PharmacyRecord";

import ItemForm from "../components/Billing/ItemForm";
import AddCourse from "../industry/academy/academyproduct";
import AddSoftwareService from "../industry/SoftwareDevelopment/AddSoftwareService";
import AddMobileProduct from "../industry/mobile/addmobileproduct";

import AddCustomer from "../components/Billing/AddCustomer";

import IndustryBarcodes from "../components/Billing/IndustryBarcodes";

import IndustryGstBill from "../components/Billing/IndustryGstBill";

import SubUserRecordsPage from "../industry/mobile/SubUserRecordsPage";
import AcademySubUsers from "../industry/academy/academySubUsers";

export const INDUSTRY_SCREENS = {
  billing: {
    default: IndustryBilling,
    byModel: { milestone: SDBilling, instalment: AcademyBilling },
  },
  inventory: {
    default: IndustryInventory,
    byKey: {
      mobile_shop: MobileInventory,
      academy: AcademyInventory,
      software_development: SoftwareDevelopmentInventory,
    },
  },
  record: {
    default: GroceryRecord,
    byKey: {
      mobile_shop: MobileRecord,
      academy: AcademyRecords,
      software_development: SDRecord,
      clothing: ClothingRecord,
      pharmacy: PharmacyRecord,
    },
  },
  addProduct: {
    default: ItemForm,
    byKey: {
      academy: AddCourse,
      software_development: AddSoftwareService,
      mobile_shop: AddMobileProduct,
    },
  },
  addCustomer: {
    default: AddCustomer,
  },
  barcodes: {
    default: IndustryBarcodes,
  },
  gst: {
    default: IndustryGstBill,
  },
  subUsers: {
    default: SubUserRecordsPage,
    byKey: { academy: AcademySubUsers },
  },
};
