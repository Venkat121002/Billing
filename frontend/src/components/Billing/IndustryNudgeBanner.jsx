import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { hasChosenIndustry } from "../../config/industryProfiles";

const DISMISS_KEY = "industryNudgeDismissed";

/**
 * Dismissible nudge shown on the dashboard until the tenant completes their
 * Company Profile (picks an industry in Settings). Never blocks anything —
 * the generic app is fully usable without it. See UNIFICATION_PLAN.md.
 */
export default function IndustryNudgeBanner({ currentUser }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  // Only the owner can act on this (industry selection is owner-only).
  if (dismissed || currentUser?.role !== "owner" || hasChosenIndustry(currentUser)) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
      <div className="flex items-center gap-2 text-emerald-800">
        <Sparkles className="w-4 h-4 shrink-0" />
        <span>
          Complete your <strong>Company Profile</strong> and pick your industry
          to unlock the fields and tools built for your business.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate("/settings?section=profile")}
          className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Complete Profile
        </button>
        <button
          onClick={dismiss}
          className="text-emerald-600 hover:text-emerald-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
