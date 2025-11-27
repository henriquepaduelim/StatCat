import DashboardHero from "./DashboardHero";
import LeaderboardCard from "./LeaderboardCard";

type DashboardSummarySectionProps = {
  title: string;
  description: string;
};

/**
 * Lightweight summary section that groups the hero and the top leaderboard cards.
 * Keeps Dashboard.tsx focused on data orchestration while this handles layout.
 */
const DashboardSummarySection = ({ title, description }: DashboardSummarySectionProps) => {
  return (
    <>
      <DashboardHero title={title} description={description} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeaderboardCard title="Top Scorers" description="Total goals recorded across reports." />
        <LeaderboardCard
          title="Clean Sheet Leaders"
          description="Goalkeepers ranked by matches without conceding."
          presetType="clean_sheets"
        />
      </div>
    </>
  );
};

export default DashboardSummarySection;
