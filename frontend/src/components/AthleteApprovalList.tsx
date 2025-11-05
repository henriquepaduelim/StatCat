import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingAthletes, approveAthlete, rejectAthlete } from "../api/athletes";

interface PendingAthlete {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
}

function AthleteApprovalList() {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState<Record<number, string>>({});

  const { data: pendingAthletes, isLoading } = useQuery({
    queryKey: ["pending-athletes"],
    queryFn: getPendingAthletes,
  });

  const approveMutation = useMutation({
    mutationFn: approveAthlete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-athletes-count"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ athleteId, reason }: { athleteId: number; reason: string }) =>
      rejectAthlete(athleteId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-athletes-count"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      setRejectionReason({});
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!pendingAthletes || pendingAthletes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">No pending athletes for approval</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-primary">
        Pending Athletes ({pendingAthletes.length})
      </h2>
      
      <div className="space-y-4">
        {pendingAthletes.map((athlete: PendingAthlete) => (
          <div
            key={athlete.id}
            className="rounded-xl border border-black/10 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {athlete.first_name} {athlete.last_name}
                </h3>
                <p className="text-sm text-muted">{athlete.email}</p>
                {athlete.phone && (
                  <p className="text-sm text-muted">{athlete.phone}</p>
                )}
              </div>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                Pending
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted">Date of Birth:</span>
                <span className="ml-2 text-primary">
                  {athlete.date_of_birth
                    ? new Date(athlete.date_of_birth).toLocaleDateString()
                    : "-"}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted">Gender:</span>
                <span className="ml-2 text-primary capitalize">
                  {athlete.gender || "-"}
                </span>
              </div>
            </div>

            <div className="border-t border-black/10 pt-4">
              <div className="mb-3">
                <label
                  htmlFor={`rejection-reason-${athlete.id}`}
                  className="mb-2 block text-sm font-medium text-muted"
                >
                  Rejection Reason (optional)
                </label>
                <textarea
                  id={`rejection-reason-${athlete.id}`}
                  value={rejectionReason[athlete.id] || ""}
                  onChange={(e) =>
                    setRejectionReason((prev) => ({
                      ...prev,
                      [athlete.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter reason for rejection (optional)"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => approveMutation.mutate(athlete.id)}
                  disabled={approveMutation.isPending}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() =>
                    rejectMutation.mutate({
                      athleteId: athlete.id,
                      reason: rejectionReason[athlete.id] || "No reason provided",
                    })
                  }
                  disabled={rejectMutation.isPending}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { AthleteApprovalList };
export default AthleteApprovalList;
