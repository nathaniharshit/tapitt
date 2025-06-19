import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  user: { roleRef?: { permissions?: string[] } } | null;
  requiredPermission: string;
  children: React.ReactNode;
}

const ProtectedRoute = ({ user, requiredPermission, children }: ProtectedRouteProps) => {
  if (!user || !user.roleRef || !Array.isArray(user.roleRef.permissions) || !user.roleRef.permissions.includes(requiredPermission)) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;

// Usage example:
// <ProtectedRoute user={user} requiredPermission="edit_employee">
//   <AdminPanel userRole={user.role} />
// </ProtectedRoute>


