import type { Event } from "../../types/event";

type TeamEventsWidgetProps = {
  events: Event[];
  isLoading: boolean;
  isError: boolean;
};

const formatDate = (dateStr: string, timeStr: string | null) => {
  const eventDate = new Date(`${dateStr}T${timeStr ?? "00:00"}`);
  return eventDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const TeamEventsWidget = ({ events, isLoading, isError }: TeamEventsWidgetProps) => {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow-lg sm:p-5">
      <h3 className="text-lg font-semibold text-container-foreground">Upcoming Events</h3>
      <p className="text-sm text-muted">
        Training, combines, and matches synced to this team&apos;s calendar.
      </p>
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted">Loading events...</p>
        ) : isError ? (
          <p className="text-sm text-red-500">Unable to load events.</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">No upcoming events have been scheduled.</p>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-black/5 bg-container px-4 py-3 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-container-foreground">{event.name}</p>
                <span className="text-xs font-semibold uppercase tracking-wide text-action-primary">
                  {event.status}
                </span>
              </div>
              <p className="text-sm text-muted">
                {formatDate(event.date, event.time)} • {event.location || "TBD"}
              </p>
              {event.notes ? (
                <p className="mt-1 text-xs text-muted">{event.notes.slice(0, 160)}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamEventsWidget;
