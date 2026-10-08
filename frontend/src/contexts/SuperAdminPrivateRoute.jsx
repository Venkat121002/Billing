import { Navigate } from "react-router-dom";
import { useSuperAdminAuth } from "./SuperAdminAuthContext";

function SuperAdminPrivateRoute({ children }) {
  const { email, loading } = useSuperAdminAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 sa-dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!email) {
    return <Navigate to="/superadmin/login" />;
  }

  return children;
}

export default SuperAdminPrivateRoute;
