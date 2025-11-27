import TeamFormModal from "./TeamFormModal";
import CoachFormModal from "./CoachFormModal";

type DashboardManagementModalsProps = {
  teamFormProps: React.ComponentProps<typeof TeamFormModal>;
  coachFormProps: React.ComponentProps<typeof CoachFormModal>;
};

/**
 * Wrapper that keeps form modals for teams and coaches together.
 * Helps keep Dashboard.tsx lean by moving modal markup out.
 */
const DashboardManagementModals = ({ teamFormProps, coachFormProps }: DashboardManagementModalsProps) => {
  return (
    <>
      <TeamFormModal {...teamFormProps} />
      <CoachFormModal {...coachFormProps} />
    </>
  );
};

export default DashboardManagementModals;
