import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import RequireAuth from "./components/RequireAuth";
import Athletes from "./pages/Athletes";
import AthleteDetail from "./pages/AthleteDetail";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NewAthlete from "./pages/NewAthlete";
import Reports from "./pages/Reports";
import Sessions from "./pages/Sessions";

const ProtectedLayout = () => (
  <RequireAuth>
    <AppShell>
      <Outlet />
    </AppShell>
  </RequireAuth>
);

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/athletes" element={<Athletes />} />
      <Route path="/athletes/new" element={<NewAthlete />} />
      <Route path="/athletes/:id" element={<AthleteDetail />} />
      <Route path="/sessions" element={<Sessions />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>
);

export default App;
