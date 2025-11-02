import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  approveAthlete, 
  rejectAthlete, 
  getPendingAthletes 
} from "../api/athletes";
import { useTranslation } from "../i18n/useTranslation";

interface PendingAthlete {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  athlete_id: number;
  athlete_status: string;
  rejection_reason?: string;
}

const AthleteApproval: React.FC = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});

  const { data: pendingAthletes = [], isLoading } = useQuery({
    queryKey: ["pending-athletes"],
    queryFn: getPendingAthletes,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: (athleteId: number) => approveAthlete(athleteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-athletes-count"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ athleteId, reason }: { athleteId: number; reason: string }) =>
      rejectAthlete(athleteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-athletes-count"] });
      setRejectionReasons({});
    },
  });

  const handleApprove = (athleteId: number) => {
    approveMutation.mutate(athleteId);
  };

  const handleReject = (athleteId: number) => {
    const reason = rejectionReasons[athleteId];
    if (!reason || !reason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({ athleteId, reason: reason.trim() });
  };

  const updateRejectionReason = (athleteId: number, reason: string) => {
    setRejectionReasons(prev => ({
      ...prev,
      [athleteId]: reason
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading pending athletes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-container-foreground">
          Athlete Approval
        </h1>
        <p className="text-muted">
          Review and approve or reject athlete registration applications
        </p>
      </header>

      {pendingAthletes.length === 0 ? (
        <div className="rounded-lg border border-black/5 bg-white p-8 text-center">
          <p className="text-muted">No pending athletes at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAthletes.map((athlete: PendingAthlete) => (
            <div
              key={athlete.id}
              className="rounded-lg border border-black/5 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-container-foreground">
                    {athlete.full_name}
                  </h3>
                  <div className="space-y-1 text-sm text-muted">
                    <p>Email: {athlete.email}</p>
                    {athlete.phone && <p>Phone: {athlete.phone}</p>}
                    <p>
                      Status: 
                      <span className="ml-1 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        {athlete.athlete_status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleApprove(athlete.athlete_id)}
                    disabled={approveMutation.isPending}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
                  >
                    {approveMutation.isPending ? "Approving..." : "Approve"}
                  </button>

                  <div className="space-y-2">
                    <textarea
                      placeholder="Rejection reason..."
                      value={rejectionReasons[athlete.athlete_id] || ""}
                      onChange={(e) => updateRejectionReason(athlete.athlete_id, e.target.value)}
                      className="w-full resize-none rounded-md border border-black/10 px-3 py-2 text-sm"
                      rows={2}
                    />
                    <button
                      onClick={() => handleReject(athlete.athlete_id)}
                      disabled={rejectMutation.isPending || !rejectionReasons[athlete.athlete_id]?.trim()}
                      className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
                    >
                      {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AthleteApproval;
