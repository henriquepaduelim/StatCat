import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import type { Athlete } from "../../types/athlete";
import type { Team } from "../../api/teams";
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
  onApproveReport?: (submissionId: number) => void;
  onReviewSubmission?: (submission: ReportSubmissionSummary) => void;
  onViewMySubmission?: (submission: ReportSubmissionSummary) => void;
  onOpenSubmissionsModal?: () => void;
  approvingSubmissionId?: number | null;
  canApproveReports?: boolean;
  onRecordCombineMetrics?: () => void;
  canRecordCombineMetrics?: boolean;
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const TeamInsightsCard = ({
  teams,
  athletes,
  athletesByTeamId,
  onNewReportCard,
  onGameReport,
  isGameReportPending = false,
  pendingReports = [],
  mySubmissions = [],
  onApproveReport = () => undefined,
  onReviewSubmission = () => undefined,
  onViewMySubmission = () => undefined,
  onOpenSubmissionsModal = () => undefined,
  approvingSubmissionId = null,
  canApproveReports = false,
  onRecordCombineMetrics,
  canRecordCombineMetrics = false,
}: TeamInsightsCardProps) => {
  const totalTeams = teams.length;
  const assignedAthletes = athletes.filter((athlete) => typeof athlete.team_id === "number").length;
  const unassignedAthletes = Math.max(athletes.length - assignedAthletes, 0);
  const averageRosterSize = totalTeams ? (assignedAthletes / totalTeams).toFixed(1) : "0.0";
  const assignmentRate = athletes.length ? Math.round((assignedAthletes / athletes.length) * 100) : 0;

  const topTeams = teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      category: team.age_category || "—",
      athleteCount: athletesByTeamId[team.id]?.length ?? 0,
    }))
    .sort((a, b) => b.athleteCount - a.athleteCount)
    .slice(0, 3);

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
    <div className="w-full rounded-xl border border-action-primary/20 bg-white/80 p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-container-foreground">Report Workflow</h2>
          </div>
          <div className="flex w-svw flex-row gap-0.5 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
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

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-black/10 bg-white/80 p-3">
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
            <div className="rounded-xl border border-black/10 bg-white/80 p-3">
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
  );
};

export default TeamInsightsCard;
