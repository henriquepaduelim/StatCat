import GameReportModal from "./GameReportModal";
import ReportCardModal from "./ReportCardModal";
import TeamCombineMetricModal from "../team-dashboard/TeamCombineMetricModal";
import ReportSubmissionListModal from "./ReportSubmissionListModal";
import ReportSubmissionReviewModal from "./ReportSubmissionReviewModal";

type DashboardReportModalsProps = {
  gameReportProps: React.ComponentProps<typeof GameReportModal>;
  reportCardProps: React.ComponentProps<typeof ReportCardModal>;
  combineMetricProps: React.ComponentProps<typeof TeamCombineMetricModal>;
  submissionListProps: React.ComponentProps<typeof ReportSubmissionListModal>;
  submissionReviewProps: React.ComponentProps<typeof ReportSubmissionReviewModal>;
};

/**
 * Groups all reporting-related modals to keep Dashboard.tsx focused on data orchestration.
 */
const DashboardReportModals = ({
  gameReportProps,
  reportCardProps,
  combineMetricProps,
  submissionListProps,
  submissionReviewProps,
}: DashboardReportModalsProps) => {
  return (
    <>
      <GameReportModal {...gameReportProps} />
      <ReportCardModal {...reportCardProps} />
      <TeamCombineMetricModal {...combineMetricProps} />
      <ReportSubmissionListModal {...submissionListProps} />
      <ReportSubmissionReviewModal {...submissionReviewProps} />
    </>
  );
};

export default DashboardReportModals;
