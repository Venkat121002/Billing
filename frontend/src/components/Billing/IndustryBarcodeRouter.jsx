import { useAuth } from "../../contexts/AuthContext";
import GroceryBarcodesPage from "../../industry/grocery/groceryBarcode";
import ClothingBarcodePage from "../../industry/Clothing/ClothingBarcode";
import ClothingAllBarcodesPage from "../../industry/Clothing/ClothingAllBarcode";
                                                                // The default inventory component

export default function IndustryBarcodeRouter() {
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
  if (industryLower.includes("clothing")) {
    
    return (
      <>
     
      <ClothingAllBarcodesPage />
      </>
    );
  }

  // For any other case, including "grocery" or if no specific match is found,
  // fall back to the default GroceryInventory.
 
  return <GroceryBarcodesPage />;
}
