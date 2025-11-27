import type { ComponentProps } from "react";

import TeamListCard from "./TeamListCard";
import type { useAthletes } from "../../hooks/useAthletes";

type TeamManagementSectionProps = {
  teamListProps: ComponentProps<typeof TeamListCard>;
  athletesQuery: ReturnType<typeof useAthletes>;
};

const TeamManagementSection = ({
  teamListProps,
  athletesQuery,
}: TeamManagementSectionProps) => (
  <section className="print-hidden">
    <div className="h-[34rem]">
      <TeamListCard {...teamListProps} athletesQuery={athletesQuery} />
    </div>
  </section>
);

export default TeamManagementSection;
