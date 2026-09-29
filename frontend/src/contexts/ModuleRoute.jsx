import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { isModuleAllowed } from "../config/industryModules";
import { resolveIndustryProfile } from "../config/industryProfiles";

// Only these module keys are gated by plan (Standard vs Premium); everything
// else stays purely industry-gated, as before. See planCapabilities.js.
const MODULE_TO_CAPABILITY = {
  barcodes: "barcodes",
  reports: "reports",
};

function ModuleRoute({ moduleKey, children }) {
  const { currentUser, hasCapability, planCapabilitiesLoading } = useAuth();
  const { key: industryKey } = resolveIndustryProfile(currentUser);

  if (!isModuleAllowed(industryKey, moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  const capKey = MODULE_TO_CAPABILITY[moduleKey];
  if (capKey) {
    // Wait for the plan-capabilities fetch rather than redirecting on a
    // still-loading (permissive-by-default) value — avoids a flash where an
    // allowed user briefly gets bounced before the real answer arrives.
    if (planCapabilitiesLoading) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <Loader2 className="animate-spin h-6 w-6" />
        </div>
      );
    }
    if (!hasCapability(capKey)) {
      try {
        sessionStorage.setItem("upgradeReason", `Upgrade your plan to use ${moduleKey === "barcodes" ? "Barcodes" : "Reports"}.`);
      } catch { /* ignore (private browsing etc.) */ }
      return <Navigate to="/pricing" replace />;
    }
  }

  return <div>{children}</div>;
}

export default ModuleRoute;
