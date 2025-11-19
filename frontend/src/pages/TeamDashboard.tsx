import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTeams } from "../hooks/useTeams";
import { useAuthStore } from "../stores/useAuthStore";
import { getCoachTeams, type Team } from "../api/teams";
import { useScoringLeaderboard } from "../hooks/useScoringLeaderboard";
import { useEvents } from "../hooks/useEvents";
import { useAthletes } from "../hooks/useAthletes";
import { listTeamCombineMetrics } from "../api/teamMetrics";
import { getTeamPosts, exportTeamPostsArchive } from "../api/teamPosts";
import TeamLeaderboardCard from "../components/team-dashboard/TeamLeaderboardCard";
import TeamFeedPreview from "../components/team-dashboard/TeamFeedPreview";
import TeamEventsWidget from "../components/team-dashboard/TeamEventsWidget";
import TeamCombineMetricsPanel from "../components/team-dashboard/TeamCombineMetricsPanel";
import TeamCombineMetricModal from "../components/team-dashboard/TeamCombineMetricModal";
import type { TeamPost } from "../types/teamPost";
import { useTranslation } from "../i18n/useTranslation";

const roleCanRecordMetrics = (role: string | null) =>
  role === "admin" || role === "staff" || role === "coach";

const TeamDashboard = () => {
  const queryClient = useQueryClient();
  const teamsQuery = useTeams();
  const authUser = useAuthStore((state) => state.user);
  const role = (authUser?.role || "").toLowerCase();
  const t = useTranslation();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isMetricModalOpen, setMetricModalOpen] = useState(false);

  const coachTeamsQuery = useQuery({
    queryKey: ["coach-teams", authUser?.id],
    enabled: role === "coach" && Boolean(authUser?.id),
    queryFn: () => (authUser ? getCoachTeams(authUser.id) : Promise.resolve<Team[]>([])),
  });

  const availableTeams = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    if (role === "athlete") {
      if (authUser?.team_id) {
        return teams.filter((team) => team.id === authUser.team_id);
      }
      return [];
    }
    if (role === "coach") {
      return coachTeamsQuery.data ?? [];
    }
    return teams;
  }, [teamsQuery.data, coachTeamsQuery.data, role, authUser?.team_id]);

  useEffect(() => {
    if (!selectedTeamId && availableTeams.length > 0) {
      setSelectedTeamId(availableTeams[0].id);
    } else if (selectedTeamId && availableTeams.every((team) => team.id !== selectedTeamId)) {
      setSelectedTeamId(availableTeams[0]?.id ?? null);
    }
  }, [availableTeams, selectedTeamId]);

  const selectedTeam = useMemo(
    () => availableTeams.find((team) => team.id === selectedTeamId) ?? null,
    [availableTeams, selectedTeamId],
  );

  const athletesQuery = useAthletes();
  const athletes = athletesQuery.data ?? [];
  const athleteNameById = useMemo(() => {
    return athletes.reduce<Record<number, string>>((acc, athlete) => {
      acc[athlete.id] = `${athlete.first_name} ${athlete.last_name}`.trim();
      return acc;
    }, {});
  }, [athletes]);
  const teamAthletes = useMemo(() => {
    if (!selectedTeamId) return [];
    return athletes.filter((athlete) => athlete.team_id === selectedTeamId);
  }, [athletes, selectedTeamId]);

  const teamDashboardTranslations = t.teamDashboard;
  const leaderboardLabels =
    teamDashboardTranslations?.leaderboard ?? {
      scorersTitle: "Top Scorers",
      scorersDescription: "Goals recorded in official stats.",
      cleanSheetsTitle: "Clean Sheet Leaders",
      cleanSheetsDescription: "Goalkeepers with the lowest concessions.",
    };

  const scorersQuery = useScoringLeaderboard({
    leaderboard_type: "scorers",
    limit: 25,
    team_id: selectedTeamId ?? undefined,
  });
  const cleanSheetsQuery = useScoringLeaderboard({
    leaderboard_type: "clean_sheets",
    limit: 25,
    team_id: selectedTeamId ?? undefined,
  });

  const eventsQuery = useEvents(
    selectedTeamId ? { team_id: selectedTeamId } : undefined,
    { enabled: Boolean(selectedTeamId) },
  );
  const upcomingEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    return events
      .filter((event) => new Date(`${event.date}T${event.time ?? "00:00"}`) >= new Date())
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time ?? "00:00"}`).getTime() -
          new Date(`${b.date}T${b.time ?? "00:00"}`).getTime(),
      )
      .slice(0, 4);
  }, [eventsQuery.data]);

  const combineMetricsQuery = useQuery({
    queryKey: ["team-combine-metrics", selectedTeamId],
    enabled: Boolean(selectedTeamId),
    queryFn: () =>
      selectedTeamId ? listTeamCombineMetrics(selectedTeamId, { limit: 12 }) : Promise.resolve([]),
  });

  const postsQuery = useQuery({
    queryKey: ["team-feed-preview", selectedTeamId],
    enabled: Boolean(selectedTeamId),
    queryFn: () =>
      selectedTeamId ? getTeamPosts(selectedTeamId, { size: 6 }) : Promise.resolve<TeamPost[]>([]),
  });

  const downloadArchiveMutation = useMutation({
    mutationFn: (options: { deleteAfter: boolean }) => {
      if (!selectedTeamId) {
        throw new Error("Missing team reference");
      }
      return exportTeamPostsArchive({ teamId: selectedTeamId, deleteAfter: options.deleteAfter });
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = variables.deleteAfter ? "team-feed-archive-cleanup.zip" : "team-feed-archive.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      if (variables.deleteAfter) {
        queryClient.invalidateQueries({ queryKey: ["teamPosts", selectedTeamId] });
        queryClient.invalidateQueries({ queryKey: ["team-feed-preview", selectedTeamId] });
      }
    },
  });

  const canRecordMetrics = roleCanRecordMetrics(role);
  const canExportArchive = role === "admin" || role === "staff";

  const handleArchiveDownload = (deleteAfter: boolean) => {
    if (!selectedTeamId) {
      return;
    }
    downloadArchiveMutation.mutate({ deleteAfter });
  };

  const teamDashboardTexts = teamDashboardTranslations ?? {
    title: "Team Hub",
    description: "Live insights, performance metrics, and communication for your roster.",
    selectLabel: "Team",
    noTeams: "No Teams Available.",
    maintenanceTitle: "Season Maintenance",
    maintenanceDescription:
      "Export community posts and clean up media before next season begins.",
    exportButton: "Download Archive",
    cleanButton: "Download & Clean",
  };

  const isLoading = teamsQuery.isLoading || (role === "coach" && coachTeamsQuery.isLoading);
  const noTeamAvailable = !isLoading && availableTeams.length === 0;

  return (
    <>
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Team Dashboard</p>
          <h1 className="text-3xl font-semibold text-container-foreground">
            {teamDashboardTexts.title}
          </h1>
          <p className="text-base text-muted">{teamDashboardTexts.description}</p>
        </div>
        <div className="w-full max-w-xs">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">
            {teamDashboardTexts.selectLabel}
            <select
              value={selectedTeamId ?? ""}
              onChange={(event) => setSelectedTeamId(Number(event.target.value))}
              disabled={role === "athlete" || availableTeams.length === 0}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.age_category})
                </option>
              ))}
            </select>
          </label>
        </div>
        {noTeamAvailable ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            {teamDashboardTexts.noTeams}
          </div>
        ) : null}
      </header>

      {selectedTeam ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TeamLeaderboardCard
                type="scorers"
                title={leaderboardLabels.scorersTitle}
                description={leaderboardLabels.scorersDescription}
                entries={(scorersQuery.data?.entries ?? []).slice(0, 5)}
                isLoading={scorersQuery.isLoading}
                isError={Boolean(scorersQuery.isError)}
              />
              <TeamLeaderboardCard
                type="clean_sheets"
                title={leaderboardLabels.cleanSheetsTitle}
                description={leaderboardLabels.cleanSheetsDescription}
                entries={(cleanSheetsQuery.data?.entries ?? []).slice(0, 5)}
                isLoading={cleanSheetsQuery.isLoading}
                isError={Boolean(cleanSheetsQuery.isError)}
              />
            </div>
            <TeamCombineMetricsPanel
              metrics={combineMetricsQuery.data ?? []}
              athleteNameById={athleteNameById}
              onAdd={() => setMetricModalOpen(true)}
              canAdd={canRecordMetrics}
            />
          </div>
          <div className="space-y-6">
            <TeamEventsWidget
              events={upcomingEvents}
              isLoading={eventsQuery.isLoading}
              isError={Boolean(eventsQuery.isError)}
            />
            <TeamFeedPreview
              posts={postsQuery.data ?? []}
              isLoading={postsQuery.isLoading}
              isError={Boolean(postsQuery.isError)}
              teamName={selectedTeam.name}
            />
            {canExportArchive ? (
              <div className="rounded-xl border border-black/10 bg-white/90 p-3 text-xs text-muted shadow">
                <p className="text-[0.6rem] uppercase tracking-[0.25em] text-muted">
                  {teamDashboardTexts.maintenanceTitle}
                </p>
                <p className="mt-1 text-[0.85rem] leading-relaxed">{teamDashboardTexts.maintenanceDescription}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleArchiveDownload(false)}
                    disabled={downloadArchiveMutation.isPending}
                    className="rounded-md border border-black/20 px-2.5 py-1 text-[0.7rem] font-semibold text-muted transition hover:text-container-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadArchiveMutation.isPending ? "Preparing..." : teamDashboardTexts.exportButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchiveDownload(true)}
                    disabled={downloadArchiveMutation.isPending}
                    className="rounded-md border border-black/20 px-2.5 py-1 text-[0.7rem] font-semibold text-muted transition hover:text-container-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {teamDashboardTexts.cleanButton}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <TeamCombineMetricModal
        isOpen={isMetricModalOpen}
        onClose={() => setMetricModalOpen(false)}
        teamId={selectedTeamId}
        teamName={selectedTeam?.name}
        athletes={teamAthletes}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["team-combine-metrics", selectedTeamId] })}
      />
    </div>
    </>
  );
};

export default TeamDashboard;
