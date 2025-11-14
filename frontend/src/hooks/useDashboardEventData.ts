import { useMemo } from "react";

import type { Event, ParticipantStatus } from "../types/event";
import type { Athlete } from "../types/athlete";
import type { TranslationDictionary } from "../i18n/translations";

type SummaryLabels = TranslationDictionary["dashboard"]["summary"];

type TeamCoachMeta = { coachName: string | null; coachUserId: number | null };

type Args = {
  events: Event[];
  selectedEventDate: string | null;
  athleteById: Map<number, Athlete>;
  teamNameById: Record<number, string>;
  summaryLabels: SummaryLabels;
  teamCoachMetaById: Map<number, TeamCoachMeta>;
  getEventTeamIds: (event: Event) => number[];
};

export const useDashboardEventData = ({
  events,
  selectedEventDate,
  athleteById,
  teamNameById,
  summaryLabels,
  teamCoachMetaById,
  getEventTeamIds,
}: Args) => {
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      if (!event.date) return;
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    });
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const toLocalTs = (dateStr: string, timeStr?: string | null) => {
      const [y, m, d] = (dateStr || "").split("-").map(Number);
      const [hh = 0, mm = 0] = (timeStr || "00:00").split(":").map(Number);
      return new Date((y || 0), (m || 1) - 1, (d || 1), hh, mm).getTime();
    };
    return [...events].sort((a, b) => toLocalTs(a.date, a.time) - toLocalTs(b.date, b.time)).slice(0, 4);
  }, [events]);

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedEventDate) return [];
    return events.filter((event) => event.date === selectedEventDate);
  }, [events, selectedEventDate]);

  const eventAvailabilityData = useMemo(() => {
    if (!selectedEventDate) return [];
    return eventsOnSelectedDate.map((event) => {
      const teamIds = getEventTeamIds(event);
      const participants = event.participants ?? [];
      const teamMap = teamIds.reduce<Record<number, Athlete[]>>((acc, id) => {
        acc[id] = [];
        return acc;
      }, {});
      const guests: Athlete[] = [];
      const participantStatusByUserId = new Map<number, ParticipantStatus>();

      participants.forEach((participant) => {
        if (participant.user_id != null) {
          participantStatusByUserId.set(participant.user_id, participant.status);
        }
        const athleteId = participant.athlete_id;
        if (!athleteId) return;
        const athlete = athleteById.get(athleteId);
        if (!athlete) return;
        if (typeof athlete.team_id === "number" && teamMap[athlete.team_id]) {
          teamMap[athlete.team_id].push(athlete);
        } else {
          guests.push(athlete);
        }
      });

      return {
        event,
        teams: teamIds.map((teamId) => {
          const meta = teamCoachMetaById.get(teamId);
          const coachStatus =
            meta?.coachUserId != null ? participantStatusByUserId.get(meta.coachUserId) ?? null : null;
          return {
            teamId,
            teamName: teamNameById[teamId] ?? summaryLabels.teamPlaceholder,
            athletes: teamMap[teamId] ?? [],
            coachName: meta?.coachName ?? null,
            coachStatus,
          };
        }),
        guests,
      };
    });
  }, [
    selectedEventDate,
    eventsOnSelectedDate,
    getEventTeamIds,
    athleteById,
    teamNameById,
    summaryLabels.teamPlaceholder,
    teamCoachMetaById,
  ]);

  const availabilityPages = useMemo(() => {
    const pages: Array<{ eventIndex: number; teamIndex: number; includeGuests: boolean }> = [];
    eventAvailabilityData.forEach((entry, eventIndex) => {
      entry.teams.forEach((_team, teamIndex) => {
        pages.push({ eventIndex, teamIndex, includeGuests: teamIndex === entry.teams.length - 1 });
      });
    });
    return pages;
  }, [eventAvailabilityData]);

  return {
    eventsByDate,
    upcomingEvents,
    eventsOnSelectedDate,
    eventAvailabilityData,
    availabilityPages,
  };
};

