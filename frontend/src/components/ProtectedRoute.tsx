import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePermissions, type UserRole } from "../hooks/usePermissions";
import { useAuthStore } from "../stores/useAuthStore";
import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { useTranslation } from "../i18n/useTranslation";

interface ProtectedRouteProps extends PropsWithChildren {
  /**
   * Specific permission required to access this route
   */
  requiredPermission?: keyof ReturnType<typeof usePermissions>;
  
  /**
   * Specific roles allowed to access this route
   */
  allowedRoles?: UserRole[];
  
  /**
   * Where to redirect if access is denied
   */
  fallbackPath?: string;
  
  /**
   * Whether authentication is required (default: true)
   */
  requireAuth?: boolean;
}

/**
 * Unified authentication and authorization component
 * Combines RequireAuth, ProtectedRoute, and DashboardGuard functionality
 */
const ProtectedRoute = ({ 
  children, 
  requiredPermission, 
  allowedRoles,
  fallbackPath = "/reports",
  requireAuth = true
}: ProtectedRouteProps): JSX.Element => {
  useAuthBootstrap();
  
  const { token, user, isInitialized } = useAuthStore();
  const permissions = usePermissions();
  const location = useLocation();
  const t = useTranslation();

  // Wait for auth initialization
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-muted">
        {t.common.loading}...
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no user but token exists, something is wrong
  if (requireAuth && token && !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role as UserRole);
    if (!hasRequiredRole) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check permission-based access
  if (requiredPermission && user) {
    const hasPermission = permissions[requiredPermission];
    if (!hasPermission) {
      // Special handling for athletes who don't have access
      if (user.role === "athlete") {
        const status = user.athlete_status || "INCOMPLETE";
        if (status === "INCOMPLETE" || status === "REJECTED") {
          // These pages are handled by Login.tsx modal now
          return <Navigate to="/login" replace />;
        }
        if (status === "PENDING") {
          // These pages are handled by Login.tsx modal now
          return <Navigate to="/login" replace />;
        }
      }
      
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default ProtectedRoute;
