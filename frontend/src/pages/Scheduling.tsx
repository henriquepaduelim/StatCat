import { useCallback, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { EventResizeDoneArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteCalendarEvent, updateCalendarEvent, type CalendarEventPayload } from "../api/calendarEvents";
import { getGoogleAuthorizationUrl } from "../api/googleCalendar";
import CalendarEventDetailsModal from "../components/CalendarEventDetailsModal";
import CalendarEventFormModal from "../components/CalendarEventFormModal";
import { useCalendarEvents, type CalendarEvent } from "../hooks/useCalendarEvents";
import { useAthletes } from "../hooks/useAthletes";
import { useGoogleCredential } from "../hooks/useGoogleCredential";
import { useGroups } from "../hooks/useGroups";
import { useAuthStore } from "../stores/useAuthStore";

import { createCalendarEvent } from "../api/calendarEvents";

const Scheduling = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clientId = user?.client_id ?? undefined;
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const eventsQuery = useCalendarEvents({ client_id: clientId, start: range.start, end: range.end });
  const groupsQuery = useGroups(clientId);
  const athletesQuery = useAthletes(clientId);
  const credentialQuery = useGoogleCredential();

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CalendarEventPayload> }) =>
      updateCalendarEvent(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: number) => deleteCalendarEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setActiveEvent(null);
    },
  });

  const groups = groupsQuery.data ?? [];
  const athletes = athletesQuery.data ?? [];
  const credential = credentialQuery.data ?? null;
  const isConnectedToGoogle = Boolean(credential);

  const events = useMemo(
    () =>
      (eventsQuery.data ?? []).map((calendarEvent) => ({
        id: String(calendarEvent.id),
        title: calendarEvent.summary,
        start: calendarEvent.start_at,
        end: calendarEvent.end_at,
        extendedProps: { calendarEvent },
      })),
    [eventsQuery.data]
  );

  const handleDatesSet = useCallback((arg: { startStr: string; endStr: string }) => {
    setRange({ start: new Date(arg.startStr).toISOString(), end: new Date(arg.endStr).toISOString() });
  }, []);

  const handleEventMutationError = (error: unknown) => {
    console.error("Calendar event update failed", error);
  };

  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const calendarEvent = (arg.event.extendedProps as { calendarEvent: CalendarEvent }).calendarEvent;
      const start = arg.event.start ?? new Date(calendarEvent.start_at);
      const end = arg.event.end ?? new Date(calendarEvent.end_at);

      try {
        await updateMutation.mutateAsync({
          id: calendarEvent.id,
          payload: {
            start_at: start.toISOString(),
            end_at: end.toISOString(),
          },
        });
      } catch (error) {
        arg.revert();
        handleEventMutationError(error);
      }
    },
    [updateMutation]
  );

  const handleEventResize = useCallback(
    async (arg: EventResizeDoneArg) => {
      const calendarEvent = (arg.event.extendedProps as { calendarEvent: CalendarEvent }).calendarEvent;
      const start = arg.event.start ?? new Date(calendarEvent.start_at);
      const end = arg.event.end ?? new Date(calendarEvent.end_at);

      try {
        await updateMutation.mutateAsync({
          id: calendarEvent.id,
          payload: {
            start_at: start.toISOString(),
            end_at: end.toISOString(),
          },
        });
      } catch (error) {
        arg.revert();
        handleEventMutationError(error);
      }
    },
    [updateMutation]
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const calendarEvent = (arg.event.extendedProps as { calendarEvent: CalendarEvent }).calendarEvent;
    setActiveEvent(calendarEvent);
  }, []);

  const handleCreateEvent = async (payload: CalendarEventPayload) => {
    await createMutation.mutateAsync(payload);
  };

  const handleDeleteEvent = async (eventId: number) => {
    await deleteMutation.mutateAsync(eventId);
  };

  const handleConnectGoogle = async () => {
    try {
      const url = await getGoogleAuthorizationUrl(clientId);
      const popup = window.open(url, "google-calendar-connect", "width=600,height=700");
      if (!popup) {
        return;
      }
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          void credentialQuery.refetch();
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to initiate Google authorization", error);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-container-foreground">Club Calendar</h1>
        <p className="text-sm text-muted">
          Organize sessions, combines, and commitments with your athletes and keep every invite in sync with Google Calendar.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl bg-container-gradient p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-container-foreground">Google Calendar</p>
          {isConnectedToGoogle ? (
            <p className="text-xs text-muted">Connected as {credential?.account_email}</p>
          ) : (
            <p className="text-xs text-muted">Connect the club account to send automatic invites.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-muted hover:border-action-primary hover:text-accent"
            onClick={() => credentialQuery.refetch()}
          >
            Refresh status
          </button>
          <button
            type="button"
            onClick={handleConnectGoogle}
            className="rounded-md bg-action-primary px-3 py-2 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
          >
            {isConnectedToGoogle ? "Reconnect" : "Connect Google"}
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">
          {eventsQuery.isLoading ? "Loading events…" : `${eventsQuery.data?.length ?? 0} events`} 
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          disabled={!isConnectedToGoogle}
          className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          New event
        </button>
      </div>

      <div className="rounded-xl bg-container-gradient p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          initialView="dayGridMonth"
          weekends
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
          dayMaxEventRows={3}
          displayEventEnd
          nowIndicator
          eventDisplay="block"
          eventTimeFormat={{ hour: "numeric", minute: "2-digit" }}
          slotLabelFormat={{ hour: "numeric", minute: "2-digit" }}
          eventBackgroundColor="#1a73e8"
          eventBorderColor="#1a73e8"
          events={events}
          editable
          droppable
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>

      <CalendarEventFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateEvent}
        isSubmitting={createMutation.isPending}
        athletes={athletes}
        groups={groups}
        defaultClientId={clientId}
      />

      <CalendarEventDetailsModal
        event={activeEvent}
        isOpen={activeEvent !== null}
        onClose={() => setActiveEvent(null)}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

export default Scheduling;
