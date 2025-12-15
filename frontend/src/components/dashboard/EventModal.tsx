import { FormEvent, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faMinus } from "@fortawesome/free-solid-svg-icons";

import type { Team } from "../../types/team";
import type { TeamCoach } from "../../types/coach";
import type { Event, ParticipantStatus } from "../../types/event";
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
  eventsOnSelectedDate?: Event[];
  teamNameById?: Record<number, string>;
  teams: Team[];
  availableCoaches: TeamCoach[];
  createEventPending: boolean;
  getEventTeamIds?: (event: Event) => number[];
  canManageEvents?: boolean;
  onDeleteEvent?: (eventId: number) => void;
  deleteEventPending?: boolean;
  currentUserId?: number | null;
  onConfirmAttendance?: (eventId: number, status: ParticipantStatus) => void;
  confirmAttendancePending?: boolean;
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
  teams,
  availableCoaches,
  createEventPending,
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
}: EventModalProps) => {
  const [mapsReady, setMapsReady] = useState(false);
  const [locationLatLng, setLocationLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadGoogleMaps = (): Promise<typeof google | null> => {
      if (typeof window !== "undefined") {
        const googleGlobal = (window as typeof window & { google?: typeof google }).google;
        if (googleGlobal?.maps?.places) {
          return Promise.resolve(googleGlobal);
        }
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[src*="maps.googleapis.com/maps/api/js"]',
        );
        if (existing) {
          existing.addEventListener("load", () => {
            const googleGlobal = (window as typeof window & { google?: typeof google }).google ?? null;
            resolve(googleGlobal);
          });
          existing.addEventListener("error", () => resolve(null));
          return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          const googleGlobal = (window as typeof window & { google?: typeof google }).google ?? null;
          resolve(googleGlobal);
        };
        script.onerror = () => {
          console.error("Failed to load Google Maps");
          resolve(null);
        };
        document.body.appendChild(script);
      });
    };

    const initAutocomplete = async () => {
      const googleLib = await loadGoogleMaps();
      if (!googleLib || !locationInputRef.current) return;

      const autocomplete = new googleLib.maps.places.Autocomplete(locationInputRef.current, {
        fields: ["formatted_address", "geometry"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const address = place.formatted_address || place.name || "";
        if (address) {
          onInputChange("location", address);
        }
        if (place.geometry?.location) {
          const latlng = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          setLocationLatLng(latlng);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(latlng);
            mapInstanceRef.current.setZoom(14);
          }
          if (markerRef.current) {
            markerRef.current.setPosition(latlng);
          }
        }
      });

      if (mapContainerRef.current && !mapInstanceRef.current) {
        const center = locationLatLng ?? { lat: 0, lng: 0 };
        mapInstanceRef.current = new googleLib.maps.Map(mapContainerRef.current, {
          center,
          zoom: locationLatLng ? 14 : 2,
          disableDefaultUI: true,
          zoomControl: true,
        });
        markerRef.current = new googleLib.maps.Marker({
          position: center,
          map: mapInstanceRef.current,
        });
      }

      setMapsReady(true);
    };

    initAutocomplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapsReady || !mapInstanceRef.current || !markerRef.current || !locationLatLng) {
      return;
    }
    mapInstanceRef.current.setCenter(locationLatLng);
    mapInstanceRef.current.setZoom(14);
    markerRef.current.setPosition(locationLatLng);
  }, [isOpen, mapsReady, locationLatLng]);

  if (!isOpen) {
    return null;
  }

  const eventsDayTitle = readableDate(eventForm.date || selectedEventDate || formatDateKey(new Date()));
  const teamFilterOptions = eventForm.teamIds.length
    ? teams.filter((team) => eventForm.teamIds.includes(team.id))
    : teams;

  const handleTeamToggle = (teamId: number) => {
    const isSelected = eventForm.teamIds.includes(teamId);
    const updated = isSelected
      ? eventForm.teamIds.filter((id) => id !== teamId)
      : [...eventForm.teamIds, teamId];
    onInputChange("teamIds", updated);
  };

  const handleCoachToggle = (coachId: number) => {
    const isSelected = eventForm.coachIds.includes(coachId);
    const updated = isSelected
      ? eventForm.coachIds.filter((id) => id !== coachId)
      : [...eventForm.coachIds, coachId];
    onInputChange("coachIds", updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 box-border flex items-center justify-center modal-overlay px-2 py-2 sm:px-8 sm:py-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="modal-surface relative box-border h-[96vh] w-full max-w-full overflow-x-hidden overflow-y-auto rounded-lg p-2 shadow-2xl sm:h-[94vh] sm:max-w-5xl sm:rounded-none sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted shadow-sm transition hover:text-accent focus-visible:ring-2 focus-visible:ring-action-primary"
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

        <div className="mt-4 space-y-6">
        <form className="modal-card space-y-4 rounded-xl bg-container p-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.nameLabel}
                  <input
                    value={eventForm.name}
                    onChange={(event) => onInputChange("name", event.target.value)}
                    className="mt-1 w-full rounded-md border border-border-muted bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
                    className="mt-1 w-full rounded-md border border-border-muted bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted">
                    {summaryLabels.calendar.timeLabel} 
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(event) => onInputChange("startTime", event.target.value)}
                      className="mt-1 w-full rounded-md border border-border-muted bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      step={900}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    End time
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(event) => onInputChange("endTime", event.target.value)}
                      className="mt-1 w-full rounded-md border border-border-muted bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      step={900}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">
                  {summaryLabels.calendar.locationLabel}
                  <input
                    value={eventForm.location}
                    onChange={(event) => onInputChange("location", event.target.value)}
                    ref={locationInputRef}
                    className="mt-1 w-full rounded-md border border-border-muted bg-container px-3 py-2 text-sm shadow-sm focus-border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                    placeholder="Main field"
                  />
                </label>
                <div className="mt-3 hidden border-t border-black/10 opacity-60 md:block" />
                {mapsReady ? (
                  <div className="mt-3 hidden h-40 rounded-lg border border-black/10 md:block" ref={mapContainerRef} />
                ) : null}
              </div>
            </div>
            <div className="text-xs font-medium text-muted">
              <label className="flex flex-col">
                <span>{summaryLabels.calendar.notesLabel}</span>
                <textarea
                  value={eventForm.notes}
                  onChange={(event) => onInputChange("notes", event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-muted bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  rows={3}
                />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="text-xs font-medium text-muted">
                <p className="mb-1">{summaryLabels.calendar.teamLabel}</p>
                <div className="modal-card space-y-1 rounded-lg bg-container p-2">
                  {teams.map((team) => {
                    const isSelected = eventForm.teamIds.includes(team.id);
                    return (
                      <button
                        key={`team-toggle-${team.id}`}
                        type="button"
                        onClick={() => handleTeamToggle(team.id)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition ${
                          isSelected ? "bg-action-primary/15 text-action-primary" : "text-container-foreground hover:bg-black/5"
                        }`}
                      >
                        <span>{team.name}</span>
                        <FontAwesomeIcon icon={isSelected ? faMinus : faPlus} className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs font-medium text-muted">
                <p className="mb-1">Invite coaches</p>
                <div className="modal-card space-y-1 rounded-lg bg-container p-2">
                  {availableCoaches.map((coach) => {
                    const isSelected = eventForm.coachIds.includes(coach.id);
                    return (
                      <button
                        key={`coach-toggle-${coach.id}`}
                        type="button"
                        onClick={() => handleCoachToggle(coach.id)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition ${
                          isSelected ? "bg-action-primary/15 text-action-primary" : "text-container-foreground hover:bg-black/5"
                        }`}
                      >
                        <span>{coach.full_name}</span>
                        <FontAwesomeIcon icon={isSelected ? faMinus : faPlus} className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card-base border-dashed bg-container/60 p-3 text-[0.7rem] text-muted lg:col-span-1">
                <p className="font-semibold text-container-foreground">Tip</p>
                <p className="mt-1">
                  Selected teams automatically include all roster athletes. Use the coach selector to add assistant or guest coaches.
                </p>
              </div>
            </div>

            <div className="text-xs font-medium text-muted">
              <p className="mb-3 text-sm font-semibold">Invite Athletes</p>
              <div className="modal-card mb-3 rounded-lg bg-container p-2 text-xs text-muted">
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
                      className="rounded border border-border-muted bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
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
                      className="rounded border border-border-muted bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
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
                      className="rounded border border-border-muted bg-container px-2 py-1 text-xs focus:border-action-primary focus:outline-none"
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

              <div className="modal-card min-h-[200px] max-h-[300px] overflow-y-auto overflow-x-auto rounded-lg bg-container-gradient">
                {filteredEventAthletes.length ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {filteredEventAthletes.map((athlete) => (
                      <div
                        key={`invitee-${athlete.id}`}
                        className="modal-card flex items-start justify-between gap-2 rounded-lg bg-container px-3 py-2 text-sm transition hover:bg-container/80"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-container-foreground">
                            {athlete.first_name} {athlete.last_name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {athlete.email || "No email"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onInviteToggle(athlete.id)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition ${
                            eventForm.inviteeIds.includes(athlete.id)
                              ? "border-action-primary text-action-primary"
                              : "border-black/20 text-muted hover:text-container-foreground"
                          }`}
                          aria-label={eventForm.inviteeIds.includes(athlete.id) ? "Remove invitee" : "Add invitee"}
                        >
                          <FontAwesomeIcon icon={eventForm.inviteeIds.includes(athlete.id) ? faMinus : faPlus} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted">
                    No athletes found with the selected filters
                  </p>
                )}
              </div>
            </div>

            {eventFormError ? <p className="text-xs text-red-500">{eventFormError}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-container-foreground hover:bg-container/80 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createEventPending}
                className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {createEventPending ? "Creating..." : summaryLabels.calendar.createButton}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
