import { useAuth } from "../../contexts/AuthContext";
import AcademyInventory from "../../industry/academy/academyinventry";
import MobileInventory from "../../industry/mobile/mobileinventory";
import GroceryInventory from "../../industry/grocery/groceryInventory"; // The default inventory component
import SoftwareDevelopmentInventory from "../../industry/SoftwareDevelopment/SoftwareDevelopmentInventory";
import ClothingInventory from "../../industry/Clothing/ClothingInventory";
import PharmacyInventory from "../../industry/Pharmacy/PharmacyInventory";


export default function IndustryInventoryRouter() {
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

    return <MobileInventory />;
  }
  if (industryLower.includes("academy")) {

    return <AcademyInventory />;
  }
   if (industryLower.includes("software_development")) {

      return <SoftwareDevelopmentInventory />;
    }
        if (industryLower.includes("pharmacy")) {

      return <PharmacyInventory />;
    }

  if (industryLower.includes("clothing")) {
    return <ClothingInventory />;
  }
  

  // For any other case, including "grocery" or if no specific match is found,
  // fall back to the default GroceryInventory.

  return <GroceryInventory />;
}
