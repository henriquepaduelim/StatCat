import React from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { usePermissions } from "../hooks/usePermissions";

const SimpleDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const permissions = usePermissions();

  console.log("SimpleDashboard - User:", user);
  console.log("SimpleDashboard - Permissions:", permissions);

  if (!user) {
    return <div>Loading user...</div>;
  }

  return (
    <div className="min-h-screen bg-page p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-container-foreground mb-4">
          Dashboard (Simple)
        </h1>
        
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="space-y-2">
            <p><strong>Name:</strong> {user.full_name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            {user.athlete_status && (
              <p><strong>Athlete Status:</strong> {user.athlete_status}</p>
            )}
            {user.athlete_id && (
              <p><strong>Athlete ID:</strong> {user.athlete_id}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-lg mt-6">
          <h2 className="text-xl font-semibold mb-4">Permissions</h2>
          <div className="space-y-2">
            <p><strong>Can View Dashboard:</strong> {permissions.canViewDashboard ? "Yes" : "No"}</p>
            <p><strong>Can View Athletes:</strong> {permissions.canViewAthletes ? "Yes" : "No"}</p>
            <p><strong>Can Create Athletes:</strong> {permissions.canCreateAthletes ? "Yes" : "No"}</p>
            <p><strong>Can View Reports:</strong> {permissions.canViewReports ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
