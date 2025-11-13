import { useEffect, useMemo, useState } from "react";

import type { ReportSubmissionSummary } from "../../api/reportSubmissions";

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

const ratingFields: Array<{ key: "technical_rating" | "physical_rating" | "training_rating" | "match_rating"; label: string }> =
  [
    { key: "technical_rating", label: "Technical" },
    { key: "physical_rating", label: "Physical" },
    { key: "training_rating", label: "Training performance" },
    { key: "match_rating", label: "Match performance" },
  ];

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
  }, [submission?.id, submission?.review_notes, isOpen]);

  const isReportCard = submission?.report_type === "report_card";
  const canTakeAction = Boolean(canResolve && submission?.status === "pending");
  const disableReject = !notes.trim() || isRejectPending;

  const headerLabel = useMemo(() => {
    if (!submission) return "";
    return submission.report_type === "game_report" ? "Game report" : "Report card";
  }, [submission]);

  if (!isOpen || !submission) {
    return null;
  }

  const statusMeta = statusStyles[submission.status];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-center justify-center px-4 py-8" onClick={onClose}>
        <div
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-muted hover:text-accent"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-container/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Submitted by</p>
                <p className="text-base font-semibold text-container-foreground">{submission.submitted_by}</p>
                <p className="text-xs text-muted">{formatDateTime(submission.created_at)}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-container/80 p-4">
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
              <>
                <div className="rounded-2xl border border-black/5 bg-container/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rating summary</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {ratingFields.map((field) => (
                      <div key={field.key} className="rounded-xl border border-black/5 bg-white/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-muted">{field.label}</p>
                        <p className="text-2xl font-semibold text-container-foreground">
                          {submission[field.key] ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-container/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">General notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-container-foreground">
                    {submission.general_notes?.trim() ? submission.general_notes : "No notes were provided."}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-black/5 bg-container/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Match summary</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-black/5 bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Opponent</p>
                    <p className="text-base font-semibold text-container-foreground">
                      {submission.opponent ?? "TBD"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/5 bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Score</p>
                    <p className="text-base font-semibold text-container-foreground">
                      {typeof submission.goals_for === "number" || typeof submission.goals_against === "number"
                        ? `${submission.goals_for ?? 0} - ${submission.goals_against ?? 0}`
                        : "Not provided"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/5 bg-white/80 px-4 py-3">
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
              <label className="block rounded-2xl border border-black/5 bg-container/80 p-4 text-sm font-medium text-muted">
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
              <div className="rounded-2xl border border-black/5 bg-container/80 p-4">
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

