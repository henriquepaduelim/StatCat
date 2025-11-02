import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import RequireAuth from "./components/RequireAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import Athletes from "./pages/Athletes";
import AthleteEdit from "./pages/AthleteEdit";
import AthleteReport from "./pages/AthleteReport";
import AthleteOnboarding from "./pages/AthleteOnboarding";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NewAthlete from "./pages/NewAthlete";
import Reports from "./pages/Reports";
import { useAuthStore } from "./stores/useAuthStore";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";

// Import AwaitingApproval separately
import AwaitingApproval from "./pages/AwaitingApproval";

const ProtectedLayout = () => (
  <RequireAuth>
    <AppShell>
      <Outlet />
    </AppShell>
  </RequireAuth>
);

const RedirectToDashboardOrReports = () => {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  // Bootstrap auth on the root route
  useAuthBootstrap();
  
  // Wait for auth to be initialized
  if (!isInitialized) {
    return (
      <div className="relative min-h-screen">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 h-full w-full object-cover"
          style={{ zIndex: -1 }}
        >
          <source src="/media/login-bg.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="flex min-h-screen items-center justify-center bg-black/50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
            <p className="mt-6 text-xl font-medium text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // For athletes, check their status
  if (user.role === "athlete") {
    const status = user.athlete_status || "INCOMPLETE";
    
    if (status === "INCOMPLETE" || status === "REJECTED") {
      return <Navigate to="/athlete-onboarding" replace />;
    }
    if (status === "PENDING") {
      return <Navigate to="/awaiting-approval" replace />;
    }
    if (status === "APPROVED") {
      return <Navigate to="/reports" replace />;
    }
    // Default for athletes with unknown status
    return <Navigate to="/athlete-onboarding" replace />;
  }
  
  // Non-athletes go to dashboard
  return <Navigate to="/dashboard" replace />;
};

const App = () => (
  <Routes>
    <Route path="/" element={<RedirectToDashboardOrReports />} />
    <Route path="/login" element={<Login />} />
    <Route path="/athlete-onboarding" element={
      <RequireAuth>
        <AthleteOnboarding />
      </RequireAuth>
    } />
    <Route path="/awaiting-approval" element={
      <RequireAuth>
        <AwaitingApproval />
      </RequireAuth>
    } />
    <Route element={<ProtectedLayout />}>
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiredPermission="canViewDashboard">
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/athletes" 
        element={
          <ProtectedRoute requiredPermission="canViewAthletes">
            <Athletes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/athletes/register/:id/details" 
        element={
          <ProtectedRoute requiredPermission="canCreateAthletes">
            <NewAthlete />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/athletes/new" 
        element={
          <ProtectedRoute requiredPermission="canCreateAthletes">
            <Navigate to="/athletes" replace />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/athletes/:id" 
        element={
          <ProtectedRoute requiredPermission="canViewReports">
            <AthleteReport />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/athletes/:id/edit" 
        element={
          <ProtectedRoute requiredPermission="canEditAthletes">
            <AthleteEdit />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute requiredPermission="canViewReports">
            <Reports />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<RedirectToDashboardOrReports />} />
    </Route>
  </Routes>
);

export default App;
