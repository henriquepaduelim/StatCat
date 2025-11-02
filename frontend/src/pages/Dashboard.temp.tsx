import React from "react";
import { usePermissions } from "../hooks/usePermissions";
import { useAuthStore } from "../stores/useAuthStore";

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const permissions = usePermissions();

  console.log("Dashboard - User:", user);
  console.log("Dashboard - Permissions:", permissions);

  return (
    <div className="space-y-8">
      <section className="print-hidden space-y-2">
        <h1 className="text-3xl font-semibold text-container-foreground">Dashboard</h1>
        <p className="text-sm text-muted">Welcome to the combine management platform</p>
      </section>

      <section className="print-hidden space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-container-foreground">Overview</h2>
            <p className="text-sm text-muted">
              Manage your athletes, teams, and track performance metrics.
            </p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Athletes</h3>
            <p className="mt-4 text-sm text-muted">View and manage athlete profiles</p>
          </div>
          
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Teams</h3>
            <p className="mt-4 text-sm text-muted">Organize athletes into teams</p>
          </div>
          
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Reports</h3>
            <p className="mt-4 text-sm text-muted">View performance analytics</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
