import { useState } from "react";

import type { ReportSubmissionSummary } from "../../api/reportSubmissions";

type ReportSubmissionListModalProps = {
  isOpen: boolean;
  pendingReports: ReportSubmissionSummary[];
  mySubmissions: ReportSubmissionSummary[];
  canApproveReports: boolean;
  onClose: () => void;
  onReviewSubmission: (submission: ReportSubmissionSummary) => void;
  onViewMySubmission: (submission: ReportSubmissionSummary) => void;
  onApproveReport: (submissionId: number) => void;
};

const tabs: Array<{ id: "report_card" | "game_report"; label: string }> = [
  { id: "report_card", label: "Report cards" },
  { id: "game_report", label: "Game reports" },
];

const ITEMS_PER_PAGE = 6;
const MAX_PAGES = 3;

const ReportSubmissionListModal = ({
  isOpen,
  pendingReports,
  mySubmissions,
  canApproveReports,
  onClose,
  onReviewSubmission,
  onViewMySubmission,
  onApproveReport,
}: ReportSubmissionListModalProps) => {
  const [activeTab, setActiveTab] = useState<"report_card" | "game_report">("report_card");
  const [pendingPage, setPendingPage] = useState(0);
  const [approvedPage, setApprovedPage] = useState(0);

  if (!isOpen) {
    return null;
  }

  const filteredPending = pendingReports.filter((report) => report.report_type === activeTab);
  const approvedSubmissions = mySubmissions.filter(
    (submission) => submission.report_type === activeTab && submission.status === "approved",
  );
  const totalPendingPages = Math.max(1, Math.min(MAX_PAGES, Math.ceil(filteredPending.length / ITEMS_PER_PAGE) || 1));
  const totalApprovedPages = Math.max(1, Math.min(MAX_PAGES, Math.ceil(approvedSubmissions.length / ITEMS_PER_PAGE) || 1));
  const pendingSlice = filteredPending.slice(
    pendingPage * ITEMS_PER_PAGE,
    pendingPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  );
  const approvedSlice = approvedSubmissions.slice(
    approvedPage * ITEMS_PER_PAGE,
    approvedPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
  );

  const resetPagination = () => {
    setPendingPage(0);
    setApprovedPage(0);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 px-3 py-4 sm:items-center sm:px-6 sm:py-8" onClick={onClose}>
      <div
        className="w-full max-w-screen-xl max-h-screen overflow-y-auto rounded-2xl bg-white p-4 pb-32 shadow-2xl sm:p-6 sm:pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Submission overview</p>
            <h2 className="text-2xl font-semibold text-container-foreground">Report queue</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-muted transition hover:bg-container/60"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-2 text-xs font-semibold text-muted">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                resetPagination();
              }}
              className={`flex-1 rounded-full border px-3 py-2 transition ${
                activeTab === tab.id
                  ? "border-action-primary bg-action-primary/10 text-action-primary"
                  : "border-black/10 hover:border-action-primary/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-container-foreground">Pending approval</h3>
                <p className="text-xs text-muted">Awaiting action</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {filteredPending.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {pendingSlice.length ? (
                pendingSlice.map((submission) => (
                  <article
                    key={`pending-submission-${submission.id}`}
                    className="rounded-lg border border-black/10 bg-container/50 p-3 text-sm"
                  >
                    <p className="font-semibold text-container-foreground">
                      {activeTab === "report_card"
                        ? submission.athlete_name ?? "Athlete TBD"
                        : submission.team_name ?? "Team TBD"}
                    </p>
                    <p className="text-xs text-muted">
                      Submitted by {submission.submitted_by} on{" "}
                      {new Date(submission.created_at).toLocaleDateString()}
                    </p>
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
            {filteredPending.length > ITEMS_PER_PAGE && (
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pendingPage === 0}
                    onClick={() => setPendingPage((prev) => Math.max(prev - 1, 0))}
                    className="rounded-full border border-black/10 px-2 py-1 disabled:opacity-50"
                  >
                    &laquo;
                  </button>
                  <button
                    type="button"
                    disabled={pendingPage + 1 >= totalPendingPages}
                    onClick={() => setPendingPage((prev) => Math.min(prev + 1, totalPendingPages - 1))}
                    className="rounded-full border border-black/10 px-2 py-1 disabled:opacity-50"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-container-foreground">Approved</h3>
                <p className="text-xs text-muted">Awaiting publication</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {approvedSubmissions.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {approvedSlice.length ? (
                approvedSlice.map((submission) => (
                  <article
                    key={`approved-submission-${submission.id}`}
                    className="rounded-lg border border-black/10 bg-white/70 p-3 text-sm"
                  >
                    <p className="font-semibold text-container-foreground">
                      {activeTab === "report_card"
                        ? submission.athlete_name ?? "Athlete TBD"
                        : submission.team_name ?? "Team TBD"}
                    </p>
                    <p className="text-xs text-muted">
                      Approved on{" "}
                      {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => onViewMySubmission(submission)}
                      className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-container-foreground transition hover:bg-container/70"
                    >
                      View submission
                    </button>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">No approved submissions for this category.</p>
              )}
            </div>
            {approvedSubmissions.length > ITEMS_PER_PAGE && (
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={approvedPage === 0}
                    onClick={() => setApprovedPage((prev) => Math.max(prev - 1, 0))}
                    className="rounded-full border border-black/10 px-2 py-1 disabled:opacity-50"
                  >
                    &laquo;
                  </button>
                  <button
                    type="button"
                    disabled={approvedPage + 1 >= totalApprovedPages}
                    onClick={() => setApprovedPage((prev) => Math.min(prev + 1, totalApprovedPages - 1))}
                    className="rounded-full border border-black/10 px-2 py-1 disabled:opacity-50"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReportSubmissionListModal;
