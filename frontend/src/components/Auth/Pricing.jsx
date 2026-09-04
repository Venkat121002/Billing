import React, { useState } from "react";
import { Check, X, Crown, Shield, Zap, Info, Loader2, FileText } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loadScript } from "./loadScript";
import jsPDF from "jspdf";
import BillingLayout from "../../Layout/BillingLayout/AdminLayout";
// import { updateUserSubscription } from "../api"; // backend update function



function Pricing() {
  const { currentUser, createSubscriptionOrder, verifySubscriptionPayment, startTrial, recordPayment } = useAuth();
  // Ensure we read plan from Tenant object if available
  const userData = currentUser;
  const currentPlan = (userData?.Tenant?.subscription_plan || userData?.plan)?.toLowerCase();
  const isPending = userData?.Tenant?.subscription_status === 'pending';
  const isTrialActive = currentPlan === 'trial' && String(userData?.Tenant?.subscription_status).toLowerCase() === 'active';
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const annualDiscount = 20;

  const featuresList = {
    trial: [
      { name: "Dashboard access", included: true },
      { name: "Add Customers & Products", included: true },
      { name: "Create Invoices (Max 20)", included: true },
      { name: "Basic Reports", included: true },
      { name: "GST/Tax Calculation (Basic)", included: true },
      { name: "Limited Cloud Storage", included: true },
      { name: "Manual Backup Download", included: true },
      { name: "Single User only", included: true },
      { name: "Unlimited Invoices", included: false },
      { name: "Expense Management", included: false },
      { name: "Inventory Auto-Sync", included: false },
      { name: "Multi-User access", included: false },
      { name: "Email/PDF automation", included: false },
      { name: "Payment reminders", included: false },
      { name: "Advanced Reports", included: false },
      { name: "Priority Support", included: false },
    ],
    standard: [
      { name: "Unlimited Invoices", included: true },
      { name: "Unlimited Customers & Products", included: true },
      { name: "Expense Management", included: true },
      { name: "Inventory Tracking", included: true },
      { name: "GST Reports (GSTR-1, GSTR-3B)", included: true },
      { name: "Data Backup (Monthly)", included: true },
      { name: "Multi-User (Up to 3 users)", included: true },
      { name: "Email Invoice (Manual send)", included: true },
      { name: "Basic Analytics", included: true },
      { name: "Receivables/Payables Summary", included: true },
      { name: "Auto Email/PDF Invoices", included: false },
      { name: "Auto Payment Reminders", included: false },
      { name: "Advanced Analytics", included: false },
      { name: "Multi-Branch Support", included: false },
      { name: "Real-time inventory sync", included: false },
      { name: "Priority Support", included: false },
    ],
    premium: [
      { name: "All Standard features included", included: true },
      { name: "Unlimited Users", included: true },
      { name: "Unlimited Cloud Storage", included: true },
      { name: "Auto Email/PDF Invoice", included: true },
      { name: "Auto Payment Reminders", included: true },
      { name: "Advanced Reports & Analytics", included: true },
      { name: "Multi-Branch Management", included: true },
      { name: "Real-Time Inventory Sync", included: true },
      { name: "Role-Based Permissions", included: true },
      { name: "API Access / Integrations", included: true },
      { name: "Priority Customer Support", included: true },
      { name: "Dedicated Account Manager", included: true },
    ],
  };

  const pricingPlans = [
    {
      id: 1,
      name: "15-Days Trial",
      tagline: "Test the software before buying",
      monthlyPrice: 0,
      yearlyPrice: 0,
      threeyearPrice: 0,
      yearlysave: 0,
      threeyearsave: 0,
      icon: <Zap size={20} />,
      plan: "trial",
      badge: "Free",
      color: "bg-blue-500",
    },
    {
      id: 2,
      name: "Standard",
      tagline: "Essential for small businesses",
      monthlyPrice: 10,
      yearlyPrice: 1,
      threeyearPrice: 7999,
      yearlysave: 291.58,
      threeyearsave: 666.58,
      icon: <Shield size={20} />,
      plan: "standard",
      badge: null,
      color: "bg-green-600",
    },
    {
      id: 3,
      name: "Premium",
      tagline: "Full Access - No Restrictions",
      monthlyPrice: 10,
      yearlyPrice: 1,
      threeyearPrice: 12999,
      yearlysave: 333.25,
      threeyearsave: 708.25,
      icon: <Crown size={20} />,
      plan: "premium",
      badge: "Best Value",
      color: "bg-green-600",
    },
  ];

  const handleTrialStart = async () => {
    if (!currentUser) {
      toast.error("Please log in to start your trial");
      navigate("/login");
      return;
    }
    if (userData?.trialUsed) {
      toast.error("You have already used your free trial");
      return;
    }
    try {
      setProcessingPlan("trial");
      await startTrial();
      toast.success("Trial activated! Welcome to SwordNex Billing!");

      // Force a slight delay or reload to ensure context updates
      setTimeout(() => {
        navigate("/dashboard");
        window.location.reload(); // Ensure global state refreshes from backend
      }, 1000);

    } catch (error) {
      console.error("Trial activation error:", error);
      // If error says trial already active/plan selected (400), treat as success
      if (error?.msg === "Trial already active or plan selected" || error?.response?.status === 400) {
        toast.success("Trial allows active! Going to Dashboard...");
        navigate("/dashboard");
        return;
      }
      toast.error("Failed to activate trial. Please try again.");
    } finally {
      setProcessingPlan(null);
    }
  };

  // const handlePayment = async (plan) => {
  //   if (!currentUser) {
  //     toast.error("Please log in to subscribe");
  //     navigate("/login");
  //     return;
  //   }
  //   const planAmount =
  //     billingCycle === "monthly"
  //       ? plan.monthlyPrice
  //       : billingCycle === "yearly"
  //         ? plan.yearlyPrice
  //         : plan.threeyearPrice;
  //   try {
  //     setProcessingPlan(plan.plan);
  //     setLoading(true);

  //     const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  //     if (!res) {
  //       setError("Razorpay SDK failed to load. Check your internet.");
  //       return;
  //     }

  //     const options = {
  //       key: "rzp_live_Rimr8JIVXNSKlr", // Replace with your Razorpay Key
  //       amount: planAmount * 100,
  //       currency: "INR",
  //       name: "SwordNex Billing",
  //       description: `${plan.name} Plan - ${billingCycle} Subscription`,
  //       image: "https://nexusjobs.in/logo.png",
  //       order_id: "", // Generate this on the server side
  //       handler: async function (response) {
  //         try {
  //           const subscriptionData = {
  //             plan: plan.plan,
  //             billingCycle: billingCycle,
  //             amount: planAmount,
  //             paymentMethod: "razorpay",
  //             paymentId: response.razorpay_payment_id,
  //           };
  //           await updateUserSubscription(subscriptionData);
  //           toast.success(`Successfully subscribed to ${plan.name} plan!`);
  //           navigate("/dashboard");
  //         } catch (error) {
  //           console.error("Subscription update error:", error);
  //           toast.error("Payment successful but subscription update failed. Please contact support.");
  //         }
  //       },
  //       prefill: {
  //         name: userData?.businessName || "",
  //         email: userData?.email || currentUser?.email || "",
  //       },
  //       theme: {
  //         color: "#FFD700",
  //       },
  //     };
  //     const paymentObject = new window.Razorpay(options);
  //     paymentObject.open();
  //   } catch (error) {
  //     console.error("Payment error:", error);
  //     toast.error("Payment failed. Please try again.");
  //   } finally {
  //     setLoading(false);
  //     setProcessingPlan(null);
  //   }
  // };


  /* 
   * SECURE PAYMENT FLOW 
   * 1. Create Order on Backend
   * 2. Open Razorpay
   * 3. Verify Payment on Backend
   */
  const handlePayment = async (plan) => {
    if (!currentUser) {
      toast.error("Please log in to subscribe");
      navigate("/login");
      return;
    }

    try {
      setProcessingPlan(plan.plan);
      setLoading(true);

      // Load Razorpay
      const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!res) {
        toast.error("Razorpay SDK failed to load.");
        return;
      }

      // Create order from backend
      const orderData = await createSubscriptionOrder({
        plan: plan.plan,
        billingCycle
      });

      const { orderId, amount, currency, keyId } = orderData;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "SwordNex Billing",
        description: `${plan.name} Plan - ${billingCycle} Subscription`,
        image: "https://nexusjobs.in/logo.png",
        order_id: orderId,

        handler: async function (response) {

          try {

            // 1️⃣ Verify payment
            await verifySubscriptionPayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              plan: plan.plan,
              billingCycle: billingCycle,
              amount: amount / 100
            });

            // 2️⃣ Record payment in DB
            await recordPayment({
              paymentId: response.razorpay_payment_id,
              plan: plan.name,
              amount: amount / 100,
              billingCycle
            });

            // 3️⃣ Send invoice email
            await handlePaymentSuccess(response, plan, amount / 100);

            toast.success(`Successfully subscribed to ${plan.name} plan!`);

            navigate("/dashboard");

          } catch (verr) {
            console.error("Verification error:", verr);
            toast.error("Payment successful but verification failed.");
          }

        },

        prefill: {
          name: userData?.businessName || "",
          email: userData?.email || currentUser?.email || "",
        },

        theme: {
          color: "#16a34a"
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error("Could not initiate payment.");
    } finally {
      setLoading(false);
      setProcessingPlan(null);
    }
  };
  // // --- 🧑‍💻 Developer-Only Test Plan Activation ---
  // const testUserEmails = [
  //   "tester.standard@example.com",
  //   "tester.premium@example.com",
  //   // Add any other test emails here
  // ];
  // const isTestUser = currentUser && testUserEmails.includes(currentUser.email);

  // const handleTestActivation = async (planName) => {
  //   if (!isTestUser) {
  //     toast.error("This feature is for test accounts only.");
  //     return;
  //   }

  //   setProcessingPlan(planName);
  //   try {
  //     const subscriptionData = {
  //       plan: planName,
  //       billingCycle: "yearly", // Default to yearly for testing
  //       amount: 0, // No cost for test activation
  //       paymentMethod: "test_activation",
  //       paymentId: `test_${Date.now()}`,
  //     };
  //     await updateUserSubscription(subscriptionData);
  //     toast.success(`Test plan "${planName}" activated successfully!`);
  //     navigate("/dashboard");
  //   } catch (error) {
  //     console.error("Test activation error:", error);
  //     toast.error("Failed to activate test plan.");
  //   } finally {
  //     setProcessingPlan(null);
  //   }
  // };
  const getPlanButtonText = (plan) => {
    if (processingPlan === plan.plan) {
      return (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          Processing...
        </>
      );
    }

    // Show "Start 15-Day Free Trial" for Standard plan if user is not on it
    if (plan.plan === "standard") {
      if (currentPlan === "standard" && userData?.subscription_status === "Trial") {
        return "Trial Active";
      }
      if (currentPlan === "standard") {
        return "Current Plan";
      }
      return "Choose Standard";
    }

    if (plan.plan === "trial") {
      if (userData?.trialUsed) return "Trial Used";
      // Explicitly check current plan for robustness
      if (currentPlan === 'trial' && isTrialActive) return "Continue to Dashboard";
      if (currentPlan === 'free') return "Start Free Trial"; // Explicitly allow free plan to start trial
      if (isPending) return "Start Free Trial";
      return "Start Free Trial";
    }
    if (currentPlan === plan.plan) {
      const expiry = userData?.Tenant?.subscription_expiry || userData?.subscriptionExpiry;
      if (expiry) {
        const expiryDate = new Date(expiry);
        const currentDate = new Date();

        if (currentDate <= expiryDate) {
          return "Current Plan"; // still valid
        }
      }
    }
    return `Choose ${plan.name}`;
  };

  const handlePaymentSuccess = async (response, plan, planAmount) => {
    try {

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("SwordNex Billing Invoice", 20, 20);

      doc.setFontSize(12);
      doc.text(`Customer: ${userData?.businessName}`, 20, 40);
      doc.text(`Email: ${userData?.email}`, 20, 55);
      doc.text(`Plan: ${plan.name}`, 20, 70);
      doc.text(`Amount Paid: ₹${planAmount}`, 20, 85);
      doc.text(`Payment ID: ${response.razorpay_payment_id}`, 20, 100);

      // Convert PDF → Base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      await fetch("/api/send-invoice-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: userData?.email,
          name: userData?.businessName,
          plan: plan.name,
          amount: planAmount,
          paymentId: response.razorpay_payment_id,
          pdf: pdfBase64
        })
      });

      toast.success("Invoice email sent successfully!");

    } catch (err) {
      console.error("Invoice error:", err);
      toast.error("Payment done but email failed.");
    }
  };

  // const getPlanButtonText = (plan) => {
  //   if (processingPlan === plan.plan) {
  //     return (
  //       <>
  //         <Loader2 className="animate-spin mr-2 h-4 w-4" />
  //         Processing...
  //       </>
  //     );
  //   }
  //   if (plan.plan === "trial") {
  //     if (userData?.trialUsed) {
  //       return "Trial Used";
  //     }
  //     return "Start Free Trial";
  //   }
  //   if (userData?.plan === plan.plan) {
  //     return "Current Plan";
  //   }
  //   return `Choose ${plan.name}`;
  // };

  // const isPlanDisabled = (plan) => {
  //   if (processingPlan) return true;
  //   if (plan.plan === "trial" && userData?.trialUsed) return true;
  //   if (userData?.plan === plan.plan) return true;
  //   return false;
  // };
  const isPlanDisabled = (plan) => {
    if (processingPlan) return true;
    if (plan.plan === "trial" && userData?.trialUsed) return true;

    // If user is already on this plan AND subscription not expired → disable
    if (currentPlan === plan.plan) {
      const expiry = userData?.Tenant?.subscription_expiry || userData?.subscriptionExpiry;
      if (expiry) {
        const expiryDate = new Date(expiry);
        const currentDate = new Date();
        if (currentDate <= expiryDate) {
          return true; // active plan → disable
        }
      }
    }

    return false; // expired → enable button again
  };


  const handlePlanSelection = (plan) => {
    if (plan.plan === "trial") {
      if (isTrialActive) {
        navigate("/dashboard");
      } else {
        handleTrialStart();
      }
    } else {
      handlePayment(plan);
    }
  };

  return (
    //  <BillingLayout>
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Header Section */}
      <div className="bg-green-600 text-white py-16">

        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-3 text-white">Choose Your Plan</h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
            Select the perfect plan for your needs and unlock the full potential
            of our platform
          </p>
        </div>


        {/* Invoice History Button - For logged-in users */}
        {/* {currentUser && (
          <div className="container mx-auto px-4 text-center mt-4">
            <button
              onClick={() => navigate("/billing-history")} // This navigates to your invoice history page.
              className="bg-white text-green-600 font-semibold py-2 px-6 rounded-full shadow-md hover:bg-gray-100 transition-all inline-flex items-center"
            >
              <FileText size={18} className="mr-2" /> View Invoice History
            </button>
          </div>
        )} */}
      </div>
      {/* Pricing Container */}
      <div className="container mx-auto px-4 -mt-8">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 inline-flex shadow-md">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "monthly"
                ? "bg-green-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "yearly"
                ? "bg-green-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setBillingCycle("3years")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "3years"
                ? "bg-green-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              3 Years{" "}
              <span className="text-xs font-bold ml-1 text-green-600">
                {annualDiscount}% off
              </span>
            </button>
          </div>
        </div>
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden border border-green-500 transition-transform duration-300 flex flex-col h-full ${hoveredPlan === plan.id ? "transform -translate-y-2 border-2 border-green-500 shadow-xl" : ""
                } `}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              {/* Badge if exists */}
              {plan.badge && (
                <div className="bg-green-500 text-white text-xs font-bold py-1 px-3 absolute right-4 top-4 rounded-full">
                  {plan.badge}
                </div>
              )}
              {/* Plan Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center mb-2">
                  <div
                    className={`${plan.color} p-2 rounded-full mr-3 text-white`}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                </div>
                <p className="text-gray-500 text-sm mb-4">{plan.tagline}</p>
                <div className="flex items-baseline">
                  {plan.plan === 'trial' ? (
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">
                        ₹
                        {billingCycle === "monthly"
                          ? plan.monthlyPrice
                          : billingCycle === "yearly"
                            ? plan.yearlyPrice
                            : plan.threeyearPrice}
                      </span>
                      <span className="text-gray-500 ml-1">
                        /{billingCycle === "monthly" ? "mo" : billingCycle === "yearly" ? "yr" : "3yr"}
                      </span>
                    </>
                  )}
                </div>
                {billingCycle === "yearly" && plan.yearlysave && (<p className="text-green-600 text-sm mt-1"> only ₹{plan.yearlysave} per month </p>)}
                {billingCycle === "3years" && plan.threeyearsave && (<p className="text-green-600 text-sm mt-1"> only ₹{plan.threeyearsave} per year </p>)}
              </div>
              {/* Features List */}
              <div className="p-6 flex-grow">
                <h4 className="font-medium text-gray-900 mb-4">
                  What's included:
                </h4>
                <ul className="space-y-3">
                  {featuresList[plan.plan].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      {feature.included ? (
                        <Check
                          className="text-green-500 mr-2 flex-shrink-0 mt-1"
                          size={16}
                        />
                      ) : (
                        <X
                          className="text-gray-400 mr-2 flex-shrink-0 mt-1"
                          size={16}
                        />
                      )}
                      <span
                        className={
                          feature.included ? "text-gray-700" : "text-gray-400"
                        }
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* CTA Button */}
              <div className="p-6 pt-0 mt-auto">
                <button
                  onClick={() => handlePlanSelection(plan)}
                  disabled={isPlanDisabled(plan)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isPlanDisabled(plan)
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : plan.badge
                      ? "bg-green-600 hover:bg-green-500 focus:ring-green-500 text-white"
                      : `${plan.color} hover:opacity-90 focus:ring-green-500 text-white`
                    }`}
                >
                  {getPlanButtonText(plan)}
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Additional Information */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center mb-4 text-gray-600">
            <Info size={18} className="mr-2" />
            <p className="text-sm">
              All plans come with a 14-day money-back guarantee
            </p>
          </div>
          <p className="text-gray-500 text-sm">
            Need a custom plan for your enterprise?{" "}
            <a href="#" className="text-green-600 font-medium">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>

      {/* --- 🧑‍💻 Developer Test Panel --- */}
      {/* {isTestUser && (
        <div className="container mx-auto px-4 mt-12">
          <div className="max-w-2xl mx-auto bg-green-50 border-2 border-dashed border-green-500 rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold text-green-800">
              🧪 Developer Test Panel
            </h3>
            <p className="text-green-700 mt-2 mb-4">
              Use these buttons to assign a plan to your test account without
              payment.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleTestActivation("standard")}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Activate Standard Plan
              </button>
              <button
                onClick={() => handleTestActivation("premium")}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700"
              >
                Activate Premium Plan
              </button>
            </div>
          </div>
        </div>
      )} */}

      {/* FAQ Section */}
      <div className="container mx-auto  px-4 mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto grid gap-6">
          <div className="bg-white p-6 border border-green-500 rounded-lg shadow">
            <h3 className="font-bold text-gray-900 mb-2">
              How does the billing cycle work?
            </h3>
            <p className="text-gray-600">
              You can choose between yearly or annual billing. Annual billing
              saves you 20% compared to paying yearly.
            </p>
          </div>
          <div className="bg-white border border-green-500 p-6 rounded-lg shadow">
            <h3 className="font-bold text-gray-900 mb-2">
              Can I change my plan later?
            </h3>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. When
              upgrading, you'll pay the prorated difference.
            </p>
          </div>
          <div className="bg-white p-6 border border-green-500 rounded-lg shadow">
            <h3 className="font-bold text-gray-900 mb-2">
              Do you offer refunds?
            </h3>
            <p className="text-gray-600">
              Yes, we offer a 14-day money-back guarantee if you're not
              satisfied with our service.
            </p>
          </div>
        </div>
      </div>
    </div>
    // </BillingLayout>
  );
}

export default Pricing;
