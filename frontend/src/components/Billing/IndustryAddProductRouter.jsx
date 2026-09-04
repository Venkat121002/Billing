import { useAuth } from "../../contexts/AuthContext";
import GroceryAddProduct from "../../industry/grocery/groceryAddProduct";
import AddCourse from "../../industry/academy/academyproduct";
import AddMobileProduct from "../../industry/mobile/addmobileproduct";
import AddSoftwareService from "../../industry/SoftwareDevelopment/AddSoftwareService";
import ClothingAddProduct from "../../industry/Clothing/ClothingAddProduct";
import PharmacyAddProduct from "../../industry/Pharmacy/PharmacyAddProduct";

export default function IndustryAddProductRouter() {
  const { currentUser } = useAuth();
  const industry =
    currentUser?.industry ||
    currentUser?.companyDetails?.industry ||
    currentUser?.Tenant?.industry ||
    localStorage.getItem("selectedIndustry") ||

    
    null;

  if (!industry) {
    return <AddProduct />;
  }

  const industryLower = industry.toLowerCase();
  const isMobile = industryLower.includes("mobile");
  const isAcademy = industryLower.includes("academy");
  const isSoftwareDev = industryLower.includes("software_development");
  const isClothing = industryLower.includes("clothing");
  const isPharmacy = industryLower.includes("pharmacy");

  if (isClothing) {
    return <ClothingAddProduct />;
  }


  if (isMobile) {
    return <AddMobileProduct />;
  }
  if (isAcademy) {
    return <AddCourse />;
  }
  if (isSoftwareDev) {
    return <AddSoftwareService />;
  }
  if (isPharmacy) {
    return <PharmacyAddProduct />;
  }

  return <GroceryAddProduct />;
}
