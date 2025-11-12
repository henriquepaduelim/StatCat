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
  inviteeIds: number[];
  sendEmail: boolean;
  sendPush: boolean;
};

export type AthleteFilter = {
  age: string;
  gender: string;
  teamStatus: "all" | "assigned" | "unassigned";
};

export type NoticeState = { variant: "success" | "error"; message: string } | null;

export type CoachFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};
