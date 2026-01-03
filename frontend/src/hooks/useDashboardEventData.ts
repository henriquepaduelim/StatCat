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
  coachById: Map<number, string>;
};

export const useDashboardEventData = ({
  events,
  selectedEventDate,
  athleteById,
  teamNameById,
  summaryLabels,
  teamCoachMetaById,
  getEventTeamIds,
  coachById,
}: Args) => {
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      if (!event.event_date) return;
      map.set(event.event_date, [...(map.get(event.event_date) ?? []), event]);
    });
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const toLocalTs = (dateStr: string, startTime?: string | null) => {
      const [y, m, d] = (dateStr || "").split("-").map(Number);
      const [hh = 0, mm = 0] = (startTime || "00:00").split(":").map(Number);
      return new Date((y || 0), (m || 1) - 1, (d || 1), hh, mm).getTime();
    };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...events]
      .filter((event) => toLocalTs(event.event_date, event.start_time) >= now.getTime())
      .sort((a, b) => toLocalTs(a.event_date, a.start_time) - toLocalTs(b.event_date, b.start_time))
      .slice(0, 4);
  }, [events]);

  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedEventDate) return [];
    return events.filter((event) => event.event_date === selectedEventDate);
  }, [events, selectedEventDate]);

  const eventAvailabilityData = useMemo(() => {
    if (!selectedEventDate) return [];
    return eventsOnSelectedDate.map((event) => {
      let teamIds = getEventTeamIds(event);
      const participants = event.participants ?? [];
      const hasTeams = teamIds.length > 0;

      // Se não houver times, cria um grupo fictício para listar todos os convidados
      if (!hasTeams) {
        teamIds = [-1];
      }

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
        const targetTeamId =
          typeof athlete.team_id === "number" && teamMap[athlete.team_id] ? athlete.team_id : hasTeams ? null : -1;
        if (targetTeamId !== null && teamMap[targetTeamId]) {
          teamMap[targetTeamId].push(athlete);
        } else if (hasTeams && typeof athlete.team_id === "number" && teamMap[athlete.team_id]) {
          teamMap[athlete.team_id].push(athlete);
        } else {
          guests.push(athlete);
        }
      });

      return {
        event,
        teams: teamIds.map((teamId) => {
          const meta = teamCoachMetaById.get(teamId);
          let coachUserId = meta?.coachUserId ?? null;
          let coachName = meta?.coachName ?? null;

          // Fallback: find a coach participant by user_id if meta is missing
          if (coachUserId == null) {
            const coachParticipant = participants.find(
              (participant) => participant.user_id != null && coachById.has(participant.user_id),
            );
            if (coachParticipant?.user_id != null) {
              coachUserId = coachParticipant.user_id;
              coachName = coachName ?? coachById.get(coachParticipant.user_id) ?? null;
            }
          }

          const coachStatus = coachUserId != null ? participantStatusByUserId.get(coachUserId) ?? null : null;
          return {
            teamId,
            teamName:
              teamId === -1
                ? summaryLabels.teamPlaceholder
                : teamNameById[teamId] ?? summaryLabels.teamPlaceholder,
            athletes: teamMap[teamId] ?? [],
            coachName: coachName,
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
    coachById,
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
