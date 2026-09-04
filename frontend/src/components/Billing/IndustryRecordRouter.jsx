import { useAuth } from "../../contexts/AuthContext";
import AcademyRecords from "../../industry/academy/academyRecord";
import GroceryRecord from "../../industry/grocery/groceryRecord";
import MobileRecord from "../../industry/mobile/mobilerecord";
import SDRecord from "../../industry/SoftwareDevelopment/SDRecord";
import ClothingRecord from "../../industry/Clothing/ClothingRecord";// The default inventory component
import PharmacyRecord from "../../industry/Pharmacy/PharmacyRecord";

export default function IndustryRecordRouter() {
  const { currentUser } = useAuth();

  // Determine the user's industry from multiple possible sources
  const industry =
    currentUser?.industry ||
    currentUser?.companyDetails?.industry ||
    currentUser?.Tenant?.industry ||
    localStorage.getItem("selectedIndustry") ||
    "grocery"; // Default to 'grocery' if no industry is found


  const industryLower = industry.toLowerCase();
  
  // Route to the specific inventory component based on the industry.
  // The `includes` check allows for variations like "mobile_shop".
  if (industryLower.includes("mobile")) {

    return <MobileRecord />;
  }
  if (industryLower.includes("academy")) {
   
    return <AcademyRecords />;
  }
  if (industryLower.includes("software_development")) {

    return <SDRecord />;
  }
    if (industryLower.includes("clothing")) {
   
    return <ClothingRecord />;
  }
if (industryLower.includes("pharmacy")) {

    return <PharmacyRecord />;
  }


  // For any other case, including "grocery" or if no specific match is found,
  // fall back to the default GroceryInventory.

  return <GroceryRecord />;
}
