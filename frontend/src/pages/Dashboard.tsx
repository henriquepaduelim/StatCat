import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignCoachToTeam,
  createCoach,
  createTeam,
  updateTeam,
  updateCoach,
  getCoachTeams,
  listAllCoaches,
  listTeamCoaches,
  deleteTeam as deleteTeamApi,
  deleteCoach as deleteCoachApi,
  type TeamCoach,
  type Team,
} from "../api/teams";
import { updateAthlete } from "../api/athletes";
import { useAthletes } from "../hooks/useAthletes";
import { useTeams } from "../hooks/useTeams";
import { usePermissions } from "../hooks/usePermissions";
import { useTranslation } from "../i18n/useTranslation";
import type { Athlete } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";
import { useMyEvents, useCreateEvent, useConfirmEventAttendance, useDeleteEvent, useEvents } from "../hooks/useEvents";
import type { Event, ParticipantStatus } from "../types/event";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import GameReportModal from "../components/dashboard/GameReportModal";
import ReportCardModal from "../components/dashboard/ReportCardModal";
import DashboardHero from "../components/dashboard/DashboardHero";
import TeamManagementSection from "../components/dashboard/TeamManagementSection";
import EventsSection from "../components/dashboard/EventsSection";
import CoachDirectorySection from "../components/dashboard/CoachDirectorySection";
import ReportSubmissionReviewModal from "../components/dashboard/ReportSubmissionReviewModal";
import ReportSubmissionListModal from "../components/dashboard/ReportSubmissionListModal";
import { submitGameReport } from "../api/matchReports";
import { submitReportCardRequest } from "../api/reportSubmissions";
import { useReportSubmissionWorkflow } from "../hooks/useReportSubmissionWorkflow";
import { useDashboardEventData } from "../hooks/useDashboardEventData";
import { useTeamBuilderData } from "../hooks/useTeamBuilderData";
import TeamFormModal from "../components/dashboard/TeamFormModal";
import CoachFormModal from "../components/dashboard/CoachFormModal";
import EventModal from "../components/dashboard/EventModal";
import { calculateAge } from "../utils/athletes";
import type {
  AthleteFilter,
  NewTeamFormState,
  NoticeState,
  CoachFormState,
  EventFormState,
  GameReportFormState,
} from "../types/dashboard";
import { createTeamLabels, teamAgeOptions } from "../constants/dashboard";
import { faCheck, faQuestion, faTimes } from "@fortawesome/free-solid-svg-icons";


type ApiErrorResponse = {
  response?: {
    data?: {
      detail?: string | Array<{ msg?: string }>;
    };
  };
};

const weekdayInitials = ["S", "M", "T", "W", "T", "F", "S"];

const createEmptyTeamForm = (): NewTeamFormState => ({
  name: "",
  ageCategory: "U14",
  gender: "coed",
  description: "",
  coachIds: [],
  athleteIds: [],
});

const createEmptyEventForm = (): EventFormState => ({
  name: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  notes: "",
  teamIds: [],
  coachIds: [],
  inviteeIds: [],
  sendEmail: true,
  sendPush: false,
});

const createEmptyGameReportForm = (): GameReportFormState => ({
  teamId: null,
  opponent: "",
  date: "",
  location: "",
  goalsFor: "",
  goalsAgainst: "",
  goalScorers: [],
  goalkeepersPlayed: [],
  goalkeeperConceded: [],
  notes: "",
});

// Generate date key (YYYY-MM-DD) in local time, avoiding day regression due to UTC
const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Convert YYYY-MM-DD string to local Date (not UTC) for display
const readableDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date((y || 0), (m || 1) - 1, (d || 1));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const isDateInPast = (date: Date) => {
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target < current;
};

const Dashboard = () => {
  const athletesQuery = useAthletes();
  const teamsQuery = useTeams();
  const permissions = usePermissions();
  const canManageEvents = permissions.canManageUsers || permissions.canCreateCoaches;
  const canApproveReports = permissions.canManageUsers;

  const athletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data]);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? null;
  const currentUserRole = user?.role ?? null;
  const currentUserAthleteId = user?.athlete_id ?? null;
  const isAthleteView = currentUserRole === "athlete";
  const teamNameById = useMemo(() => {
    return teams.reduce<Record<number, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teams]);
  const athletesByTeamId = useMemo(() => {
    return athletes.reduce<Record<number, Athlete[]>>((acc, athlete) => {
      if (typeof athlete.team_id === "number") {
        if (!acc[athlete.team_id]) {
          acc[athlete.team_id] = [];
        }
        acc[athlete.team_id].push(athlete);
      }
      return acc;
    }, {});
  }, [athletes]);
  const athleteById = useMemo(() => {
    const map = new Map<number, Athlete>();
    athletes.forEach((athlete) => {
      map.set(athlete.id, athlete);
    });
    return map;
  }, [athletes]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isCoachFormOpen, setCoachFormOpen] = useState(false);
  const [isTeamFormOpen, setTeamFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ id: number; name: string; ageCategory: string; gender: string; description: string } | null>(null);
  const [editingCoach, setEditingCoach] = useState<{ id: number; fullName: string; email: string; phone: string } | null>(null);
  const [coachTeams, setCoachTeams] = useState<Team[]>([]);
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>({
    age: "",
    gender: "",
    teamStatus: "all"
  });
  const { age: filterAge, gender: filterGender, teamStatus: filterTeamStatus } = athleteFilter;
  const [draggedAthleteId, setDraggedAthleteId] = useState<number | null>(null);
  const createEmptyCoachForm = (): CoachFormState => ({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [coachForm, setCoachForm] = useState(createEmptyCoachForm);
  const [coachFormError, setCoachFormError] = useState<string | null>(null);
  const [coachFormSuccess, setCoachFormSuccess] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState<NewTeamFormState>(() => createEmptyTeamForm());
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [teamNotice, setTeamNotice] = useState<NoticeState>(null);
  const [coachNotice, setCoachNotice] = useState<NoticeState>(null);
  const { candidates: teamBuilderCandidates, remainingAthleteCount } = useTeamBuilderData({
    athletes,
    teamForm,
    athleteFilter,
  });
  const t = useTranslation();
  const queryClient = useQueryClient();
  const {
    pendingReports,
    myReports,
    selectedSubmission,
    isSubmissionModalOpen,
    openSubmissionModal,
    closeSubmissionModal,
    handleApproveSubmission,
    handleRejectSubmission,
    approvingSubmissionId,
    rejectingSubmissionId,
    refetchSubmissions: refetchReportSubmissions,
  } = useReportSubmissionWorkflow({
    canApproveReports,
    onError: (message) => setTeamNotice({ variant: "error", message }),
  });
  const createGameReportMutation = useMutation({
    mutationFn: submitGameReport,
    onSuccess: () => {
      setGameReportError(null);
      setGameReportModalOpen(false);
      setGameReportForm(createEmptyGameReportForm());
      setGameReportAthleteFilterTeam(null);
      queryClient.invalidateQueries({ queryKey: ["scoring-leaderboard"] });
      refetchReportSubmissions();
    },
    onError: (error: unknown) => {
      const errorDetail = (error as ApiErrorResponse)?.response?.data?.detail;
      const message =
        typeof errorDetail === "string"
          ? errorDetail
          : "Unable to save the game report.";
      setGameReportError(message);
    },
  });
  const submitReportCardMutation = useMutation({
    mutationFn: submitReportCardRequest,
    onSuccess: () => {
      setReportCardError(null);
      setReportCardModalOpen(false);
      setReportCardAthleteId(null);
      setReportCardTeamId(null);
      setReportCardNotes("");
      refetchReportSubmissions();
    },
    onError: (error: unknown) => {
      const errorDetail = (error as ApiErrorResponse)?.response?.data?.detail;
      const message =
        typeof errorDetail === "string"
          ? errorDetail
          : "Unable to submit report card request.";
      setReportCardError(message);
    },
  });
  const fetchTeamCoaches = (teamId: number) =>
    queryClient.ensureQueryData({
      queryKey: ["team-coaches", teamId],
      queryFn: () => listTeamCoaches(teamId),
    });
  const summaryLabels = t.dashboard.summary;
  const coachDirectoryLabels = summaryLabels.coachDirectory;
  const allCoachesQuery = useQuery<TeamCoach[]>({
    queryKey: ["all-team-coaches"],
    queryFn: listAllCoaches,
    enabled: Boolean(token),
    staleTime: 1000 * 30,
  });
  const availableCoaches = useMemo(() => {
    const coaches = allCoachesQuery.data ?? [];
    return [...coaches].sort((a, b) => (a?.full_name || "").localeCompare(b?.full_name || ""));
  }, [allCoachesQuery.data]);
  const teamCoachMetaById = useMemo(() => {
    const map = new Map<number, { coachName: string | null; coachUserId: number | null }>();
    teams.forEach((team) => {
      const normalizedCoachName = (team.coach_name || "").trim().toLowerCase();
      const matchedCoach =
        normalizedCoachName && availableCoaches.length
          ? availableCoaches.find(
              (coach) => (coach.full_name || "").trim().toLowerCase() === normalizedCoachName
            )
          : null;
      map.set(team.id, {
        coachName: team.coach_name ?? null,
        coachUserId: matchedCoach?.id ?? null,
      });
    });
    return map;
  }, [teams, availableCoaches]);

  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  
  // Fetch events from backend
  const canManageCoaches = permissions.canCreateCoaches || permissions.canManageUsers;
  const shouldUseGlobalEvents = permissions.canManageUsers;
  const allEventsQuery = useEvents(undefined, { enabled: shouldUseGlobalEvents });
  const myEventsQuery = useMyEvents({ enabled: !shouldUseGlobalEvents });
  const events = useMemo(
    () => (shouldUseGlobalEvents ? allEventsQuery.data ?? [] : myEventsQuery.data ?? []),
    [shouldUseGlobalEvents, allEventsQuery.data, myEventsQuery.data]
  );

  const getEventTeamIds = useCallback(
    (event: Event): number[] => {
      const ids = new Set<number>();
      if (Array.isArray(event.team_ids)) {
        event.team_ids.forEach((id) => {
          if (typeof id === "number") {
            ids.add(id);
          }
        });
      }
      if (typeof event.team_id === "number") {
        ids.add(event.team_id);
      }
      (event.participants ?? []).forEach((participant) => {
        if (participant.athlete_id) {
          const athlete = athleteById.get(participant.athlete_id);
          if (athlete?.team_id) {
            ids.add(athlete.team_id);
          }
        }
      });
      return Array.from(ids);
    },
    [athleteById]
  );
  
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(createEmptyEventForm);
  const [eventFormError, setEventFormError] = useState<string | null>(null);
  const [availabilityPage, setAvailabilityPage] = useState(0);
  const [isGameReportModalOpen, setGameReportModalOpen] = useState(false);
  const [gameReportForm, setGameReportForm] = useState<GameReportFormState>(createEmptyGameReportForm);
  const [gameReportAthleteFilterTeam, setGameReportAthleteFilterTeam] = useState<number | null>(null);
  const [gameReportError, setGameReportError] = useState<string | null>(null);
  const [isReportCardModalOpen, setReportCardModalOpen] = useState(false);
  const [reportCardAthleteId, setReportCardAthleteId] = useState<number | null>(null);
  const [reportCardTeamId, setReportCardTeamId] = useState<number | null>(null);
  const [reportCardNotes, setReportCardNotes] = useState("");
  const [reportCardRatings, setReportCardRatings] = useState({
    technical: 3,
    physical: 3,
    training: 3,
    match: 3,
  });
  const [reportCardError, setReportCardError] = useState<string | null>(null);
  const [isSubmissionListModalOpen, setSubmissionListModalOpen] = useState(false);
  
  // Athlete filters for event invitation
  const [athleteFilterTeam, setAthleteFilterTeam] = useState<number | "unassigned" | null>(null);
  const [athleteFilterAge, setAthleteFilterAge] = useState<string>("");
  const [athleteFilterGender, setAthleteFilterGender] = useState<string>("");
  
  const resetEventForm = useCallback(() => {
    setEventForm(createEmptyEventForm());
    setEventFormError(null);
    setAthleteFilterTeam(null);
    setAthleteFilterAge("");
    setAthleteFilterGender("");
  }, []);
  
  const selectAllInviteesRef = useRef<HTMLInputElement | null>(null);

  const {
    eventsByDate,
    upcomingEvents,
    eventsOnSelectedDate,
    eventAvailabilityData,
    availabilityPages,
  } = useDashboardEventData({
    events,
    selectedEventDate,
    athleteById,
    teamNameById,
    summaryLabels,
    teamCoachMetaById,
    getEventTeamIds,
  });

  const eventTeamIdsForSelectedDate = useMemo(() => {
    if (!selectedEventDate) {
      return [];
    }
    const ids = new Set<number>();
    eventsOnSelectedDate.forEach((event) => {
      getEventTeamIds(event).forEach((teamId) => ids.add(teamId));
    });
    return Array.from(ids);
  }, [eventsOnSelectedDate, selectedEventDate, getEventTeamIds]);

  const teamsForSelectedDate = useMemo(() => {
    if (!events.length) {
      return [];
    }
    const teamsWithEvents = new Set<number>();
    events.forEach((event) => {
      getEventTeamIds(event).forEach((teamId) => teamsWithEvents.add(teamId));
    });
    if (!teamsWithEvents.size) {
      return [];
    }
    if (selectedEventDate) {
      return teams.filter((team) => eventTeamIdsForSelectedDate.includes(team.id));
    }
    return teams.filter((team) => teamsWithEvents.has(team.id));
  }, [teams, events, selectedEventDate, eventTeamIdsForSelectedDate, getEventTeamIds]);

  // Mutations
  const createEventMutation = useCreateEvent();
  const confirmAttendanceMutation = useConfirmEventAttendance();
  const deleteEventMutation = useDeleteEvent();

  useEffect(() => {
    if (!teams.length || !teamsForSelectedDate.length) {
      if (selectedTeamId !== null) {
        setSelectedTeamId(null);
      }
      setAvailabilityPage(0);
      return;
    }

    if (selectedEventDate) {
      const nextId = selectedTeamId && eventTeamIdsForSelectedDate.includes(selectedTeamId)
        ? selectedTeamId
        : teamsForSelectedDate[0]?.id ?? null;
      if (nextId !== selectedTeamId) {
        setSelectedTeamId(nextId);
      }
      setAvailabilityPage(0);
      return;
    }

    const stillValid =
      selectedTeamId !== null &&
      teamsForSelectedDate.some((team) => team.id === selectedTeamId);
    const nextId = stillValid ? selectedTeamId : teamsForSelectedDate[0]?.id ?? null;
    if (nextId !== selectedTeamId) {
      setSelectedTeamId(nextId);
    }
    setAvailabilityPage(0);
  }, [teams, teamsForSelectedDate, selectedEventDate, eventTeamIdsForSelectedDate, selectedTeamId]);

  useEffect(() => {
    if (availabilityPage >= availabilityPages.length && availabilityPages.length > 0) {
      setAvailabilityPage(0);
    }
  }, [availabilityPage, availabilityPages.length]);

  useEffect(() => {
    setCoachForm(createEmptyCoachForm());
    setCoachFormError(null);
    setCoachFormSuccess(null);
  }, [selectedTeamId]);

  const filteredEventAthletes = useMemo(() => {
    let filtered = [...athletes];
    
    if (athleteFilterTeam !== null) {
      if (athleteFilterTeam === "unassigned") {
        filtered = filtered.filter((athlete) => athlete.team_id == null);
      } else {
        filtered = filtered.filter((athlete) => athlete.team_id === athleteFilterTeam);
      }
    }
    
    if (athleteFilterAge) {
      filtered = filtered.filter(athlete => {
        if (!athlete.birth_date) return false;
        const age = calculateAge(athlete.birth_date);
        
        if (athleteFilterAge === "U8" && age < 8) return true;
        if (athleteFilterAge === "U9" && age >= 8 && age < 9) return true;
        if (athleteFilterAge === "U10" && age >= 9 && age < 10) return true;
        if (athleteFilterAge === "U11" && age >= 10 && age < 11) return true;
        if (athleteFilterAge === "U12" && age >= 11 && age < 12) return true;
        if (athleteFilterAge === "U13" && age >= 12 && age < 13) return true;
        if (athleteFilterAge === "U14" && age >= 13 && age < 14) return true;
        if (athleteFilterAge === "U15" && age >= 14 && age < 15) return true;
        if (athleteFilterAge === "U16" && age >= 14 && age < 16) return true;
        if (athleteFilterAge === "U17" && age >= 16 && age < 17) return true;
        if (athleteFilterAge === "U18" && age >= 16 && age < 18) return true;
        if (athleteFilterAge === "U19" && age >= 18 && age < 19) return true;
        if (athleteFilterAge === "U20" && age >= 19 && age < 20) return true;
        if (athleteFilterAge === "U21" && age >= 20 && age < 21) return true;
        if (athleteFilterAge === "Senior" && age >= 21) return true;
        return false;
      });
    }
    
    if (athleteFilterGender) {
      filtered = filtered.filter(athlete => athlete.gender === athleteFilterGender);
    }
    
    return filtered;
  }, [athletes, athleteFilterTeam, athleteFilterAge, athleteFilterGender]);

  const allInviteeIds = useMemo(() => athletes.map((athlete) => athlete.id), [athletes]);
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

  const getAthleteEventStatus = (athleteId: number, eventId?: number): ParticipantStatus | null => {
    if (!selectedEventDate || !eventsOnSelectedDate.length) {
      return null;
    }
    
    for (const event of eventsOnSelectedDate) {
      if (eventId && event.id !== eventId) {
        continue;
      }
      const participant = event.participants?.find(p => p.athlete_id === athleteId);
      if (participant) {
        return participant.status;
      }
    }
    
    return null;
  };

  const getAvailabilityDisplay = (athlete: Athlete, eventId: number) => {
    const eventStatus = getAthleteEventStatus(athlete.id, eventId);
    
    if (eventStatus) {
      switch (eventStatus) {
        case 'confirmed':
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700",
            icon: faCheck,
            label: "Confirmed",
            status: "confirmed" as ParticipantStatus,
          };
        case 'declined':
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
            icon: faTimes,
            label: "Declined",
            status: "declined" as ParticipantStatus,
          };
        case 'maybe':
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700",
            icon: faQuestion,
            label: "Maybe",
            status: "maybe" as ParticipantStatus,
          };
        case 'invited':
        default:
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600",
            icon: faQuestion,
            label: "Pending",
            status: "invited" as ParticipantStatus,
          };
      }
    }
    
    return {
      className: athlete.status === "active"
        ? "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
        : "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
      icon: athlete.status === "active" ? faCheck : faTimes,
      label: athlete.status === "active" ? "Active" : "Inactive",
      status: athlete.status,
    };
  };

  const isRosterLoading = athletesQuery.isLoading || teamsQuery.isLoading;
  const rosterHasError = athletesQuery.isError || teamsQuery.isError;
  const goToPrevMonth = () => {
    setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const openEventFormPanel = (dateKey?: string) => {
    const targetDate = dateKey || formatDateKey(new Date());
    setEventForm((prev) => ({
      ...prev,
      date: targetDate,
      teamIds: prev.teamIds.length > 0 ? prev.teamIds : (selectedTeamId ? [selectedTeamId] : []),
    }));
    setEventFormError(null);
    setEventModalOpen(true);
  };

  const handleDayClick = (day: number | null) => {
    if (!day) {
      return;
    }
    const target = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), day);
    const dateKey = formatDateKey(target);
    const dayEvents = eventsByDate.get(dateKey) ?? [];
    const canCreateOnDay = !isDateInPast(target);

    if (selectedEventDate === dateKey) {
      if (canCreateOnDay && canManageEvents) {
        openEventFormPanel(dateKey);
      }
    } else {
      setEventFormError(null);
      setSelectedEventDate(dateKey);
      setEventModalOpen(false);

      const teamsWithEventsOnDate = new Set<number>();
      dayEvents.forEach((ev) => {
        getEventTeamIds(ev).forEach((teamId) => teamsWithEventsOnDate.add(teamId));
      });
      if (teamsWithEventsOnDate.size > 0) {
        const firstTeamId = Array.from(teamsWithEventsOnDate)[0];
        if (!selectedTeamId || !teamsWithEventsOnDate.has(selectedTeamId)) {
          setSelectedTeamId(firstTeamId);
        }
      }
    }
  };

  const openGameReportModal = () => {
    setGameReportForm(() => {
      const template = createEmptyGameReportForm();
      return {
        ...template,
        teamId: selectedTeamId ?? null,
        date: formatDateKey(new Date()),
      };
    });
    setGameReportAthleteFilterTeam(selectedTeamId ?? null);
    setGameReportError(null);
    setGameReportModalOpen(true);
  };

  const openReportCardModal = () => {
    setReportCardAthleteId(athletes[0]?.id ?? null);
    setReportCardTeamId(selectedTeamId ?? null);
    setReportCardNotes("");
    setReportCardRatings({ technical: 3, physical: 3, training: 3, match: 3 });
    setReportCardError(null);
    setReportCardModalOpen(true);
  };

  const handleGameReportInputChange = <T extends keyof GameReportFormState>(
    field: T,
    value: GameReportFormState[T]
  ) => {
    setGameReportForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddGoalScorer = (athleteId: number) => {
    setGameReportForm((prev) => {
      if (prev.goalScorers.some((entry) => entry.athleteId === athleteId)) {
        return prev;
      }
      return {
        ...prev,
        goalScorers: [...prev.goalScorers, { athleteId, goals: 1, shootoutGoals: 0 }],
      };
    });
  };

  const handleRemoveGoalScorer = (athleteId: number) => {
    setGameReportForm((prev) => ({
      ...prev,
      goalScorers: prev.goalScorers.filter((entry) => entry.athleteId !== athleteId),
    }));
  };

  const handleUpdateGoalScorerGoals = (athleteId: number, goals: number) => {
    const normalized = Number.isFinite(goals) && goals > 0 ? goals : 1;
    setGameReportForm((prev) => ({
      ...prev,
      goalScorers: prev.goalScorers.map((entry) =>
        entry.athleteId === athleteId ? { ...entry, goals: normalized } : entry
      ),
    }));
  };

  const handleUpdateGoalScorerShootoutGoals = (athleteId: number, goals: number) => {
    const normalized = Number.isFinite(goals) && goals >= 0 ? goals : 0;
    setGameReportForm((prev) => ({
      ...prev,
      goalScorers: prev.goalScorers.map((entry) =>
        entry.athleteId === athleteId ? { ...entry, shootoutGoals: normalized } : entry
      ),
    }));
  };

  const handleToggleGoalkeeper = (athleteId: number) => {
    setGameReportForm((prev) => {
      const exists = prev.goalkeepersPlayed.includes(athleteId);
      const nextKeepers = exists
        ? prev.goalkeepersPlayed.filter((id) => id !== athleteId)
        : [...prev.goalkeepersPlayed, athleteId];
      const nextConceded = prev.goalkeeperConceded.filter((entry) =>
        nextKeepers.includes(entry.athleteId)
      );
      return {
        ...prev,
        goalkeepersPlayed: nextKeepers,
        goalkeeperConceded: nextConceded,
      };
    });
  };

  const handleToggleGoalkeeperConceded = (athleteId: number) => {
    setGameReportForm((prev) => {
      if (!prev.goalkeepersPlayed.includes(athleteId)) {
        return prev;
      }
      const exists = prev.goalkeeperConceded.find((entry) => entry.athleteId === athleteId);
      const nextConceded = exists
        ? prev.goalkeeperConceded.filter((entry) => entry.athleteId !== athleteId)
        : [...prev.goalkeeperConceded, { athleteId, conceded: 1 }];
      return { ...prev, goalkeeperConceded: nextConceded };
    });
  };

  const handleUpdateGoalkeeperConcededGoals = (athleteId: number, goals: number) => {
    const normalized = Number.isFinite(goals) && goals >= 0 ? goals : 0;
    setGameReportForm((prev) => ({
      ...prev,
      goalkeeperConceded: prev.goalkeeperConceded.some((entry) => entry.athleteId === athleteId)
        ? prev.goalkeeperConceded.map((entry) =>
            entry.athleteId === athleteId ? { ...entry, conceded: normalized } : entry
          )
        : [...prev.goalkeeperConceded, { athleteId, conceded: normalized }],
    }));
  };

  const handleGameReportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createGameReportMutation.isPending) {
      return;
    }
    const normalizedScorers = gameReportForm.goalScorers
      .filter((entry) => entry.goals > 0 || entry.shootoutGoals > 0)
      .map((entry) => ({
        athlete_id: entry.athleteId,
        goals: entry.goals,
        shootout_goals: entry.shootoutGoals,
      }));
    const concededMap = new Map(
      gameReportForm.goalkeeperConceded.map((entry) => [entry.athleteId, entry.conceded])
    );
    const goalkeeperPayload = gameReportForm.goalkeepersPlayed.map((athleteId) => ({
      athlete_id: athleteId,
      conceded: concededMap.get(athleteId) ?? 0,
    }));
    if (!normalizedScorers.length && !goalkeeperPayload.length) {
      setGameReportError("Add at least one goal scorer or goalkeeper.");
      return;
    }

    const toPositiveNumber = (value: string) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    };
    const trimOrNull = (value: string) => {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const payload = {
      team_id: gameReportForm.teamId,
      opponent: gameReportForm.opponent.trim(),
      date: gameReportForm.date || formatDateKey(new Date()),
      location: trimOrNull(gameReportForm.location),
      goals_for: toPositiveNumber(gameReportForm.goalsFor),
      goals_against: toPositiveNumber(gameReportForm.goalsAgainst),
      goal_scorers: normalizedScorers,
      goalkeepers: goalkeeperPayload,
      notes: trimOrNull(gameReportForm.notes),
    };

    setGameReportError(null);
    createGameReportMutation.mutate(payload);
  };

  const handleGameReportCancel = () => {
    setGameReportModalOpen(false);
    setGameReportForm(createEmptyGameReportForm());
    setGameReportAthleteFilterTeam(null);
    setGameReportError(null);
  };

  const handleReportCardRatingChange = (
    field: keyof typeof reportCardRatings,
    value: number,
  ) => {
    const clamped = Math.min(5, Math.max(1, value));
    setReportCardRatings((prev) => ({ ...prev, [field]: clamped }));
  };

  const handleReportCardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportCardAthleteId) {
      setReportCardError("Select an athlete before submitting.");
      return;
    }
    submitReportCardMutation.mutate({
      athlete_id: reportCardAthleteId,
      team_id: reportCardTeamId,
      technical_rating: reportCardRatings.technical,
      physical_rating: reportCardRatings.physical,
      training_rating: reportCardRatings.training,
      match_rating: reportCardRatings.match,
      general_notes: reportCardNotes.trim() ? reportCardNotes.trim() : null,
    });
  };

  const handleReportCardCancel = () => {
    setReportCardModalOpen(false);
    setReportCardAthleteId(null);
    setReportCardTeamId(null);
    setReportCardNotes("");
    setReportCardRatings({ technical: 3, physical: 3, training: 3, match: 3 });
    setReportCardError(null);
  };


  const handleEventInputChange = <T extends keyof EventFormState>(field: T, value: EventFormState[T]) => {
    setEventForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "teamIds" ? { inviteeIds: [] } : null),
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

  const handleEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createEventMutation.isPending) {
      return;
    }
    if (!eventForm.name.trim() || !eventForm.date) {
      setEventFormError(summaryLabels.calendar.errorIncomplete);
      return;
    }

    const timeValue = eventForm.startTime || null;
    
    let notesWithTime = eventForm.notes || "";
    if (eventForm.startTime && eventForm.endTime) {
      const timeNote = `Time: ${eventForm.startTime} - ${eventForm.endTime}`;
      notesWithTime = notesWithTime 
        ? `${timeNote}\n\n${notesWithTime}` 
        : timeNote;
    }

    try {
      await createEventMutation.mutateAsync({
        name: eventForm.name.trim(),
        date: eventForm.date,
        time: timeValue,
        location: eventForm.location || null,
        notes: notesWithTime || null,
        team_id: eventForm.teamIds.length === 1 ? eventForm.teamIds[0] : null,
        team_ids: eventForm.teamIds,
        invitee_ids: eventForm.coachIds,
        athlete_ids: eventForm.inviteeIds,
        send_email: eventForm.sendEmail,
        send_push: eventForm.sendPush,
      });

      setSelectedEventDate(eventForm.date);
      if (eventForm.teamIds.length === 1) {
        setSelectedTeamId(eventForm.teamIds[0]);
      }
      
      resetEventForm();
      setEventModalOpen(false);
    } catch (error: unknown) {
      const errorDetail = (error as ApiErrorResponse)?.response?.data?.detail;
      const errorMessage = Array.isArray(errorDetail)
        ? errorDetail
            .map((detail) =>
              typeof detail === "string" ? detail : detail?.msg || JSON.stringify(detail)
            )
            .join(", ")
        : typeof errorDetail === "string"
          ? errorDetail
          : "Error creating event";
      setEventFormError(errorMessage);
    }
  };

  const handleConfirmAttendance = async (eventId: number, status: ParticipantStatus) => {
    if (status !== "confirmed" && status !== "declined" && status !== "maybe") {
      // Ignore or handle unsupported status values
      return;
    }
    try {
      await confirmAttendanceMutation.mutateAsync({
        eventId,
        payload: { status },
      });
    } catch (error) {
      console.error("Error confirming attendance:", error);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }
    try {
      await deleteEventMutation.mutateAsync(eventId);
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleEventCancel = () => {
    resetEventForm();
    setEventModalOpen(false);
  };

  const closeTeamFormModal = () => {
    setTeamFormOpen(false);
    setTeamForm(createEmptyTeamForm());
    setTeamFormError(null);
    setEditingTeam(null);
  };
  const closeCoachFormModal = () => {
    setCoachFormOpen(false);
    setCoachForm(createEmptyCoachForm());
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setEditingCoach(null);
    setCoachTeams([]);
  };

  const createTeamMutation = useMutation({
    mutationFn: async (form: NewTeamFormState & { teamId?: number }) => {
      const teamPayload = {
        name: form.name.trim(),
        age_category: form.ageCategory,
        description: form.description.trim() ? form.description.trim() : null,
      };

      const team = form.teamId 
        ? await updateTeam(form.teamId, teamPayload)
        : await createTeam(teamPayload);

      const currentTeamAthletes = athletes.filter((athlete) => athlete.team_id === team.id);
      const currentAthleteIds = new Set(currentTeamAthletes.map(a => a.id));
      const newAthleteIds = new Set(form.athleteIds);

      const athletesToRemove = currentTeamAthletes.filter(a => !newAthleteIds.has(a.id));
      if (athletesToRemove.length) {
        await Promise.all(
          athletesToRemove.map((athlete) => updateAthlete(athlete.id, { team_id: null }))
        );
      }

      const athletesToAdd = form.athleteIds.filter((id) => !currentAthleteIds.has(id));
      if (athletesToAdd.length) {
        await Promise.all(
          athletesToAdd.map((athleteId) => updateAthlete(athleteId, { team_id: team.id }))
        );
      }

      if (form.coachIds.length) {
        await Promise.all(
          form.coachIds.map((coachId) => assignCoachToTeam(team.id, coachId).catch(() => {
          }))
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
      const message = error instanceof Error ? error.message : editingTeam ? "Unable to update team." : "Unable to create team.";
      setTeamFormError(message);
    },
  });
  const deleteTeamMutation = useMutation<void, Error, number>({
    mutationFn: deleteTeamApi,
    onSuccess: (_data, teamId) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      setTeamNotice({ variant: "success", message: "Team removed successfully." });
      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
      if (isTeamFormOpen && editingTeam?.id === teamId) {
        closeTeamFormModal();
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to remove team.";
      setTeamNotice({ variant: "error", message });
    },
  });

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
      setCoachForm(createEmptyCoachForm());
      setCoachFormError(null);
      const successMessage = result.teamId
        ? coachDirectoryLabels.assignSuccess
        : coachDirectoryLabels.createSuccess;
      setCoachFormSuccess(successMessage);
      closeCoachFormModal();
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

  const updateCoachMutation = useMutation<
    TeamCoach,
    Error,
    CoachFormSubmit & { coachId: number }
  >({
    mutationFn: async (form) => {
      return await updateCoach(form.coachId, {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      setCoachFormSuccess("Coach updated successfully.");
      closeCoachFormModal();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to update coach.";
      setCoachFormError(message);
    },
  });

  const deleteCoachMutation = useMutation<void, Error, number>({
    mutationFn: deleteCoachApi,
    onSuccess: (_data, coachId) => {
      queryClient.invalidateQueries({ queryKey: ["all-team-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["team-coaches"] });
      setCoachNotice({ variant: "success", message: coachDirectoryLabels.removeSuccess });
      if (editingCoach?.id === coachId) {
        closeCoachFormModal();
      }
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : coachDirectoryLabels.removeError;
      setCoachNotice({ variant: "error", message });
    },
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateCoachForm("password", password);
  };

  const handleCoachSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = coachForm.fullName.trim();
    const trimmedEmail = coachForm.email.trim();
    const trimmedPhone = coachForm.phone.trim();
    const trimmedPassword = coachForm.password.trim();
    
    if (!trimmedName || !trimmedEmail) {
      setCoachFormError("Name and email are required.");
      return;
    }
    
    if (!editingCoach && !trimmedPassword) {
      setCoachFormError("Password is required for new coaches.");
      return;
    }
    
    setCoachFormError(null);
    setCoachFormSuccess(null);
    
    if (editingCoach) {
      updateCoachMutation.mutate({
        coachId: editingCoach.id,
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password: trimmedPassword,
        teamId: null,
      });
    } else {
      createCoachMutation.mutate({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password: trimmedPassword,
        teamId: null,
      });
    }
  };

  const handleEditCoach = async (coach: TeamCoach) => {
    const teams = await getCoachTeams(coach.id);
    setCoachTeams(teams);
    setEditingCoach({
      id: coach.id,
      fullName: coach.full_name,
      email: coach.email,
      phone: coach.phone || "",
    });
    setCoachForm({
      fullName: coach.full_name,
      email: coach.email,
      phone: coach.phone || "",
      password: "",
    });
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setCoachFormOpen(true);
  };

  const handleCoachDelete = (coachId: number, coachName: string) => {
    if (!canManageCoaches) {
      return;
    }
    const confirmed = window.confirm(
      `Delete coach ${coachName}? This will remove access and unassign from teams.`
    );
    if (!confirmed) {
      return;
    }
    setCoachNotice(null);
    deleteCoachMutation.mutate(coachId);
  };

  const handleAddCoach = () => {
    setCoachForm(createEmptyCoachForm());
    setCoachFormOpen(true);
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setEditingCoach(null);
  };

  const handleTeamFormFieldChange = <T extends keyof NewTeamFormState>(
    field: T,
    value: NewTeamFormState[T]
  ) => {
    setTeamForm((prev) => ({ ...prev, [field]: value }));
    setTeamFormError(null);
  };

  const handleTeamCreateClick = () => {
    setTeamForm(createEmptyTeamForm());
    setTeamFormError(null);
    setEditingTeam(null);
    setTeamFormOpen(true);
  };

  type TeamCoachRecord = TeamCoach & { coach_id?: number };

  const handleTeamEdit = async (team: Team) => {
    try {
      const coaches = (await fetchTeamCoaches(team.id)) as TeamCoachRecord[];
      const coachIds = coaches
        .map((coach) => (typeof coach.coach_id === "number" ? coach.coach_id : coach.id))
        .filter((id: number | undefined): id is number => typeof id === "number");
      const teamAthletes = athletesByTeamId[team.id] ?? [];

      setEditingTeam({
        id: team.id,
        name: team.name,
        ageCategory: team.age_category,
        gender: "coed",
        description: team.description || "",
      });
      setTeamForm({
        name: team.name,
        ageCategory: team.age_category,
        gender: "coed",
        description: team.description || "",
        coachIds: coachIds.length ? coachIds : [],
        athleteIds: teamAthletes.map((athlete) => athlete.id),
      });
      setTeamFormError(null);
      setTeamFormOpen(true);
    } catch (error) {
      console.error("Unable to prepare team form:", error);
    }
  };

  const handleTeamDelete = (teamId: number, teamName: string) => {
    if (!permissions.canManageUsers) {
      return;
    }
    const confirmed = window.confirm(`Delete team ${teamName}? Athletes will remain unassigned.`);
    if (!confirmed) {
      return;
    }
    setTeamNotice(null);
    deleteTeamMutation.mutate(teamId);
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
      teamId: editingTeam?.id,
      name: trimmedName,
      ageCategory: teamForm.ageCategory,
      gender: teamForm.gender,
      description: teamForm.description.trim(),
      coachIds: teamForm.coachIds,
      athleteIds: teamForm.athleteIds,
    });
  };

  const handleNewReportCard = () => {
    openReportCardModal();
  };

  const handleGameReport = () => {
    openGameReportModal();
  };


  const teamListCardProps = {
    teams,
    athletesByTeamId,
    notice: teamNotice,
    isLoading: teamsQuery.isLoading,
    isError: teamsQuery.isError,
    canManageUsers: permissions.canManageUsers,
    isCreatePending: createTeamMutation.isPending,
    isDeletePending: deleteTeamMutation.isPending,
    onAddTeam: handleTeamCreateClick,
    onEditTeam: handleTeamEdit,
    onDeleteTeam: handleTeamDelete,
    addButtonLabel: createTeamLabels.button,
    statusCopy: {
      loading: `${t.common.loading}...`,
      error: "Unable to load teams.",
      empty: "No teams created yet.",
    },
  };
  const teamInsightsCardProps = {
    teams,
    athletes,
    athletesByTeamId,
    onNewReportCard: handleNewReportCard,
    onGameReport: handleGameReport,
    isGameReportPending: createGameReportMutation.isPending,
    pendingReports: canApproveReports ? pendingReports : [],
    mySubmissions: myReports,
    onApproveReport: handleApproveSubmission,
    onReviewSubmission: openSubmissionModal,
    onViewMySubmission: openSubmissionModal,
    onOpenSubmissionsModal: () => setSubmissionListModalOpen(true),
    approvingSubmissionId,
    canApproveReports,
  };
  const calendarPanelProps = {
    summaryLabels,
    calendarCursor,
    calendarGrid,
    weekdayInitials,
    eventsByDate,
    selectedEventDate,
    onPrevMonth: goToPrevMonth,
    onNextMonth: goToNextMonth,
    onDayClick: handleDayClick,
    onOpenEventForm: () => openEventFormPanel(),
    upcomingEvents,
    readableDate,
    formatDateKey,
    canManageEvents,
    onDeleteEvent: handleDeleteEvent,
    deleteEventPending: deleteEventMutation.isPending,
    setSelectedEventDate,
    setSelectedTeamId,
    setCalendarCursor,
    getEventTeamIds,
  };
  const availabilityPanelProps = {
    summaryLabels,
    selectedEventDate,
    readableDate,
    clearLabel: t.common.clear,
    eventsAvailability: eventAvailabilityData,
    availabilityPages,
    availabilityPage,
    setAvailabilityPage,
    isRosterLoading,
    rosterHasError,
    onClearSelectedDate: () => setSelectedEventDate(null),
    getAvailabilityDisplay,
    currentUserRole,
    currentUserId,
    currentUserAthleteId,
    onConfirmAttendance: handleConfirmAttendance,
    confirmAttendancePending: confirmAttendanceMutation.isPending,
  };
  const coachDirectorySectionProps = {
    canCreateCoaches: permissions.canCreateCoaches,
    isCreatePending: createCoachMutation.isPending,
    notice: coachNotice,
    coaches: availableCoaches,
    isLoading: allCoachesQuery.isLoading,
    isError: allCoachesQuery.isError,
    onAddCoach: handleAddCoach,
    onEditCoach: handleEditCoach,
    onDeleteCoach: handleCoachDelete,
  };
  return (
    <>
      <div className="space-y-8">
        <DashboardHero title={t.dashboard.title} description={t.dashboard.description} />
        <section className="print-hidden">
          <LeaderboardCard />
        </section>

        {!isAthleteView ? (
          <TeamManagementSection
            teamListProps={teamListCardProps}
            insightsProps={teamInsightsCardProps}
          />
        ) : null}

        <EventsSection
          calendarProps={calendarPanelProps}
          availabilityProps={availabilityPanelProps}
        />

        {canManageCoaches ? <CoachDirectorySection {...coachDirectorySectionProps} /> : null}
      </div>

      <TeamFormModal
      isOpen={isTeamFormOpen}
      isSubmitting={createTeamMutation.isPending}
      editingTeam={editingTeam}
      labels={createTeamLabels}
      teamForm={teamForm}
      teamFormError={teamFormError}
      teamAgeOptions={teamAgeOptions}
      availableCoaches={availableCoaches}
      teamBuilderCandidates={teamBuilderCandidates}
      remainingAthleteCount={remainingAthleteCount}
      teamNameById={teamNameById}
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
      <CoachFormModal
      isOpen={isCoachFormOpen}
      editingCoach={editingCoach}
      coachForm={coachForm}
      coachFormError={coachFormError}
      coachFormSuccess={coachFormSuccess}
      coachTeams={coachTeams}
      isCreatePending={createCoachMutation.isPending}
      isUpdatePending={updateCoachMutation.isPending}
      onClose={closeCoachFormModal}
      onSubmit={handleCoachSubmit}
      onFieldChange={updateCoachForm}
      onGeneratePassword={generatePassword}
    />
      <EventModal
      isOpen={isEventModalOpen}
      summaryLabels={summaryLabels}
      eventForm={eventForm}
      selectedEventDate={selectedEventDate}
      readableDate={readableDate}
      formatDateKey={formatDateKey}
      eventsOnSelectedDate={eventsOnSelectedDate}
      teamNameById={teamNameById}
      teams={teams}
      availableCoaches={availableCoaches}
      canManageEvents={canManageEvents}
      onDeleteEvent={handleDeleteEvent}
      deleteEventPending={deleteEventMutation.isPending}
      currentUserId={user?.id ?? null}
      onConfirmAttendance={handleConfirmAttendance}
      confirmAttendancePending={confirmAttendanceMutation.isPending}
      athleteFilterTeam={athleteFilterTeam}
      setAthleteFilterTeam={setAthleteFilterTeam}
      athleteFilterAge={athleteFilterAge}
      setAthleteFilterAge={setAthleteFilterAge}
      athleteFilterGender={athleteFilterGender}
      setAthleteFilterGender={setAthleteFilterGender}
      filteredEventAthletes={filteredEventAthletes}
      selectAllInviteesRef={selectAllInviteesRef}
      areAllInviteesSelected={areAllInviteesSelected}
      onToggleAllInvitees={handleToggleAllInvitees}
      onInviteToggle={handleInviteToggle}
      eventFormError={eventFormError}
      onInputChange={handleEventInputChange}
      onSubmit={handleEventSubmit}
      createEventPending={createEventMutation.isPending}
      onCancel={handleEventCancel}
      getEventTeamIds={getEventTeamIds}
      />
      <GameReportModal
        isOpen={isGameReportModalOpen}
        teams={teams}
        athletes={athletes}
        form={gameReportForm}
        athleteFilterTeam={gameReportAthleteFilterTeam}
        setAthleteFilterTeam={setGameReportAthleteFilterTeam}
        onInputChange={handleGameReportInputChange}
      onAddScorer={handleAddGoalScorer}
      onRemoveScorer={handleRemoveGoalScorer}
      onUpdateScorerGoals={handleUpdateGoalScorerGoals}
      onUpdateScorerShootoutGoals={handleUpdateGoalScorerShootoutGoals}
      onToggleGoalkeeper={handleToggleGoalkeeper}
        onToggleGoalkeeperConceded={handleToggleGoalkeeperConceded}
        onUpdateGoalkeeperConceded={handleUpdateGoalkeeperConcededGoals}
        isSubmitting={createGameReportMutation.isPending}
        errorMessage={gameReportError}
        onSubmit={handleGameReportSubmit}
        onCancel={handleGameReportCancel}
      />
      <ReportCardModal
        isOpen={isReportCardModalOpen}
        athletes={athletes}
        teams={teams}
        selectedAthleteId={reportCardAthleteId}
        selectedTeamId={reportCardTeamId}
        notes={reportCardNotes}
        ratings={reportCardRatings}
        isSubmitting={submitReportCardMutation.isPending}
        errorMessage={reportCardError}
        onAthleteSelect={setReportCardAthleteId}
        onTeamSelect={setReportCardTeamId}
        onNotesChange={setReportCardNotes}
        onRatingChange={handleReportCardRatingChange}
        onSubmit={handleReportCardSubmit}
        onCancel={handleReportCardCancel}
      />
      <ReportSubmissionListModal
        isOpen={isSubmissionListModalOpen}
        pendingReports={canApproveReports ? pendingReports : []}
        mySubmissions={myReports}
        canApproveReports={canApproveReports}
        onClose={() => setSubmissionListModalOpen(false)}
        onReviewSubmission={openSubmissionModal}
        onViewMySubmission={openSubmissionModal}
        onApproveReport={handleApproveSubmission}
      />
      <ReportSubmissionReviewModal
        submission={selectedSubmission}
        isOpen={isSubmissionModalOpen && Boolean(selectedSubmission)}
        canResolve={Boolean(canApproveReports && selectedSubmission?.status === "pending")}
        onClose={closeSubmissionModal}
        onApprove={handleApproveSubmission}
        onReject={handleRejectSubmission}
        isApprovePending={
          Boolean(approvingSubmissionId) &&
          approvingSubmissionId === (selectedSubmission?.id ?? null)
        }
        isRejectPending={
          Boolean(rejectingSubmissionId) &&
          rejectingSubmissionId === (selectedSubmission?.id ?? null)
        }
      />
    </>
  );
};

export default Dashboard;
