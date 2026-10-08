import React, { useEffect, useState } from "react";
import { Check, Crown, Shield, Zap, Info, Loader2, LogOut, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loadScript } from "./loadScript";
import { getSubscription, formatDate, daysLabel, TRIAL_DAYS } from "../../utils/subscription";
import { capabilitiesToDisplayList } from "../../config/planCapabilities";

// Purely cosmetic per-plan styling — everything else (name, price, what's
// included) comes from the backend so the superadmin Plans page controls it.
const STYLE_BY_KEY = {
  trial: { icon: Zap, accent: "bg-blue-500" },
  standard: { icon: Shield, accent: "bg-green-600" },
  premium: { icon: Crown, accent: "bg-green-600" },
};

const TONE = {
  green: { panel: "border-green-200", bar: "bg-green-500", text: "text-green-700", chip: "bg-green-100 text-green-700" },
  amber: { panel: "border-amber-300", bar: "bg-amber-500", text: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
  red: { panel: "border-red-300", bar: "bg-red-500", text: "text-red-700", chip: "bg-red-100 text-red-700" },
};

function Pricing() {
  const { currentUser, getPlans, createSubscriptionOrder, verifySubscriptionPayment, logout } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [processingPlan, setProcessingPlan] = useState(null);
  const [plans, setPlans] = useState(null);
  const [plansError, setPlansError] = useState(null);

  // A plan-gated screen (see ModuleRoute.jsx) may have bounced the user here
  // with a one-line reason — show it once, then clear it.
  const [upgradeReason] = useState(() => {
    try {
      const r = sessionStorage.getItem("upgradeReason");
      sessionStorage.removeItem("upgradeReason");
      return r;
    } catch {
      return null;
    }
  });

  const loadPlans = async () => {
    setPlansError(null);
    try {
      const data = await getPlans();
      setPlans(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      setPlansError(err?.msg || "Could not load plans. Please try again.");
    }
  };

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sub = currentUser ? getSubscription(currentUser) : null;
  const tone = sub ? TONE[sub.tone] : TONE.green;
  const isOwner = ["owner", "TenantAdmin"].includes(currentUser?.role);
  const pct = sub && sub.daysLeft !== null && sub.totalDays
    ? Math.min(100, Math.round((sub.daysLeft / sub.totalDays) * 100))
    : 0;

  const priceFor = (plan) => (billingCycle === "monthly" ? plan.monthly : plan.yearly);

  // Secure flow: server creates the order (price comes from the Plan doc, not
  // the browser), Cashfree collects payment, server verifies + activates.
  const handlePayment = async (plan) => {
    if (!currentUser) {
      toast.error("Please log in to subscribe");
      navigate("/login");
      return;
    }
    if (!isOwner) {
      toast.error("Only the account owner can change the subscription.");
      return;
    }

    try {
      setProcessingPlan(plan.key);

      const { orderId, paymentSessionId, amount, currency, environment } = await createSubscriptionOrder({
        plan: plan.key,
        billingCycle
      });

      // Load Cashfree SDK
      const scriptUrl = environment === 'sandbox'
        ? "https://sdk.cashfree.com/js/v3/cashfree.sandbox.js"
        : "https://sdk.cashfree.com/js/v3/cashfree.js";

      const sdkLoaded = await loadScript(scriptUrl);
      if (!sdkLoaded) {
        toast.error("Could not load the payment window. Check your internet connection.");
        setProcessingPlan(null);
        return;
      }

      // Initialize Cashfree
      const cashfree = window.Cashfree({
        mode: environment === 'sandbox' ? 'sandbox' : 'production'
      });

      // Checkout options
      const checkoutOptions = {
        paymentSessionId: paymentSessionId,
        returnUrl: `${window.location.origin}/pricing?order_id=${orderId}`,
      };

      // Open checkout
      cashfree.checkout(checkoutOptions).then(async (result) => {
        if (result.error) {
          toast.error(result.error.message || "Payment failed. Please try again.");
          setProcessingPlan(null);
          return;
        }

        // Verify payment on return
        try {
          await verifySubscriptionPayment({ orderId });
          toast.success(`You're now on the ${plan.name} plan. Remaining days were added.`);
          navigate("/dashboard");
        } catch (err) {
          console.error("Verification error:", err);
          toast.error(`Payment received but activation failed. Contact support with order ID ${orderId}.`);
        } finally {
          setProcessingPlan(null);
        }
      }).catch((err) => {
        toast.error(err.message || "Payment failed. Please try again.");
        setProcessingPlan(null);
      });

    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error(error?.msg || "Could not initiate payment.");
      setProcessingPlan(null);
    }
  };

  const isCurrent = (plan) => !!sub && sub.planKey === plan.key;
  const isCurrentActive = (plan) => isCurrent(plan) && !sub.expired;

  const buttonLabel = (plan) => {
    if (processingPlan === plan.key) {
      return (<><Loader2 className="animate-spin mr-2 h-4 w-4" />Processing...</>);
    }
    if (plan.key === "trial") {
      if (isCurrentActive(plan)) return `Current plan · ${daysLabel(sub.daysLeft)} left`;
      return sub ? "Trial ended" : `${TRIAL_DAYS}-day trial on signup`;
    }
    if (isCurrentActive(plan)) return "Extend this plan";
    if (sub?.isTrial && !sub.expired) return `Upgrade to ${plan.name}`;
    return `Choose ${plan.name}`;
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Hero */}
      <div className="bg-green-600 text-white pt-14 pb-24">
        <div className="container mx-auto px-4 text-center relative">
          {currentUser && (
            <button
              onClick={() => logout()}
              className="absolute right-4 top-0 inline-flex items-center gap-1.5 text-sm text-green-100 hover:text-white"
            >
              <LogOut size={15} /> Log out
            </button>
          )}
          <h1 className="text-4xl font-bold mb-3">Plans &amp; Subscription</h1>
          <p className="text-lg text-green-100 max-w-2xl mx-auto">
            {sub?.expired
              ? "Your access has ended. Pick a plan to keep using SwordNex Billing. Your data is safe."
              : "Upgrade any time. Days you haven't used are added to your new plan."}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-14">
        {upgradeReason && (
          <div className="max-w-5xl mx-auto mb-6 bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-xl px-4 py-3 text-center">
            {upgradeReason}
          </div>
        )}

        {/* Current plan panel */}
        {sub && (
          <div className={`max-w-5xl mx-auto mb-8 bg-white rounded-2xl shadow-lg border-2 ${tone.panel} p-5 sm:p-6`}>
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="md:w-1/3">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Your current plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-2xl font-bold text-gray-900">{sub.label}</h2>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.expired ? TONE.red.chip : tone.chip}`}>
                    {sub.expired ? "Expired" : "Active"}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                {sub.daysLeft !== null ? (
                  <>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className={`text-2xl font-extrabold ${tone.text}`}>
                        {sub.expired ? "0 days left" : `${daysLabel(sub.daysLeft)} left`}
                      </span>
                      <span className="text-sm text-gray-500">
                        {sub.expired ? "Ended" : "Ends"} {formatDate(sub.endDate)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${sub.expired ? 0 : pct}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600">No expiry date on this plan.</p>
                )}
              </div>

              {!sub.expired && (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-600 text-green-700 hover:bg-green-50 font-semibold px-5 py-2.5"
                >
                  Back to dashboard <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 inline-flex shadow-md">
            {[["monthly", "Monthly"], ["yearly", "Yearly"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setBillingCycle(key)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === key ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        {!plans && !plansError && (
          <p className="text-center text-gray-500 py-16">Loading plans…</p>
        )}

        {plansError && (
          <div className="max-w-md mx-auto text-center py-10">
            <p className="text-red-600 mb-3">{plansError}</p>
            <button
              onClick={loadPlans}
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        )}

        {plans && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const style = STYLE_BY_KEY[plan.key] || STYLE_BY_KEY.standard;
              const Icon = style.icon;
              const current = isCurrent(plan);
              const trialCard = plan.key === "trial";
              // A paid plan the super admin hasn't priced yet (₹0) can't be bought.
              const unpriced = !trialCard && !(Number(priceFor(plan)) > 0);
              const disabled = !!processingPlan || trialCard || unpriced;
              const monthlyEquivalent = !trialCard && plan.yearly > 0 ? Math.round(plan.yearly / 12) : null;

              return (
                <div
                  key={plan.key}
                  className={`relative bg-white rounded-xl shadow-lg overflow-hidden flex flex-col ${current && !sub?.expired ? "border-2 border-green-500 ring-4 ring-green-100" : "border border-gray-200"}`}
                >
                  {current && !sub?.expired ? (
                    <div className="absolute right-4 top-4 bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full">Current plan</div>
                  ) : plan.badge ? (
                    <div className="absolute right-4 top-4 bg-amber-500 text-white text-xs font-bold py-1 px-3 rounded-full">{plan.badge}</div>
                  ) : null}

                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center mb-2">
                      <div className={`${style.accent} p-2 rounded-full mr-3 text-white`}><Icon size={20} /></div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">{plan.tagline}</p>
                    {trialCard ? (
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                    ) : unpriced ? (
                      <span className="text-xl font-semibold text-gray-500">Price coming soon</span>
                    ) : (
                      <>
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-gray-900">₹{priceFor(plan)}</span>
                          <span className="text-gray-500 ml-1">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                        </div>
                        {billingCycle === "yearly" && monthlyEquivalent !== null && (
                          <p className="text-green-600 text-sm mt-1">only ₹{monthlyEquivalent} per month</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="p-6 flex-grow">
                    <h4 className="font-medium text-gray-900 mb-4">What's included:</h4>
                    <ul className="space-y-3">
                      {capabilitiesToDisplayList(plan.capabilities).map((f, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="text-green-500 mr-2 flex-shrink-0 mt-1" size={16} />
                          <span className="text-gray-700">{f.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-6 pt-0 mt-auto">
                    <button
                      onClick={() => handlePayment(plan)}
                      disabled={disabled}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all inline-flex items-center justify-center ${disabled
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"}`}
                    >
                      {unpriced ? "Not available yet" : buttonLabel(plan)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-3 text-gray-600">
            <Info size={18} className="mr-2" />
            <p className="text-sm">Unused days on your current plan or trial are added to the plan you buy.</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="container mx-auto px-4 mt-14">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto grid gap-4">
          {[
            [`How does the free trial work?`, `Every new account gets a ${TRIAL_DAYS}-day free trial automatically at signup. No card needed. You can see the days remaining on your dashboard.`],
            ["What happens when the trial ends?", "You'll be brought to this page to choose a plan. Your data is kept, and access returns as soon as you subscribe."],
            ["What happens to my remaining days if I upgrade?", "They are added on top of the new plan. For example, upgrading with 5 trial days left gives you the plan period plus 5 extra days."],
            ["Can I extend or switch plans later?", "Yes. Buy again at any time from this page; the new period is added after your current end date."],
          ].map(([q, a]) => (
            <div key={q} className="bg-white p-5 border border-green-200 rounded-lg shadow-sm">
              <h3 className="font-bold text-gray-900 mb-1">{q}</h3>
              <p className="text-gray-600 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Pricing;
