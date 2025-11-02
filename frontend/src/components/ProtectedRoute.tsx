import { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions, type UserRole } from "../hooks/usePermissions";
import { useAuthStore } from "../stores/useAuthStore";

interface ProtectedRouteProps extends PropsWithChildren {
  requiredPermission?: keyof ReturnType<typeof usePermissions>;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  allowedRoles,
  fallbackPath = "/reports" 
}: ProtectedRouteProps): JSX.Element => {
  const permissions = usePermissions();
  const user = useAuthStore((state) => state.user);

  console.log("ProtectedRoute - User:", user?.email);
  console.log("ProtectedRoute - Required permission:", requiredPermission);
  console.log("ProtectedRoute - User permissions:", permissions);

  // If specific roles are required, check them
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role as UserRole);
    if (!hasRequiredRole) {
      console.log("ProtectedRoute - Role check failed, redirecting to:", fallbackPath);
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // If specific permission is required, check it
  if (requiredPermission) {
    const hasPermission = permissions[requiredPermission];
    if (!hasPermission) {
      console.log("ProtectedRoute - Permission check failed, redirecting");
      
      // Special handling for athletes who don't have access
      if (user?.role === "athlete") {
        const status = user.athlete_status || "INCOMPLETE";
        if (status === "INCOMPLETE" || status === "REJECTED") {
          console.log("ProtectedRoute - Redirecting incomplete athlete to onboarding");
          return <Navigate to="/athlete-onboarding" replace />;
        }
        if (status === "PENDING") {
          console.log("ProtectedRoute - Redirecting pending athlete to awaiting approval");
          return <Navigate to="/awaiting-approval" replace />;
        }
      }
      
      console.log("ProtectedRoute - Using fallback path:", fallbackPath);
      return <Navigate to={fallbackPath} replace />;
    }
  }

  console.log("ProtectedRoute - Access granted");
  return <>{children}</>;
};

export default ProtectedRoute;
