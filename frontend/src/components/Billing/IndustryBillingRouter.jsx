import { useAuth } from "../../contexts/AuthContext";
import AcademyBilling from "../../industry/academy/academybilling";
import SDBilling from "../../industry/SoftwareDevelopment/SoftwareBilling";
import ClothingBilling from "../../industry/Clothing/ClothingBilling";
import GroceryBilling from "../../industry/grocery/groceryBilling";
import PharmacyBilling from "../../industry/Pharmacy/PharmacyBilling";

// The default inventory component

export default function IndustryBillingRouter() {
  const { currentUser } = useAuth();

  // Determine the user's industry from multiple possible sources
  const industry =
    currentUser?.industry ||
    currentUser?.companyDetails?.industry ||
    currentUser?.Tenant?.industry ||
    localStorage.getItem("selectedIndustry") ||
    "grocery"; // Default to 'grocery' if no industry is found

  console.log("🛣️ IndustryRouter: Detected industry:", industry, "User:", currentUser?.email);

  const industryLower = industry.toLowerCase();
  
  // Route to the specific inventory component based on the industry.
  // The `includes` check allows for variations like "mobile_shop".
//   if (industryLower.includes("mobile")) {
//     console.log("🛣️ IndustryRouter: Routing to MobileInventory");
//     return <MobileInventory />;
//   }
 if (industryLower.includes("software_development")) {

    return <SDBilling />;
  }
   if (industryLower.includes("clothing")) {
  
    return <ClothingBilling />;
  }
   if (industryLower.includes("academy")) {
  
    return <AcademyBilling />;
  }
   if (industryLower.includes("pharmacy")) {
   
    return <PharmacyBilling/>;
  }

  // For any other case, including "grocery" or if no specific match is found,
  // fall back to the default GroceryInventory.

  return <GroceryBilling />;
}
