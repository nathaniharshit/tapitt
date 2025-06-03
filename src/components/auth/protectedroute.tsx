import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  user: { role: string } | null;
  allowedRoles: string[];
  children: React.ReactNode;
}

const ProtectedRoute = ({ user, allowedRoles, children }: ProtectedRouteProps) => {
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;

// Usage example (not part of the component file):
// <ProtectedRoute user={user} allowedRoles={['admin', 'super_admin']}>
//   <AdminPanel userRole={user.role} />
// </ProtectedRoute>


