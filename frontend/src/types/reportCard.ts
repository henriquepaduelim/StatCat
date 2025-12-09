export type ReportCardMetric = {
  name: string;
  score: number | null;
};

export type ReportCardCategory = {
  name: string;
  metrics: ReportCardMetric[];
  group_average?: number | null;
};

export type ReportSubmissionStatus = "pending" | "approved" | "rejected" | "reopened";

export type ReportCardPayload = {
  athlete_id: number;
  team_id: number | null;
  coach_report: string;
  categories: ReportCardCategory[];
};
