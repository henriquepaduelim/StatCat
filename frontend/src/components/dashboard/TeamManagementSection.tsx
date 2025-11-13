import type { ComponentProps } from "react";

import TeamListCard from "./TeamListCard";
import TeamInsightsCard from "./TeamInsightsCard";

type TeamManagementSectionProps = {
  teamListProps: ComponentProps<typeof TeamListCard>;
  insightsProps: ComponentProps<typeof TeamInsightsCard>;
};

const TeamManagementSection = ({ teamListProps, insightsProps }: TeamManagementSectionProps) => (
  <section className="print-hidden grid gap-6 lg:grid-cols-2">
    <TeamListCard {...teamListProps} />
    <TeamInsightsCard {...insightsProps} />
  </section>
);

export default TeamManagementSection;

