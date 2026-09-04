import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

function EmployerRoute() {
  const { currentUser, loading } = useAuth();
  const userData = currentUser;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Check if user is authenticated and has employer role
  if (!currentUser || !userData || userData.role !== "employer") {
    return <Navigate to="/login" />;
  }

  // Check if employer account is approved
  if (userData.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Pending Approval
          </h2>
          <p className="text-gray-600">
            Your employer account is currently under review. We'll notify you
            once it's approved.
          </p>
        </div>
      </div>
    );
  }

  // If authenticated as employer and approved, render the protected routes
  return <Outlet />;
}

export default EmployerRoute;
