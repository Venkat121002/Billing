import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  const userData = currentUser;

  // If user is authenticated and is an employer, redirect to employer dashboard
  if (currentUser && userData?.role === 'employer') {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default PublicRoute; 