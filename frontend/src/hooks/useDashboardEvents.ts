import {
  ComponentProps,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useCreateEvent, useConfirmEventAttendance, useDeleteEvent, useEvents, useMyEvents } from "./useEvents";
import { useDashboardEventData } from "./useDashboardEventData";
import { useEventInviteeFilters } from "./useEventInviteeFilters";
import type { Athlete } from "../types/athlete";
import type { TeamCoach } from "../api/teams";
import type { Team } from "../types/team";
import type { Event, ParticipantStatus } from "../types/event";
import type { EventFormState } from "../types/dashboard";
import type EventsSection from "../components/dashboard/EventsSection";
import type EventModal from "../components/dashboard/EventModal";
import { formatDateKey, readableDate, isDateInPast } from "../lib/dashboardDateUtils";
import type { useTranslation } from "../i18n/useTranslation";
import { faCheck, faQuestion, faTimes } from "@fortawesome/free-solid-svg-icons";

type ApiErrorResponse = {
  response?: {
    data?: {
      detail?: string | Array<{ msg?: string }>;
    };
  };
};

type SummaryLabels = ReturnType<typeof useTranslation>["dashboard"]["summary"];

const weekdayInitials = ["S", "M", "T", "W", "T", "F", "S"];

type UseDashboardEventsParams = {
  permissions: { canManageUsers: boolean; canCreateCoaches: boolean };
  athletesQuery: { isError: boolean; isLoading: boolean };
  teamsQuery: { isError: boolean; isLoading: boolean };
  athletes: Athlete[];
  teams: Team[];
  athleteById: Map<number, Athlete>;
  teamNameById: Record<number, string>;
  summaryLabels: SummaryLabels;
  currentUserId: number | null;
  currentUserRole: string | null;
  currentUserAthleteId: number | null;
  availableCoaches: TeamCoach[];
  selectedTeamId: number | null;
  setSelectedTeamId: React.Dispatch<React.SetStateAction<number | null>>;
  clearLabel: string;
};

export const useDashboardEvents = ({
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
  clearLabel,
}: UseDashboardEventsParams) => {
  const canManageEvents = permissions.canManageUsers || permissions.canCreateCoaches;
  const shouldUseGlobalEvents = permissions.canManageUsers;

  const allEventsQuery = useEvents(undefined, { enabled: shouldUseGlobalEvents });
  const myEventsQuery = useMyEvents({ enabled: !shouldUseGlobalEvents });
  const events = useMemo(
    () => (shouldUseGlobalEvents ? allEventsQuery.data ?? [] : myEventsQuery.data ?? []),
    [shouldUseGlobalEvents, allEventsQuery.data, myEventsQuery.data],
  );

  const teamCoachMetaById = useMemo(() => {
    const map = new Map<number, { coachName: string | null; coachUserId: number | null }>();
    teams.forEach((team) => {
      const normalizedCoachName = (team.coach_name || "").trim().toLowerCase();
      const matchedCoach =
        normalizedCoachName && availableCoaches.length
          ? availableCoaches.find(
              (coach) => (coach.full_name || "").trim().toLowerCase() === normalizedCoachName,
            )
          : null;
      map.set(team.id, {
        coachName: team.coach_name ?? null,
        coachUserId: matchedCoach?.id ?? null,
      });
    });
    return map;
  }, [teams, availableCoaches]);

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
    [athleteById],
  );

  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormState>(() => ({
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
  }));
  const [eventFormError, setEventFormError] = useState<string | null>(null);
  const [availabilityPage, setAvailabilityPage] = useState(0);

  const {
    athleteFilterTeam,
    setAthleteFilterTeam,
    athleteFilterAge,
    setAthleteFilterAge,
    athleteFilterGender,
    setAthleteFilterGender,
    filteredEventAthletes,
  } = useEventInviteeFilters(athletes);

  const resetEventForm = useCallback(() => {
    setEventForm({
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
    setEventFormError(null);
    setAthleteFilterTeam(null);
    setAthleteFilterAge("");
    setAthleteFilterGender("");
  }, [setAthleteFilterAge, setAthleteFilterGender, setAthleteFilterTeam]);

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

  const loadErrorMessage = useMemo(() => {
    if (athletesQuery.isError) return "Unable to load athletes right now.";
    if (teamsQuery.isError) return "Unable to load teams right now.";
    if (shouldUseGlobalEvents && allEventsQuery.isError) return "Unable to load events right now.";
    if (!shouldUseGlobalEvents && myEventsQuery.isError) return "Unable to load your events right now.";
    return null;
  }, [
    athletesQuery.isError,
    teamsQuery.isError,
    shouldUseGlobalEvents,
    allEventsQuery.isError,
    myEventsQuery.isError,
  ]);

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
  }, [teams, teamsForSelectedDate, selectedEventDate, eventTeamIdsForSelectedDate, selectedTeamId, setSelectedTeamId]);

  useEffect(() => {
    if (availabilityPage >= availabilityPages.length && availabilityPages.length > 0) {
      setAvailabilityPage(0);
    }
  }, [availabilityPage, availabilityPages.length]);

  const allInviteeIds = useMemo(() => athletes.map((athlete) => athlete.id), [athletes]);
  const areAllInviteesSelected = useMemo(
    () => allInviteeIds.length > 0 && allInviteeIds.every((id) => eventForm.inviteeIds.includes(id)),
    [allInviteeIds, eventForm.inviteeIds],
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
        case "confirmed":
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700",
            icon: faCheck,
            status: "confirmed" as ParticipantStatus,
            label: "Confirmed",
          };
        case "declined":
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
            icon: faTimes,
            status: "declined" as ParticipantStatus,
            label: "Declined",
          };
        case "maybe":
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700",
            icon: faQuestion,
            status: "maybe" as ParticipantStatus,
            label: "Maybe",
          };
        case "invited":
        default:
          return {
            className: "flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600",
            icon: faQuestion,
            status: "invited" as ParticipantStatus,
            label: "Pending",
          };
      }
    }
    
    return {
      className: athlete.status === "active"
        ? "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
        : "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
      icon: athlete.status === "active" ? faCheck : faTimes,
      status: athlete.status,
      label: athlete.status === "active" ? "Active" : "Inactive",
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

  const createEventMutation = useCreateEvent();
  const confirmAttendanceMutation = useConfirmEventAttendance();
  const deleteEventMutation = useDeleteEvent();

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

    const timeValue = eventForm.startTime.trim() ? eventForm.startTime.trim() : null;
    const dateValue = eventForm.date && eventForm.date.trim().length
      ? eventForm.date.trim()
      : formatDateKey(new Date());
    
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
        event_date: dateValue, // FIX: Changed 'date' to 'event_date'
        start_time: timeValue,
        location: eventForm.location || null,
        notes: notesWithTime || null,
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
              typeof detail === "string" ? detail : detail?.msg || JSON.stringify(detail),
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
      return;
    }
    try {
      await confirmAttendanceMutation.mutateAsync({
        eventId,
        payload: { status },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }
    try {
      await deleteEventMutation.mutateAsync(eventId);
    } catch (error) {
      const errorDetail = (error as ApiErrorResponse)?.response?.data?.detail;
      const message =
        typeof errorDetail === "string" ? errorDetail : "Error deleting event.";
      console.error(message);
    }
  };

  const handleEventCancel = () => {
    resetEventForm();
    setEventModalOpen(false);
  };

  const eventsSectionProps: ComponentProps<typeof EventsSection> = {
    calendarProps: {
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
    },
    availabilityProps: {
      summaryLabels,
      selectedEventDate,
      readableDate,
      clearLabel,
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
    },
  };

  const eventModalProps: ComponentProps<typeof EventModal> = {
    isOpen: isEventModalOpen,
    summaryLabels,
    eventForm,
    selectedEventDate,
    readableDate,
    formatDateKey,
    eventsOnSelectedDate,
    teamNameById,
    teams,
    availableCoaches,
    createEventPending: createEventMutation.isPending,
    getEventTeamIds,
    canManageEvents,
    onDeleteEvent: handleDeleteEvent,
    deleteEventPending: deleteEventMutation.isPending,
    currentUserId,
    onConfirmAttendance: handleConfirmAttendance,
    confirmAttendancePending: confirmAttendanceMutation.isPending,
    athleteFilterTeam,
    setAthleteFilterTeam,
    athleteFilterAge,
    setAthleteFilterAge,
    athleteFilterGender,
    setAthleteFilterGender,
    filteredEventAthletes,
    selectAllInviteesRef,
    areAllInviteesSelected,
    onToggleAllInvitees: handleToggleAllInvitees,
    onInviteToggle: handleInviteToggle,
    eventFormError,
    onInputChange: handleEventInputChange,
    onSubmit: handleEventSubmit,
    onCancel: handleEventCancel,
  };

  return {
    loadErrorMessage,
    eventsSectionProps,
    eventModalProps,
    openEventFormPanel,
    setSelectedEventDate,
    setEventModalOpen,
    selectedEventDate,
  };
};
