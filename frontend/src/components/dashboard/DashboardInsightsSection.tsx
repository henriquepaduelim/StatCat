import CoachDirectorySection from "./CoachDirectorySection";
import TeamInsightsCard from "./TeamInsightsCard";

type DashboardInsightsSectionProps = {
  showInsights: boolean;
  showCoaches: boolean;
  teamInsightsCardProps: React.ComponentProps<typeof TeamInsightsCard>;
  coachDirectorySectionProps: React.ComponentProps<typeof CoachDirectorySection>;
};

/**
 * Combines insights and coach directory cards under a single responsive layout.
 * Keeps Dashboard.tsx focused on data orchestration.
 */
const DashboardInsightsSection = ({
  showInsights,
  showCoaches,
  teamInsightsCardProps,
  coachDirectorySectionProps,
}: DashboardInsightsSectionProps) => {
  if (!showInsights && !showCoaches) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {showInsights ? (
        <div className="lg:h-[34rem]">
          <TeamInsightsCard {...teamInsightsCardProps} />
        </div>
      ) : null}
      {showCoaches ? (
        <div className="lg:h-[34rem]">
          <CoachDirectorySection {...coachDirectorySectionProps} />
        </div>
      ) : null}
    </div>
  );
};

export default DashboardInsightsSection;
