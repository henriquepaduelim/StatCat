import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faUsers, faUserTie, faPlus, faChevronLeft, faChevronRight, faCheck, faTimes, faQuestion } from "@fortawesome/free-solid-svg-icons";

import {
  assignCoachToTeam,
  createCoach,
  createTeam,
  updateTeam,
  deleteTeamCoach,
  listAllCoaches,
  listTeamCoaches,
  type TeamCoach,
} from "../api/teams";
import { updateAthlete } from "../api/athletes";
import { useAthletes } from "../hooks/useAthletes";
import { useTeamCoaches } from "../hooks/useTeamCoaches";
import { useTeams } from "../hooks/useTeams";
import { useScoringLeaderboard } from "../hooks/useScoringLeaderboard";
import { useMetricRanking } from "../hooks/useMetricRanking";
import { usePermissions } from "../hooks/usePermissions";
import { useTranslation } from "../i18n/useTranslation";
import type { Athlete } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";
import { useMyEvents, useCreateEvent, useConfirmEventAttendance } from "../hooks/useEvents";
import type { Event, ParticipantStatus } from "../types/event";

type EventFormState = {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  teamIds: number[];
  coachId: number | null;
  inviteeIds: number[];
  sendEmail: boolean;
  sendPush: boolean;
};

type NewTeamFormState = {
  name: string;
  ageCategory: string;
  gender: "boys" | "girls" | "coed";
  description: string;
  coachIds: number[];
  athleteIds: number[];
};

type AthleteFilter = {
  age: string;
  gender: string;
  teamStatus: "all" | "assigned" | "unassigned";
};

const weekdayInitials = ["S", "M", "T", "W", "T", "F", "S"];

// Helper function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

const createEmptyTeamForm = (): NewTeamFormState => ({
  name: "",
  ageCategory: "U14",
  gender: "coed",
  description: "",
  coachIds: [],
  athleteIds: [],
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

const Dashboard = () => {
  const athletesQuery = useAthletes();
  const teamsQuery = useTeams();
  const permissions = usePermissions();

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
  const [editingTeam, setEditingTeam] = useState<{ id: number; name: string; ageCategory: string; gender: string; description: string } | null>(null);
  const [editingCoach, setEditingCoach] = useState<{ id: number; fullName: string; email: string; phone: string } | null>(null);
  const [athleteFilter, setAthleteFilter] = useState<AthleteFilter>({
    age: "",
    gender: "",
    teamStatus: "all"
  });
  const [draggedAthleteId, setDraggedAthleteId] = useState<number | null>(null);
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
  
  // Fetch events from backend
  const myEventsQuery = useMyEvents();
  const events = useMemo(() => myEventsQuery.data ?? [], [myEventsQuery.data]);
  
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    notes: "",
    teamIds: [],
    coachId: null,
    inviteeIds: [],
    sendEmail: true,
    sendPush: false,
  });
  const [eventFormError, setEventFormError] = useState<string | null>(null);
  
  // Athlete filters for event invitation
  const [athleteFilterTeam, setAthleteFilterTeam] = useState<number | null>(null);
  const [athleteFilterAge, setAthleteFilterAge] = useState<string>("");
  const [athleteFilterGender, setAthleteFilterGender] = useState<string>("");
  
  // Mutations
  const createEventMutation = useCreateEvent();
  const confirmAttendanceMutation = useConfirmEventAttendance();
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
      if (event.team_id !== null) {
        ids.add(event.team_id);
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
      if (event.team_id !== null) {
        teamsWithEvents.add(event.team_id);
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
    // Show all athletes, grouped by team
    if (!Array.isArray(displayAthletes)) {
      return [];
    }
    return displayAthletes;
  }, [displayAthletes]);



  // Get all athletes from selected teams
  // Base list of athletes for event invitation (all athletes available)
  const eventTeamAthletes = useMemo(() => {
    return displayAthletes;
  }, [displayAthletes]);

  // Apply filters to athletes
  const filteredEventAthletes = useMemo(() => {
    let filtered = [...eventTeamAthletes];
    
    // Filter by team
    if (athleteFilterTeam) {
      filtered = filtered.filter(athlete => athlete.team_id === athleteFilterTeam);
    }
    
    // Filter by age category (calculated from birth_date)
    if (athleteFilterAge) {
      filtered = filtered.filter(athlete => {
        if (!athlete.birth_date) return false;
        const age = calculateAge(athlete.birth_date);
        
        // Match age category
        if (athleteFilterAge === "U14" && age < 14) return true;
        if (athleteFilterAge === "U16" && age >= 14 && age < 16) return true;
        if (athleteFilterAge === "U18" && age >= 16 && age < 18) return true;
        if (athleteFilterAge === "U21" && age >= 18 && age < 21) return true;
        if (athleteFilterAge === "Senior" && age >= 21) return true;
        return false;
      });
    }
    
    // Filter by gender
    if (athleteFilterGender) {
      filtered = filtered.filter(athlete => athlete.gender === athleteFilterGender);
    }
    
    return filtered;
  }, [eventTeamAthletes, athleteFilterTeam, athleteFilterAge, athleteFilterGender]);

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

  // Unique dates with events (sorted), to navigate between days with events
  const eventDatesSorted = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => { if (e.date) set.add(e.date); });
    return Array.from(set).sort();
  }, [events]);
  const eventDateIndex = useMemo(() => (
    selectedEventDate ? eventDatesSorted.indexOf(selectedEventDate) : -1
  ), [eventDatesSorted, selectedEventDate]);
  const hasPrevEventDay = eventDateIndex > 0;
  const hasNextEventDay = eventDateIndex >= 0 && eventDateIndex < eventDatesSorted.length - 1;
  const goToPrevEventDay = () => {
    if (!hasPrevEventDay) return;
    const d = eventDatesSorted[eventDateIndex - 1];
    setSelectedEventDate(d);
    setEventForm((prev) => ({ ...prev, date: d }));
  };
  const goToNextEventDay = () => {
    if (!hasNextEventDay) return;
    const d = eventDatesSorted[eventDateIndex + 1];
    setSelectedEventDate(d);
    setEventForm((prev) => ({ ...prev, date: d }));
  };

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

  // Get athlete participation status for events on selected date
  const getAthleteEventStatus = (athleteId: number): ParticipantStatus | null => {
    if (!selectedEventDate || !eventsOnSelectedDate.length) {
      return null;
    }
    
    // Find if athlete is participant in any event on selected date
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
      // Athlete has event invitation/confirmation
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
    
    // No event - show athlete status
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

    // Two-click behavior:
    // - First click: select day and show events only
    // - Second click on same day: open event creation modal
    if (selectedEventDate === dateKey) {
      // Second click on same day - open the event creation modal
      openEventFormPanel(dateKey);
    } else {
      // First click - just select the day and show events
      setEventFormOpen(false);
      setEventFormError(null);
      setSelectedEventDate(dateKey);
      setEventModalOpen(false); // Make sure modal is closed

      // If there are teams with events on this day, select a valid one by default
      const teamsWithEventsOnDate = new Set<number>();
      dayEvents.forEach((ev) => {
        if (ev.team_id !== null) teamsWithEventsOnDate.add(ev.team_id);
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
  
  const handleTeamToggle = (teamId: number) => {
    setEventForm((prev) => {
      const nextTeams = prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId];
      return { ...prev, teamIds: nextTeams, inviteeIds: [] };
    });
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

    // Use startTime for the backend (backend expects HH:MM format only)
    // We'll store endTime separately or in notes for now
    const timeValue = eventForm.startTime || null;
    
    // Add end time to notes if provided
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
        coach_id: eventForm.coachId,
        invitee_ids: [], // Empty for now - we're inviting athletes, not users
        athlete_ids: eventForm.inviteeIds, // These are athlete IDs
        send_email: eventForm.sendEmail,
        send_push: eventForm.sendPush,
      });

      setSelectedEventDate(eventForm.date);
      if (eventForm.teamIds.length === 1) {
        setSelectedTeamId(eventForm.teamIds[0]);
      }
      
      // Reset form
      setEventForm({
        name: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        notes: "",
        teamIds: [],
        coachId: null,
        inviteeIds: [],
        sendEmail: true,
        sendPush: false,
      });
      setEventFormError(null);
      setEventModalOpen(false);
      // Reset filters
      setAthleteFilterTeam(null);
      setAthleteFilterAge("");
      setAthleteFilterGender("");
    } catch (error: any) {
      const errorDetail = error?.response?.data?.detail;
      // Handle validation errors (array) or string errors
      const errorMessage = Array.isArray(errorDetail)
        ? errorDetail.map((e: any) => e.msg || JSON.stringify(e)).join(", ")
        : typeof errorDetail === "string"
          ? errorDetail
          : "Error creating event";
      setEventFormError(errorMessage);
    }
  };

  const handleConfirmAttendance = async (eventId: number, status: 'confirmed' | 'declined' | 'maybe') => {
    try {
      await confirmAttendanceMutation.mutateAsync({
        eventId,
        payload: { status },
      });
    } catch (error) {
      console.error("Error confirming attendance:", error);
    }
  };

  const handleEventCancel = () => {
    setEventModalOpen(false);
    setEventFormError(null);
  };

  const closeTeamFormModal = () => {
    setTeamFormOpen(false);
    setTeamForm(createEmptyTeamForm());
    setTeamFormError(null);
    setEditingTeam(null);
  };
  const closeCoachFormModal = () => {
    setCoachFormOpen(false);
    setCoachForm(createEmptyCoachForm(Boolean(selectedTeamId)));
    setCoachFormError(null);
    setCoachFormSuccess(null);
    setEditingCoach(null);
  };

  const createTeamMutation = useMutation({
    mutationFn: async (form: NewTeamFormState & { teamId?: number }) => {
      const teamPayload = {
        name: form.name.trim(),
        age_category: form.ageCategory,
        description: form.description.trim() ? form.description.trim() : null,
      };

      // Update existing team or create new one
      const team = form.teamId 
        ? await updateTeam(form.teamId, teamPayload)
        : await createTeam(teamPayload);

      // Get all athletes currently in this team
      const currentTeamAthletes = displayAthletes.filter(a => a.team_id === team.id);
      const currentAthleteIds = new Set(currentTeamAthletes.map(a => a.id));
      const newAthleteIds = new Set(form.athleteIds);

      // Remove athletes that are no longer in the team
      const athletesToRemove = currentTeamAthletes.filter(a => !newAthleteIds.has(a.id));
      if (athletesToRemove.length) {
        await Promise.all(
          athletesToRemove.map((athlete) => updateAthlete(athlete.id, { team_id: null }))
        );
      }

      // Add new athletes to the team
      const athletesToAdd = form.athleteIds.filter(id => !currentAthleteIds.has(id));
      if (athletesToAdd.length) {
        await Promise.all(
          athletesToAdd.map((athleteId) => updateAthlete(athleteId, { team_id: team.id }))
        );
      }

      // Handle coach assignments (simplified for now - may need more sophisticated logic)
      if (form.coachIds.length) {
        await Promise.all(
          form.coachIds.map((coachId) => assignCoachToTeam(team.id, coachId).catch(() => {
            // Ignore if already assigned
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

      {/* Teams and Report Cards Containers */}
      <section className="print-hidden grid gap-6 md:grid-cols-2">
        {/* Teams Container */}
        <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-container-foreground">Teams</h2>
                <p className="text-sm text-muted">Manage team rosters and assignments</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTeamForm(createEmptyTeamForm());
                  setTeamFormError(null);
                  setEditingTeam(null);
                  setTeamFormOpen(true);
                }}
                disabled={createTeamMutation.isPending}
                className="flex items-center justify-center gap-2 rounded-md bg-action-primary px-3 sm:px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                <span className="hidden sm:inline">{createTeamLabels.button}</span>
                <span className="sm:hidden">Add</span>
                <FontAwesomeIcon icon={faUsers} className="text-xs" />
              </button>
            </div>
            <div className="space-y-3">
              {teamsQuery.isLoading ? (
                <p className="text-sm text-muted">{t.common.loading}...</p>
              ) : teamsQuery.isError ? (
                <p className="text-sm text-red-500">Unable to load teams.</p>
              ) : !teams.length ? (
                <p className="text-sm text-muted">No teams created yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white/90">
                  {/* Header - Desktop only */}
                  <div className="hidden sm:grid grid-cols-[auto_1fr_80px_60px_50px] gap-3 border-b border-black/10 bg-container/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <FontAwesomeIcon icon={faUsers} className="self-center text-action-primary" />
                    <span>Team Name</span>
                    <span className="text-center">Category</span>
                    <span className="text-center">Athletes</span>
                    <span className="text-center">Edit</span>
                  </div>
                  {/* Rows */}
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="grid grid-cols-1 sm:grid-cols-[auto_1fr_80px_60px_50px] gap-3 items-start sm:items-center border-b border-black/5 px-3 sm:px-4 py-3 text-sm hover:bg-white/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 sm:contents">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-primary/10">
                          <FontAwesomeIcon icon={faUsers} className="text-xs text-action-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-container-foreground">{team.name}</p>
                          {team.description && (
                            <p className="text-xs text-muted truncate">{team.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Mobile layout - additional info */}
                      <div className="flex justify-between items-center sm:contents">
                        <div className="flex gap-4 text-xs text-muted sm:hidden">
                          <span>{team.age_category}</span>
                          <span>{displayAthletes.filter(athlete => athlete.team_id === team.id).length} athletes</span>
                        </div>
                        
                        {/* Desktop layout - separate columns */}
                        <span className="hidden sm:block text-center text-xs text-muted">{team.age_category}</span>
                        <span className="hidden sm:block text-center text-xs font-medium text-container-foreground">
                          {displayAthletes.filter(athlete => athlete.team_id === team.id).length}
                        </span>
                        
                        <button
                          type="button"
                          onClick={async () => {
                            setEditingTeam({
                              id: team.id,
                              name: team.name,
                              ageCategory: team.age_category,
                              gender: "coed", // Default since backend doesn't have this field yet
                              description: team.description || ""
                            });
                            
                            // Load existing coaches for this team
                            let existingCoachIds: number[] = [];
                            try {
                              const coaches = await listTeamCoaches(team.id);
                              existingCoachIds = coaches.map(coach => coach.id);
                            } catch (error) {
                              console.error("Error loading team coaches:", error);
                            }
                            
                            setTeamForm({
                              name: team.name,
                              ageCategory: team.age_category,
                              gender: "coed", // Default since backend doesn't have this field yet
                              description: team.description || "",
                              coachIds: existingCoachIds,
                              athleteIds: displayAthletes.filter(athlete => athlete.team_id === team.id).map(athlete => athlete.id)
                            });
                            setTeamFormError(null);
                            setTeamFormOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-action-primary/10 hover:text-action-primary sm:mx-auto"
                          aria-label={`Edit ${team.name}`}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-lg" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Cards Container - Placeholder */}
        <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-container-foreground">Report Cards</h2>
                <p className="text-sm text-muted">Performance reports and analytics</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-white/90 p-8">
                <div className="text-center">
                  <p className="text-sm text-muted">Report cards feature coming soon...</p>
                  <p className="mt-2 text-xs text-muted">
                    Generate and view athlete performance reports and assessments.
                  </p>
                </div>
              </div>
            </div>
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
                  <FontAwesomeIcon icon={faPlus} className="text-xs mr-1" />
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
                      if (event.team_id) {
                        setSelectedTeamId(event.team_id);
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
        </div>
        <div className="w-full space-y-4 rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur xl:w-1/2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-container-foreground">{summaryLabels.title}</h2>
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
                  <ul className="mt-2 space-y-1">
                    {eventsOnSelectedDate.map((event) => (
                      <li
                        key={`selected-event-${event.id}`}
                        className="grid grid-cols-[80px_1fr_150px] gap-4 text-xs items-center"
                      >
                        <span className="font-medium text-container-foreground text-left">
                          {event.time || "TBD"}
                        </span>
                        <span className="font-medium text-container-foreground text-left">
                          {event.name}
                        </span>
                        <span className="text-muted text-left">
                          {event.team_id
                            ? teamNameById[event.team_id] ?? summaryLabels.teamPlaceholder
                            : summaryLabels.teamPlaceholder}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
                )}
                {eventTeamIdsForSelectedDate.length > 1 && (
                  <div className="mt-3 pt-2 border-t border-action-primary/20">
                    <label className="block text-xs font-medium text-muted">
                      Select team to view availability:
                      <select
                        value={selectedTeamId ?? ""}
                        onChange={(event) => {
                          const teamId = event.target.value ? Number(event.target.value) : null;
                          setSelectedTeamId(teamId);
                        }}
                        className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      >
                        <option value="">{summaryLabels.teamPlaceholder}</option>
                        {eventTeamIdsForSelectedDate.map((teamId) => {
                          const team = teams.find(t => t.id === teamId);
                          return team ? (
                            <option key={`team-selector-${team.id}`} value={team.id}>
                              {team.name}
                            </option>
                          ) : null;
                        })}
                      </select>
                    </label>
                  </div>
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
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white/70">
                  <div className="hidden sm:grid grid-cols-[minmax(140px,180px)_1fr_100px] gap-x-4 border-b border-black/5 bg-container/20 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
                    <span className="text-left">{summaryLabels.columns.name}</span>
                    <span className="text-left">{summaryLabels.columns.contact}</span>
                    <span className="text-center">{summaryLabels.columns.availability}</span>
                  </div>
                  {isRosterLoading ? (
                    <div className="px-4 py-6 text-sm text-muted">{summaryLabels.loading}</div>
                  ) : rosterHasError ? (
                    <div className="px-4 py-6 text-sm text-red-500">{summaryLabels.error}</div>
                  ) : !rosterAthletes.length ? (
                    <div className="px-4 py-6 text-sm text-muted">{summaryLabels.empty}</div>
                  ) : (
                    <ul className="divide-y divide-black/5">
                      {/* Group athletes by team */}
                      {teams
                        .filter((team) => rosterAthletes.some((athlete) => athlete.team_id === team.id))
                        .map((team) => {
                          const teamAthletes = rosterAthletes.filter((athlete) => athlete.team_id === team.id);
                          return (
                            <li key={`team-group-${team.id}`} className="border-b border-black/5 last:border-b-0">
                              {/* Team header */}
                              <div className="bg-gray-50/80 px-3 sm:px-4 py-2 border-b border-black/5">
                                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                                  {team.name} ({teamAthletes.length})
                                </p>
                              </div>
                              {/* Athletes in this team */}
                              <ul className="divide-y divide-black/5">
                                {teamAthletes.map((athlete) => {
                                  const availability = getAvailabilityDisplay(athlete);
                                  return (
                                    <li
                                      key={athlete.id}
                                      className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(140px,180px)_1fr_100px] items-center gap-x-3 sm:gap-x-2 px-3 sm:px-4 py-2 text-sm"
                                    >
                                      <div className="w-full sm:w-auto sm:max-w-[180px]">
                                        <p className="font-semibold text-container-foreground text-left whitespace-nowrap overflow-hidden text-ellipsis">
                                          {athlete.first_name} {athlete.last_name}
                                        </p>
                                      </div>
                                      <div className="hidden sm:block min-w-0 text-left">
                                        <span className="block truncate text-left text-sm text-container-foreground">
                                          {athlete.email ?? summaryLabels.contactFallback}
                                        </span>
                                      </div>
                                      <div className="flex justify-center items-center w-auto sm:w-[100px]">
                                        <span className={availability.className} title={availability.label}>
                                          <FontAwesomeIcon icon={availability.icon} className="h-3 w-3" />
                                        </span>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Coaches Container - Full Width at Bottom */}
      <section className="print-hidden">
        <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-container-foreground">Coaches</h2>
                <p className="text-sm text-muted">Manage coaching staff and assignments</p>
              </div>
              {permissions.canCreateCoaches && (
                <button
                  type="button"
                  onClick={() => {
                    setCoachForm(createEmptyCoachForm(Boolean(selectedTeamId)));
                    setCoachFormOpen(true);
                    setCoachFormError(null);
                    setCoachFormSuccess(null);
                    setEditingCoach(null);
                  }}
                  disabled={createCoachMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-md bg-action-primary px-3 sm:px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span className="hidden sm:inline">Add Coach</span>
                  <span className="sm:hidden">Add</span>
                  <FontAwesomeIcon icon={faUserTie} className="text-xs" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              {allCoachesQuery.isLoading ? (
                <p className="text-sm text-muted">{t.common.loading}...</p>
              ) : allCoachesQuery.isError ? (
                <p className="text-sm text-red-500">Unable to load coaches.</p>
              ) : !availableCoaches.length ? (
                <p className="text-sm text-muted">No coaches registered yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white/90">
                  {/* Header - Desktop only */}
                  <div className="hidden sm:grid grid-cols-[auto_1fr_120px_50px] gap-3 border-b border-black/10 bg-container/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <FontAwesomeIcon icon={faUserTie} className="self-center text-action-primary" />
                    <span>Coach Name</span>
                    <span className="text-center">Contact</span>
                    <span className="text-center">Edit</span>
                  </div>
                  {/* Rows */}
                  {availableCoaches.map((coach) => (
                    <div
                      key={coach.id}
                      className="grid grid-cols-1 sm:grid-cols-[auto_1fr_120px_50px] gap-3 items-start sm:items-center border-b border-black/5 px-3 sm:px-4 py-3 text-sm hover:bg-white/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 sm:contents">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-action-primary/10">
                          <FontAwesomeIcon icon={faUserTie} className="text-xs text-action-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-container-foreground">{coach.full_name}</p>
                          <p className="text-xs text-muted truncate">{coach.email}</p>
                        </div>
                      </div>
                      
                      {/* Mobile layout - additional info */}
                      <div className="flex justify-between items-center sm:contents">
                        <div className="text-xs text-muted sm:hidden">
                          <span>Phone: {coach.phone ?? "Not set"}</span>
                        </div>
                        
                        {/* Desktop layout - separate columns */}
                        <span className="hidden sm:block text-center text-xs text-muted">
                          {coach.phone ?? "Not set"}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCoach({
                              id: coach.id,
                              fullName: coach.full_name,
                              email: coach.email,
                              phone: coach.phone || ""
                            });
                            setCoachForm({
                              fullName: coach.full_name,
                              email: coach.email,
                              phone: coach.phone || "",
                              password: "", // Password field will be optional for edits
                              assignToTeam: false
                            });
                            setCoachFormError(null);
                            setCoachFormSuccess(null);
                            setCoachFormOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-action-primary/10 hover:text-action-primary sm:mx-auto"
                          aria-label={`Edit ${coach.full_name}`}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="text-lg" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
    {isTeamFormOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 sm:px-4 py-4 sm:py-8"
        onClick={() => {
          if (!createTeamMutation.isPending) {
            closeTeamFormModal();
          }
        }}
        role="presentation"
      >
        <div
          className="w-full max-w-lg sm:max-w-7xl max-h-[95vh] sm:max-h-[98vh] overflow-y-auto space-y-4 rounded-2xl bg-white p-4 sm:p-6 md:px-10 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative">
            <button
              type="button"
              onClick={closeTeamFormModal}
              disabled={createTeamMutation.isPending}
              className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
              >
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-semibold text-container-foreground">
                {editingTeam ? `Edit ${editingTeam.name}` : createTeamLabels.modalTitle}
              </h3>
              <p className="text-sm text-muted">{createTeamLabels.helper}</p>
            </div>
          </div>
          <form onSubmit={handleTeamFormSubmit} className="space-y-5">
            {/* Basic Info Section */}
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-xs font-medium text-muted md:col-span-3">
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
              <label className="text-xs font-medium text-muted">
                Gender Category
                <select
                  value={teamForm.gender}
                  onChange={(event) => handleTeamFormFieldChange("gender", event.target.value as "boys" | "girls" | "coed")}
                  disabled={createTeamMutation.isPending}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                >
                  <option value="boys">Boys</option>
                  <option value="girls">Girls</option>
                  <option value="coed">Coed</option>
                </select>
              </label>
              <label className="text-xs font-medium text-muted md:col-span-3">
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

            {/* Coaches Selection */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-container-foreground">
                Assign Coaches
              </p>
              <p className="text-xs text-muted">Select up to 2 coaches for this team</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-muted">
                  Head Coach
                  <select
                    value={teamForm.coachIds[0] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      const newCoachIds = [...teamForm.coachIds];
                      if (value) {
                        newCoachIds[0] = value;
                        if (newCoachIds.length > 1 && newCoachIds[0] === newCoachIds[1]) {
                          newCoachIds[1] = 0;
                        }
                      } else {
                        newCoachIds.splice(0, 1);
                      }
                      setTeamForm((prev) => ({ ...prev, coachIds: newCoachIds.filter(id => id > 0) }));
                    }}
                    disabled={createTeamMutation.isPending}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                  >
                    <option value="">Select a coach</option>
                    {availableCoaches.map((coach) => (
                      <option key={`head-coach-${coach.id}`} value={coach.id}>
                        {coach.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-muted">
                  Assistant Coach
                  <select
                    value={teamForm.coachIds[1] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      const newCoachIds = [...teamForm.coachIds];
                      if (value && newCoachIds[0] && value !== newCoachIds[0]) {
                        newCoachIds[1] = value;
                      } else if (!value && newCoachIds.length > 1) {
                        newCoachIds.splice(1, 1);
                      }
                      setTeamForm((prev) => ({ ...prev, coachIds: newCoachIds.filter(id => id > 0) }));
                    }}
                    disabled={createTeamMutation.isPending || !teamForm.coachIds[0]}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary disabled:opacity-70"
                  >
                    <option value="">Select an assistant coach</option>
                    {availableCoaches
                      .filter(coach => coach.id !== teamForm.coachIds[0])
                      .map((coach) => (
                        <option key={`assistant-coach-${coach.id}`} value={coach.id}>
                          {coach.full_name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Athletes Section with Drag and Drop */}
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 items-start">
              {/* Team Roster - Athletes in this team */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-container-foreground">
                  Team Roster
                </p>
                <p className="text-xs text-muted">Athletes currently on this team</p>
                <div 
                  className="min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg border-2 border-dashed border-action-primary/30 bg-blue-50/30 p-2"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-action-primary', 'bg-blue-100/50');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-action-primary', 'bg-blue-100/50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-action-primary', 'bg-blue-100/50');
                    if (draggedAthleteId && !teamForm.athleteIds.includes(draggedAthleteId)) {
                      setTeamForm((prev) => ({
                        ...prev,
                        athleteIds: [...prev.athleteIds, draggedAthleteId]
                      }));
                    }
                    setDraggedAthleteId(null);
                  }}
                >
                  {teamForm.athleteIds.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted">
                      Drag athletes here to add them to the team
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {teamForm.athleteIds.map((athleteId) => {
                        const athlete = displayAthletes.find(a => a.id === athleteId);
                        if (!athlete) return null;
                        return (
                          <div
                            key={`roster-athlete-${athlete.id}`}
                            draggable
                            onDragStart={() => setDraggedAthleteId(athlete.id)}
                            className="flex items-center justify-between gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm cursor-move hover:bg-gray-50 transition"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-container-foreground truncate">
                                {athlete.first_name} {athlete.last_name}
                              </p>                      <p className="text-xs text-muted truncate">
                        {athlete.birth_date ? `Age: ${calculateAge(athlete.birth_date)}` : ""}
                        {athlete.gender ? ` • ${athlete.gender === "male" ? "Boys" : "Girls"}` : ""}
                      </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTeamForm((prev) => ({
                                  ...prev,
                                  athleteIds: prev.athleteIds.filter(id => id !== athlete.id)
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 px-2 py-1 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted">
                  Total: {teamForm.athleteIds.length} {teamForm.athleteIds.length === 1 ? 'athlete' : 'athletes'}
                </p>
              </div>

              {/* Available Athletes - Pool of athletes */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-container-foreground">
                  Available Athletes
                </p>
                <p className="text-xs text-muted">Drag athletes to add them to the roster</p>
                
                {/* Filters */}
                <div className="grid gap-2 grid-cols-3 rounded-lg border border-black/10 bg-white/90 p-2">
                  <select
                    value={athleteFilter.age}
                    onChange={(e) => setAthleteFilter(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    <option value="">All Ages</option>
                    <option value="U14">U14</option>
                    <option value="U16">U16</option>
                    <option value="U18">U18</option>
                    <option value="U21">U21</option>
                    <option value="Senior">Senior</option>
                  </select>
                  <select
                    value={athleteFilter.gender}
                    onChange={(e) => setAthleteFilter(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    <option value="">All Genders</option>
                    <option value="male">Boys</option>
                    <option value="female">Girls</option>
                  </select>
                  <select
                    value={athleteFilter.teamStatus}
                    onChange={(e) => setAthleteFilter(prev => ({ ...prev, teamStatus: e.target.value as "all" | "assigned" | "unassigned" }))}
                    className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    <option value="all">All Status</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                  </select>
                </div>

                {/* Available Athletes List */}
                <div className="min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg border border-black/10 bg-white/70 p-2">
                  {(() => {
                    const availableAthletes = displayAthletes
                      .filter(athlete => !teamForm.athleteIds.includes(athlete.id))
                      .filter(athlete => {
                        if (athleteFilter.gender && athlete.gender !== athleteFilter.gender) return false;
                        if (athleteFilter.teamStatus === "assigned" && !athlete.team_id) return false;
                        if (athleteFilter.teamStatus === "unassigned" && athlete.team_id) return false;
                        if (athleteFilter.age) {
                          if (!athlete.birth_date) return false;
                          const age = calculateAge(athlete.birth_date);
                          const ageLimit = parseInt(athleteFilter.age.substring(1));
                          if (age >= ageLimit) return false;
                        }
                        return true;
                      });

                    if (availableAthletes.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-32 text-xs text-muted">
                          No athletes available with selected filters
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1">
                        {availableAthletes.map((athlete) => {
                          const assignedTeamName = athlete.team_id && teamNameById[athlete.team_id] 
                            ? teamNameById[athlete.team_id] 
                            : null;
                          return (
                            <div
                              key={`available-athlete-${athlete.id}`}
                              draggable
                              onDragStart={() => setDraggedAthleteId(athlete.id)}
                              className="flex items-center justify-between gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm cursor-move hover:bg-blue-50 transition"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-container-foreground truncate">
                                  {athlete.first_name} {athlete.last_name}
                                </p>
                                <p className="text-xs text-muted truncate">
                                  {athlete.birth_date ? `Age: ${calculateAge(athlete.birth_date)}` : ""}
                                  {athlete.gender ? ` • ${athlete.gender === "male" ? "Boys" : "Girls"}` : ""}
                                  {assignedTeamName ? ` • ${assignedTeamName}` : " • Unassigned"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!teamForm.athleteIds.includes(athlete.id)) {
                                    setTeamForm((prev) => ({
                                      ...prev,
                                      athleteIds: [...prev.athleteIds, athlete.id]
                                    }));
                                  }
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-action-primary hover:bg-action-primary/20 transition"
                              >
                                <FontAwesomeIcon icon={faPlus} className="text-xs" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted">
                  {displayAthletes.filter(athlete => !teamForm.athleteIds.includes(athlete.id)).length} athletes available
                </p>
              </div>
            </div>

            {teamFormError ? <p className="text-xs text-red-500">{teamFormError}</p> : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createTeamMutation.isPending}
                className="w-full sm:w-auto rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                {editingTeam ? "Save" : createTeamLabels.submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
    {isCoachFormOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 sm:px-4 py-4 sm:py-8"
        onClick={closeCoachFormModal}
        role="presentation"
      >
        <div
          className="relative w-full max-w-lg sm:max-w-5xl space-y-5 rounded-2xl bg-white p-4 sm:p-6 md:px-10 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <button
                type="button"
                onClick={closeCoachFormModal}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4"
                >
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-container-foreground">
                {editingCoach ? `Edit ${editingCoach.fullName}` : coachDirectoryLabels.title}
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
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-container-foreground">
                  {coachDirectoryLabels.listTitle}
                </p>
                {availableCoaches.length ? (
                  <span className="text-xs text-muted">
                    {availableCoaches.length}{" "}
                    {availableCoaches.length === 1
                      ? coachDirectoryLabels.coachCountSingular
                      : coachDirectoryLabels.coachCountPlural}
                  </span>
                ) : null}
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-black/10 bg-white/70">
                {allCoachesQuery.isLoading ? (
                  <p className="px-3 py-2 text-xs text-muted">
                    {coachDirectoryLabels.coachesLoading}
                  </p>
                ) : allCoachesQuery.isError ? (
                  <p className="px-3 py-2 text-xs text-red-500">
                    {coachDirectoryLabels.coachesError}
                  </p>
                ) : !availableCoaches.length ? (
                  <p className="px-3 py-2 text-xs text-muted">
                    {coachDirectoryLabels.noCoaches}
                  </p>
                ) : (
                  <div className="space-y-3 p-3">
                    {availableCoaches.map((coach) => {
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
                    })}
                  </div>
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
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={createCoachMutation.isPending}
                    className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {editingCoach ? "Save" : coachDirectoryLabels.createSubmit}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    
    {isEventModalOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-0 py-0"
        onClick={handleEventCancel}
        role="presentation"
      >
        <div
          className="w-full max-w-none h-[92vh] sm:h-[94vh] overflow-y-auto rounded-none bg-white p-4 sm:p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative">
            <button
              type="button"
              onClick={handleEventCancel}
              className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
              >
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-container-foreground">
                {readableDate(eventForm.date || selectedEventDate || formatDateKey(new Date()))}
              </h3>
              <p className="text-sm text-muted">{summaryLabels.calendar.subtitle}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* Left column: Events of the day */}
            <div className="rounded-xl border border-black/10 bg-white/80 p-4">
              <h4 className="text-base font-semibold text-container-foreground">
                {summaryLabels.calendar.title}
              </h4>
              <p className="text-xs text-muted">{summaryLabels.calendar.subtitle}</p>
              {eventsOnSelectedDate.length ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {eventsOnSelectedDate.map((ev) => {
                    const currentUser = useAuthStore.getState().user;
                    const myParticipant = ev.participants?.find(p => p.user_id === currentUser?.id);
                    const confirmedCount = ev.participants?.filter(p => p.status === 'confirmed').length || 0;
                    const declinedCount = ev.participants?.filter(p => p.status === 'declined').length || 0;
                    const pendingCount = ev.participants?.filter(p => p.status === 'invited').length || 0;
                    
                    return (
                      <li key={`modal-day-event-${ev.id}`} className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-container-foreground">{ev.name}</p>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                ev.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                ev.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ev.status === 'scheduled' ? 'Scheduled' : 
                                 ev.status === 'completed' ? 'Completed' : 'Cancelled'}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-1">
                              {ev.time || summaryLabels.calendar.timeTbd}
                              {ev.location ? ` • ${ev.location}` : ""}
                            </p>
                            <p className="text-[0.7rem] text-muted">
                              {summaryLabels.teamLabel}: {ev.team_id ? (teamNameById[ev.team_id] ?? summaryLabels.teamPlaceholder) : summaryLabels.teamPlaceholder}
                            </p>
                            
                            {/* Participant stats */}
                            {ev.participants && ev.participants.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {confirmedCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                                    {confirmedCount}
                                  </span>
                                )}
                                {declinedCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                                    {declinedCount}
                                  </span>
                                )}
                                {pendingCount > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                    <FontAwesomeIcon icon={faQuestion} className="h-3 w-3" />
                                    {pendingCount}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Confirmation buttons for invited users */}
                            {myParticipant && myParticipant.status === 'invited' && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => handleConfirmAttendance(ev.id, 'confirmed')}
                                  disabled={confirmAttendanceMutation.isPending}
                                  className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleConfirmAttendance(ev.id, 'maybe')}
                                  disabled={confirmAttendanceMutation.isPending}
                                  className="flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                  <FontAwesomeIcon icon={faQuestion} className="h-3 w-3" />
                                  Maybe
                                </button>
                                <button
                                  onClick={() => handleConfirmAttendance(ev.id, 'declined')}
                                  disabled={confirmAttendanceMutation.isPending}
                                  className="flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                  <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                                  Decline
                                </button>
                              </div>
                            )}

                            {/* Show current status if already responded */}
                            {myParticipant && myParticipant.status !== 'invited' && (
                              <div className="mt-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                  myParticipant.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                  myParticipant.status === 'declined' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {myParticipant.status === 'confirmed' ? 'You confirmed attendance' :
                                   myParticipant.status === 'declined' ? 'You declined' :
                                   'You marked as maybe'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
              )}
            </div>

            {/* Right column: Create new event */}
            <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-4">
              <h4 className="text-base font-semibold text-container-foreground">
                {summaryLabels.calendar.createButton}
              </h4>
              <form onSubmit={handleEventSubmit} className="mt-3 space-y-3 text-sm">
                <label className="block text-xs font-medium text-muted">
                  {summaryLabels.calendar.nameLabel}
                  <input
                    type="text"
                    value={eventForm.name}
                    onChange={(e) => handleEventInputChange("name", e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Training session"
                    required
                  />
                </label>
                <label className="block text-xs font-medium text-muted">
                  {summaryLabels.calendar.dateLabel}
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => handleEventInputChange("date", e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-muted">
                    Start Time
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => handleEventInputChange("startTime", e.target.value)}
                      className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    />
                  </label>
                  <label className="block text-xs font-medium text-muted">
                    End Time
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => handleEventInputChange("endTime", e.target.value)}
                      className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-muted">
                  {summaryLabels.calendar.locationLabel}
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => handleEventInputChange("location", e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Main field"
                  />
                </label>
                <label className="block text-xs font-medium text-muted">
                  {summaryLabels.calendar.notesLabel}
                  <textarea
                    value={eventForm.notes}
                    onChange={(e) => handleEventInputChange("notes", e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    rows={3}
                  />
                </label>

                {/* Invite athletes section */}
                <div className="block text-xs font-medium text-muted">
                  <p className="mb-3 text-sm font-semibold">Invite Athletes</p>
                  
                  {/* Filter Controls */}
                  <div className="mb-3 grid gap-2 sm:grid-cols-3 rounded-lg border border-black/10 bg-white/70 p-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Filter by Team</label>
                      <select
                        value={athleteFilterTeam ?? ""}
                        onChange={(e) => setAthleteFilterTeam(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      >
                        <option value="">All Teams</option>
                        {teams.map((team) => (
                          <option key={`filter-team-${team.id}`} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Filter by Age</label>
                      <select
                        value={athleteFilterAge}
                        onChange={(e) => setAthleteFilterAge(e.target.value)}
                        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      >
                        <option value="">All Ages</option>
                        <option value="U14">U14</option>
                        <option value="U16">U16</option>
                        <option value="U18">U18</option>
                        <option value="U21">U21</option>
                        <option value="Senior">Senior</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Filter by Gender</label>
                      <select
                        value={athleteFilterGender}
                        onChange={(e) => setAthleteFilterGender(e.target.value)}
                        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      >
                        <option value="">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  {/* Select All Checkbox */}
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                    <input
                      ref={selectAllInviteesRef}
                      id="select-all-invitees"
                      type="checkbox"
                      checked={areAllInviteesSelected}
                      onChange={handleToggleAllInvitees}
                      className="h-4 w-4 rounded border-gray-300 text-action-primary"
                    />
                    <label htmlFor="select-all-invitees">Select all ({filteredEventAthletes.length} athletes)</label>
                  </div>

                  {/* Athletes Table */}
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-black/10 bg-white">
                    {filteredEventAthletes.length ? (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-50 border-b border-black/10">
                          <tr>
                            <th className="w-8 px-2 py-2 text-left">
                              <span className="sr-only">Select</span>
                            </th>
                            <th className="px-2 py-2 text-left font-semibold text-muted">Name</th>
                            <th className="px-2 py-2 text-left font-semibold text-muted">Team</th>
                            <th className="px-2 py-2 text-left font-semibold text-muted">Age</th>
                            <th className="px-2 py-2 text-left font-semibold text-muted">Gender</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                          {filteredEventAthletes.map((athlete) => (
                            <tr 
                              key={`invitee-${athlete.id}`} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleInviteToggle(athlete.id)}
                            >
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={eventForm.inviteeIds.includes(athlete.id)}
                                  onChange={() => handleInviteToggle(athlete.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 rounded border-gray-300 text-action-primary"
                                />
                              </td>
                              <td className="px-2 py-2 font-medium text-container-foreground">
                                {athlete.first_name} {athlete.last_name}
                              </td>
                              <td className="px-2 py-2 text-muted">
                                {athlete.team_id && teamNameById[athlete.team_id] ? teamNameById[athlete.team_id] : "—"}
                              </td>
                              <td className="px-2 py-2 text-muted">
                                {athlete.birth_date ? calculateAge(athlete.birth_date) : "—"}
                              </td>
                              <td className="px-2 py-2 text-muted">
                                {athlete.gender === "male" ? "Male" : athlete.gender === "female" ? "Female" : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="px-3 py-6 text-center text-xs text-muted">
                        {displayAthletes.length === 0 
                          ? "No athletes registered yet. Create athletes first to invite them to events." 
                          : "No athletes found with the selected filters"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notification toggles */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-container-foreground">Notifications</p>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={eventForm.sendEmail}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                      className="rounded border-gray-300 text-action-primary"
                    />
                    <span>Send email notifications</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={eventForm.sendPush}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, sendPush: e.target.checked }))}
                      className="rounded border-gray-300 text-action-primary"
                    />
                    <span>Send push notifications</span>
                  </label>
                </div>
                {eventFormError ? (
                  <p className="text-xs text-red-500">{eventFormError}</p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={createEventMutation.isPending}
                    className="w-full sm:w-auto rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createEventMutation.isPending ? "Criando..." : summaryLabels.calendar.createButton}
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
