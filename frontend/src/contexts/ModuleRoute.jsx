import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isModuleAllowed } from "../config/industryModules";

function ModuleRoute({ moduleKey, children }) {
  const { currentUser } = useAuth();
  const industryKey =
    currentUser?.Tenant?.industry ||
    localStorage.getItem("selectedIndustry") ||
    "others";

  if (!isModuleAllowed(industryKey, moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <div>{children}</div>;
}

export default ModuleRoute;
