import { lazy, Suspense, useState } from "react";
import { usePermissions } from "../hooks/usePermissions";
import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../stores/useAuthStore";
import DashboardSummarySection from "../components/dashboard/DashboardSummarySection";
import { useDashboardBaseData } from "../hooks/useDashboardBaseData";
import { useDashboardEvents } from "../hooks/useDashboardEvents";
import { useDashboardReports } from "../hooks/useDashboardReports";
import { createTeamLabels, teamAgeOptions } from "../constants/dashboard";
import { useDashboardTeamManagement } from "../hooks/useDashboardTeamManagement";


const DashboardTeamManagementContainer = lazy(
  () => import("../components/dashboard/DashboardTeamManagementContainer"),
);
const DashboardEventsContainer = lazy(
  () => import("../components/dashboard/DashboardEventsContainer"),
);
const DashboardInsightsSection = lazy(
  () => import("../components/dashboard/DashboardInsightsSection"),
);
const DashboardReportModals = lazy(
  () => import("../components/dashboard/DashboardReportModals"),
);

const SectionFallback = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
    {label}
  </div>
);

const Dashboard = () => {
  const {
    athletesQuery,
    teamsQuery,
    athletes,
    teams,
    teamNameById,
    athletesByTeamId,
    athleteById,
  } = useDashboardBaseData();
  const permissions = usePermissions();
  const canApproveReports = permissions.canManageUsers;
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? null;
  const currentUserRole = user?.role ?? null;
  const currentUserAthleteId = user?.athlete_id ?? null;
  const isAthleteView = currentUserRole === "athlete";
  const canRecordCombineMetrics = ["admin", "staff", "coach"].includes(
    (currentUserRole || "").toLowerCase(),
  );
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const t = useTranslation();
  const summaryLabels = t.dashboard.summary;
  const coachDirectoryLabels = summaryLabels.coachDirectory;
  const {
    availableCoaches,
    teamListCardProps,
    coachDirectorySectionProps,
    teamFormModalProps,
    coachFormModalProps,
    setTeamNotice,
  } = useDashboardTeamManagement({
    permissions,
    athletes,
    teams,
    teamsQuery,
    athletesQuery,
    athletesByTeamId,
    teamNameById,
    athleteById,
    selectedTeamId,
    setSelectedTeamId,
    coachDirectoryLabels,
    createTeamLabels,
    teamAgeOptions,
    isAthleteView,
  });
  const {
    loadErrorMessage,
    eventsSectionProps,
    eventModalProps,
  } = useDashboardEvents({
    permissions,
    athletesQuery,
    teamsQuery,
    athletes,
    teams,
    athleteById,
    teamNameById,
    summaryLabels,
    currentUserId,
    currentUserRole,
    currentUserAthleteId,
    availableCoaches,
    selectedTeamId,
    setSelectedTeamId,
    clearLabel: t.common.clear,
  });
  const shouldShowInsights = !isAthleteView;
  const shouldShowCoaches = permissions.canCreateCoaches || permissions.canManageUsers;
  const { teamInsightsCardProps, reportModalsProps } = useDashboardReports({
    athletes,
    teams,
    athletesByTeamId,
    canApproveReports,
    canRecordCombineMetrics,
    selectedTeamId,
    setTeamNotice,
  });



  return (
    <>
      <div className="space-y-8">
        <DashboardSummarySection title={t.dashboard.title} description={t.dashboard.description} />

        {loadErrorMessage ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadErrorMessage}
          </div>
        ) : null}

        <Suspense fallback={<SectionFallback label="Loading team management..." />}>
          <DashboardTeamManagementContainer
            showTeamManagement={!isAthleteView}
            teamListProps={teamListCardProps}
            teamFormProps={teamFormModalProps}
            coachFormProps={coachFormModalProps}
            athletesQuery={athletesQuery}
          />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Loading events..." />}>
          <DashboardEventsContainer
            eventsSectionProps={eventsSectionProps}
            eventModalProps={eventModalProps}
          />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Loading insights..." />}>
          <DashboardInsightsSection
            showInsights={shouldShowInsights}
            showCoaches={shouldShowCoaches}
            teamInsightsCardProps={teamInsightsCardProps}
            coachDirectorySectionProps={coachDirectorySectionProps}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <DashboardReportModals {...reportModalsProps} />
      </Suspense>
    </>
  );
};

export default Dashboard;
