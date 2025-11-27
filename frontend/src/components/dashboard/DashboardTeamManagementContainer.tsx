import TeamManagementSection from "./TeamManagementSection";
import DashboardManagementModals from "./DashboardManagementModals";
import { useAthletes } from "../../hooks/useAthletes";

type DashboardTeamManagementContainerProps = {
  showTeamManagement: boolean;
  teamListProps: React.ComponentProps<
    typeof TeamManagementSection
  >["teamListProps"];
  teamFormProps: React.ComponentProps<
    typeof DashboardManagementModals
  >["teamFormProps"];
  coachFormProps: React.ComponentProps<
    typeof DashboardManagementModals
  >["coachFormProps"];
  athletesQuery: ReturnType<typeof useAthletes>;
};

/**
 * Wraps team management list + modals for teams/coaches.
 */
const DashboardTeamManagementContainer = ({
  showTeamManagement,
  teamListProps,
  teamFormProps,
  coachFormProps,
  athletesQuery,
}: DashboardTeamManagementContainerProps) => {
  return (
    <>
      {showTeamManagement ? (
        <TeamManagementSection
          teamListProps={teamListProps}
          athletesQuery={athletesQuery}
        />
      ) : null}
      <DashboardManagementModals
        teamFormProps={teamFormProps}
        coachFormProps={coachFormProps}
      />
    </>
  );
};

export default DashboardTeamManagementContainer;
