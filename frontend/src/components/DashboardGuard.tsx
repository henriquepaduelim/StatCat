import { useAuthStore } from "../stores/useAuthStore";
import { Navigate } from "react-router-dom";

interface DashboardGuardProps {
  children: React.ReactNode;
}

const DashboardGuard = ({ children }: DashboardGuardProps) => {
  const user = useAuthStore((state) => state.user);
  
  console.log("DashboardGuard - User:", user);
  console.log("DashboardGuard - User role:", user?.role);
  console.log("DashboardGuard - Athlete status:", user?.athlete_status);
  
  // If user is an athlete with incomplete status, redirect to onboarding
  if (user?.role === "athlete") {
    const status = user.athlete_status || "INCOMPLETE";
    
    if (status === "INCOMPLETE" || status === "REJECTED") {
      console.log("DashboardGuard - Redirecting athlete to onboarding");
      return <Navigate to="/athlete-onboarding" replace />;
    }
    
    if (status === "PENDING") {
      console.log("DashboardGuard - Redirecting athlete to awaiting approval");
      return <Navigate to="/awaiting-approval" replace />;
    }
    
    if (status === "APPROVED") {
      console.log("DashboardGuard - Redirecting approved athlete to reports");
      return <Navigate to="/reports" replace />;
    }
  }
  
  console.log("DashboardGuard - Allowing access to dashboard");
  return <>{children}</>;
};

export default DashboardGuard;
