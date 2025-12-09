import { useEffect, useMemo, useState } from "react";

import type { ReportSubmissionSummary } from "../../api/reportSubmissions";
import { getScoreBand, type ScoreBand } from "../../lib/reportCard";

type ReportSubmissionReviewModalProps = {
  submission: ReportSubmissionSummary | null;
  isOpen: boolean;
  canResolve: boolean;
  onClose: () => void;
  onApprove: (submissionId: number) => void;
  onReject: (submissionId: number, notes: string) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
};

const bandClasses: Record<ScoreBand, string> = {
  low: "text-orange-600",
  medium: "text-amber-600",
  high: "text-emerald-600",
};

const bandBgClasses: Record<ScoreBand, string> = {
  low: "bg-orange-400",
  medium: "bg-amber-500",
  high: "bg-emerald-500",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return "—";
  }
  return target.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return "—";
  }
  return target.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const statusStyles: Record<
  ReportSubmissionSummary["status"],
  { text: string; badgeClass: string }
> = {
  pending: {
    text: "Pending",
    badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  approved: {
    text: "Approved",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  rejected: {
    text: "Returned",
    badgeClass: "bg-rose-100 text-rose-700 border border-rose-200",
  },
  reopened: {
    text: "Reopened",
    badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
  },
};

const ReportSubmissionReviewModal = ({
  submission,
  isOpen,
  canResolve,
  onClose,
  onApprove,
  onReject,
  isApprovePending,
  isRejectPending,
}: ReportSubmissionReviewModalProps) => {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen && submission) {
      setNotes(submission.review_notes ?? "");
    } else {
      setNotes("");
    }
  }, [submission, isOpen]);

  const isReportCard = submission?.report_type === "report_card";
  const canTakeAction = Boolean(canResolve && submission?.status === "pending");
  const disableReject = !notes.trim() || isRejectPending;

  const headerLabel = useMemo(() => {
    if (!submission) return "";
    return submission.report_type === "game_report" ? "Game Report" : "Report Card";
  }, [submission]);

  if (!isOpen || !submission) {
    return null;
  }

  const statusMeta = statusStyles[submission.status];

  return (
    <div className="fixed inset-0 z-50 modal-overlay backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-start justify-center px-2 py-2 sm:items-center sm:px-4 sm:py-3" onClick={onClose}>
        <div
          className="modal-surface relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl p-0 sm:p-0"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{headerLabel}</p>
              <h2 className="text-xl font-semibold text-container-foreground">Submission details</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusMeta.badgeClass}`}>
                {statusMeta.text}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-container text-muted hover:text-accent"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[78vh] space-y-6 overflow-y-auto px-4 pb-6 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="modal-card rounded-xl bg-container/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Submitted by</p>
                <p className="text-base font-semibold text-container-foreground">{submission.submitted_by}</p>
                <p className="text-xs text-muted">{formatDateTime(submission.created_at)}</p>
              </div>
              <div className="modal-card rounded-xl bg-container/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Athlete / team</p>
                <p className="text-base font-semibold text-container-foreground">
                  {submission.report_type === "report_card"
                    ? submission.athlete_name ?? "Athlete TBD"
                    : submission.team_name ?? "Team TBD"}
                </p>
                <p className="text-xs text-muted">
                  {submission.report_type === "report_card"
                    ? submission.team_name ?? "Independent"
                    : submission.athlete_name ?? "Roster TBD"}
                </p>
              </div>
            </div>

            {isReportCard ? (
              <div className="space-y-4">
                <div className="modal-card rounded-2xl bg-container/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Coach report</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-container-foreground">
                    {submission.coach_report?.trim() || "No coach report provided."}
                  </p>
                </div>

                {typeof submission.overall_average === "number" ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="modal-card rounded-xl bg-white/80 px-4 py-3 shadow-sm">
                      <p className="text-xs uppercase tracking-wide text-muted">Overall average</p>
                      <p className="text-2xl font-semibold text-container-foreground">
                        {submission.overall_average.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {(submission.categories ?? []).length ? (
                  <div className="space-y-3">
                    {(submission.categories ?? []).map((category) => (
                      <div key={category.name} className="modal-card rounded-2xl bg-container/80 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-container-foreground">{category.name}</p>
                          <p className="text-xs font-semibold text-muted">
                            {typeof category.group_average === "number"
                              ? `Avg ${category.group_average?.toFixed(1)}`
                              : "No scores"}
                          </p>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {category.metrics.map((metric) => {
                            const band = getScoreBand(metric.score);
                            const bandClass = band ? bandClasses[band] : "text-muted";
                            const barClass = band ? bandBgClasses[band] : "bg-slate-300";
                            return (
                              <div key={`${category.name}-${metric.name}`} className="rounded-xl bg-white/90 px-4 py-3 shadow-sm">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-container-foreground">{metric.name}</span>
                                  <span className={`text-xs font-semibold ${bandClass}`}>
                                    {typeof metric.score === "number" ? metric.score : "—"}
                                  </span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-slate-200">
                                  {typeof metric.score === "number" ? (
                                    <div
                                      className={`h-2 rounded-full ${barClass}`}
                                      style={{ width: `${Math.min(100, Math.max(0, metric.score))}%` }}
                                    />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="modal-card rounded-2xl bg-container/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Match summary</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="modal-card rounded-xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Opponent</p>
                    <p className="text-base font-semibold text-container-foreground">
                      {submission.opponent ?? "TBD"}
                    </p>
                  </div>
                  <div className="modal-card rounded-xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Score</p>
                    <p className="text-base font-semibold text-container-foreground">
                      {typeof submission.goals_for === "number" || typeof submission.goals_against === "number"
                        ? `${submission.goals_for ?? 0} - ${submission.goals_against ?? 0}`
                        : "Not provided"}
                    </p>
                  </div>
                  <div className="modal-card rounded-xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Match date</p>
                    <p className="text-base font-semibold text-container-foreground">{formatDate(submission.match_date)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Detailed scorer data is stored in the match report and updates the leaderboard automatically.
                </p>
              </div>
            )}

            {canResolve ? (
              <label className="modal-card block rounded-2xl bg-container/80 p-4 text-sm font-medium text-muted">
                Return notes to coach
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  placeholder="Explain why the submission needs adjustments…"
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
                <span className="mt-1 inline-block text-xs text-muted/80">
                  Coaches will see this message if the report is returned.
                </span>
              </label>
            ) : submission.review_notes ? (
              <div className="modal-card rounded-2xl bg-container/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reviewer notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-container-foreground">{submission.review_notes}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-black/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {canTakeAction ? (
              <>
                <button
                  type="button"
                  onClick={() => onReject(submission.id, notes.trim())}
                  disabled={disableReject}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isRejectPending ? "Sending..." : "Send back to coach"}
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(submission.id)}
                  disabled={isApprovePending}
                  className="w-full rounded-xl bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isApprovePending ? "Approving..." : "Approve submission"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-container-foreground transition hover:bg-container/80 sm:w-auto"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSubmissionReviewModal;
