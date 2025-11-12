import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { Event } from "../../types/event";
import type { Team } from "../../api/teams";
import type { Athlete } from "../../types/athlete";
import type { TranslationDictionary } from "../../i18n/translations";

type SummaryLabels = TranslationDictionary["dashboard"]["summary"];

type AvailabilityDisplay = {
  className: string;
  icon: IconDefinition;
  label: string;
};

type EventAvailabilityPanelProps = {
  summaryLabels: SummaryLabels;
  selectedEventDate: string | null;
  selectedTeamId: number | null;
  readableDate: (date: string) => string;
  clearLabel: string;
  eventsOnSelectedDate: Event[];
  teamNameById: Record<number, string>;
  eventTeamIdsForSelectedDate: number[];
  teams: Team[];
  onSelectTeam: (teamId: number | null) => void;
  teamsForSelectedDate: Team[];
  isRosterLoading: boolean;
  rosterHasError: boolean;
  athletesByTeamId: Record<number, Athlete[]>;
  onClearSelectedDate: () => void;
  getAvailabilityDisplay: (athlete: Athlete) => AvailabilityDisplay;
  getEventTeamIds: (event: Event) => number[];
  availabilityPage: number;
  setAvailabilityPage: (page: number) => void;
};

const TEAMS_PER_PAGE = 2;

const EventAvailabilityPanel = ({
  summaryLabels,
  selectedEventDate,
  selectedTeamId,
  readableDate,
  clearLabel,
  eventsOnSelectedDate,
  teamNameById,
  eventTeamIdsForSelectedDate,
  teams,
  onSelectTeam,
  teamsForSelectedDate,
  isRosterLoading,
  rosterHasError,
  athletesByTeamId,
  onClearSelectedDate,
  getAvailabilityDisplay,
  getEventTeamIds,
  availabilityPage,
  setAvailabilityPage,
}: EventAvailabilityPanelProps) => {
  const availableTeams = teamsForSelectedDate.filter((team) => (athletesByTeamId[team.id] ?? []).length);
  const filteredTeams = selectedTeamId ? availableTeams.filter((team) => team.id === selectedTeamId) : availableTeams;
  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / TEAMS_PER_PAGE));
  const currentPage = Math.min(availabilityPage, totalPages - 1);

  useEffect(() => {
    if (availabilityPage !== currentPage) {
      setAvailabilityPage(currentPage);
    }
  }, [availabilityPage, currentPage, setAvailabilityPage]);

  const paginatedTeams = filteredTeams.slice(
    currentPage * TEAMS_PER_PAGE,
    currentPage * TEAMS_PER_PAGE + TEAMS_PER_PAGE
  );

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
            {eventsOnSelectedDate.length ? (
              <ul className="mt-2 space-y-1">
                {eventsOnSelectedDate.map((event) => {
                  const teamIds = getEventTeamIds(event);
                  const teamLabels = teamIds.length
                    ? teamIds
                        .map((teamId) => teamNameById[teamId] ?? summaryLabels.teamPlaceholder)
                        .join(", ")
                    : summaryLabels.teamPlaceholder;
                  return (
                    <li
                      key={`selected-event-${event.id}`}
                      className="grid grid-cols-[80px_1fr_150px] items-center gap-4 text-xs"
                    >
                      <span className="text-left font-medium text-container-foreground">
                        {event.time || "TBD"}
                      </span>
                      <span className="text-left font-medium text-container-foreground">{event.name}</span>
                      <span className="text-left text-muted">{teamLabels}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">{summaryLabels.calendar.upcomingEmpty}</p>
            )}
            {eventTeamIdsForSelectedDate.length > 1 && (
              <div className="mt-3 border-t border-action-primary/20 pt-2">
                <label className="block text-xs font-medium text-muted">
                  Select team to view availability:
                  <select
                    value={selectedTeamId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value ? Number(event.target.value) : null;
                      onSelectTeam(value);
                      setAvailabilityPage(0);
                    }}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-2 py-1 text-xs shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    <option value="">{summaryLabels.teamPlaceholder}</option>
                    {eventTeamIdsForSelectedDate.map((teamId) => {
                      const team = teams.find((t) => t.id === teamId);
                      if (!team) return null;
                      return (
                        <option key={`team-selector-${team.id}`} value={team.id}>
                          {team.name}
                        </option>
                      );
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
        ) : (
          <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-muted">
            {summaryLabels.summaryHelper ?? "Select a date to view RSVP availability."}
          </div>
        )}
        {!selectedEventDate ? null : !eventsOnSelectedDate.length ? (
          <div className="rounded-lg border border-black/10 bg-white/70 px-3 py-6 text-center text-xs text-muted">
            {summaryLabels.noEvents}
          </div>
        ) : (
          <div className="flex h-[500px] flex-col overflow-hidden rounded-lg border border-white/10 bg-white/70">
            <div className="hidden grid-cols-[minmax(140px,180px)_1fr_100px] gap-x-4 border-b border-black/5 bg-container/20 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted sm:grid">
              <span className="text-left">{summaryLabels.columns.name}</span>
              <span className="text-left">{summaryLabels.columns.contact}</span>
              <span className="text-center">{summaryLabels.columns.availability}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {isRosterLoading ? (
                <div className="px-4 py-6 text-sm text-muted">{summaryLabels.loading}</div>
              ) : rosterHasError ? (
                <div className="px-4 py-6 text-sm text-red-500">{summaryLabels.error}</div>
              ) : !availableTeams.length ? (
                <div className="px-4 py-6 text-sm text-muted">{summaryLabels.empty}</div>
              ) : (
                <ul className="h-full divide-y divide-black/5 overflow-hidden">
                  {paginatedTeams.map((team) => {
                    const teamAthletes = athletesByTeamId[team.id] ?? [];
                    return (
                      <li key={`team-group-${team.id}`} className="border-b border-black/5 last:border-b-0">
                        <div className="border-b border-black/5 bg-gray-50/80 px-3 py-2 sm:px-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            {team.name} ({teamAthletes.length})
                          </p>
                        </div>
                        <ul className="divide-y divide-black/5">
                          {teamAthletes.map((athlete) => {
                            const availability = getAvailabilityDisplay(athlete);
                            return (
                              <li
                                key={athlete.id}
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
                                <div className="flex w-auto items-center justify-center sm:w-[100px]">
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
            {filteredTeams.length > TEAMS_PER_PAGE ? (
              <div className="flex items-center justify-end gap-2 border-t border-black/5 bg-white/60 px-3 py-2 text-xs text-muted">
                <button
                  type="button"
                  onClick={() => setAvailabilityPage(Math.max(currentPage - 1, 0))}
                  disabled={currentPage === 0}
                  className="rounded border border-black/10 px-2 py-1 text-xs font-semibold text-container-foreground disabled:opacity-40"
                >
                  {"<<"}
                </button>
                <span className="text-[0.7rem] font-semibold">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAvailabilityPage(Math.min(currentPage + 1, totalPages - 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="rounded border border-black/10 px-2 py-1 text-xs font-semibold text-container-foreground disabled:opacity-40"
                >
                  {">>"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventAvailabilityPanel;
