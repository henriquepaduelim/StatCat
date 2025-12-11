import { FormEvent, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useTeams } from "../hooks/useTeams";
import { useAuthStore } from "../stores/useAuthStore";
import {
  assignCoachToTeam,
  deleteTeamCoach,
  getCoachTeams,
  listAllCoaches,
  listTeamCoaches,
  updateTeam,
} from "../api/teams";
import type { Team } from "../types/team";
import type { Event as ApiEvent } from "../types/event";
import { updateAthlete } from "../api/athletes";
import { useEvents, useMyEvents } from "../hooks/useEvents";
import { useAthletes } from "../hooks/useAthletes";
import { listTeamCombineMetrics } from "../api/teamMetrics";
import { getTeamPosts } from "../api/teamPosts";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import CombineLeaderboardCard from "../components/dashboard/CombineLeaderboardCard";
import TeamFeedPreview from "../components/team-dashboard/TeamFeedPreview";
import TeamEventsWidget from "../components/team-dashboard/TeamEventsWidget";
import TeamCombineMetricsPanel from "../components/team-dashboard/TeamCombineMetricsPanel";
import TeamCombineMetricModal from "../components/team-dashboard/TeamCombineMetricModal";
import type { TeamPost } from "../types/teamPost";
import { useTranslation } from "../i18n/useTranslation";
import type { Athlete } from "../types/athlete";
import type { AthleteFilter, NewTeamFormState } from "../types/dashboard";
import { useTeamBuilderData } from "../hooks/useTeamBuilderData";
import TeamFormModal from "../components/dashboard/TeamFormModal";
import { createTeamLabels, teamAgeOptions } from "../constants/dashboard";
import { getMediaUrl } from "../utils/media";
import PageTitle from "../components/PageTitle";
import Spinner from "../components/Spinner";

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
  const [isTeamFormOpen, setTeamFormOpen] = useState(false);
  const [isTeamFormSubmitting, setTeamFormSubmitting] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState<NewTeamFormState>(() => ({
    name: "",
    ageCategory: "U14",
    gender: "coed",
    description: "",
    coachIds: [],
    athleteIds: [],
  }));
  const [editingTeam, setEditingTeam] = useState<{ id: number; name: string } | null>(null);
  const [draggedAthleteId, setDraggedAthleteId] = useState<number | null>(null);
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>({
    age: "",
    gender: "",
    query: "",
    teamStatus: "all",
  });

  const coachTeamsQuery = useQuery({
    queryKey: ["coach-teams", authUser?.id],
    enabled: role === "coach" && Boolean(authUser?.id),
    queryFn: () => (authUser ? getCoachTeams(authUser.id) : Promise.resolve<Team[]>([])),
  });
  const allCoachesQuery = useQuery({
    queryKey: ["all-team-coaches"],
    queryFn: listAllCoaches,
  });
  const teamCoachesQuery = useQuery({
    queryKey: ["team-coaches", selectedTeamId],
    enabled: Boolean(selectedTeamId),
    queryFn: () => (selectedTeamId ? listTeamCoaches(selectedTeamId) : Promise.resolve([])),
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
  const flatAthletes = useMemo(() => athletesQuery.data?.pages.flatMap(page => page.items) ?? [], [athletesQuery.data]);

  const athleteNameById = useMemo(() => {
    return flatAthletes.reduce<Record<number, string>>((acc, athlete) => {
      acc[athlete.id] = `${athlete.first_name} ${athlete.last_name}`.trim();
      return acc;
    }, {});
  }, [flatAthletes]);

  const teamAthletes = useMemo(() => {
    if (!selectedTeamId) return [];
    return flatAthletes.filter((athlete) => athlete.team_id === selectedTeamId);
  }, [flatAthletes, selectedTeamId]);

  const teamDashboardTranslations = t.teamDashboard;
  const leaderboardLabels =
    teamDashboardTranslations?.leaderboard ?? {
      scorersTitle: "Top Scorers",
      scorersDescription: "Goals recorded in official stats.",
      cleanSheetsTitle: "Clean Sheet Leaders",
      cleanSheetsDescription: "Goalkeepers with the lowest concessions.",
    };

  const eventsQuery = useEvents(
    selectedTeamId ? { team_id: selectedTeamId } : undefined,
    { enabled: Boolean(selectedTeamId) },
  );
  const myEventsQuery = useMyEvents({ enabled: !selectedTeamId });
  const events: ApiEvent[] = selectedTeamId ? eventsQuery.data ?? [] : myEventsQuery.data ?? [];
  const upcomingEvents = useMemo(() => {
    return events
      .filter(
        (event: ApiEvent) =>
          new Date(`${event.event_date}T${event.start_time ?? "00:00"}`) >= new Date(),
      )
      .sort(
        (a: ApiEvent, b: ApiEvent) =>
          new Date(`${a.event_date}T${a.start_time ?? "00:00"}`).getTime() -
          new Date(`${b.event_date}T${b.start_time ?? "00:00"}`).getTime(),
      )
      .slice(0, 4);
  }, [events]);

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
  const loadErrorMessage = useMemo(() => {
    if (teamsQuery.isError) return "Unable to load teams. Please try again.";
    if (eventsQuery.isError) return "Unable to load events. Please try again.";
    if (postsQuery.isError) return "Unable to load posts. Please try again.";
    return null;
  }, [eventsQuery.isError, postsQuery.isError, teamsQuery.isError]);

  const canRecordMetrics = roleCanRecordMetrics(role);
  const athleteById = useMemo(() => new Map(flatAthletes.map((athlete) => [athlete.id, athlete])), [flatAthletes]);
  const { candidates: teamBuilderCandidates, remainingAthleteCount } = useTeamBuilderData({
    athletes: flatAthletes,
    teamForm,
    athleteFilter,
  });

  const openTeamFormModal = async () => {
    if (!selectedTeam) return;
    setTeamFormError(null);
    setAthleteFilter({ age: "", gender: "", query: "", teamStatus: "all" });
    try {
      const teamCoaches = await queryClient.fetchQuery({
        queryKey: ["team-coaches", selectedTeam.id],
        queryFn: () => listTeamCoaches(selectedTeam.id),
      });
      setTeamForm({
        name: selectedTeam.name,
        ageCategory: selectedTeam.age_category,
        gender: "coed",
        description: selectedTeam.description || "",
        coachIds: teamCoaches.map((coach) => coach.id),
        athleteIds: teamAthletes.map((athlete) => athlete.id),
      });
      setEditingTeam({ id: selectedTeam.id, name: selectedTeam.name });
      setTeamFormOpen(true);
    } catch (error) {
      setTeamFormError("Unable to load team details.");
    }
  };

  const closeTeamFormModal = () => {
    setTeamFormOpen(false);
    setTeamForm({
      name: "",
      ageCategory: "U14",
      gender: "coed",
      description: "",
      coachIds: [],
      athleteIds: [],
    });
    setEditingTeam(null);
    setTeamFormError(null);
    setDraggedAthleteId(null);
  };

  const handleTeamFormFieldChange = <T extends keyof NewTeamFormState>(
    field: T,
    value: NewTeamFormState[T],
  ) => {
    setTeamForm((prev) => ({ ...prev, [field]: value }));
    setTeamFormError(null);
  };

  const handleTeamFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeam) return;
    const trimmedName = teamForm.name.trim();
    if (!trimmedName) {
      setTeamFormError("Team name is required.");
      return;
    }
    setTeamFormSubmitting(true);
    setTeamFormError(null);
    try {
      await updateTeam(selectedTeam.id, {
        name: trimmedName,
        age_category: teamForm.ageCategory,
        description: teamForm.description.trim() || null,
      });

      const currentAthleteIds = new Set(teamAthletes.map((athlete) => athlete.id));
      const desiredAthleteIds = new Set(teamForm.athleteIds);
      const athletesToRemove = teamAthletes.filter((athlete) => !desiredAthleteIds.has(athlete.id));
      const athletesToAdd = teamForm.athleteIds.filter((id) => !currentAthleteIds.has(id));

      await Promise.all([
        ...athletesToRemove.map((athlete) => updateAthlete(athlete.id, { team_id: null })),
        ...athletesToAdd.map((athleteId) => updateAthlete(athleteId, { team_id: selectedTeam.id })),
      ]);

      const currentCoachIds = (teamCoachesQuery.data ?? []).map((coach) => coach.id);
      const desiredCoachIds = teamForm.coachIds;
      const coachesToRemove = currentCoachIds.filter((id) => !desiredCoachIds.includes(id));
      const coachesToAdd = desiredCoachIds.filter((id) => !currentCoachIds.includes(id));

      await Promise.all([
        ...coachesToRemove.map((coachId) => deleteTeamCoach(selectedTeam.id, coachId)),
        ...coachesToAdd.map((coachId) => assignCoachToTeam(selectedTeam.id, coachId)),
      ]);

      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      await queryClient.invalidateQueries({ queryKey: ["athletes"] });
      await queryClient.invalidateQueries({ queryKey: ["team-coaches", selectedTeam.id] });
      closeTeamFormModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update team.";
      setTeamFormError(message);
    } finally {
      setTeamFormSubmitting(false);
    }
  };

  const teamDashboardTexts = teamDashboardTranslations ?? {
    title: "Team Hub",
    description: "Live insights, performance metrics, and communication for your roster.",
    selectLabel: "Team",
    noTeams: "No Teams Available.",
    rosterTitle: "Team Roster",
  };

  const isLoading = teamsQuery.isLoading || (role === "coach" && coachTeamsQuery.isLoading);
  const noTeamAvailable = !isLoading && availableTeams.length === 0;

  return (
    <>
    <div className="space-y-2">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PageTitle title={teamDashboardTexts.title} description={teamDashboardTexts.description} className="pb-0" />
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

      {isLoading ? (
        <Spinner />
      ) : selectedTeam ? (
        <div className="space-y-6">
          {loadErrorMessage ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadErrorMessage}
              <button
                type="button"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["teams"] });
                  queryClient.invalidateQueries({ queryKey: ["events"] });
                  queryClient.invalidateQueries({ queryKey: ["team-feed-preview", selectedTeamId] });
                }}
                className="ml-3 rounded-md border border-amber-400 px-3 py-1 text-xs font-semibold hover:bg-amber-100"
              >
                {"Retry"}
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <LeaderboardCard
              presetType="scorers"
              title={leaderboardLabels.scorersTitle}
              description={leaderboardLabels.scorersDescription}
              limit={5}
              teamId={selectedTeamId ?? null}
            />
            <CombineLeaderboardCard teamId={selectedTeamId ?? null} limit={5} />
            <LeaderboardCard
              presetType="clean_sheets"
              title={leaderboardLabels.cleanSheetsTitle}
              description={leaderboardLabels.cleanSheetsDescription}
              limit={5}
              teamId={selectedTeamId ?? null}
            />
          </div>

          <section className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-container-foreground">
                  {teamDashboardTexts.rosterTitle}
                </h2>
                {role !== "athlete" ? (
                  <p className="text-xs text-muted">
                    {teamAthletes.length} athletes
                  </p>
                ) : null}
              </div>
              {role !== "athlete" ? (
                <button
                  type="button"
                  onClick={openTeamFormModal}
                  className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus-visible:ring-2"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  Add Athlete
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {teamAthletes.length ? (
                teamAthletes.map((athlete: Athlete) => {
                  const initials = `${athlete.first_name?.[0] ?? ""}${athlete.last_name?.[0] ?? ""}`.trim().toUpperCase();
                  const avatarSrc = getMediaUrl(athlete.photo_url);
                  return (
                    <div
                      key={athlete.id}
                      className="rounded-lg border border-action-primary/30 bg-[rgb(var(--color-container-background))] p-2 shadow-sm flex items-center gap-2 text-sm"
                    >
                      <div className="h-9 w-9 flex items-center justify-center rounded-full overflow-hidden bg-action-primary/20 text-action-primary font-semibold text-xs">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={athlete.first_name} className="h-full w-full object-cover" />
                        ) : (
                          initials || "?"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-container-foreground text-sm">
                          {athlete.first_name} {athlete.last_name}
                        </p>
                        <p className="truncate text-[11px] text-muted">{athlete.email || "No email"}</p>
                        <p className="truncate text-[11px] text-muted">{athlete.phone || "No phone"}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted">No athletes assigned to this team.</p>
              )}
            </div>
          </section>

          <TeamCombineMetricsPanel
            metrics={combineMetricsQuery.data ?? []}
            athleteNameById={athleteNameById}
            onAdd={() => setMetricModalOpen(true)}
            canAdd={canRecordMetrics}
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
      <TeamFormModal
        isOpen={isTeamFormOpen}
        isSubmitting={isTeamFormSubmitting}
        editingTeam={editingTeam}
        labels={createTeamLabels}
        teamForm={teamForm}
        teamFormError={teamFormError}
        teamAgeOptions={teamAgeOptions}
        availableCoaches={allCoachesQuery.data ?? []}
        teamBuilderCandidates={teamBuilderCandidates}
        remainingAthleteCount={remainingAthleteCount}
        teamNameById={undefined}
        athleteById={athleteById}
        draggedAthleteId={draggedAthleteId}
        athleteFilter={athleteFilter}
        onSubmit={handleTeamFormSubmit}
        onClose={closeTeamFormModal}
        onFieldChange={handleTeamFormFieldChange}
        setTeamForm={setTeamForm}
        setDraggedAthleteId={setDraggedAthleteId}
        setAthleteFilter={setAthleteFilter}
      />
    </div>
    </>
  );
};

export default TeamDashboard;
