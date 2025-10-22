import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { AxiosError } from "axios";

import MapInput from "./MapInput";

import type { CalendarEventPayload } from "../api/calendarEvents";
import type { Athlete } from "../types/athlete";
import type { Group } from "../hooks/useGroups";

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultStart = () => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now;
};

const defaultEnd = (start: Date) => {
  const end = new Date(start.getTime());
  end.setHours(end.getHours() + 2);
  return end;
};

type CalendarEventFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CalendarEventPayload) => Promise<void> | void;
  isSubmitting: boolean;
  athletes: Athlete[];
  groups: Group[];
  defaultClientId?: number | null;
};

const EVENT_TYPES = [
  { value: "combine", label: "Combine" },
  { value: "training", label: "Training" },
  { value: "game", label: "Game" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

const calculateAge = (birthDate?: string | null) => {
  if (!birthDate) {
    return null;
  }

  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  const dayDiff = today.getDate() - parsed.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
};

const CalendarEventFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  athletes,
  groups,
  defaultClientId,
}: CalendarEventFormModalProps) => {
  const timezoneGuess = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("combine");
  const [calendarId] = useState("primary");
  const [status] = useState("scheduled");
  const [timeZone] = useState(timezoneGuess);
  const [startValue, setStartValue] = useState(() => formatDateTimeLocal(defaultStart()));
  const [endValue, setEndValue] = useState(() => formatDateTimeLocal(defaultEnd(defaultStart())));
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteSortAsc, setAthleteSortAsc] = useState(true);
  const [groupSearch, setGroupSearch] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const teamOptions = useMemo(() => {
    const clubs = athletes
      .map((athlete) => athlete.club_affiliation?.trim())
      .filter((club): club is string => Boolean(club));

    return Array.from(new Set(clubs)).sort((a, b) => a.localeCompare(b));
  }, [athletes]);

  useEffect(() => {
    if (isOpen) {
      const start = defaultStart();
      const end = defaultEnd(start);
      setSummary("");
      setDescription("");
      setLocation("");
      setEventType("combine");
      // calendarId, status, and timeZone remain using defaults
      setStartValue(formatDateTimeLocal(start));
      setEndValue(formatDateTimeLocal(end));
      setSelectedAthletes([]);
      setSelectedGroups([]);
      setCoordinates(null);
      setLocalError(null);
      setAthleteSearch("");
      setAthleteSortAsc(true);
      setGroupSearch("");
      setSelectedGenders([]);
      setSelectedStatuses([]);
      setAgeMin("");
      setAgeMax("");
      setSelectedTeams([]);
    }
  }, [isOpen, timezoneGuess]);

  const filteredAthletes = useMemo(() => {
    const query = athleteSearch.trim().toLowerCase();
    const base = query
      ? athletes.filter((athlete) =>
          `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(query) ||
          athlete.email.toLowerCase().includes(query)
        )
      : athletes;
    const minAge = ageMin ? parseInt(ageMin, 10) : null;
    const maxAge = ageMax ? parseInt(ageMax, 10) : null;

    const next = base.filter((athlete) => {
      if (selectedGenders.length) {
        const gender = athlete.gender ?? null;
        if (!gender || !selectedGenders.includes(gender)) {
          return false;
        }
      }

      if (selectedStatuses.length && !selectedStatuses.includes(athlete.status)) {
        return false;
      }

      if (selectedTeams.length) {
        const club = athlete.club_affiliation?.trim();
        if (!club || !selectedTeams.includes(club)) {
          return false;
        }
      }

      if (minAge !== null || maxAge !== null) {
        const age = calculateAge(athlete.birth_date);

        if (age === null) {
          return false;
        }

        if (minAge !== null && age < minAge) {
          return false;
        }

        if (maxAge !== null && age > maxAge) {
          return false;
        }
      }

      return true;
    });

    return [...next].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return athleteSortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }, [
    athletes,
    athleteSearch,
    athleteSortAsc,
    selectedGenders,
    selectedStatuses,
    ageMin,
    ageMax,
    selectedTeams,
  ]);

  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) {
      return groups;
    }
    return groups.filter((group) => group.name.toLowerCase().includes(query));
  }, [groups, groupSearch]);

  const toggleValue = (value: string, collection: string[], setter: (next: string[]) => void) => {
    setter(
      collection.includes(value)
        ? collection.filter((item) => item !== value)
        : [...collection, value]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!summary.trim()) {
      return;
    }

    const startIso = new Date(startValue).toISOString();
    const endIso = new Date(endValue).toISOString();

    const hasManualSelection = selectedAthletes.length > 0;
    const hasGroupSelection = selectedGroups.length > 0;

    if (!hasManualSelection && !hasGroupSelection) {
      setLocalError("Select at least one athlete or group before saving.");
      return;
    }

    const locationValue = location.trim() || undefined;
    if (!locationValue || !coordinates) {
      setLocalError("Select a location on the map before saving the event.");
      return;
    }

    const payload: CalendarEventPayload = {
      summary: summary.trim(),
      description: description.trim() || undefined,
      location: locationValue,
      event_type: eventType,
      start_at: startIso,
      end_at: endIso,
      time_zone: timeZone,
      calendar_id: calendarId || undefined,
      status,
      client_id: defaultClientId ?? undefined,
      attendee_ids: selectedAthletes.map(Number),
      group_ids: selectedGroups.map(Number),
    };

    setLocalError(null);

    try {
      await onSubmit(payload);
    } catch (error) {
      if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail;
        const message =
          (typeof detail === "string" && detail) ||
          (error.response?.data?.message as string | undefined) ||
          "Failed to create event. Please review the attendee selection.";
        setLocalError(message);
      } else {
        setLocalError("Failed to create event. Please try again.");
      }
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
                <Dialog.Panel className="glass-panel w-full max-w-2xl transform overflow-hidden rounded-3xl bg-gradient-to-br from-white/95 via-white/90 to-white/80 p-6 text-left shadow-2xl backdrop-blur-md transition-all">
                <Dialog.Title as="h3" className="text-xl font-semibold text-container-foreground">
                  New calendar event
                </Dialog.Title>

                <p className="mt-1 text-sm text-muted">
                  Pick a slot, set the venue, and we will send Google Calendar invitations to everyone selected below.
                </p>

                <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                  {localError ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {localError}
                    </p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-container-foreground">Title</span>
                      <input
                        type="text"
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                        className="rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                        required
                      />
                    </label>
                    <label className="flex flex-col w-1/2/ gap-1 text-sm">
                      <span className="font-medium text-container-foreground">Type</span>
                      <select
                        value={eventType}
                        onChange={(event) => setEventType(event.target.value)}
                        className="rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                      >
                        {EVENT_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-container-foreground">Start</span>
                      <input
                        type="datetime-local"
                        value={startValue}
                        onChange={(event) => setStartValue(event.target.value)}
                        className="min-w-[13rem] rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-container-foreground">End</span>
                      <input
                        type="datetime-local"
                        value={endValue}
                        min={startValue}
                        onChange={(event) => setEndValue(event.target.value)}
                        className="min-w-[13rem] rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
                    <div className="flex flex-col gap-3 text-sm">
                      <span className="font-medium text-container-foreground">Pick the venue</span>
                      <div className="rounded-xl border border-black/10 bg-white/90 p-3 shadow-inner">
                        <MapInput
                          height={180}
                          onChange={(position, address) => {
                            const resolvedAddress = address || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
                            setLocation(resolvedAddress);
                            setCoordinates(position);
                          }}
                        />
                        <p className="mt-2 text-xs text-muted">
                          {location
                            ? `Selected: ${location}${
                                coordinates
                                  ? ` — (${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)})`
                                  : ""
                              }`
                            : "Search or drop the pin to attach the address to the event."}
                        </p>
                      </div>
                    </div>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-container-foreground">Description</span>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={6}
                        className="min-h-[8rem] rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                        placeholder="Share the agenda, kit requirements, or meeting point details."
                      />
                    </label>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-black/10 bg-white/80 p-5 shadow-inner">
                    <div>
                      <h4 className="text-sm font-semibold text-container-foreground">Invite attendees</h4>
                      <p className="text-xs text-muted">Add athletes individually or by bundle. Smart filters help you capture everyone who meets the criteria.</p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[1fr,1fr]">
                      <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Athletes
                        </label>
                        <div className="max-h-48 overflow-hidden rounded-xl border border-black/10 bg-white/95 shadow-sm">
                          <ul className="divide-y divide-black/5 text-sm">
                            {filteredAthletes.length ? (
                              filteredAthletes.map((athlete) => {
                                const value = String(athlete.id);
                                const isSelected = selectedAthletes.includes(value);
                                return (
                                  <li key={athlete.id}>
                                    <label className="grid grid-cols-[1.5rem,1fr] items-center gap-3 px-4 py-2 hover:bg-action-primary/10">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                          setSelectedAthletes((prev) =>
                                            isSelected
                                              ? prev.filter((item) => item !== value)
                                              : [...prev, value]
                                          )
                                        }
                                        className="h-4 w-4 rounded border-gray-300"
                                      />
                                      <span className="truncate text-container-foreground">
                                        {athlete.first_name} {athlete.last_name}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })
                            ) : (
                              <li className="px-4 py-3 text-xs text-muted">No athletes match the current filters.</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                          Groups
                        </label>
                        <div className="max-h-48 overflow-hidden rounded-xl border border-black/10 bg-white/95 shadow-sm">
                          <ul className="divide-y divide-black/5 text-sm">
                            {filteredGroups.length ? (
                              filteredGroups.map((group) => {
                                const value = String(group.id);
                                const isSelected = selectedGroups.includes(value);
                                return (
                                  <li key={group.id}>
                                    <label className="grid grid-cols-[1.5rem,1fr] items-center gap-3 px-4 py-2 hover:bg-action-primary/10">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                          setSelectedGroups((prev) =>
                                            isSelected
                                              ? prev.filter((item) => item !== value)
                                              : [...prev, value]
                                          )
                                        }
                                        className="h-4 w-4 rounded border-gray-300"
                                      />
                                      <span className="truncate text-container-foreground">{group.name}</span>
                                    </label>
                                  </li>
                                );
                              })
                            ) : (
                              <li className="px-4 py-3 text-xs text-muted">No groups found.</li>
                            )}
                          </ul>
                        </div>

                        <div className="space-y-3 rounded-xl border border-black/10 bg-white/95 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Smart filters</p>
                          <div className="flex flex-wrap gap-3 text-xs">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={selectedGenders.includes("male")}
                                onChange={() => toggleValue("male", selectedGenders, setSelectedGenders)}
                              />
                              Male
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={selectedGenders.includes("female")}
                                onChange={() => toggleValue("female", selectedGenders, setSelectedGenders)}
                              />
                              Female
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={selectedStatuses.includes("active")}
                                onChange={() => toggleValue("active", selectedStatuses, setSelectedStatuses)}
                              />
                              Active
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={selectedStatuses.includes("inactive")}
                                onChange={() => toggleValue("inactive", selectedStatuses, setSelectedStatuses)}
                              />
                              Inactive
                            </label>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1 text-xs">
                              <span>Minimum age</span>
                              <input
                                type="number"
                                min={0}
                                value={ageMin}
                                onChange={(event) => setAgeMin(event.target.value)}
                                className="rounded border border-black/10 bg-white px-2 py-1"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs">
                              <span>Maximum age</span>
                              <input
                                type="number"
                                min={0}
                                value={ageMax}
                                onChange={(event) => setAgeMax(event.target.value)}
                                className="rounded border border-black/10 bg-white px-2 py-1"
                              />
                            </label>
                          </div>
                          {teamOptions.length ? (
                            <label className="flex flex-col gap-1 text-xs">
                              <span>Teams</span>
                              <select
                                multiple
                                value={selectedTeams}
                                onChange={(event) =>
                                  setSelectedTeams(Array.from(event.target.selectedOptions, (option) => option.value))
                                }
                                className="h-16 rounded border border-black/10 bg-white px-2 py-1"
                              >
                                {teamOptions.map((team) => (
                                  <option key={team} value={team}>
                                    {team}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-muted hover:border-action-primary hover:text-accent"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? "Saving…" : "Create event"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CalendarEventFormModal;
