import { useMemo, useState } from "react";

import type { ReportSubmissionSummary } from "../../api/reportSubmissions";

type ReportSubmissionListModalProps = {
  isOpen: boolean;
  pendingReports: ReportSubmissionSummary[];
  approvedReports: ReportSubmissionSummary[];
  mySubmissions: ReportSubmissionSummary[];
  canApproveReports: boolean;
  onClose: () => void;
  onReviewSubmission: (submission: ReportSubmissionSummary) => void;
  onViewMySubmission: (submission: ReportSubmissionSummary) => void;
  onApproveReport: (submissionId: number) => void;
};

const tabs: Array<{ id: "report_card" | "game_report"; label: string }> = [
  { id: "report_card", label: "Report Cards" },
  { id: "game_report", label: "Game reports" },
];

const ReportSubmissionListModal = ({
  isOpen,
  pendingReports,
  approvedReports,
  mySubmissions,
  canApproveReports,
  onClose,
  onReviewSubmission,
  onViewMySubmission,
  onApproveReport,
}: ReportSubmissionListModalProps) => {
  const [activeTab, setActiveTab] = useState<"report_card" | "game_report">("report_card");

  const safePendingReports = pendingReports ?? [];
  const safeApprovedReports = approvedReports ?? [];
  const safeMySubmissions = mySubmissions ?? [];

  const filteredPending = useMemo(
    () => safePendingReports.filter((report) => report.report_type === activeTab),
    [safePendingReports, activeTab],
  );
  const filteredApproved = useMemo(
    () => {
      const source = canApproveReports ? safeApprovedReports : safeMySubmissions;
      return source.filter(
        (submission) => submission.report_type === activeTab && submission.status === "approved",
      );
    },
    [safeApprovedReports, safeMySubmissions, activeTab, canApproveReports],
  );

  const totalByTab = useMemo(() => {
    const pendingCount = filteredPending.length;
    const approvedCount = filteredApproved.length;
    return { pendingCount, approvedCount, total: pendingCount + approvedCount };
  }, [filteredPending, filteredApproved]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center modal-overlay px-2 py-3 sm:items-center sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="modal-surface w-full max-w-screen-xl max-h-[90vh] overflow-hidden rounded-2xl p-0 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
          <div className="sticky top-0 z-10 border-b border-border-muted bg-container/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Submission overview</p>
              <h2 className="text-2xl font-semibold text-container-foreground">Report queue</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-container px-3 py-1 text-xs font-semibold text-muted sm:flex">
                <span>Pending</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  {totalByTab.pendingCount}
                </span>
                <span>Approved</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                  {totalByTab.approvedCount}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted transition hover:bg-container/60"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex gap-2 border-t border-border-muted px-4 py-2 text-xs font-semibold text-muted sm:px-6">
            {tabs.map((tab) => {
              const pendingCount = safePendingReports.filter((r) => r.report_type === tab.id).length;
              const approvedCount = (canApproveReports ? safeApprovedReports : safeMySubmissions).filter(
                (r) => r.report_type === tab.id && r.status === "approved",
              ).length;
              const total = pendingCount + approvedCount;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-1 py-1.5 text-[12px] transition ${
                    isActive
                      ? "border-action-primary bg-action-primary/15 text-action-primary shadow-sm"
                      : "border-border-muted bg-surface-primary/50 text-container-foreground/80 hover:border-action-primary/50 hover:bg-container/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isActive ? "bg-action-primary text-action-primary-foreground" : "bg-black/10 text-muted"
                    }`}
                  >
                    {total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-6">
          <section className="card-base flex flex-col gap-3 rounded-2xl bg-container p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-container-foreground">Pending approval</h3>
                <p className="text-xs text-muted">Awaiting action</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                {filteredPending.length}
              </span>
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {filteredPending.length ? (
                filteredPending.map((submission) => (
                  <article
                    key={`pending-submission-${submission.id}`}
                    className="rounded-lg border border-border-muted bg-container px-3 py-3 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-container-foreground">
                          {submission.report_type === "report_card"
                            ? submission.athlete_name ?? "Athlete TBD"
                            : submission.team_name ?? "Team TBD"}
                        </p>
                        <p className="text-xs text-muted">
                          Submitted by {submission.submitted_by} ·{" "}
                          {new Date(submission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    </div>
                    {canApproveReports ? (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => onReviewSubmission(submission)}
                          className="w-full rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:bg-container/70"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveReport(submission.id)}
                          className="w-full rounded-full bg-action-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-action-primary-foreground shadow transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approve
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">Nothing pending for this category.</p>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-container/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-container-foreground">Approved</h3>
                <p className="text-xs text-muted">Ready for athlete visibility</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                {filteredApproved.length}
              </span>
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {filteredApproved.length ? (
                filteredApproved.map((submission) => (
                  <article
                    key={`approved-submission-${submission.id}`}
                    className="rounded-lg border border-black/10 bg-container px-3 py-3 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-container-foreground">
                          {submission.report_type === "report_card"
                            ? submission.athlete_name ?? "Athlete TBD"
                            : submission.team_name ?? "Team TBD"}
                        </p>
                        <p className="text-xs text-muted">
                          Approved on{" "}
                          {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Approved
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onViewMySubmission(submission)}
                        className="w-full rounded-full border border-border-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:bg-container/70"
                      >
                        View submission
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">No approved submissions for this category.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReportSubmissionListModal;
