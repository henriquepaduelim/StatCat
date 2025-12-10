import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthStore } from "./stores/useAuthStore";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { OfflineBanner } from "./components/OfflineBanner";
import { InstallPrompt } from "./components/InstallPrompt";

// Lazy load pages for better code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Athletes = lazy(() => import("./pages/Athletes"));
const AthleteEdit = lazy(() => import("./pages/AthleteEdit"));
const AthleteReport = lazy(() => import("./pages/AthleteReport"));
const NewAthlete = lazy(() => import("./pages/NewAthlete"));
const PlayerProfileLayout = lazy(() => import("./pages/player-profile/PlayerProfileLayout"));
const PlayerProfileOverview = lazy(
  () => import("./pages/player-profile/ProfileOverviewPage"),
);
const PlayerCombineResults = lazy(
  () => import("./pages/player-profile/CombineResultsPage"),
);
const PlayerReportCards = lazy(() => import("./pages/player-profile/ReportCardsPage"));
const PlayerScheduling = lazy(() => import("./pages/player-profile/SchedulingPage"));
const TeamFeed = lazy(() => import("./pages/TeamFeed"));
const TeamDashboard = lazy(() => import("./pages/TeamDashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

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

export const RedirectToDashboardOrPlayerProfile = () => {
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
      return <Navigate to="/player-profile" replace />;
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
        <Route path="/" element={<RedirectToDashboardOrPlayerProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
            path="/player-profile"
            element={
              <ProtectedRoute requiredPermission="canViewReports">
                <PlayerProfileLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PlayerProfileOverview />} />
            <Route path="combine" element={<PlayerCombineResults />} />
            <Route path="report-cards" element={<PlayerReportCards />} />
            <Route path="scheduling" element={<PlayerScheduling />} />
          </Route>
          <Route
            path="/team-feed"
            element={
              <ProtectedRoute requiredPermission="canViewReports">
                <TeamFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-dashboard"
            element={
              <ProtectedRoute requiredPermission="canViewReports">
                <TeamDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<RedirectToDashboardOrPlayerProfile />} />
        </Route>
      </Routes>
      <OfflineBanner />
      <InstallPrompt />
      <PWAUpdatePrompt />
    </Suspense>
  );
};

export default App;
