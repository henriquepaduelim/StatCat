import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingAthletes,
  approveAthlete,
  rejectAthlete,
  approveAllAthletes,
} from "../api/athletes";
import type { PendingAthleteSummary } from "../types/athlete";
import NotificationBadge from "./NotificationBadge";

type IconProps = {
  size?: number;
  className?: string;
};

const CheckIcon = ({ size = 18, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const XIcon = ({ size = 18, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ChevronDownIcon = ({ size = 18, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function AthleteApprovalList() {
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: pendingAthletes = [], isLoading } = useQuery<PendingAthleteSummary[]>({
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

  const approveAllMutation = useMutation({
    mutationFn: approveAllAthletes,
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
    },
  });

  const toggleDropdown = () => {
    if (pendingAthletes.length === 0) {
      return;
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const resolveAthleteId = (athlete: PendingAthleteSummary): number | undefined => {
    return athlete.id ?? athlete.athlete_id ?? undefined;
  };

  const handleApprove = (athlete: PendingAthleteSummary) => {
    const athleteId = resolveAthleteId(athlete);
    if (!athleteId) {
      return;
    }
    approveMutation.mutate(athleteId);
  };

  const handleReject = (athlete: PendingAthleteSummary) => {
    const athleteId = resolveAthleteId(athlete);
    if (!athleteId || typeof window === "undefined") {
      return;
    }
    const reasonInput = window.prompt("Provide a reason for rejection (optional):");
    if (reasonInput === null) {
      return;
    }
    const reason = reasonInput.trim() || "No reason provided";
    rejectMutation.mutate({ athleteId, reason });
  };

  const handleApproveAll = () => {
    if (pendingAthletes.length === 0 || approveAllMutation.isPending) {
      return;
    }

    const shouldApproveAll =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Approve all ${pendingAthletes.length} pending ${
              pendingAthletes.length === 1 ? "athlete" : "athletes"
            }?`,
          );

    if (shouldApproveAll) {
      approveAllMutation.mutate();
      setIsDropdownOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (pendingAthletes.length === 0) {
    return (
      <div className="text-center">
        <button
          type="button"
          className="flex items-center justify-between rounded-lg border border-black/10 bg-gray-50 px-4 py-2 text-sm font-medium text-muted"
          disabled
        >
          Pending Athletes (0)
          <ChevronDownIcon size={16} className="text-muted" />
        </button>
        <p className="mt-3 text-sm text-muted">No pending athletes for approval</p>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        <span>Pending Athletes</span>
        {pendingAthletes.length > 0 && (
          <NotificationBadge count={pendingAthletes.length} className="absolute -top-2 -right-2" />
        )}
        <ChevronDownIcon className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute left-0 z-10 mt-2 w-full min-w-[320px] rounded-xl border border-black/10 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <span className="text-sm font-semibold text-primary">Pending list</span>
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={approveAllMutation.isPending}
              className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {approveAllMutation.isPending ? "Approving..." : "Approve All"}
            </button>
          </div>

          <ul className="max-h-80 divide-y divide-black/5 overflow-y-auto">
            {pendingAthletes.map((athlete) => {
              const athleteId = resolveAthleteId(athlete) ?? athlete.user_id;
              return (
                <li
                  key={athleteId}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-primary">
                      {athlete.first_name} {athlete.last_name}
                    </p>
                    <p className="text-xs text-muted">{athlete.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(athlete)}
                      disabled={approveMutation.isPending}
                      className="flex items-center justify-center rounded-full bg-green-100 p-2 text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Approve"
                    >
                    <CheckIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(athlete)}
                      disabled={rejectMutation.isPending}
                      className="flex items-center justify-center rounded-full bg-red-100 p-2 text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Reject"
                    >
                    <XIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export { AthleteApprovalList };
export default AthleteApprovalList;
