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
  approvingSubmissionId?: number | null;
  canApproveReports?: boolean;
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
  approvingSubmissionId = null,
  canApproveReports = false,
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

  return (
    <div className="rounded-xl border border-action-primary/20 bg-white/80 p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-container-foreground">Report Cards</h2>
            
          </div>
          <div className="flex w-full flex-row flex-wrap gap-2 sm:w-auto sm:justify-end">
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
              <span className="whitespace-nowrap">New Report Card</span>
            </button>
          </div>
        </div>

        
        {canApproveReports ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Pending approvals</div>
            {pendingReports.length ? (
              <ul className="space-y-2">
                {pendingReports.slice(0, 5).map((report) => (
                  <li
                    key={`pending-report-${report.id}`}
                    className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white/80 p-3 text-sm"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted">
                        {report.report_type === "game_report" ? "Game report" : "Report card"}
                      </p>
                      <p className="font-semibold text-container-foreground">
                        {report.report_type === "game_report"
                          ? report.team_name ?? "Team TBD"
                          : report.athlete_name ?? "Athlete TBD"}
                      </p>
                      <p className="text-xs text-muted">
                        {report.report_type === "game_report"
                          ? report.opponent
                            ? `vs ${report.opponent}`
                            : "Opponent TBD"
                          : report.team_name ?? "No team selected"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onReviewSubmission(report)}
                        className="w-full rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:bg-container/60 sm:w-auto"
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        onClick={() => onApproveReport(report.id)}
                        disabled={approvingSubmissionId === report.id}
                        className="w-full rounded-full bg-action-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-action-primary-foreground shadow disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {approvingSubmissionId === report.id ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No reports awaiting approval.</p>
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">My submissions</div>
          {mySubmissions.length ? (
            <ul className="space-y-2">
              {mySubmissions.slice(0, 5).map((submission) => (
                <li
                  key={`my-report-${submission.id}`}
                  className="rounded-lg border border-black/10 bg-white/80 p-3 text-sm"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted">
                        {submission.report_type === "game_report" ? "Game report" : "Report card"}
                      </p>
                      <p className="font-semibold text-container-foreground">
                        {submission.report_type === "game_report"
                          ? submission.team_name ?? "Team TBD"
                          : submission.athlete_name ?? "Athlete TBD"}
                      </p>
                      <p className="text-xs text-muted">
                        Status:{" "}
                        <span
                          className={
                            submission.status === "approved"
                              ? "text-emerald-600"
                              : submission.status === "rejected"
                                ? "text-rose-600"
                                : "text-amber-600"
                          }
                        >
                          {submission.status}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-muted">{new Date(submission.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewMySubmission(submission)}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-black/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:bg-container/70 sm:w-auto"
                  >
                    View details
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">You have not submitted any reports yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamInsightsCard;
