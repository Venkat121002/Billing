export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_LABELS = {
  trial: "Free Trial",
  standard: "Standard",
  premium: "Premium",
  free: "No plan",
};

/**
 * Normalise the subscription fields the backend puts on currentUser.Tenant.
 * Days are counted in whole days, rounded up (a plan ending later today = 1 day left).
 */
export function getSubscription(user, now = new Date()) {
  const tenant = user?.Tenant || user?.tenant || {};
  const planKey = String(tenant.subscription_plan || "free").toLowerCase();
  const status = String(tenant.subscription_status || "").toLowerCase();
  const end = tenant.subscription_expiry ? new Date(tenant.subscription_expiry) : null;
  const start = tenant.subscription_start ? new Date(tenant.subscription_start) : null;

  const daysLeft = end ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : null;
  const expired = status !== "active" || (end !== null && end < now);

  // Length of the current period, used for the progress bar.
  let totalDays = planKey === "trial" ? TRIAL_DAYS : null;
  if (start && end && end > start) totalDays = Math.max(1, Math.round((end - start) / DAY_MS));

  const tone = expired || (daysLeft !== null && daysLeft <= 3)
    ? "red"
    : daysLeft !== null && daysLeft <= 7
      ? "amber"
      : "green";

  return {
    planKey,
    label: PLAN_LABELS[planKey] || tenant.subscription_plan || "No plan",
    isTrial: planKey === "trial",
    expired,
    daysLeft,
    totalDays,
    endDate: end,
    tone,
  };
}

export const formatDate = (d) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

export const daysLabel = (n) => (n === 1 ? "1 day" : `${n} days`);
