import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { EventDropArg, EventClickArg } from "@fullcalendar/interaction";
import { useQueryClient } from "@tanstack/react-query";

import { useSessions, type SessionRecord } from "../hooks/useSessions";
import { updateSession, deleteSession } from "../api/sessions";
import { useAuthStore } from "../stores/useAuthStore";
import SessionDetailModal from "../components/SessionDetailModal";

const Scheduling = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);

  const clientId = useAuthStore((state) => state.user?.client_id);

  const { data: sessions } = useSessions({
    clientId,
    start: dateRange.start,
    end: dateRange.end,
  });

  const events = useMemo(() => {
    if (!sessions) return [];
    return sessions.map((session) => ({
      id: String(session.id),
      title: session.name,
      start: session.scheduled_at,
      allDay: !session.scheduled_at?.includes("T"),
      extendedProps: session,
    }));
  }, [sessions]);

  const handleDatesSet = useCallback((arg: { startStr: string; endStr: string }) => {
    setDateRange({ start: arg.startStr, end: arg.endStr });
  }, []);

  const handleEventDrop = useCallback(
    async (arg: EventDropArg) => {
      const { event } = arg;
      const sessionId = Number(event.id);
      const newDate = event.startStr;

      try {
        await updateSession(sessionId, { scheduled_at: newDate });
        await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      } catch (error) {
        console.error("Failed to update session date", error);
        arg.revert();
      }
    },
    [queryClient]
  );

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setSelectedSession(arg.event.extendedProps as SessionRecord);
  }, []);

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteSession(sessionId);
      setSelectedSession(null); // Close modal
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  const handleStartSession = (session: SessionRecord) => {
    if (!session.athlete_id) {
      console.error("Session is not linked to an athlete.");
      return;
    }
    navigate(`/athletes/${session.athlete_id}/edit`, { state: { session } });
  };

  return (
    <>
      <div className="rounded-lg bg-container-gradient p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          initialView="dayGridMonth"
          weekends={true}
          events={events}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
        />
      </div>
      <SessionDetailModal
        isOpen={selectedSession !== null}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onDelete={handleDeleteSession}
        onStart={handleStartSession}
      />
    </>
  );
};

export default Scheduling;