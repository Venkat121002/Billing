import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";

function SubscriptionRoute({ children }) {
  const { currentUser, loading: authLoading } = useAuth();

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

  // Allow access if tenant exists and status is Active or Trial.
  // Case-insensitive status OR plan-name whitelist.
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

  // Redirect to pricing if the subscription has expired.
  if (tenant.subscription_expiry) {
    const expiryDate = new Date(tenant.subscription_expiry);
    if (new Date() > expiryDate) {
      return <Navigate to="/pricing" replace />;
    }
  }

  return children;
}

export default SubscriptionRoute;
