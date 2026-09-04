
import { useAuth } from "../../contexts/AuthContext";
import PharmacyAddCustomer from "../../industry/Pharmacy/PharmacyAddCustomer";
import AddCustomer from "../Billing/AddCustomer";


export default function IndustryAddCustomerRouter() {
  const { currentUser } = useAuth();
  const industry =
    currentUser?.industry ||
    currentUser?.companyDetails?.industry ||
    currentUser?.Tenant?.industry ||
    localStorage.getItem("selectedIndustry") ||

    
    null;

  if (!industry) {
    return <AddCustomer />;
  }

  const industryLower = industry.toLowerCase();
  const isPharmacy = industryLower.includes("pharmacy");


  if (isPharmacy) {
    return <PharmacyAddCustomer />; 
  }

  return <AddCustomer />;
}

