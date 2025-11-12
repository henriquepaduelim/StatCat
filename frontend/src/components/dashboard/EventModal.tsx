import { FormEvent, Dispatch, SetStateAction } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faCheck, faQuestion, faTimes } from "@fortawesome/free-solid-svg-icons";

import type { Event } from "../../types/event";
import type { ParticipantStatus } from "../../types/event";
import type { Team } from "../../api/teams";
import type { Athlete } from "../../types/athlete";
import type { TranslationDictionary } from "../../i18n/translations";
import type { EventFormState } from "../../types/dashboard";

type SummaryLabels = TranslationDictionary["dashboard"]["summary"];

type EventModalProps = {
  isOpen: boolean;
  summaryLabels: SummaryLabels;
  eventForm: EventFormState;
  selectedEventDate: string | null;
  readableDate: (dateStr: string) => string;
  formatDateKey: (date: Date) => string;
  eventsOnSelectedDate: Event[];
  teamNameById: Record<number, string>;
  teams: Team[];
  getEventTeamIds: (event: Event) => number[];
  canManageEvents: boolean;
  onDeleteEvent: (eventId: number) => void;
  deleteEventPending: boolean;
  currentUserId: number | null;
  onConfirmAttendance: (eventId: number, status: ParticipantStatus) => void;
  confirmAttendancePending: boolean;
  athleteFilterTeam: number | "unassigned" | null;
  setAthleteFilterTeam: Dispatch<SetStateAction<number | "unassigned" | null>>;
  athleteFilterAge: string;
  setAthleteFilterAge: Dispatch<SetStateAction<string>>;
  athleteFilterGender: string;
  setAthleteFilterGender: Dispatch<SetStateAction<string>>;
  filteredEventAthletes: Athlete[];
  selectAllInviteesRef: React.RefObject<HTMLInputElement>;
  areAllInviteesSelected: boolean;
  onToggleAllInvitees: () => void;
  onInviteToggle: (athleteId: number) => void;
  eventFormError: string | null;
  onInputChange: <T extends keyof EventFormState>(field: T, value: EventFormState[T]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const EventModal = ({
  isOpen,
  summaryLabels,
  eventForm,
  selectedEventDate,
  readableDate,
  formatDateKey,
  eventsOnSelectedDate,
  teamNameById,
  teams,
  canManageEvents,
  onDeleteEvent,
  deleteEventPending,
  currentUserId,
  onConfirmAttendance,
  confirmAttendancePending,
  athleteFilterTeam,
  setAthleteFilterTeam,
  athleteFilterAge,
  setAthleteFilterAge,
  athleteFilterGender,
  setAthleteFilterGender,
  filteredEventAthletes,
  selectAllInviteesRef,
  areAllInviteesSelected,
  onToggleAllInvitees,
  onInviteToggle,
  eventFormError,
  onInputChange,
  onSubmit,
  onCancel,
  getEventTeamIds,
}: EventModalProps) => {
  if (!isOpen) {
    return null;
  }

  const eventsDayTitle = readableDate(eventForm.date || selectedEventDate || formatDateKey(new Date()));
  const teamFilterOptions = eventForm.teamIds.length
    ? teams.filter((team) => eventForm.teamIds.includes(team.id))
    : teams;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 py-2 sm:px-0 sm:py-0"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="h-[96vh] w-full max-w-none overflow-y-auto rounded-lg bg-white p-3 shadow-2xl sm:h-[94vh] sm:rounded-none sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/70 text-muted shadow-sm transition hover:text-accent focus-visible:ring-2 focus-visible:ring-action-primary"
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
            <h3 className="text-lg font-semibold text-container-foreground">{eventsDayTitle}</h3>
            <p className="text-sm text-muted">{summaryLabels.calendar.subtitle}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-black/10 bg-white/80 p-4">
            <h4 className="text-base font-semibold text-container-foreground">
              {summaryLabels.calendar.title}
            </h4>
            <p className="text-xs text-muted">{summaryLabels.calendar.subtitle}</p>
            {eventsOnSelectedDate.length ? (
              <ul className="mt-3 space-y-3 text-sm">
                {eventsOnSelectedDate.map((event) => {
                  const participants = event.participants ?? [];
                  const teamIds = getEventTeamIds(event);
                  const teamLabel = teamIds.length
                    ? teamIds
                        .map((teamId) => teamNameById[teamId] ?? summaryLabels.teamPlaceholder)
                        .join(", ")
                    : summaryLabels.teamPlaceholder;
                  const confirmedCount = participants.filter((p) => p.status === "confirmed").length;
                  const declinedCount = participants.filter((p) => p.status === "declined").length;
                  const pendingCount = participants.filter((p) => p.status === "invited").length;
                  const myParticipant = participants.find((p) => p.user_id === currentUserId);

                  return (
                    <li key={`modal-day-event-${event.id}`} className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-container-foreground">{event.name}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  event.status === "scheduled"
                                    ? "bg-blue-100 text-blue-800"
                                    : event.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {event.status === "scheduled"
                                  ? "Scheduled"
                                  : event.status === "completed"
                                    ? "Completed"
                                    : "Cancelled"}
                              </span>
                              {canManageEvents ? (
                                <button
                                  type="button"
                                  onClick={(buttonEvent) => {
                                    buttonEvent.stopPropagation();
                                    onDeleteEvent(event.id);
                                  }}
                                  disabled={deleteEventPending}
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                  title="Delete event"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {event.time || summaryLabels.calendar.timeTbd}
                            {event.location ? ` • ${event.location}` : ""}
                          </p>
                          <p className="text-[0.7rem] text-muted">
                            {summaryLabels.teamLabel}: {teamLabel}
                          </p>

                          {participants.length > 0 && (
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

                          {myParticipant && myParticipant.status === "invited" && (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => onConfirmAttendance(event.id, "confirmed")}
                                disabled={confirmAttendancePending}
                                className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => onConfirmAttendance(event.id, "maybe")}
                                disabled={confirmAttendancePending}
                                className="flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={faQuestion} className="h-3 w-3" />
                                Maybe
                              </button>
                              <button
                                type="button"
                                onClick={() => onConfirmAttendance(event.id, "declined")}
                                disabled={confirmAttendancePending}
                                className="flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                                Decline
                              </button>
                            </div>
                          )}

                          {myParticipant && myParticipant.status !== "invited" && (
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                  myParticipant.status === "confirmed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : myParticipant.status === "declined"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {myParticipant.status === "confirmed"
                                  ? "You confirmed attendance"
                                  : myParticipant.status === "declined"
                                    ? "You declined"
                                    : "You marked maybe"}
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

          <form className="space-y-4 rounded-xl border border-black/10 bg-white/80 p-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted">
                {summaryLabels.calendar.nameLabel}
                <input
                  value={eventForm.name}
                  onChange={(event) => onInputChange("name", event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  placeholder="Training session"
                  required
                />
              </label>
              <label className="text-xs font-medium text-muted">
                {summaryLabels.calendar.dateLabel}
                <input
                  type="date"
                  value={eventForm.date || selectedEventDate || formatDateKey(new Date())}
                  onChange={(event) => onInputChange("date", event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted">
                {summaryLabels.calendar.timeLabel}
                <input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(event) => onInputChange("startTime", event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
              <label className="text-xs font-medium text-muted">
                End time
                <input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(event) => onInputChange("endTime", event.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                />
              </label>
            </div>
            <label className="text-xs font-medium text-muted">
              {summaryLabels.calendar.locationLabel}
              <input
                value={eventForm.location}
                onChange={(event) => onInputChange("location", event.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="Main field"
              />
            </label>
            <label className="text-xs font-medium text-muted">
              {summaryLabels.calendar.notesLabel}
              <textarea
                value={eventForm.notes}
                onChange={(event) => onInputChange("notes", event.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                rows={3}
              />
            </label>

            <label className="text-xs font-medium text-muted">
              {summaryLabels.calendar.teamLabel}
              <select
                multiple
                value={eventForm.teamIds.map((id) => String(id))}
                onChange={(event) => {
                  const selected = Array.from(event.target.selectedOptions).map((option) => Number(option.value));
                  onInputChange("teamIds", selected);
                }}
                className="mt-1 h-32 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                {teams.map((team) => (
                  <option key={`event-form-team-${team.id}`} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[0.65rem] text-muted">
                Hold Cmd/Ctrl to select multiple teams. Leave empty to invite athletes individually.
              </span>
            </label>

            <div className="text-xs font-medium text-muted">
              <p className="mb-3 text-sm font-semibold">Invite Athletes</p>
              <div className="mb-3 rounded-lg border border-black/10 bg-white/70 p-2 text-xs text-muted">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1">
                    <span className="text-[0.65rem] uppercase">Team</span>
                    <select
                      value={
                        athleteFilterTeam === null
                          ? ""
                          : athleteFilterTeam === "unassigned"
                            ? "unassigned"
                            : String(athleteFilterTeam)
                      }
                      onChange={(event) => {
                        const { value } = event.target;
                        if (!value) {
                          setAthleteFilterTeam(null);
                        } else if (value === "unassigned") {
                          setAthleteFilterTeam("unassigned");
                        } else {
                          setAthleteFilterTeam(Number(value));
                        }
                      }}
                      className="rounded border border-black/10 bg-white px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
                    >
                      <option value="">All</option>
                      <option value="unassigned">Unassigned</option>
                      {teamFilterOptions.map((team) => (
                        <option key={`filter-team-${team.id}`} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-[0.65rem] uppercase">Age</span>
                    <select
                      value={athleteFilterAge}
                      onChange={(event) => setAthleteFilterAge(event.target.value)}
                      className="rounded border border-black/10 bg-white px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
                    >
                      <option value="">All</option>
                      <option value="U14">U14</option>
                      <option value="U16">U16</option>
                      <option value="U18">U18</option>
                      <option value="U21">U21</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    <span className="text-[0.65rem] uppercase">Gender</span>
                    <select
                      value={athleteFilterGender}
                      onChange={(event) => setAthleteFilterGender(event.target.value)}
                      className="rounded border border-black/10 bg-white px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
                    >
                      <option value="">All</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAthleteFilterTeam(null);
                      setAthleteFilterAge("");
                      setAthleteFilterGender("");
                    }}
                    className="ml-auto text-[0.65rem] uppercase text-action-primary hover:text-action-primary/80"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                <input
                  ref={selectAllInviteesRef}
                  id="select-all-invitees"
                  type="checkbox"
                  checked={areAllInviteesSelected}
                  onChange={onToggleAllInvitees}
                  className="h-4 w-4 rounded border-gray-300 text-action-primary"
                />
                <label htmlFor="select-all-invitees">
                  Select all ({filteredEventAthletes.length} athletes)
                </label>
              </div>

              <div className="min-h-[200px] max-h-[300px] overflow-y-auto rounded-lg border border-black/10 bg-white/70">
                {filteredEventAthletes.length ? (
                  <ul className="divide-y divide-black/5 text-sm">
                    {filteredEventAthletes.map((athlete) => (
                      <li key={`invitee-${athlete.id}`} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="font-semibold text-container-foreground">
                            {athlete.first_name} {athlete.last_name}
                          </p>
                          <p className="text-xs text-muted">{athlete.email || "No email"}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={eventForm.inviteeIds.includes(athlete.id)}
                          onChange={() => onInviteToggle(athlete.id)}
                          className="h-4 w-4 rounded border-gray-300 text-action-primary"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted">
                    No athletes found with the selected filters
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-container-foreground">Notifications</p>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={eventForm.sendEmail}
                  onChange={(event) => onInputChange("sendEmail", event.target.checked)}
                  className="rounded border-gray-300 text-action-primary"
                />
                <span>Send email notifications</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={eventForm.sendPush}
                  onChange={(event) => onInputChange("sendPush", event.target.checked)}
                  className="rounded border-gray-300 text-action-primary"
                />
                <span>Send push notifications</span>
              </label>
            </div>

            {eventFormError ? <p className="text-xs text-red-500">{eventFormError}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-container-foreground hover:bg-white sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 sm:w-auto"
              >
                {summaryLabels.calendar.createButton}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
