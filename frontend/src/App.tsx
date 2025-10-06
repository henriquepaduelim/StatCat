import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import Athletes from "./pages/Athletes";
import AthleteDetail from "./pages/AthleteDetail";
import Dashboard from "./pages/Dashboard";
import NewAthlete from "./pages/NewAthlete";
import Reports from "./pages/Reports";
import Sessions from "./pages/Sessions";

const App = () => (
  <AppShell>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/athletes" element={<Athletes />} />
      <Route path="/athletes/new" element={<NewAthlete />} />
      <Route path="/athletes/:id" element={<AthleteDetail />} />
      <Route path="/sessions" element={<Sessions />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </AppShell>
);

export default App;
