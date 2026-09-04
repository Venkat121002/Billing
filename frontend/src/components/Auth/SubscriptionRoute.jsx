import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import axios from "axios"; // ✅ Import axios

function SubscriptionRoute({ children }) {
  const { currentUser, userData, loading: authLoading } = useAuth();

  // Show loading spinner while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check subscription status
  const tenant = currentUser.Tenant || currentUser.tenant;

  

  // Allow access if tenant exists and status is Active or Trial
  // Ultra-robust check: Case-insensitive status OR plan name whitelist
  const hasValidSubscription = tenant && (
    String(tenant.subscription_status).toLowerCase() === 'active' ||
    String(tenant.subscription_status).toLowerCase() === 'trial' ||
    ['standard', 'premium', 'trial'].includes(String(tenant.subscription_plan).toLowerCase())
  );

  // Redirect to pricing if no valid subscription
  if (!hasValidSubscription) {
    console.warn("Invalid subscription status. Redirecting to pricing.", tenant?.subscription_status);
    return <Navigate to="/pricing" replace />;
  }

  // Check if subscription is expired
  if (tenant.subscription_expiry) {
    const expiryDate = new Date(tenant.subscription_expiry);
    const currentDate = new Date();

    const diffTime = expiryDate - currentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // ✅ 1. Send reminder email for 5,4,3,2,1 days left
    if ([5, 4, 3, 2, 1].includes(diffDays)) {
      sendBrevoEmail("template_reminder", {
        to: currentUser.email,
        name: currentUser.name || "Customer",
        plan: tenant?.subscription_plan,
        daysLeft: diffDays,
        expiryDate: tenant.subscription_expiry,
      });
    }

    // ✅ 2. Send expired email if plan expired
    if (currentDate > expiryDate) {
      sendBrevoEmail("template_expired", {
        to: currentUser.email,
        name: currentUser.name || "Customer",
        plan: tenant?.subscription_plan,
        expiryDate: tenant.subscription_expiry,
      });
      return <Navigate to="/pricing" replace />;
    }
  }

  // ✅ 3. If paymentSuccess flag exists, send Payment Success Email
  if (currentUser.paymentSuccess && currentUser.planStartDate && currentUser.subscriptionExpiry) {
    sendBrevoEmail("template_payment_success", {
      to: currentUser.email,
      name: currentUser.name || "Customer",
      plan: tenant?.subscription_plan, // Fixed to use tenant plan
      startDate: currentUser.planStartDate,
      expiryDate: currentUser.subscriptionExpiry,
    });

    // optional: once sent, mark it as false (prevent duplicate email)
    currentUser.paymentSuccess = false;
  }

  return children;

  // ---------------- Brevo Email Function ----------------
  async function sendBrevoEmail(templateKey, data) {
    try {
      const response = await axios.post(
        "YOUR_FIREBASE_FUNCTION_URL/sendBrevoTemplateEmail",
        {
          templateKey,
          data,
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Brevo email error:",
        error.response?.data || error.message
      );
    }
  }

export default SubscriptionRoute;
