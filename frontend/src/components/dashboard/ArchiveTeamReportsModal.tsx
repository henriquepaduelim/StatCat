import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios"; // Added this import

import { getTeamReportSubmissions } from "../../api/teams";
import { deleteReportSubmission } from "../../api/report_submissions";
import { deleteTeam } from "../../api/teams";
import type { ReportSubmissionItem } from "../../types/report_submission";

interface ArchiveTeamReportsModalProps {
  teamId: number;
  teamName: string;
  onClose: () => void;
  onTeamDeleted: () => void;
}

type Step = "initial" | "confirm_delete" | "deleting" | "done";

export const ArchiveTeamReportsModal = ({
  teamId,
  teamName,
  onClose,
  onTeamDeleted,
}: ArchiveTeamReportsModalProps) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("initial");
  const [error, setError] = useState<string | null>(null);

  const { data: reports, isLoading, isError } = useQuery<ReportSubmissionItem[]>({
    queryKey: ["team-report-submissions", teamId],
    queryFn: () => getTeamReportSubmissions(teamId),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!reports) return;

      // Sequentially delete all report submissions
      for (const report of reports) {
        try {
          await deleteReportSubmission(report.id);
        } catch (deleteErr) {
          if (axios.isAxiosError(deleteErr) && deleteErr.response?.status === 404) {
            console.warn(`Report submission with ID ${report.id} not found during deletion attempt (already deleted?). Skipping.`);
          } else {
            // Re-throw other errors
            throw deleteErr;
          }
        }
      }

      // After all reports are deleted, delete the team
      await deleteTeam(teamId);
    },
    onSuccess: () => {
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["report-submissions"] }); // Invalidate any related queries
      onTeamDeleted();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "An unknown error occurred during deletion.");
      setStep("confirm_delete"); // Go back to confirmation step on error
    },
  });

  const handleDownload = () => {
    if (!reports) return;
    const jsonString = JSON.stringify(reports, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-submissions-team-${teamId}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    setStep("deleting");
    setError(null);
    deleteMutation.mutate();
  };

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center text-muted">Loading team reports...</p>;
    }
    if (isError) {
      return <p className="text-center text-red-500">Error loading reports. Please try again.</p>;
    }
    if (!reports || reports.length === 0) {
      return (
        <div className="text-center space-y-4">
          <p className="text-muted">No report submissions found for this team.</p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      );
    }

    switch (step) {
      case "done":
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-emerald-600">Success!</h3>
            <p className="text-muted">Team &quot;{teamName}&quot; and all its associated reports have been deleted.</p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90"
            >
              Close
            </button>
          </div>
        );
      case "deleting":
        return (
          <div className="text-center space-y-4">
            <p className="text-muted">Deleting {reports.length} reports and team &quot;{teamName}&quot;...</p>
            <div className="h-4 w-4 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        );
      case "confirm_delete":
        return (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-destructive">Are you absolutely sure?</h3>
            <p className="text-sm text-muted">
              This will permanently delete <strong>{reports.length} report submissions</strong> and the team <strong>&quot;{teamName}&quot;</strong>. This action cannot be undone.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep("initial")}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, delete everything"}
              </button>
            </div>
          </div>
        );
      case "initial":
      default:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
               <h3 className="text-lg font-semibold text-container-foreground">Archive and Delete Team</h3>
               <p className="text-sm text-muted">
                Team &quot;{teamName}&quot; cannot be deleted because it is associated with <strong>{reports.length} report submissions</strong>.
              </p>
            </div>
            <div className="space-y-4 rounded-lg border border-border bg-background p-4">
              <p className="text-sm">
                To proceed, you must first archive (download) and then permanently delete these reports.
              </p>
              <button
                onClick={handleDownload}
                className="w-full rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90"
              >
                Download {reports.length} Reports (JSON)
              </button>
            </div>
            <div className="space-y-4 rounded-lg border border-destructive/50 bg-red-50/50 p-4 dark:bg-destructive/10">
              <h4 className="font-semibold text-destructive">Danger Zone</h4>
              <p className="text-xs text-muted">
                Once you have downloaded the archive, you can proceed with permanent deletion.
              </p>
              <button
                onClick={() => setStep("confirm_delete")}
                className="w-full rounded-lg bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/30"
              >
                Proceed to Deletion...
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="modal-surface w-full max-w-md rounded-2xl bg-container-gradient p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-container text-muted shadow-sm transition hover:text-accent"
          aria-label="Close"
        >
          &times;
        </button>
        {renderContent()}
      </div>
    </div>
  );
};
