import { useAuth } from "../../contexts/AuthContext";
import SubUserRecordsPage from "../../industry/mobile/SubUserRecordsPage";
import AcademySubUsers from "../../industry/academy/academySubUsers";



// The default inventory component

export default function IndustrySubUsersRouter() {
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
//  if (industryLower.includes("software_development")) {
//     console.log("🛣️ IndustryRouter: Routing to Software Development Gst Bill");
//     return <SDGSTBill />;
//   }
//     if (industryLower.includes("grocery_store")) {
//     console.log("🛣️ IndustryRouter: Routing to AcademyInventory");
//     return <GroceryGSTBill />;
//   }
//  if (industryLower.includes("clothing")) {
//     console.log("🛣️ IndustryRouter: Routing to AcademyInventory");
//     return <ClothingGSTBill />;
//   }
  if (industryLower.includes("academy")) {
    
    return <AcademySubUsers />;
  }
  // For any other case, including "grocery" or if no specific match is found,
  // fall back to the default GroceryInventory.

  return <SubUserRecordsPage />;
}
