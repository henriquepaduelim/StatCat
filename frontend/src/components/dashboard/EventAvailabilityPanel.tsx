import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCheck, faQuestion, faTimes } from "@fortawesome/free-solid-svg-icons";

import type { Event, ParticipantStatus } from "../../types/event";
import type { Athlete } from "../../types/athlete";
import type { TranslationDictionary } from "../../i18n/translations";

type SummaryLabels = TranslationDictionary["dashboard"]["summary"];

type AvailabilityDisplay = {
  className: string;
  icon: IconDefinition;
  label: string;
  status?: ParticipantStatus | "active" | "inactive";
};

type EventAvailabilityEntry = {
  event: Event;
  teams: Array<{
    teamId: number;
    teamName: string;
    athletes: Athlete[];
    coachName: string | null;
    coachStatus: ParticipantStatus | null;
  }>;
  guests: Athlete[];
};

type AvailabilityPageMeta = {
  eventIndex: number;
  teamIndex: number;
  includeGuests: boolean;
};

type EventAvailabilityPanelProps = {
  summaryLabels: SummaryLabels;
  selectedEventDate: string | null;
  readableDate: (date: string) => string;
  clearLabel: string;
  eventsAvailability: EventAvailabilityEntry[];
  availabilityPages: AvailabilityPageMeta[];
  availabilityPage: number;
  setAvailabilityPage: (page: number) => void;
  isRosterLoading: boolean;
  rosterHasError: boolean;
  onClearSelectedDate: () => void;
  getAvailabilityDisplay: (athlete: Athlete, eventId: number) => AvailabilityDisplay;
  currentUserRole: string | null;
  currentUserId: number | null;
  currentUserAthleteId: number | null;
  onConfirmAttendance: (eventId: number, status: ParticipantStatus) => void;
  confirmAttendancePending: boolean;
};

const EventAvailabilityPanel = ({
  summaryLabels,
  selectedEventDate,
  readableDate,
  clearLabel,
  eventsAvailability,
  availabilityPages,
  availabilityPage,
  setAvailabilityPage,
  isRosterLoading,
  rosterHasError,
  onClearSelectedDate,
  getAvailabilityDisplay,
  currentUserRole,
  currentUserId,
  currentUserAthleteId,
  onConfirmAttendance,
  confirmAttendancePending,
}: EventAvailabilityPanelProps) => {
  const rsvpOptions: ParticipantStatus[] = ["confirmed", "maybe", "declined"];
  const rsvpLabels: Record<ParticipantStatus, string> = {
    confirmed: "Confirm",
    maybe: "Maybe",
    declined: "Decline",
    invited: "Pending",
  };

  const renderRSVPButtons = (currentStatus: ParticipantStatus | null, eventId: number, disabled?: boolean) => (
    <div className="flex flex-wrap items-center gap-1">
      {rsvpOptions.map((option) => (
        <button
          key={`rsvp-${eventId}-${option}`}
          type="button"
          onClick={() => onConfirmAttendance(eventId, option)}
          disabled={disabled || confirmAttendancePending}
          className={`rounded-full border px-2 py-1 text-[0.65rem] font-semibold transition ${
            currentStatus === option
              ? "border-action-primary bg-action-primary text-white"
              : "border-black/20 text-muted hover:text-container-foreground"
          } disabled:opacity-50`}
        >
          {rsvpLabels[option]}
        </button>
      ))}
    </div>
  );

  const getCoachStatusBadge = (status: ParticipantStatus | null) => {
    switch (status) {
      case "confirmed":
        return {
          className:
            "flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700",
          label: "Confirmed",
          icon: faCheck,
        };
      case "declined":
        return {
          className:
            "flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700",
          label: "Declined",
          icon: faTimes,
        };
      case "maybe":
        return {
          className:
            "flex h-6 w-6 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700",
          label: "Maybe",
          icon: faQuestion,
        };
      case "invited":
      default:
        return {
          className:
            "flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-gray-600",
          label: summaryLabels.coachLine.unknownAvailability,
          icon: faQuestion,
        };
    }
  };

  const totalPages = availabilityPages.length;
  const currentMeta = totalPages ? availabilityPages[Math.min(availabilityPage, totalPages - 1)] : null;
  const currentEntry = currentMeta ? eventsAvailability[currentMeta.eventIndex] : null;
  const currentTeam =
    currentMeta && currentEntry && currentMeta.teamIndex >= 0
      ? currentEntry.teams[currentMeta.teamIndex]
      : null;
  const showGuests = currentMeta && currentEntry ? (currentMeta.includeGuests ? currentEntry.guests.length > 0 : false) : false;

  const renderAthleteRow = (athlete: Athlete, eventId: number) => {
    const availability = getAvailabilityDisplay(athlete, eventId);
    const normalizedStatus =
      availability.status === "confirmed" ||
      availability.status === "declined" ||
      availability.status === "maybe" ||
      availability.status === "invited"
        ? (availability.status as ParticipantStatus)
        : null;
    const isCurrentAthlete =
      currentUserRole === "athlete" && currentUserAthleteId === athlete.id && currentUserAthleteId !== null;
    return (
      <li
        key={`availability-athlete-${athlete.id}`}
        className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 py-2 text-sm sm:grid-cols-[minmax(140px,180px)_1fr_100px] sm:gap-x-2 sm:px-4"
      >
        <div className="w-full sm:w-auto sm:max-w-[180px]">
          <p className="overflow-hidden text-left font-semibold text-container-foreground whitespace-nowrap text-ellipsis">
            {athlete.first_name} {athlete.last_name}
          </p>
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm text-container-foreground">
            {athlete.email ?? summaryLabels.contactFallback}
          </span>
        </div>
        <div className="flex w-auto flex-col items-center justify-center gap-2 sm:w-[100px]">
          <span className={availability.className} title={availability.label}>
            <FontAwesomeIcon icon={availability.icon} className="h-3 w-3" />
          </span>
          {isCurrentAthlete ? renderRSVPButtons(normalizedStatus, eventId) : null}
        </div>
      </li>
    );
  };

  const renderBody = () => {
    if (!selectedEventDate) {
      return (
        <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-muted">
          Select a date to view RSVP availability.
        </div>
      );
    }

    if (isRosterLoading) {
      return <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-muted">{summaryLabels.loading}</div>;
    }

    if (rosterHasError) {
      return <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-red-500">{summaryLabels.error}</div>;
    }

    if (!totalPages || !currentEntry || !currentTeam) {
      return (
        <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-muted">
          {summaryLabels.empty}
        </div>
      );
    }

    const event = currentEntry.event;
    const teamAthletes = currentTeam.athletes;
    const coachStatusBadge = getCoachStatusBadge(currentTeam.coachStatus);
    const coachName = currentTeam.coachName ?? summaryLabels.coachLine.unknownCoach;
    const coachParticipant = currentEntry.event.participants?.find(
      (participant) => participant.user_id === currentUserId
    );
    const showCoachActions =
      currentUserRole === "coach" && currentUserId != null && Boolean(coachParticipant);

    return (
      <div className="flex h-[500px] flex-col overflow-hidden rounded-lg border border-white/10 bg-white/70">
        <div className="border-b border-black/5 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-container-foreground">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p>{event.name}</p>
              <p className="text-xs text-muted">
                {readableDate(event.date)} • {event.time || summaryLabels.calendar.timeTbd}
              </p>
              <p className="text-xs text-muted mt-1">{currentTeam.teamName}</p>
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAvailabilityPage(Math.max(availabilityPage - 1, 0))}
                  disabled={availabilityPage === 0}
                  className="rounded border border-black/10 px-2 py-1 font-semibold text-container-foreground disabled:opacity-40"
                >
                  {"<<"}
                </button>
                <span className="font-semibold">
                  {availabilityPage + 1}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAvailabilityPage(Math.min(availabilityPage + 1, totalPages - 1))}
                  disabled={availabilityPage >= totalPages - 1}
                  className="rounded border border-black/10 px-2 py-1 font-semibold text-container-foreground disabled:opacity-40"
                >
                  {">>"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="hidden grid-cols-[minmax(140px,180px)_1fr_100px] gap-x-4 border-b border-black/5 bg-container/20 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted sm:grid">
          <span className="text-left">{summaryLabels.columns.name}</span>
          <span className="text-left">{summaryLabels.columns.contact}</span>
          <span className="text-center">{summaryLabels.columns.availability}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-black/5">
            {teamAthletes.length ? (
              teamAthletes.map((athlete) => renderAthleteRow(athlete, event.id))
            ) : (
              <li className="px-3 py-4 text-xs text-muted sm:px-4">No athletes invited for this team.</li>
            )}
            {showGuests ? (
              <>
                <li className="border-t border-black/5 bg-gray-50/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted sm:px-4">
                  Guest Athletes ({currentEntry.guests.length})
                </li>
                {currentEntry.guests.map((athlete) => renderAthleteRow(athlete, event.id))}
              </>
            ) : null}
          </ul>
        </div>
        <div className="border-t border-dashed border-black/10 bg-white/80 px-4 py-3 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">{summaryLabels.coachLine.label}</p>
              <p className="font-semibold text-container-foreground">{coachName}</p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-xs uppercase tracking-wide text-muted">{summaryLabels.coachLine.availability}</span>
              <div className="flex items-center gap-2">
                <span className={coachStatusBadge.className}>
                  <FontAwesomeIcon icon={coachStatusBadge.icon} className="h-3 w-3" />
                </span>
                <span className="text-sm font-semibold text-container-foreground">{coachStatusBadge.label}</span>
              </div>
              {showCoachActions ? renderRSVPButtons(coachParticipant?.status ?? null, event.id) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur xl:w-1/2">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-container-foreground">{summaryLabels.title}</h2>
        <p className="text-xs text-muted">{summaryLabels.subtitle}</p>
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
                onClick={onClearSelectedDate}
                className="text-xs font-semibold text-action-primary transition hover:text-action-primary/80"
              >
                {clearLabel}
              </button>
            </div>
            {eventsAvailability.length ? (
              <p className="mt-2 text-[0.7rem] text-muted">
                {eventsAvailability.length} {eventsAvailability.length === 1 ? "event" : "events"} scheduled on this date.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
            )}
          </div>
        ) : null}
        {renderBody()}
      </div>
    </div>
  );
};

export default EventAvailabilityPanel;
