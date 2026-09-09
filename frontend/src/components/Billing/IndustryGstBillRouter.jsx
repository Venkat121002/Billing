import { useAuth } from "../../contexts/AuthContext";
import GroceryGSTBill from "../../industry/grocery/groceryGstBill";
import SDGSTBill from "../../industry/SoftwareDevelopment/SDGstBill";
import ClothingGSTBill from "../../industry/Clothing/ClothingGstBill";
import AcademyGSTBill from "../../industry/academy/academygstbill";

// The default inventory component

export default function IndustryGstBillRouter() {
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
//   if (industryLower.includes("mobile")) {
//     console.log("🛣️ IndustryRouter: Routing to MobileInventory");
//     return <MobileInventory />;
//   }
 if (industryLower.includes("software_development")) {

    return <SDGSTBill />;
  }
 if (industryLower.includes("clothing")) {

    return <ClothingGSTBill />;
  }
  if (industryLower.includes("academy")) {

    return <AcademyGSTBill />;
  }
  // For any other case, including "grocery" or if no specific match is found,
  // fall back to the default GroceryGSTBill (matches the pattern used by
  // every other Industry*Router — grocery tenants use the "grocery" value,
  // not "grocery_store", so an explicit check for "grocery_store" here never
  // matched and grocery tenants were falling through to the generic screen).

  return <GroceryGSTBill />;
}
