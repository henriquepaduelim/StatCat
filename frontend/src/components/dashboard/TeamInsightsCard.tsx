import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import type { Athlete } from "../../types/athlete";
import type { Team } from "../../types/team";
import type { ReportSubmissionSummary } from "../../api/reportSubmissions";

type TeamInsightsCardProps = {
  teams: Team[];
  athletes: Athlete[];
  athletesByTeamId: Record<number, Athlete[]>;
  onNewReportCard?: () => void;
  onGameReport?: () => void;
  isGameReportPending?: boolean;
  pendingReports?: ReportSubmissionSummary[];
  mySubmissions?: ReportSubmissionSummary[];
  onOpenSubmissionsModal?: () => void;
  canApproveReports?: boolean;
  onRecordCombineMetrics?: () => void;
  canRecordCombineMetrics?: boolean;
};

const TeamInsightsCard = ({
  onNewReportCard,
  onGameReport,
  isGameReportPending = false,
  pendingReports = [],
  mySubmissions = [],
  onOpenSubmissionsModal = () => undefined,
  canApproveReports = false,
  onRecordCombineMetrics,
  canRecordCombineMetrics = false,
}: TeamInsightsCardProps) => {
  const submissionSummary = useMemo(() => {
    const pendingReportCards = pendingReports.filter((report) => report.report_type === "report_card").length;
    const pendingGameReports = pendingReports.filter((report) => report.report_type === "game_report").length;
    const approvedReportCards = mySubmissions.filter(
      (submission) => submission.report_type === "report_card" && submission.status === "approved",
    ).length;
    const approvedGameReports = mySubmissions.filter(
      (submission) => submission.report_type === "game_report" && submission.status === "approved",
    ).length;
    return { pendingReportCards, pendingGameReports, approvedReportCards, approvedGameReports };
  }, [pendingReports, mySubmissions]);

  return (
    <div
      className="flex h-full w-full flex-col rounded-xl border border-action-primary/20 p-4 sm:p-6 shadow-xl backdrop-blur"
      style={{
        backgroundColor: "rgb(var(--color-container-background))",
        borderColor: "rgb(var(--color-border))",
      }}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-container-foreground">Report Workflow</h2>
          </div>
          <div className="flex w-full flex-row gap-0.5 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={onGameReport}
              disabled={isGameReportPending}
              className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span className="whitespace-nowrap">
                {isGameReportPending ? "Saving..." : "Game Report"}
              </span>
            </button>
            <button
              type="button"
              onClick={onNewReportCard}
              className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 sm:px-4"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
              <span className="whitespace-nowrap">Report Card</span>
            </button>
            {canRecordCombineMetrics ? (
              <button
                type="button"
                onClick={onRecordCombineMetrics}
                className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus-visible:ring-2"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span className="whitespace-nowrap">Testing</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className="rounded-xl border p-3"
                style={{
                  backgroundColor: "rgb(var(--color-container-background))",
                  borderColor: "rgb(var(--color-border))",
                }}
              >
                <p className="text-xs uppercase tracking-wide text-muted">Report Cards</p>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-container-foreground">
                      {submissionSummary.pendingReportCards}
                    </p>
                    <p className="text-xs text-muted">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-container-foreground">
                      {submissionSummary.approvedReportCards}
                    </p>
                    <p className="text-xs text-muted">Approved</p>
                  </div>
                </div>
              </div>
              <div
                className="rounded-xl border p-3"
                style={{
                  backgroundColor: "rgb(var(--color-container-background))",
                  borderColor: "rgb(var(--color-border))",
                }}
              >
                <p className="text-xs uppercase tracking-wide text-muted">Game Reports</p>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-container-foreground">
                      {submissionSummary.pendingGameReports}
                    </p>
                    <p className="text-xs text-muted">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-container-foreground">
                      {submissionSummary.approvedGameReports}
                    </p>
                    <p className="text-xs text-muted">Approved</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {canApproveReports && (submissionSummary.pendingReportCards + submissionSummary.pendingGameReports > 0) ? (
                <button
                  type="button"
                  onClick={onOpenSubmissionsModal}
                  className="w-full rounded-full border border-black/20 px-3 py-2 text-sm font-semibold text-container-foreground transition hover:bg-container/70 sm:w-auto"
                >
                  Review pending approvals
                </button>
              ) : (
                <div className="text-sm text-muted">No pending approvals right now.</div>
              )}
              <button
                type="button"
                onClick={onOpenSubmissionsModal}
                className="w-full rounded-full border border-black/20 px-3 py-2 text-sm font-semibold text-container-foreground transition hover:bg-container/70 sm:w-auto"
              >
                View submissions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamInsightsCard;
