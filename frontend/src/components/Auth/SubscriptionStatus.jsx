import React from "react";
import { Link } from "react-router-dom";
import { Clock, Crown, Sparkles } from "lucide-react";
import { getSubscription, formatDate, daysLabel } from "../../utils/subscription";

const TONES = {
  green: { chip: "bg-green-50 text-green-700 border-green-200", bar: "bg-green-500", card: "border-green-200 bg-green-50/60", text: "text-green-700" },
  amber: { chip: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500", card: "border-amber-200 bg-amber-50/70", text: "text-amber-700" },
  red: { chip: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500", card: "border-red-200 bg-red-50/70", text: "text-red-700" },
};

/** Small header chip: "Trial · 9d left". Clicking opens the plans page. Owners only. */
export function SubscriptionBadge({ user }) {
  if (!["owner", "TenantAdmin"].includes(user?.role)) return null;
  const sub = getSubscription(user);
  const t = TONES[sub.tone];
  return (
    <Link
      to="/pricing"
      title="View plans"
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${t.chip}`}
    >
      {sub.isTrial ? <Clock className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
      {sub.label}
      {sub.daysLeft !== null && <span>· {sub.expired ? "expired" : `${sub.daysLeft}d left`}</span>}
    </Link>
  );
}

/** Dashboard widget: current plan, days left, progress and an upgrade button. Owners only. */
export function SubscriptionCard({ user }) {
  if (!["owner", "TenantAdmin"].includes(user?.role)) return null;
  const sub = getSubscription(user);
  const t = TONES[sub.tone];
  const pct =
    sub.daysLeft !== null && sub.totalDays
      ? Math.min(100, Math.max(0, Math.round((sub.daysLeft / sub.totalDays) * 100)))
      : 100;

  return (
    <div className={`mb-6 rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${t.card}`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
          {sub.isTrial ? <Sparkles className={`w-5 h-5 ${t.text}`} /> : <Crown className={`w-5 h-5 ${t.text}`} />}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Current plan</p>
          <p className="text-lg font-bold text-gray-900">{sub.label}</p>
        </div>
      </div>

      <div className="flex-1">
        {sub.daysLeft !== null ? (
          <>
            <div className="flex justify-between text-sm mb-1.5">
              <span className={`font-semibold ${t.text}`}>
                {sub.expired ? "Expired" : `${daysLabel(sub.daysLeft)} left`}
              </span>
              <span className="text-gray-500">
                {sub.expired ? "Ended" : "Ends"} {formatDate(sub.endDate)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white overflow-hidden">
              <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${sub.expired ? 0 : pct}%` }} />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">No expiry date on this plan.</p>
        )}
      </div>

      {(sub.isTrial || sub.expired || (sub.daysLeft !== null && sub.daysLeft <= 30)) && (
        <Link
          to="/pricing"
          className="inline-flex justify-center rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm"
        >
          {sub.isTrial ? "Upgrade" : "Renew / Upgrade"}
        </Link>
      )}
    </div>
  );
}
