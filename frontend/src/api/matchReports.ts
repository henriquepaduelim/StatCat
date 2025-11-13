import api from "./client";

export type GameReportPayload = {
  team_id: number | null;
  opponent: string;
  date: string;
  location: string | null;
  goals_for: number;
  goals_against: number;
  goal_scorers: Array<{ athlete_id: number; goals: number; shootout_goals: number }>;
  goalkeepers: Array<{ athlete_id: number; conceded: number }>;
  notes: string | null;
};

export const submitGameReport = async (payload: GameReportPayload) => {
  const { data } = await api.post("/match-stats/reports", payload);
  return data;
};
