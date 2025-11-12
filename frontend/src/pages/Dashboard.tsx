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
import { useMyEvents, useCreateEvent, useConfirmEventAttendance, useDeleteEvent } from "../hooks/useEvents";
import type { Event, ParticipantStatus } from "../types/event";
import TeamListCard from "../components/dashboard/TeamListCard";
import LeaderboardCard from "../components/dashboard/LeaderboardCard";
import TeamInsightsCard from "../components/dashboard/TeamInsightsCard";
import TeamFormModal from "../components/dashboard/TeamFormModal";
import CoachFormModal from "../components/dashboard/CoachFormModal";
import CoachDirectoryCard from "../components/dashboard/CoachDirectoryCard";
import EventCalendarPanel from "../components/dashboard/EventCalendarPanel";
import EventAvailabilityPanel from "../components/dashboard/EventAvailabilityPanel";
import EventModal from "../components/dashboard/EventModal";
import { calculateAge } from "../utils/athletes";
import type { AthleteFilter, NewTeamFormState, NoticeState, CoachFormState, EventFormState } from "../types/dashboard";
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

  const athletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data]);
  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
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
  const teamBuilderCandidates = useMemo(() => {
    return athletes
      .filter((athlete) => !teamForm.athleteIds.includes(athlete.id))
      .filter((athlete) => {
        if (filterGender && athlete.gender !== filterGender) {
          return false;
        }
        if (filterTeamStatus === "assigned" && !athlete.team_id) {
          return false;
        }
        if (filterTeamStatus === "unassigned" && athlete.team_id) {
          return false;
        }
        if (filterAge) {
          if (!athlete.birth_date) {
            return false;
          }
          const ageLimit = parseInt(filterAge.replace(/\D/g, ""), 10);
          if (Number.isFinite(ageLimit)) {
            const currentAge = calculateAge(athlete.birth_date);
            if (currentAge >= ageLimit) {
              return false;
            }
          }
        }
        return true;
      });
  }, [athletes, filterAge, filterGender, filterTeamStatus, teamForm.athleteIds]);
  const remainingAthleteCount = useMemo(() => {
    return athletes.filter((athlete) => !teamForm.athleteIds.includes(athlete.id)).length;
  }, [athletes, teamForm.athleteIds]);
  const t = useTranslation();
  const queryClient = useQueryClient();
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
    return [...coaches].sort((a, b) => (a?.full_name || '').localeCompare(b?.full_name || ''));
  }, [allCoachesQuery.data]);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  
  // Fetch events from backend
  const myEventsQuery = useMyEvents();
  const events = useMemo(() => myEventsQuery.data ?? [], [myEventsQuery.data]);

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
      getEventTeamIds(event).forEach((teamId) => ids.add(teamId));
    });
    return Array.from(ids);
  }, [eventsOnSelectedDate, selectedEventDate, getEventTeamIds]);

  const eventAvailabilityData = useMemo(() => {
    if (!selectedEventDate) {
      return [];
    }

    return eventsOnSelectedDate.map((event) => {
      const teamIds = getEventTeamIds(event);
      const participants = event.participants ?? [];
      const teamMap = teamIds.reduce<Record<number, Athlete[]>>((acc, id) => {
        acc[id] = [];
        return acc;
      }, {});
      const guests: Athlete[] = [];

      participants.forEach((participant) => {
        const athleteId = participant.athlete_id;
        if (!athleteId) {
          return;
        }
        const athlete = athleteById.get(athleteId);
        if (!athlete) {
          return;
        }
        if (typeof athlete.team_id === "number" && teamMap[athlete.team_id]) {
          teamMap[athlete.team_id].push(athlete);
        } else {
          guests.push(athlete);
        }
      });

      return {
        event,
        teams: teamIds.map((teamId) => ({
          teamId,
          teamName: teamNameById[teamId] ?? summaryLabels.teamPlaceholder,
          athletes: teamMap[teamId] ?? [],
        })),
        guests,
      };
    });
  }, [selectedEventDate, eventsOnSelectedDate, getEventTeamIds, athleteById, teamNameById, summaryLabels.teamPlaceholder]);

  const availabilityPages = useMemo(() => {
    const pages: Array<{ eventIndex: number; teamIndex: number; includeGuests: boolean }> = [];
    eventAvailabilityData.forEach((entry, eventIndex) => {
      entry.teams.forEach((_team, teamIndex) => {
        pages.push({ eventIndex, teamIndex, includeGuests: teamIndex === entry.teams.length - 1 });
      });
    });
    return pages;
  }, [eventAvailabilityData]);
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

  const allInviteeIds = useMemo(() => filteredEventAthletes.map((athlete) => athlete.id), [filteredEventAthletes]);
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
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      if (!event.date) {
        return;
      }
      const dayEvents = map.get(event.date);
      if (dayEvents) {
        dayEvents.push(event);
      } else {
        map.set(event.date, [event]);
      }
    });
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const toLocalTs = (dateStr: string, timeStr?: string | null) => {
      const [y, m, d] = (dateStr || "").split("-").map(Number);
      const [hh = 0, mm = 0] = (timeStr || "00:00").split(":" ).map(Number);
      return new Date((y || 0), (m || 1) - 1, (d || 1), hh, mm).getTime();
    };
    return [...events]
      .sort((a, b) => toLocalTs(a.date, a.time) - toLocalTs(b.date, b.time))
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

  const getAthleteEventStatus = (athleteId: number): ParticipantStatus | null => {
    if (!selectedEventDate || !eventsOnSelectedDate.length) {
      return null;
    }
    
    for (const event of eventsOnSelectedDate) {
      const participant = event.participants?.find(p => p.athlete_id === athleteId);
      if (participant) {
        return participant.status;
      }
    }
    
    return null;
  };

  const getAvailabilityDisplay = (athlete: Athlete) => {
    const eventStatus = getAthleteEventStatus(athlete.id);
    
    if (eventStatus) {
      switch (eventStatus) {
        case 'confirmed':
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700",
            icon: faCheck,
            label: "Confirmed"
          };
        case 'declined':
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
            icon: faTimes,
            label: "Declined"
          };
        case 'maybe':
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700",
            icon: faQuestion,
            label: "Maybe"
          };
        case 'invited':
        default:
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600",
            icon: faQuestion,
            label: "Pending"
          };
      }
    }
    
    return {
      className: athlete.status === "active"
        ? "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
        : "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
      icon: athlete.status === "active" ? faCheck : faTimes,
      label: athlete.status === "active" ? "Active" : "Inactive"
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
      if (canCreateOnDay) {
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
    if (!permissions.canManageUsers && !permissions.canCreateCoaches) {
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
    console.info("Report card creation requested.");
  };

  const handleGameReport = () => {
    console.info("Game report creation requested.");
  };
  return (
    <>
    <div className="space-y-8">
      <section className="print-hidden space-y-2">
        <h1 className="text-3xl font-semibold text-container-foreground">{t.dashboard.title}</h1>
        <p className="text-sm text-muted">{t.dashboard.description}</p>
      </section>

      <section className="print-hidden">
        <LeaderboardCard />
      </section>

      <section className="print-hidden grid gap-6 lg:grid-cols-2">
        <TeamListCard
          teams={teams}
          athletesByTeamId={athletesByTeamId}
          notice={teamNotice}
          isLoading={teamsQuery.isLoading}
          isError={teamsQuery.isError}
          canManageUsers={permissions.canManageUsers}
          isCreatePending={createTeamMutation.isPending}
          isDeletePending={deleteTeamMutation.isPending}
          onAddTeam={handleTeamCreateClick}
          onEditTeam={handleTeamEdit}
          onDeleteTeam={handleTeamDelete}
          addButtonLabel={createTeamLabels.button}
          statusCopy={{
            loading: `${t.common.loading}...`,
            error: "Unable to load teams.",
            empty: "No teams created yet.",
          }}
        />
        <TeamInsightsCard
          teams={teams}
          athletes={athletes}
          athletesByTeamId={athletesByTeamId}
          onNewReportCard={handleNewReportCard}
          onGameReport={handleGameReport}
        />
      </section>

      <section className="print-hidden flex flex-col gap-6 xl:flex-row">
        <EventCalendarPanel
          summaryLabels={summaryLabels}
          calendarCursor={calendarCursor}
          calendarGrid={calendarGrid}
          weekdayInitials={weekdayInitials}
          eventsByDate={eventsByDate}
          selectedEventDate={selectedEventDate}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onDayClick={handleDayClick}
          onOpenEventForm={openEventFormPanel}
          upcomingEvents={upcomingEvents}
          readableDate={readableDate}
          formatDateKey={formatDateKey}
          canManageEvents={canManageEvents}
          onDeleteEvent={handleDeleteEvent}
          deleteEventPending={deleteEventMutation.isPending}
          setSelectedEventDate={setSelectedEventDate}
          setSelectedTeamId={setSelectedTeamId}
          setCalendarCursor={setCalendarCursor}
          getEventTeamIds={getEventTeamIds}
        />
        <EventAvailabilityPanel
          summaryLabels={summaryLabels}
          selectedEventDate={selectedEventDate}
          readableDate={readableDate}
          clearLabel={t.common.clear}
          eventsAvailability={eventAvailabilityData}
          availabilityPages={availabilityPages}
          availabilityPage={availabilityPage}
          setAvailabilityPage={setAvailabilityPage}
          isRosterLoading={isRosterLoading}
          rosterHasError={rosterHasError}
          onClearSelectedDate={() => setSelectedEventDate(null)}
          getAvailabilityDisplay={getAvailabilityDisplay}
        />
      </section>

      {/* Coaches Container - Full Width at Bottom */}
      <CoachDirectoryCard
        canCreateCoaches={permissions.canCreateCoaches}
        isCreatePending={createCoachMutation.isPending}
        notice={coachNotice}
        coaches={availableCoaches}
        isLoading={allCoachesQuery.isLoading}
        isError={allCoachesQuery.isError}
        onAddCoach={handleAddCoach}
        onEditCoach={handleEditCoach}
        onDeleteCoach={handleCoachDelete}
      />
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
      onCancel={handleEventCancel}
      getEventTeamIds={getEventTeamIds}
      />
    </>
  );
};

export default Dashboard;
