// ProtectedRoute.tsx
// Wrap admin-only or employee-only routes with this.
//
// Usage in your router:
//   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
//     <Route path="/admin/dashboard" element={<AdminDashboard />} />
//   </Route>

import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type UserRole } from "./AuthContext";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Logged in, but wrong role — send them to their own dashboard instead of /login.
    const fallback = user.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}