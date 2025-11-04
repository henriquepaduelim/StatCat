import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./stores/useAuthStore";

// Lazy load pages for better code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Athletes = lazy(() => import("./pages/Athletes"));
const AthleteEdit = lazy(() => import("./pages/AthleteEdit"));
const AthleteReport = lazy(() => import("./pages/AthleteReport"));
const NewAthlete = lazy(() => import("./pages/NewAthlete"));
const Reports = lazy(() => import("./pages/Reports"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

const ProtectedLayout = () => (
  <ProtectedRoute requireAuth={true}>
    <AppShell>
      <Outlet />
    </AppShell>
  </ProtectedRoute>
);

const RedirectToDashboardOrReports = () => {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  // Wait for auth to be initialized
  if (!isInitialized) {
    return <div>Loading...</div>;
  }
  
  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // For athletes, check their status
  if (user.role === "athlete") {
    const status = user.athlete_status || "INCOMPLETE";
    
    if (status === "APPROVED") {
      return <Navigate to="/reports" replace />;
    }
    // Unapproved athletes stay on login page
    return <Navigate to="/login" replace />;
  }
  
  // Non-athletes go to dashboard
  return <Navigate to="/dashboard" replace />;
};

const App = () => {
  const setInitialized = useAuthStore((state) => state.setInitialized);
  
  // Initialize auth store on app mount
  useEffect(() => {
    setInitialized(true);
  }, [setInitialized]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<RedirectToDashboardOrReports />} />
        <Route path="/login" element={<Login />} />
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
  </Suspense>
  );
};

export default App;
  