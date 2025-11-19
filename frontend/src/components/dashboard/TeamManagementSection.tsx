import type { ComponentProps } from "react";

import TeamListCard from "./TeamListCard";

type TeamManagementSectionProps = {
  teamListProps: ComponentProps<typeof TeamListCard>;
};

const TeamManagementSection = ({ teamListProps }: TeamManagementSectionProps) => (
  <section className="print-hidden">
    <div className="h-[34rem]">
      <TeamListCard {...teamListProps} />
    </div>
  </section>
);

export default TeamManagementSection;
