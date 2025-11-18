import { useMemo, useState } from "react";

import { useTranslation } from "../../i18n/useTranslation";
import { useEvents, useConfirmEventAttendance } from "../../hooks/useEvents";
import { usePlayerProfileContext } from "./context";
import type { ParticipantStatus, EventConfirmationPayload } from "../../types/event";
import { useAuthStore } from "../../stores/useAuthStore";

const SchedulingPage = () => {
  const t = useTranslation();
  const { currentAthlete, currentAthleteId } = usePlayerProfileContext();
  const currentUser = useAuthStore((state) => state.user);
  const confirmAttendanceMutation = useConfirmEventAttendance();
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const eventsQuery = useEvents(
    currentAthleteId ? { athlete_id: currentAthleteId } : undefined,
    { enabled: Boolean(currentAthleteId) },
  );

  const isSelfView =
    Boolean(currentUser) &&
    currentUser?.role === "athlete" &&
    currentUser.athlete_id != null &&
    currentUser.athlete_id === currentAthleteId;

  const events = useMemo(() => {
  if (!eventsQuery.data) {
    return [];
  }
  return [...eventsQuery.data].sort((a, b) => {
    const timeA = a.time ?? "00:00";
      const timeB = b.time ?? "00:00";
      return new Date(`${a.date}T${timeA}`).getTime() - new Date(`${b.date}T${timeB}`).getTime();
    });
  }, [eventsQuery.data]);

  if (!currentAthleteId) {
    return (
      <div className="rounded-xl border border-black/10 bg-container p-4 text-sm text-muted">
        {t.playerProfile.schedulingNoAthlete}
      </div>
    );
  }

  if (eventsQuery.isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  if (eventsQuery.isError) {
    return (
      <p className="text-sm text-red-500">
        {t.playerProfile.schedulingLoadError}
      </p>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-xl border border-black/10 bg-container p-4 text-sm text-muted">
        {currentAthlete
          ? `${currentAthlete.first_name} ${currentAthlete.last_name}: ${t.playerProfile.schedulingEmpty}`
          : t.playerProfile.schedulingEmpty}
      </div>
    );
  }

  type RsvpStatus = EventConfirmationPayload["status"];
  const rsvpOptions: Array<{ status: RsvpStatus; label: string }> = [
    { status: "confirmed", label: t.playerProfile.schedulingButtons.confirm },
    { status: "maybe", label: t.playerProfile.schedulingButtons.maybe },
    { status: "declined", label: t.playerProfile.schedulingButtons.decline },
  ];

  const handleRespond = async (eventId: number, status: RsvpStatus) => {
    if (!isSelfView) {
      return;
    }
    setActionError(null);
    setPendingEventId(eventId);
    try {
      await confirmAttendanceMutation.mutateAsync({
        eventId,
        payload: { status },
      });
    } catch {
      setActionError(t.playerProfile.schedulingUpdateError);
    } finally {
      setPendingEventId((current) => (current === eventId ? null : current));
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}
      {events.map((event) => {
        const myParticipant = event.participants?.find(
          (participant) => participant.athlete_id === currentAthleteId,
        );
        const currentStatus = (myParticipant?.status ?? "invited") as keyof typeof t.playerProfile.schedulingStatus;
        const canRespond = Boolean(isSelfView && myParticipant);

        return (
          <article
          key={event.id}
          className="rounded-xl border border-black/10 bg-container p-4 shadow-sm space-y-2"
        >
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-container-foreground">{event.name}</h3>
              <p className="text-sm text-muted">
                {event.date} {event.time ? `• ${event.time}` : ""}{" "}
                {event.location ? `• ${event.location}` : ""}
              </p>
            </div>
            <span className="self-start rounded-full bg-action-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-action-primary">
              {event.status}
            </span>
          </div>
          <p className="text-sm text-muted">{event.notes || "No additional notes."}</p>

          {currentAthleteId && myParticipant && (
            <div
              className={`rounded-lg p-3 text-sm border transition ${
                currentStatus === "confirmed"
                  ? "bg-green-50 border-green-200 text-green-900"
                  : currentStatus === "maybe"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                    : currentStatus === "declined"
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-container border-black/5"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-container-foreground">
                  {t.playerProfile.schedulingRsvpTitle}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide inline-flex items-center rounded-full border border-white/20 px-3 py-1">
                  {t.playerProfile.schedulingStatus[currentStatus]}
                </span>
              </div>
              {canRespond ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {rsvpOptions.map((option) => {
                    const isSelected = currentStatus === option.status;
                    const isDisabled =
                      pendingEventId === event.id || confirmAttendanceMutation.isPending;
                    return (
                      <button
                        key={`${event.id}-${option.status}`}
                        type="button"
                        onClick={() => handleRespond(event.id, option.status)}
                        disabled={isDisabled}
                        className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                          isSelected
                            ? "border-action-primary bg-action-primary text-action-primary-foreground shadow"
                            : "border-black/10 bg-container hover:border-action-primary hover:text-action-primary"
                        } ${isDisabled ? "opacity-60" : ""}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </article>
        );
      })}
    </div>
  );
};

export default SchedulingPage;
