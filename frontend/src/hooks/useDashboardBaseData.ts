import { useMemo } from "react";
import { useAthletes } from "./useAthletes";
import { useTeams } from "./useTeams";
import type { Athlete } from "../types/athlete";

type AthleteByIdMap = Map<number, Athlete>;
type AthletesByTeamId = Record<number, Athlete[]>;
type TeamNameById = Record<number, string>;

export const useDashboardBaseData = () => {
  const athletesQuery = useAthletes();
  const teamsQuery = useTeams();

  const {
    athletes,
    athleteById,
    athletesByTeamId,
  } = useMemo(() => {
    const flatList = athletesQuery.data?.pages.flatMap((page) => page.items) ?? [];
    
    const byTeamId = flatList.reduce<AthletesByTeamId>((acc, athlete) => {
      if (typeof athlete.team_id === "number") {
        if (!acc[athlete.team_id]) {
          acc[athlete.team_id] = [];
        }
        acc[athlete.team_id].push(athlete);
      }
      return acc;
    }, {});

    const byId: AthleteByIdMap = new Map();
    flatList.forEach((athlete) => {
      byId.set(athlete.id, athlete);
    });
    
    return {
      athletes: flatList,
      athleteById: byId,
      athletesByTeamId: byTeamId,
    };
  }, [athletesQuery.data]);

  const { teams, teamNameById } = useMemo(() => {
    const teamList = teamsQuery.data ?? [];
    const nameById = teamList.reduce<TeamNameById>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
    return { teams: teamList, teamNameById: nameById };
  }, [teamsQuery.data]);

  return {
    athletesQuery,
    teamsQuery,
    athletes,
    teams,
    teamNameById,
    athletesByTeamId,
    athleteById,
  };
};
