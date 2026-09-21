import React, { useState } from "react";
import { Check, X, Crown, Shield, Zap, Info, Loader2, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loadScript } from "./loadScript";
import { getSubscription, formatDate, daysLabel, TRIAL_DAYS } from "../../utils/subscription";

const featuresList = {
  trial: [
    { name: "Full Premium access for 14 days", included: true },
    { name: "Bills, invoices & GST bills (up to 300)", included: true },
    { name: "Products (up to 500, Excel import included)", included: true },
    { name: "Inventory, Records & Cash Book", included: true },
    { name: "Credit / customer dues", included: true },
    { name: "Industry-specific modules", included: true },
    { name: "Full Reports & analytics", included: true },
    { name: "Barcode generation", included: true },
    { name: "Online payment links (Razorpay) + email receipts", included: true },
    { name: "Data export (Excel / PDF)", included: true },
    { name: "1 staff login", included: true },
    { name: "Email support", included: true },
  ],
  standard: [
    { name: "Unlimited bills, invoices & GST bills", included: true },
    { name: "Products (up to 2,000, Excel import included)", included: true },
    { name: "Inventory, Records & Cash Book", included: true },
    { name: "Credit / customer dues (record payments manually)", included: true },
    { name: "Industry-specific modules", included: true },
    { name: "Basic dashboard analytics", included: true },
    { name: "Data export (limited)", included: true },
    { name: "3 staff logins (extra logins as add-on)", included: true },
    { name: "Email support", included: true },
    { name: "Full Reports module", included: false },
    { name: "Barcode generation", included: false },
    { name: "Online payment links + email receipts", included: false },
    { name: "Priority support", included: false },
  ],
  premium: [
    { name: "Unlimited bills, invoices & GST bills", included: true },
    { name: "Unlimited products (Excel import included)", included: true },
    { name: "Inventory, Records & Cash Book", included: true },
    { name: "Credit / customer dues", included: true },
    { name: "Industry-specific modules", included: true },
    { name: "Full Reports & analytics", included: true },
    { name: "Barcode generation", included: true },
    { name: "Online payment links (Razorpay) + email receipts", included: true },
    { name: "Data export (Excel / PDF)", included: true },
    { name: "6 staff logins (extra logins as add-on)", included: true },
    { name: "Priority support", included: true },
  ],
};

const pricingPlans = [
  {
    name: "Free Trial",
    tagline: `${TRIAL_DAYS} days, starts automatically at signup`,
    monthlyPrice: 0, yearlyPrice: 0, threeyearPrice: 0,
    icon: <Zap size={20} />, plan: "trial", accent: "bg-blue-500",
  },
  {
    name: "Standard",
    tagline: "Run the daily business",
    monthlyPrice: 10, yearlyPrice: 1, threeyearPrice: 7999,
    yearlysave: 291.58, threeyearsave: 666.58,
    icon: <Shield size={20} />, plan: "standard", accent: "bg-green-600",
  },
  {
    name: "Premium",
    tagline: "Grow and automate",
    monthlyPrice: 10, yearlyPrice: 1, threeyearPrice: 12999,
    yearlysave: 333.25, threeyearsave: 708.25,
    icon: <Crown size={20} />, plan: "premium", accent: "bg-green-600", badge: "Best Value",
  },
];

const TONE = {
  green: { panel: "border-green-200", bar: "bg-green-500", text: "text-green-700", chip: "bg-green-100 text-green-700" },
  amber: { panel: "border-amber-300", bar: "bg-amber-500", text: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
  red: { panel: "border-red-300", bar: "bg-red-500", text: "text-red-700", chip: "bg-red-100 text-red-700" },
};

function Pricing() {
  const { currentUser, createSubscriptionOrder, verifySubscriptionPayment, logout } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [processingPlan, setProcessingPlan] = useState(null);

  const sub = currentUser ? getSubscription(currentUser) : null;
  const tone = sub ? TONE[sub.tone] : TONE.green;
  const isOwner = ["owner", "TenantAdmin"].includes(currentUser?.role);
  const pct = sub && sub.daysLeft !== null && sub.totalDays
    ? Math.min(100, Math.round((sub.daysLeft / sub.totalDays) * 100))
    : 0;

  const priceFor = (plan) =>
    billingCycle === "monthly" ? plan.monthlyPrice : billingCycle === "yearly" ? plan.yearlyPrice : plan.threeyearPrice;

  // Secure flow: server creates the order, Razorpay collects payment, server verifies + activates.
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
      setProcessingPlan(plan.plan);

      const sdkLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!sdkLoaded) {
        toast.error("Could not load the payment window. Check your internet connection.");
        return;
      }

      const { orderId, amount, currency, keyId } = await createSubscriptionOrder({ plan: plan.plan, billingCycle });

      const paymentObject = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "SwordNex Billing",
        description: `${plan.name} Plan - ${billingCycle} Subscription`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Server derives plan/cycle/amount from the order; we only send proof of payment.
            await verifySubscriptionPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            toast.success(`You're now on the ${plan.name} plan. Remaining days were added.`);
            navigate("/dashboard");
          } catch (err) {
            console.error("Verification error:", err);
            toast.error(`Payment received but activation failed. Contact support with payment ID ${response.razorpay_payment_id}.`);
          }
        },
        prefill: {
          name: currentUser?.Tenant?.name || "",
          email: currentUser?.email || "",
        },
        theme: { color: "#16a34a" },
      });
      paymentObject.open();
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error(error?.msg || "Could not initiate payment.");
    } finally {
      setProcessingPlan(null);
    }
  };

  const isCurrent = (plan) => !!sub && sub.planKey === plan.plan;
  const isCurrentActive = (plan) => isCurrent(plan) && !sub.expired;

  const buttonLabel = (plan) => {
    if (processingPlan === plan.plan) {
      return (<><Loader2 className="animate-spin mr-2 h-4 w-4" />Processing...</>);
    }
    if (plan.plan === "trial") {
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
            {[["monthly", "Monthly"], ["yearly", "Yearly"], ["3years", "3 Years"]].map(([key, label]) => (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => {
            const current = isCurrent(plan);
            const trialCard = plan.plan === "trial";
            const disabled = !!processingPlan || trialCard;
            return (
              <div
                key={plan.plan}
                className={`relative bg-white rounded-xl shadow-lg overflow-hidden flex flex-col ${current && !sub.expired ? "border-2 border-green-500 ring-4 ring-green-100" : "border border-gray-200"}`}
              >
                {current && !sub.expired ? (
                  <div className="absolute right-4 top-4 bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full">Current plan</div>
                ) : plan.badge ? (
                  <div className="absolute right-4 top-4 bg-amber-500 text-white text-xs font-bold py-1 px-3 rounded-full">{plan.badge}</div>
                ) : null}

                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center mb-2">
                    <div className={`${plan.accent} p-2 rounded-full mr-3 text-white`}>{plan.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">{plan.tagline}</p>
                  {trialCard ? (
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">₹{priceFor(plan)}</span>
                        <span className="text-gray-500 ml-1">/{billingCycle === "monthly" ? "mo" : billingCycle === "yearly" ? "yr" : "3yr"}</span>
                      </div>
                      {billingCycle === "yearly" && plan.yearlysave && (<p className="text-green-600 text-sm mt-1">only ₹{plan.yearlysave} per month</p>)}
                      {billingCycle === "3years" && plan.threeyearsave && (<p className="text-green-600 text-sm mt-1">only ₹{plan.threeyearsave} per year</p>)}
                    </>
                  )}
                </div>

                <div className="p-6 flex-grow">
                  <h4 className="font-medium text-gray-900 mb-4">What's included:</h4>
                  <ul className="space-y-3">
                    {featuresList[plan.plan].map((f) => (
                      <li key={f.name} className="flex items-start">
                        {f.included
                          ? <Check className="text-green-500 mr-2 flex-shrink-0 mt-1" size={16} />
                          : <X className="text-gray-400 mr-2 flex-shrink-0 mt-1" size={16} />}
                        <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.name}</span>
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
                    {buttonLabel(plan)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-3 text-gray-600">
            <Info size={18} className="mr-2" />
            <p className="text-sm">Unused days on your current plan or trial are added to the plan you buy.</p>
          </div>
          <p className="text-gray-500 text-sm">
            Need a custom plan for your enterprise?{" "}
            <a href="#" className="text-green-600 font-medium">Contact our sales team</a>
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="container mx-auto px-4 mt-14">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
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
