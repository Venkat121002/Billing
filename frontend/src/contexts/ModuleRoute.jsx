import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isModuleAllowed } from "../config/industryModules";
import { resolveIndustryProfile } from "../config/industryProfiles";

function ModuleRoute({ moduleKey, children }) {
  const { currentUser } = useAuth();
  const { key: industryKey } = resolveIndustryProfile(currentUser);

  if (!isModuleAllowed(industryKey, moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <div>{children}</div>;
}

export default ModuleRoute;
