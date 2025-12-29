export type NewTeamFormState = {
  name: string;
  ageCategory: string;
  gender: "boys" | "girls" | "coed";
  description: string;
  coachIds: number[];
  athleteIds: number[];
};

export type EventFormState = {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  teamIds: number[];
  coachIds: number[];
  inviteeIds: number[];
  sendEmail: boolean;
  sendPush: boolean;
};

export type AthleteFilter = {
  age: string;
  gender: string;
  query: string;
  teamStatus: "all" | "assigned" | "unassigned";
};

export type NoticeState = { variant: "success" | "error"; message: string } | null;

export type CoachFormState = {
  fullName: string;
  email: string;
  phone: string;
};

export type GameReportFormState = {
  teamId: number | null;
  opponent: string;
  date: string;
  location: string;
  goalsFor: string;
  goalsAgainst: string;
  goalScorers: Array<{ athleteId: number; goals: number; shootoutGoals: number }>;
  goalkeepersPlayed: number[];
  goalkeeperConceded: Array<{ athleteId: number; conceded: number }>;
  notes: string;
};
