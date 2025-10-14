import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import RequireAuth from "./components/RequireAuth";
import Athletes from "./pages/Athletes";
import AthleteEdit from "./pages/AthleteEdit";
import AthleteReport from "./pages/AthleteReport";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NewAthlete from "./pages/NewAthlete";
import Reports from "./pages/Reports";
import ClientDetail from "./pages/ClientDetail";
import ClientSettings from "./pages/ClientSettings";
import ClientReportsPage from "./pages/ClientReports";

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
      <Route path="/athletes/:id" element={<AthleteReport />} />
      <Route path="/athletes/:id/edit" element={<AthleteEdit />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/clients/:id" element={<ClientDetail />} />
      <Route path="/clients/:id/settings" element={<ClientSettings />} />
      <Route path="/clients/:id/reports" element={<ClientReportsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>
);

export default App;
