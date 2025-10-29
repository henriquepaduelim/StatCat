import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignCoachToTeam,
  createCoach,
  createTeam,
  deleteTeamCoach,
  listAllCoaches,
  type TeamCoach,
} from "../api/teams";
import { updateAthlete } from "../api/athletes";
import { useAthletes } from "../hooks/useAthletes";
import { useTeamCoaches } from "../hooks/useTeamCoaches";
import { useTeams } from "../hooks/useTeams";
import { useScoringLeaderboard } from "../hooks/useScoringLeaderboard";
import { useMetricRanking } from "../hooks/useMetricRanking";
import { useTranslation } from "../i18n/useTranslation";
import type { Athlete } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";

type DashboardEvent = {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  notes: string;
  teamId: number | null;
  coachId: number | null;
  inviteeIds: number[];
};

type EventFormState = {
  name: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  teamId: number | null;
  coachId: number | null;
  inviteeIds: number[];
};

type NewTeamFormState = {
  name: string;
  ageCategory: string;
  description: string;
  coachIds: number[];
  athleteIds: number[];
};

const weekdayInitials = ["S", "M", "T", "W", "T", "F", "S"];

const createEmptyTeamForm = (): NewTeamFormState => ({
  name: "",
  ageCategory: "U14",
  description: "",
  coachIds: [],
  athleteIds: [],
});

const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

const readableDate = (dateStr: string) => {
  if (!dateStr) {
    return "";
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const Dashboard = () => {
  const athletesQuery = useAthletes();
  const teamsQuery = useTeams();

  const displayAthletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data]);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const token = useAuthStore((state) => state.token);
  const teamNameById = useMemo(() => {
    if (!Array.isArray(teams) || teams.length === 0) {
      return {};
    }
    return teams.reduce<Record<number, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teams]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [speedAgeCategory, setSpeedAgeCategory] = useState<string>("U14");
  const [speedGenderFilter, setSpeedGenderFilter] = useState<string>("boys");
  const [isCoachFormOpen, setCoachFormOpen] = useState(false);
  const [isTeamFormOpen, setTeamFormOpen] = useState(false);
  const createEmptyCoachForm = (assignToTeam: boolean) => ({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    assignToTeam,
  });
  const [coachForm, setCoachForm] = useState(() => createEmptyCoachForm(false));
  const [coachFormError, setCoachFormError] = useState<string | null>(null);
  const [coachFormSuccess, setCoachFormSuccess] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState<NewTeamFormState>(() => createEmptyTeamForm());
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const t = useTranslation();
  const queryClient = useQueryClient();
  const teamCoachesQuery = useTeamCoaches(selectedTeamId);
  const summaryLabels = t.dashboard.summary;
  const createTeamLabels = {
    button: "Add team",
    modalTitle: "Create new team",
    helper: "Set up the roster by inviting coaches and assigning athletes.",
    nameLabel: "Team name",
    ageLabel: "Age category",
    descriptionLabel: "Description (optional)",
    coachesSection: "Coaches",
    coachesHelper: "Select coaches that are already registered to manage this team.",
    coachesLoading: "Loading coaches...",
    coachesError: "Unable to load coaches.",
    noCoaches: "No coaches available. Create coaches first.",
    athletesSection: "Assign athletes",
    athletesHelper: "Select players to include in this team.",
    athletesHeaderSelect: "Select",
    athletesHeaderAthlete: "Athlete",
    submitLabel: "Create team",
    cancelLabel: "Cancel",
    noAthletes: "No athletes available.",
    errorName: "Team name is required.",
    errorCoach: "Select at least one coach.",
  };
  const coachDirectoryLabels = summaryLabels.coachDirectory;
  const allCoachesQuery = useQuery<TeamCoach[]>({
    queryKey: ["all-team-coaches"],
    queryFn: listAllCoaches,
    enabled: Boolean(token),
    staleTime: 1000 * 30,
  });
  const availableCoaches = useMemo(() => {
    const coaches = allCoachesQuery.data ?? [];
    return [...coaches].sort((a, b) => (a?.full_name || '').localeCompare(b?.full_name || ''));
  }, [allCoachesQuery.data]);
  const teamAgeOptions = ["U12", "U13", "U14", "U15", "U16", "U19"];
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>({
    name: "",
    date: "",
    time: "",
    location: "",
    notes: "",
    teamId: null,
    coachId: null,
    inviteeIds: [],
  });
  const [eventFormError, setEventFormError] = useState<string | null>(null);
  const eventIdRef = useRef(1);
  const selectAllAthletesRef = useRef<HTMLInputElement | null>(null);
  const selectAllInviteesRef = useRef<HTMLInputElement | null>(null);
  const eventTeamId = eventForm.teamId ?? selectedTeamId ?? null;
  const eventTeamCoachesQuery = useTeamCoaches(eventTeamId);

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedEventDate) {
      return [];
    }
    return events.filter((event) => event.date === selectedEventDate);
  }, [events, selectedEventDate]);

  const eventTeamIdsForSelectedDate = useMemo(() => {
    if (!selectedEventDate) {
      return [];
    }
    const ids = new Set<number>();
    eventsOnSelectedDate.forEach((event) => {
      if (event.teamId !== null) {
        ids.add(event.teamId);
      }
    });
    return Array.from(ids);
  }, [eventsOnSelectedDate, selectedEventDate]);
  const teamsForSelectedDate = useMemo(() => {
    if (!events.length) {
      return [];
    }
    const teamsWithEvents = new Set<number>();
    events.forEach((event) => {
      if (event.teamId !== null) {
        teamsWithEvents.add(event.teamId);
      }
    });
    if (!teamsWithEvents.size) {
      return [];
    }
    if (selectedEventDate) {
      return teams.filter((team) => eventTeamIdsForSelectedDate.includes(team.id));
    }
    return teams.filter((team) => teamsWithEvents.has(team.id));
  }, [teams, events, selectedEventDate, eventTeamIdsForSelectedDate]);

  const apiGender = speedGenderFilter === "girls" ? "female" : "male";
  const speedRankingQuery = useMetricRanking("top_end_speed", {
    limit: 5,
    age_category: speedAgeCategory,
    gender: apiGender,
  });

  const scorersLeaderboard = useScoringLeaderboard({
    leaderboard_type: "scorers",
    limit: 5,
    age_category: speedAgeCategory,
    gender: apiGender,
  });

  const shootoutsLeaderboard = useScoringLeaderboard({
    leaderboard_type: "shootouts",
    limit: 5,
    age_category: speedAgeCategory,
    gender: apiGender,
  });

  useEffect(() => {
    if (!teams.length || !teamsForSelectedDate.length) {
      if (selectedTeamId !== null) {
        setSelectedTeamId(null);
      }
      return;
    }

    if (selectedEventDate) {
      const nextId = selectedTeamId && eventTeamIdsForSelectedDate.includes(selectedTeamId)
        ? selectedTeamId
        : teamsForSelectedDate[0]?.id ?? null;
      if (nextId !== selectedTeamId) {
        setSelectedTeamId(nextId);
      }
      return;
    }

    const stillValid =
      selectedTeamId !== null &&
      teamsForSelectedDate.some((team) => team.id === selectedTeamId);
    const nextId = stillValid ? selectedTeamId : teamsForSelectedDate[0]?.id ?? null;
    if (nextId !== selectedTeamId) {
      setSelectedTeamId(nextId);
    }
  }, [teams, teamsForSelectedDate, selectedEventDate, eventTeamIdsForSelectedDate, selectedTeamId]);

  useEffect(() => {
    setCoachForm(createEmptyCoachForm(Boolean(selectedTeamId)));
    setCoachFormError(null);
    setCoachFormSuccess(null);
  }, [selectedTeamId]);

  const rosterAthletes = useMemo(() => {
    if (!selectedTeamId) {
      return [];
    }
    return displayAthletes.filter((athlete) => athlete.team_id === selectedTeamId);
  }, [displayAthletes, selectedTeamId]);

  const allAthleteIds = useMemo(() => {
    if (!Array.isArray(displayAthletes)) {
      return [];
    }
    return displayAthletes.map((athlete) => athlete.id)
  }, [displayAthletes]);
  const areAllAthletesSelected = useMemo(
    () => allAthleteIds.length > 0 && allAthleteIds.every((id) => teamForm.athleteIds.includes(id)),
    [allAthleteIds, teamForm.athleteIds]
  );

  useEffect(() => {
    if (!selectAllAthletesRef.current) {
      return;
    }
    const isIndeterminate = teamForm.athleteIds.length > 0 && !areAllAthletesSelected;
    selectAllAthletesRef.current.indeterminate = isIndeterminate;
  }, [teamForm.athleteIds, areAllAthletesSelected]);

  const eventTeamAthletes = useMemo(() => {
    if (!eventTeamId) {
      return [];
    }
    return displayAthletes.filter((athlete) => athlete.team_id === eventTeamId);
  }, [displayAthletes, eventTeamId]);

  const allInviteeIds = useMemo(() => eventTeamAthletes.map((athlete) => athlete.id), [eventTeamAthletes]);
  const areAllInviteesSelected = useMemo(
    () => allInviteeIds.length > 0 && allInviteeIds.every((id) => eventForm.inviteeIds.includes(id)),
    [allInviteeIds, eventForm.inviteeIds]
  );

  useEffect(() => {
    if (!selectAllInviteesRef.current) {
      return;
    }
    const isIndeterminate = eventForm.inviteeIds.length > 0 && !areAllInviteesSelected;
    selectAllInviteesRef.current.indeterminate = isIndeterminate;
  }, [eventForm.inviteeIds, areAllInviteesSelected]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DashboardEvent[]>();
    events.forEach((event) => {
      if (!event.date) {
        return;
      }
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    });
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const bDate = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return aDate - bDate;
      })
      .slice(0, 4);
  }, [events]);

  const calendarGrid = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(day);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return { cells, year, month };
  }, [calendarCursor]);

  const availabilityBadgeClass = (status: Athlete["status"]) =>
    status === "active"
      ? "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
      : "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700";

  const isRosterLoading = athletesQuery.isLoading || teamsQuery.isLoading;
  const rosterHasError = athletesQuery.isError || teamsQuery.isError;
  const teamCoaches = useMemo(() => teamCoachesQuery.data ?? [], [teamCoachesQuery.data]);
  const assignedCoachIds = useMemo(() => new Set(teamCoaches.map((coach) => coach.id)), [teamCoaches]);
  const selectedTeamName = useMemo(() => {
    if (!selectedTeamId) {
      return null;
    }
    return teams.find((team) => team.id === selectedTeamId)?.name ?? null;
  }, [teams, selectedTeamId]);
  const isCoachListLoading = teamCoachesQuery.isLoading && Boolean(selectedTeamId);
  const coachListHasError = teamCoachesQuery.isError;
  const eventTeamCoaches = eventTeamCoachesQuery.data ?? [];
  const isTeamSelectDisabled = !teamsForSelectedDate.length;

  const goToPrevMonth = () => {
    setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const openEventFormPanel = (dateKey?: string) => {
    const targetDate = dateKey ?? formatDateKey(new Date());
    setEventForm((prev) => ({
      ...prev,
      date: targetDate,
      teamId: prev.teamId ?? selectedTeamId ?? null,
    }));
    setEventFormError(null);
    setEventFormOpen(true);
  };

  const handleDayClick = (day: number | null) => {
    if (!day) {
      return;
    }
    const target = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), day);
    const dateKey = formatDateKey(target);
    const dayEvents = eventsByDate.get(dateKey) ?? [];
    if (dayEvents.length) {
      setEventFormOpen(false);
      setEventFormError(null);
      setSelectedEventDate(dateKey);
      return;
    }
    setSelectedEventDate(null);
    openEventFormPanel(dateKey);
  };

  const handleEventInputChange = <T extends keyof EventFormState>(field: T, value: EventFormState[T]) => {
    setEventForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "teamId" ? { inviteeIds: [], coachId: null } : null),
    }));
  };

  const handleInviteToggle = (athleteId: number) => {
    setEventForm((prev) => {
      const nextInvitees = prev.inviteeIds.includes(athleteId)
        ? prev.inviteeIds.filter((id) => id !== athleteId)
        : [...prev.inviteeIds, athleteId];
      return { ...prev, inviteeIds: nextInvitees };
    });
  };

  const handleToggleAllInvitees = () => {
    setEventForm((prev) => ({
      ...prev,
      inviteeIds: areAllInviteesSelected ? [] : allInviteeIds,
    }));
  };

  const handleEventSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventForm.name.trim() || !eventForm.date) {
      setEventFormError(summaryLabels.calendar.errorIncomplete);
      return;
    }
    const newEvent: DashboardEvent = {
      id: eventIdRef.current,
      name: eventForm.name.trim(),
      date: eventForm.date,
      time: eventForm.time,
      location: eventForm.location,
      notes: eventForm.notes,
      teamId: eventForm.teamId ?? selectedTeamId ?? null,
      coachId: eventForm.coachId,
      inviteeIds: eventForm.inviteeIds,
    };
    eventIdRef.current += 1;
    setEvents((prev) => [...prev, newEvent]);
    setSelectedEventDate(newEvent.date);
    if (newEvent.teamId) {
      setSelectedTeamId(newEvent.teamId);
    }
    setEventForm({
      name: "",
      date: "",
      time: "",
      location: "",
      notes: "",
      teamId: eventForm.teamId ?? selectedTeamId ?? null,
      coachId: null,
      inviteeIds: [],
    });
    setEventFormError(null);
    setEventFormOpen(false);
  };

  const handleEventCancel = () => {
    setEventFormOpen(false);
    setEventFormError(null);
  };

  const closeTeamFormModal = () => {
    setTeamFormOpen(false);
    setTeamForm(createEmptyTeamForm());
    setTeamFormError(null);
  };
  const closeCoachFormModal = () => {
    setCoachFormOpen(false);
    setCoachForm(createEmptyCoachForm(Boolean(selectedTeamId)));
    setCoachFormError(null);
    setCoachFormSuccess(null);
  };

  const createTeamMutation = useMutation({
    mutationFn: async (form: NewTeamFormState) => {
      const team = await createTeam({
        name: form.name.trim(),
        age_category: form.ageCategory,
        description: form.description.trim() ? form.description.trim() : null,
      });

      if (form.coachIds.length) {
        await Promise.all(
          form.coachIds.map((coachId) => assignCoachToTeam(team.id, coachId))
        );
      }

      if (form.athleteIds.length) {
        await Promise.all(
          form.athleteIds.map((athleteId) => updateAthlete(athleteId, { team_id: team.id }))
        );
      }

      return team;
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches", team.id] });
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      setSelectedTeamId(team.id);
      closeTeamFormModal();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to create team.";
      setTeamFormError(message);
    },
  });

  type CoachFormState = ReturnType<typeof createEmptyCoachForm>;
  type CoachFormSubmit = CoachFormState & { teamId: number | null };

  const updateCoachForm = <T extends keyof CoachFormState>(field: T, value: CoachFormState[T]) => {
    setCoachForm((prev) => ({ ...prev, [field]: value }));
    setCoachFormError(null);
    setCoachFormSuccess(null);
  };

  const createCoachMutation = useMutation<
    { coach: TeamCoach; teamId: number | null },
    Error,
    CoachFormSubmit
  >({
    mutationFn: async (form: CoachFormSubmit) => {
      const coach = await createCoach({
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      if (form.teamId) {
        await assignCoachToTeam(form.teamId, coach.id);
      }
      return { coach, teamId: form.teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      if (result.teamId) {
        queryClient.invalidateQueries({ queryKey: ["team-coaches", result.teamId] });
      }
      setCoachForm(createEmptyCoachForm(Boolean(selectedTeamId)));
      setCoachFormError(null);
      const successMessage = result.teamId
        ? coachDirectoryLabels.assignSuccess
        : coachDirectoryLabels.createSuccess;
      setCoachFormSuccess(successMessage);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : coachDirectoryLabels.createError;
      setCoachFormSuccess(null);
      setCoachFormError(message);
    },
  });

  const removeCoachMutation = useMutation<
    void,
    Error,
    { teamId: number; coachId: number }
  >({
    mutationFn: ({ teamId, coachId }: { teamId: number; coachId: number }) =>
      deleteTeamCoach(teamId, coachId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-coaches", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      setCoachFormSuccess(coachDirectoryLabels.removeSuccess);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : coachDirectoryLabels.removeError;
      setCoachFormError(message);
    },
  });

  const assignCoachMutation = useMutation<
    TeamCoach,
    Error,
    { teamId: number; coachId: number }
  >({
    mutationFn: ({ teamId, coachId }: { teamId: number; coachId: number }) =>
      assignCoachToTeam(teamId, coachId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-coaches", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      setCoachFormSuccess(coachDirectoryLabels.assignSuccess);
      setCoachFormError(null);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : coachDirectoryLabels.assignError;
      setCoachFormError(message);
      setCoachFormSuccess(null);
    },
  });

  const handleCoachSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = coachForm.fullName.trim();
    const trimmedEmail = coachForm.email.trim();
    const trimmedPhone = coachForm.phone.trim();
    const trimmedPassword = coachForm.password.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setCoachFormError(coachDirectoryLabels.createError);
      return;
    }
    if (coachForm.assignToTeam && !selectedTeamId) {
      setCoachFormError(coachDirectoryLabels.assignDisabled);
      return;
    }
    setCoachFormError(null);
    setCoachFormSuccess(null);
    createCoachMutation.mutate({
      ...coachForm,
      fullName: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      password: trimmedPassword,
      teamId: coachForm.assignToTeam ? selectedTeamId ?? null : null,
    });
  };

  const handleCoachRemove = (coachId: number) => {
    if (!selectedTeamId) {
      setCoachFormError(coachDirectoryLabels.assignDisabled);
      return;
    }
    setCoachFormSuccess(null);
    setCoachFormError(null);
    removeCoachMutation.mutate({ teamId: selectedTeamId, coachId });
  };

  const handleCoachAssign = (coachId: number) => {
    if (!selectedTeamId) {
      setCoachFormError(coachDirectoryLabels.assignDisabled);
      return;
    }
    setCoachFormSuccess(null);
    setCoachFormError(null);
    assignCoachMutation.mutate({ teamId: selectedTeamId, coachId });
  };

  const handleTeamFormFieldChange = <T extends keyof NewTeamFormState>(
    field: T,
    value: NewTeamFormState[T]
  ) => {
    setTeamForm((prev) => ({ ...prev, [field]: value }));
    setTeamFormError(null);
  };

  const handleTeamCoachToggle = (coachId: number) => {
    setTeamForm((prev) => {
      const nextCoachIds = prev.coachIds.includes(coachId)
        ? prev.coachIds.filter((id) => id !== coachId)
        : [...prev.coachIds, coachId];
      return { ...prev, coachIds: nextCoachIds };
    });
    setTeamFormError(null);
  };

  const handleTeamAthleteToggle = (athleteId: number) => {
    setTeamForm((prev) => {
      const nextAthletes = prev.athleteIds.includes(athleteId)
        ? prev.athleteIds.filter((id) => id !== athleteId)
        : [...prev.athleteIds, athleteId];
      return { ...prev, athleteIds: nextAthletes };
    });
    setTeamFormError(null);
  };

  const handleToggleAllAthletes = () => {
    setTeamForm((prev) => ({
      ...prev,
      athleteIds: areAllAthletesSelected ? [] : allAthleteIds,
    }));
    setTeamFormError(null);
  };

  const handleTeamFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = teamForm.name.trim();
    if (!trimmedName) {
      setTeamFormError(createTeamLabels.errorName);
      return;
    }
    if (!teamForm.coachIds.length) {
      setTeamFormError(createTeamLabels.errorCoach);
      return;
    }
    setTeamFormError(null);
    createTeamMutation.mutate({
      name: trimmedName,
      ageCategory: teamForm.ageCategory,
      description: teamForm.description.trim(),
      coachIds: teamForm.coachIds,
      athleteIds: teamForm.athleteIds,
    });
  };
  return (
    <>
      <div className="space-y-8">
      <section className="print-hidden space-y-2">
        <h1 className="text-3xl font-semibold text-container-foreground">{t.dashboard.title}</h1>
        <p className="text-sm text-muted">{t.dashboard.description}</p>
      </section>

      <section className="print-hidden space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-container-foreground">Live leaderboards</h2>
            <p className="text-sm text-muted">
              Track top speed leaders and get ready for scoring leaderboards as match data arrives.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <span>Category</span>
              <select
                value={speedAgeCategory}
                onChange={(event) => setSpeedAgeCategory(event.target.value)}
                className="rounded-md border border-black/10 bg-white/90 px-2 py-1 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="U12">U12</option>
                <option value="U13">U13</option>
                <option value="U14">U14</option>
                <option value="U15">U15</option>
                <option value="U16">U16</option>
                <option value="U19">U19</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Gender</span>
              <select
                value={speedGenderFilter}
                onChange={(event) => setSpeedGenderFilter(event.target.value)}
                className="rounded-md border border-black/10 bg-white/90 px-2 py-1 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
              </select>
            </label>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">30m Leaders</h3>
            {speedRankingQuery.isLoading ? (
              <p className="mt-4 text-sm text-muted">{t.common.loading}...</p>
            ) : speedRankingQuery.isError ? (
              <p className="mt-4 text-sm text-red-500">Unable to load leaderboard.</p>
            ) : !speedRankingQuery.data?.entries?.length ? (
              <p className="mt-4 text-sm text-muted">No athletes with recorded data.</p>
            ) : (
              <ol className="mt-4 flex-1 space-y-3 text-sm text-muted">
                {speedRankingQuery.data.entries.map((entry, index) => (
                  <li key={entry.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-xs font-semibold text-[#039903]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
                        <p className="text-xs text-muted">{entry.team ?? "Club not set"}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#039903]">
                      {entry.value.toFixed(2)} {entry.unit ?? ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Goal Leaders</h3>
            {scorersLeaderboard.isLoading ? (
              <p className="mt-4 text-sm text-muted">{t.common.loading}...</p>
            ) : scorersLeaderboard.isError ? (
              <p className="mt-4 text-sm text-red-500">Unable to load scoring leaderboard.</p>
            ) : !scorersLeaderboard.data?.entries?.length ? (
              <p className="mt-4 text-sm text-muted">No match data recorded yet.</p>
            ) : (
              <ol className="mt-4 flex-1 space-y-3 text-sm text-muted">
                {scorersLeaderboard.data.entries.map((entry, index) => (
                  <li key={entry.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-xs font-semibold text-[#039903]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
                        <p className="text-xs text-muted">
                          {[entry.team, entry.position].filter(Boolean).join(" • ") || "No team"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#039903]">{entry.goals}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Clean Sheet Leaders</h3>
            {shootoutsLeaderboard.isLoading ? (
              <p className="mt-4 text-sm text-muted">{t.common.loading}...</p>
            ) : shootoutsLeaderboard.isError ? (
              <p className="mt-4 text-sm text-red-500">Unable to load shootout leaderboard.</p>
            ) : !shootoutsLeaderboard.data?.entries?.length ? (
              <p className="mt-4 text-sm text-muted">No shootout data recorded yet.</p>
            ) : (
              <ol className="mt-4 flex-1 space-y-3 text-sm text-muted">
                {shootoutsLeaderboard.data.entries.map((entry, index) => (
                  <li key={entry.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-xs font-semibold text-[#039903]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
                        <p className="text-xs text-muted">
                          {[entry.team, entry.position].filter(Boolean).join(" • ") || "No team"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#039903]">{entry.shootout_goals}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section className="print-hidden flex flex-col gap-6 xl:flex-row">
        <div className="w-full space-y-4 xl:w-1/2">
          <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="rounded-full border border-action-primary/40 bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
              >
                {summaryLabels.calendar.prevMonth}
              </button>
              <div className="text-center">
                <p className="text-lg font-semibold text-container-foreground">
                  {calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-muted">{summaryLabels.calendar.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={goToNextMonth}
                className="rounded-full border border-action-primary/40 bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
              >
                {summaryLabels.calendar.nextMonth}
              </button>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                {weekdayInitials.map((day, index) => (
                  <span key={`weekday-${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2 text-sm">
                {calendarGrid.cells.map((cell, index) => {
                  const dateKey = cell
                    ? formatDateKey(new Date(calendarGrid.year, calendarGrid.month, cell))
                    : null;
                  const hasEvents = Boolean(dateKey && eventsByDate.get(dateKey)?.length);
                  const isToday = dateKey === formatDateKey(new Date());
                  const isSelected = Boolean(dateKey && selectedEventDate === dateKey);
                  return (
                    <button
                      key={`calendar-cell-${calendarGrid.year}-${calendarGrid.month}-${index}`}
                      type="button"
                      disabled={!cell}
                      onClick={() => handleDayClick(cell)}
                      className={`flex h-14 flex-col items-center justify-center rounded-lg border px-1 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-action-primary/60 ${
                        cell
                          ? isSelected
                            ? "border-action-primary bg-action-primary/10 text-action-primary"
                            : isToday
                              ? "border-action-primary/40 bg-white text-action-primary"
                              : "border-black/10 bg-white/80 text-container-foreground hover:border-action-primary/40"
                          : "border-transparent bg-transparent text-transparent"
                      }`}
                    >
                      {cell ?? ""}
                      {hasEvents ? (
                        <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-action-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-container-foreground">{summaryLabels.calendar.title}</p>
                  <p className="text-xs text-muted">{summaryLabels.calendar.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEventFormPanel()}
                  className="rounded-md border border-action-primary/40 bg-action-primary px-3 py-1 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
                >
                  {summaryLabels.calendar.createButton}
                </button>
              </div>
              {upcomingEvents.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {upcomingEvents.map((event) => {
                    const handleUpcomingClick = () => {
                      setSelectedEventDate(event.date);
                      setEventFormOpen(false);
                      setEventFormError(null);
                      if (event.teamId) {
                        setSelectedTeamId(event.teamId);
                      }
                      setCalendarCursor((prev) => {
                        const eventDate = new Date(event.date);
                        if (
                          prev.getFullYear() === eventDate.getFullYear() &&
                          prev.getMonth() === eventDate.getMonth()
                        ) {
                          return prev;
                        }
                        return new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);
                      });
                    };
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={handleUpcomingClick}
                          className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-left shadow-sm transition hover:border-action-primary/40 hover:shadow-md"
                        >
                          <p className="font-semibold text-container-foreground">{event.name}</p>
                          <p className="text-xs text-muted">
                            {readableDate(event.date)} • {event.time || summaryLabels.calendar.timeTbd}
                          </p>
                          {event.location ? (
                            <p className="text-xs text-muted">{event.location}</p>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
              )}
            </div>
          </div>
          {eventFormOpen ? (
            <div className="rounded-xl border border-action-primary/25 bg-white/90 p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-container-foreground">
                  {summaryLabels.calendar.formTitle}
                </h3>
                <button
                  type="button"
                  onClick={handleEventCancel}
                  className="text-sm font-semibold text-muted hover:text-action-primary"
                >
                  {summaryLabels.calendar.cancelLabel}
                </button>
              </div>
              <form onSubmit={handleEventSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs font-medium text-muted md:col-span-2">
                  {summaryLabels.calendar.nameLabel}
                  <input
                    type="text"
                    value={eventForm.name}
                    onChange={(event) => handleEventInputChange("name", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Rivalry Match"
                    required
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.dateLabel}
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(event) => handleEventInputChange("date", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    required
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.timeLabel}
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(event) => handleEventInputChange("time", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.locationLabel}
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(event) => handleEventInputChange("location", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Training Center"
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.notesLabel}
                  <textarea
                    value={eventForm.notes}
                    onChange={(event) => handleEventInputChange("notes", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    rows={3}
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.teamLabel}
                  <select
                    value={eventForm.teamId ?? ""}
                    onChange={(event) =>
                      handleEventInputChange("teamId", event.target.value ? Number(event.target.value) : null)
                    }
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    <option value="">{summaryLabels.teamPlaceholder}</option>
                    {teams.map((team) => (
                      <option key={`event-team-${team.id}`} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.coachLabel}
                  {eventTeamCoachesQuery.isLoading ? (
                    <p className="mt-1 text-xs text-muted">{summaryLabels.calendar.coachLoading}</p>
                  ) : eventTeamCoaches.length ? (
                    <select
                      value={eventForm.coachId ?? ""}
                      onChange={(event) =>
                        handleEventInputChange("coachId", event.target.value ? Number(event.target.value) : null)
                      }
                      className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    >
                      <option value="">{t.common.select}</option>
                      {eventTeamCoaches.map((coach) => (
                        <option key={`event-coach-${coach.id}`} value={coach.id}>
                          {coach.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{summaryLabels.calendar.coachEmpty}</p>
                  )}
                </label>
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-muted">{summaryLabels.calendar.inviteLabel}</p>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-black/10 bg-white/70">
                    {!eventTeamId ? (
                      <p className="px-3 py-2 text-xs text-muted">{summaryLabels.emptyTeam}</p>
                    ) : eventTeamAthletes.length ? (
                      <div className="text-sm text-container-foreground">
                        <div className="grid w-full min-w-full border border-black/10">
                          <div className="grid grid-cols-[40px_1fr] items-center border-b border-black/10 bg-container/20 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
                            <div className="flex items-center justify-center">
                              <input
                                ref={selectAllInviteesRef}
                                type="checkbox"
                                checked={areAllInviteesSelected}
                                onChange={handleToggleAllInvitees}
                                aria-label={summaryLabels.calendar.inviteHeaderSelect}
                                className="h-4 w-4 rounded border-gray-300 text-action-primary focus:ring-action-primary"
                              />
                            </div>
                            <span className="px-1">{summaryLabels.calendar.inviteHeaderAthlete}</span>
                          </div>
                          {eventTeamAthletes.map((athlete) => {
                            const assignedTeamName =
                              athlete.team_id && teamNameById[athlete.team_id]
                                ? teamNameById[athlete.team_id]
                                : null;
                            const checkboxId = `event-invite-${athlete.id}`;
                            return (
                              <div
                                key={checkboxId}
                                className="grid grid-cols-[40px_1fr] items-stretch border-b border-black/10 last:border-b-0"
                              >
                                <div className="flex items-center justify-center border-r border-black/10 px-2 py-1">
                                  <input
                                    id={checkboxId}
                                    type="checkbox"
                                    checked={eventForm.inviteeIds.includes(athlete.id)}
                                    onChange={() => handleInviteToggle(athlete.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-action-primary focus:ring-action-primary"
                                  />
                                </div>
                                <label
                                  htmlFor={checkboxId}
                                  className="flex flex-col justify-center gap-0.5 px-3 py-1 leading-tight"
                                >
                                  <span>
                                    {athlete.first_name} {athlete.last_name}
                                  </span>
                                  {athlete.team_id ? (
                                    <span className="text-xs text-muted">
                                      {assignedTeamName
                                        ? `(Assigned • ${assignedTeamName})`
                                        : "(Assigned)"}
                                    </span>
                                  ) : null}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="px-3 py-2 text-xs text-muted">{summaryLabels.calendar.noAthletes}</p>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">{summaryLabels.calendar.inviteHelper}</p>
                </div>
                {eventFormError ? (
                  <p className="text-xs text-red-500 md:col-span-2">{eventFormError}</p>
                ) : null}
                <div className="md:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground"
                  >
                    {summaryLabels.calendar.submitLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleEventCancel}
                    className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted"
                  >
                    {summaryLabels.calendar.cancelLabel}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
        <div className="w-full space-y-4 rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur xl:w-1/2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-container-foreground">{summaryLabels.title}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTeamForm(createEmptyTeamForm());
                  setTeamFormError(null);
                  setTeamFormOpen(true);
                }}
                disabled={createTeamMutation.isPending}
                className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createTeamLabels.button}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoachForm(createEmptyCoachForm(Boolean(selectedTeamId)));
                  setCoachFormOpen(true);
                  setCoachFormError(null);
                  setCoachFormSuccess(null);
                }}
                disabled={createCoachMutation.isPending}
                className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 "
              >
                {summaryLabels.addCoachButton}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {selectedEventDate ? (
              <div className="rounded-lg border border-action-primary/30 bg-action-primary/5 px-3 py-2 text-xs text-container-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-action-primary">
                    {summaryLabels.calendar.filterLabel} • {readableDate(selectedEventDate)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedEventDate(null)}
                    className="text-xs font-semibold text-action-primary transition hover:text-action-primary/80"
                  >
                    {t.common.clear}
                  </button>
                </div>
                {eventsOnSelectedDate.length ? (
                  <ul className="mt-2 space-y-1 text-left">
                    {eventsOnSelectedDate.map((event) => (
                      <li
                        key={`selected-event-${event.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"
                      >
                        <span className="font-medium text-container-foreground">{event.name}</span>
                        <span>
                          {summaryLabels.teamLabel}:{" "}
                          {event.teamId
                            ? teamNameById[event.teamId] ?? summaryLabels.teamPlaceholder
                            : summaryLabels.teamPlaceholder}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
                )}
                <p className="mt-2 text-[0.7rem] text-muted">{summaryLabels.calendar.filterHelper}</p>
                {!eventTeamIdsForSelectedDate.length ? (
                  <p className="mt-1 text-xs text-red-500">{summaryLabels.calendar.filterEmpty}</p>
                ) : null}
              </div>
            ) : null}
            {!teamsForSelectedDate.length ? (
              <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs text-muted">
                {summaryLabels.noEvents}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted">
                    <span>{summaryLabels.teamLabel}</span>
                    <select
                      value={selectedTeamId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedTeamId(value ? Number(value) : null);
                      }}
                      disabled={isTeamSelectDisabled}
                      className="rounded-md border border-action-primary/30 bg-container/80 px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">{summaryLabels.teamPlaceholder}</option>
                      {teamsForSelectedDate.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ml-auto flex rounded-lg border border-black/5 bg-white/80 px-3 py-2 text-xs text-muted">
                    <div className="space-y-1">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-container-foreground">
                        {summaryLabels.coachesTitle}
                      </p>
                      {!selectedTeamId ? (
                        <p>{summaryLabels.emptyTeam}</p>
                      ) : isCoachListLoading ? (
                        <p>{t.common.loading}...</p>
                      ) : coachListHasError ? (
                        <p className="text-red-500">{summaryLabels.error}</p>
                      ) : teamCoaches.length ? (
                        <ul className="space-y-1">
                          {teamCoaches.map((coach) => (
                            <li key={coach.id} className="flex items-center gap-2 text-xs text-container-foreground">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{coach.full_name}</p>
                                <p className="truncate text-muted">{coach.phone ?? coachDirectoryLabels.phoneFallback}</p>
                                <p className="truncate text-muted">{coach.email}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCoachRemove(coach.id)}
                                disabled={removeCoachMutation.isPending}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[0.65rem] font-semibold text-red-500 transition hover:bg-red-200 disabled:opacity-50"
                                aria-label={summaryLabels.removeCoachLabel}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>{summaryLabels.coachesEmpty}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white/70">
                  <div className="grid grid-cols-[max-content_minmax(0,1fr)_auto] gap-x-2 border-b border-black/5 bg-container/20 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
                    <span className="text-left">{summaryLabels.columns.name}</span>
                    <span className="text-center">{summaryLabels.columns.contact}</span>
                    <span className="text-right">{summaryLabels.columns.availability}</span>
                  </div>
                  {isRosterLoading ? (
                    <div className="px-4 py-6 text-sm text-muted">{summaryLabels.loading}</div>
                  ) : rosterHasError ? (
                    <div className="px-4 py-6 text-sm text-red-500">{summaryLabels.error}</div>
                  ) : !selectedTeamId ? (
                    <div className="px-4 py-6 text-sm text-muted">{summaryLabels.emptyTeam}</div>
                  ) : !rosterAthletes.length ? (
                    <div className="px-4 py-6 text-sm text-muted">{summaryLabels.empty}</div>
                  ) : (
                    <ul className="divide-y divide-black/5">
                      {rosterAthletes.map((athlete) => (
                        <li
                          key={athlete.id}
                          className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)_auto] items-center gap-x-2 px-1 py-1 text-[0.95rem]"
                        >
                          <div className="w-max">
                            <p className="font-semibold text-container-foreground">
                              {athlete.first_name} {athlete.last_name}
                            </p>
                            <p className="text-xs text-muted">
                              {athlete.primary_position ?? summaryLabels.positionFallback}
                            </p>
                          </div>
                          <div className="min-w-0 justify-self-start">
                            <span className="block truncate text-left text-sm text-container-foreground">
                              {athlete.email ?? summaryLabels.contactFallback}
                            </span>
                          </div>
                          <span className={`${availabilityBadgeClass(athlete.status)} justify-self-end`}>
                            {athlete.status === "active" ? "✔" : "✖"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
    {isTeamFormOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        onClick={() => {
          if (!createTeamMutation.isPending) {
            closeTeamFormModal();
          }
        }}
        role="presentation"
      >
        <div
          className="w-full max-w-7xl max-h-[98vh] overflow-y-auto space-y-4 rounded-2xl bg-white p-6 shadow-2xl md:px-10"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-container-foreground">
                {createTeamLabels.modalTitle}
              </h3>
              <p className="text-sm text-muted">{createTeamLabels.helper}</p>
            </div>
            <button
              type="button"
              onClick={closeTeamFormModal}
              disabled={createTeamMutation.isPending}
              className="text-sm font-semibold text-muted hover:text-action-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createTeamLabels.cancelLabel}
            </button>
          </div>
          <form onSubmit={handleTeamFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-medium text-muted md:col-span-2">
                {createTeamLabels.nameLabel}
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(event) => handleTeamFormFieldChange("name", event.target.value)}
                  disabled={createTeamMutation.isPending}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                  placeholder="U14 National"
                  required
                />
              </label>
              <label className="text-xs font-medium text-muted">
                {createTeamLabels.ageLabel}
                <select
                  value={teamForm.ageCategory}
                  onChange={(event) => handleTeamFormFieldChange("ageCategory", event.target.value)}
                  disabled={createTeamMutation.isPending}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                >
                  {teamAgeOptions.map((option) => (
                    <option key={`team-age-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-muted md:col-span-2">
                {createTeamLabels.descriptionLabel}
                <textarea
                  value={teamForm.description}
                  onChange={(event) => handleTeamFormFieldChange("description", event.target.value)}
                  disabled={createTeamMutation.isPending}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                  rows={2}
                />
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2 items-stretch">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-container-foreground">
                  {createTeamLabels.coachesSection}
                </p>
                <p className="text-xs text-muted">{createTeamLabels.coachesHelper}</p>
                <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-black/10 bg-white/70">
                  {allCoachesQuery.isLoading ? (
                    <p className="px-3 py-2 text-xs text-muted">{createTeamLabels.coachesLoading}</p>
                  ) : allCoachesQuery.isError ? (
                    <p className="px-3 py-2 text-xs text-red-500">{createTeamLabels.coachesError}</p>
                  ) : !availableCoaches.length ? (
                    <p className="px-3 py-2 text-xs text-muted">{createTeamLabels.noCoaches}</p>
                  ) : (
                    <div className="text-sm text-container-foreground">
                      <div className="grid w-full min-w-full border border-black/10">
                        {availableCoaches.map((coach) => {
                          const checkboxId = `team-coach-${coach.id}`;
                          return (
                            <div
                              key={checkboxId}
                              className="grid grid-cols-[40px_1fr] items-stretch border-b border-black/10 last:border-b-0"
                            >
                              <div className="flex items-center justify-center border-r border-black/10 px-2 py-1">
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  checked={teamForm.coachIds.includes(coach.id)}
                                  onChange={() => handleTeamCoachToggle(coach.id)}
                                  disabled={createTeamMutation.isPending}
                                  aria-label={`Select ${coach.full_name}`}
                                  className="h-4 w-4 rounded border-gray-300 text-action-primary focus:ring-action-primary"
                                />
                              </div>
                              <label
                                htmlFor={checkboxId}
                                className="flex flex-col justify-center gap-0.5 px-3 py-1 leading-tight"
                              >
                                <span className="font-medium">{coach.full_name}</span>
                                <span className="text-xs text-muted">{coach.email}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-container-foreground">
                  {createTeamLabels.athletesSection}
                </p>
                <p className="text-xs text-muted">{createTeamLabels.athletesHelper}</p>
                <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-black/10 bg-white/70">
                  {!displayAthletes.length ? (
                    <p className="px-3 py-2 text-xs text-muted">{createTeamLabels.noAthletes}</p>
                  ) : (
                    <div className="text-sm text-container-foreground">
                      <div className="grid w-full min-w-full border border-black/10">
                        <div className="grid grid-cols-[40px_1fr] items-center border-b border-black/10 bg-container/20 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
                          <div className="flex items-center justify-center">
                            <input
                              ref={selectAllAthletesRef}
                              type="checkbox"
                              checked={areAllAthletesSelected}
                              onChange={handleToggleAllAthletes}
                              disabled={createTeamMutation.isPending}
                              aria-label={createTeamLabels.athletesHeaderSelect}
                              className="h-4 w-4 rounded border-gray-300 text-action-primary focus:ring-action-primary"
                            />
                          </div>
                          <span className="px-1">{createTeamLabels.athletesHeaderAthlete}</span>
                        </div>
                        {displayAthletes.map((athlete) => {
                          const assignedTeamName =
                            athlete.team_id && teamNameById[athlete.team_id]
                              ? teamNameById[athlete.team_id]
                              : null;
                          const checkboxId = `team-athlete-${athlete.id}`;
                          return (
                            <div
                              key={checkboxId}
                              className="grid grid-cols-[40px_1fr] items-stretch border-b border-black/10 last:border-b-0"
                            >
                              <div className="flex items-center justify-center border-r border-black/10 px-2 py-1">
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  checked={teamForm.athleteIds.includes(athlete.id)}
                                  onChange={() => handleTeamAthleteToggle(athlete.id)}
                                  disabled={createTeamMutation.isPending}
                                  aria-label={`Select ${athlete.first_name} ${athlete.last_name}`}
                                  className="h-4 w-4 rounded border-gray-300 text-action-primary focus:ring-action-primary"
                                />
                              </div>
                              <label
                                htmlFor={checkboxId}
                                className="flex flex-col justify-center gap-0.5 px-3 py-1 leading-tight"
                              >
                                <span>
                                  {athlete.first_name} {athlete.last_name}
                                </span>
                                {athlete.team_id ? (
                                  <span className="text-xs text-muted">
                                    {assignedTeamName
                                      ? `(Assigned • ${assignedTeamName})`
                                      : "(Assigned)"}
                                  </span>
                                ) : null}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {teamFormError ? <p className="text-xs text-red-500">{teamFormError}</p> : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTeamFormModal}
                disabled={createTeamMutation.isPending}
                className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createTeamLabels.cancelLabel}
              </button>
              <button
                type="submit"
                disabled={createTeamMutation.isPending}
                className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                {createTeamLabels.submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
    {isCoachFormOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
        onClick={closeCoachFormModal}
        role="presentation"
      >
        <div
          className="w-full max-w-5xl space-y-5 rounded-2xl bg-white p-6 shadow-2xl md:px-10"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-container-foreground">
                {coachDirectoryLabels.title}
              </h3>
              <p className="text-sm text-muted">{coachDirectoryLabels.helper}</p>
              {selectedTeamName ? (
                <p className="text-xs text-muted">
                  {coachDirectoryLabels.selectedTeamLabel}: {selectedTeamName}
                </p>
              ) : (
                <p className="text-xs text-muted">{coachDirectoryLabels.assignDisabled}</p>
              )}
            </div>
            <button
              type="button"
              onClick={closeCoachFormModal}
              className="text-sm font-semibold text-muted hover:text-action-primary"
            >
              {coachDirectoryLabels.closeButton}
            </button>
          </div>
          {coachFormError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {coachFormError}
            </div>
          ) : null}
          {coachFormSuccess ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {coachFormSuccess}
            </div>
          ) : null}
          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-container-foreground">
                  {coachDirectoryLabels.listTitle}
                </p>
                <span className="text-xs text-muted">
                  {availableCoaches.length} {availableCoaches.length === 1 ? coachDirectoryLabels.coachCountSingular : coachDirectoryLabels.coachCountPlural}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-black/10 bg-white/70 p-3 space-y-2">
                {allCoachesQuery.isLoading ? (
                  <p className="text-xs text-muted">{coachDirectoryLabels.coachesLoading}</p>
                ) : allCoachesQuery.isError ? (
                  <p className="text-xs text-red-500">{coachDirectoryLabels.coachesError}</p>
                ) : !availableCoaches.length ? (
                  <p className="text-xs text-muted">{coachDirectoryLabels.noCoaches}</p>
                ) : (
                  availableCoaches.map((coach) => {
                    const isAssigned = assignedCoachIds.has(coach.id);
                    return (
                      <div
                        key={`coach-directory-${coach.id}`}
                        className="flex flex-col gap-2 rounded-lg border border-black/5 bg-white px-3 py-2 text-sm text-container-foreground shadow-sm md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-semibold">{coach.full_name}</p>
                          <p className="truncate text-xs text-muted">
                            {coach.phone ?? coachDirectoryLabels.phoneFallback}
                          </p>
                          <p className="truncate text-xs text-muted">{coach.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedTeamId ? (
                            isAssigned ? (
                              <button
                                type="button"
                                onClick={() => handleCoachRemove(coach.id)}
                                disabled={removeCoachMutation.isPending}
                                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {coachDirectoryLabels.removeButton}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCoachAssign(coach.id)}
                                disabled={assignCoachMutation.isPending}
                                className="rounded-full border border-action-primary/40 px-3 py-1 text-xs font-semibold text-action-primary transition hover:bg-action-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {coachDirectoryLabels.assignButton}
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              className="cursor-not-allowed rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-muted"
                              disabled
                            >
                              {coachDirectoryLabels.assignDisabled}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-container-foreground">
                {coachDirectoryLabels.addTitle}
              </p>
              <form onSubmit={handleCoachSubmit} className="space-y-3">
                <label className="text-xs font-medium text-muted">
                  {coachDirectoryLabels.nameLabel}
                  <input
                    type="text"
                    value={coachForm.fullName}
                    onChange={(event) => updateCoachForm("fullName", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Sam Carter"
                    required
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {coachDirectoryLabels.emailLabel}
                  <input
                    type="email"
                    value={coachForm.email}
                    onChange={(event) => updateCoachForm("email", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="coach@club.dev"
                    required
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {coachDirectoryLabels.phoneLabel}
                  <input
                    type="tel"
                    value={coachForm.phone}
                    onChange={(event) => updateCoachForm("phone", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="(+1) 555-1234"
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  {coachDirectoryLabels.passwordLabel}
                  <input
                    type="password"
                    value={coachForm.password}
                    onChange={(event) => updateCoachForm("password", event.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Temporary password"
                    required
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted">
                  <input
                    type="checkbox"
                    checked={coachForm.assignToTeam && Boolean(selectedTeamId)}
                    onChange={(event) =>
                      updateCoachForm(
                        "assignToTeam",
                        selectedTeamId ? event.target.checked : false
                      )
                    }
                    disabled={!selectedTeamId}
                    className="rounded border-gray-300 text-action-primary focus:ring-action-primary disabled:cursor-not-allowed"
                  />
                  <span>
                    {coachDirectoryLabels.assignToggle}
                    {selectedTeamName ? ` (${selectedTeamName})` : ""}
                  </span>
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCoachFormModal}
                    className="rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-muted"
                  >
                    {coachDirectoryLabels.cancelLabel}
                  </button>
                  <button
                    type="submit"
                    disabled={createCoachMutation.isPending}
                    className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {coachDirectoryLabels.createSubmit}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
};

export default Dashboard;
