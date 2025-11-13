import api from "./client";

export type ReportSubmissionSummary = {
  id: number;
  report_type: "game_report" | "report_card";
  status: "pending" | "approved" | "rejected";
  team_name: string | null;
  opponent: string | null;
  athlete_name: string | null;
  match_date: string | null;
  goals_for: number | null;
  goals_against: number | null;
  technical_rating: number | null;
  physical_rating: number | null;
  training_rating: number | null;
  match_rating: number | null;
  general_notes: string | null;
  review_notes: string | null;
  submitted_by: string;
  created_at: string;
};

export type ReportCardPayload = {
  athlete_id: number;
  team_id: number | null;
  technical_rating: number;
  physical_rating: number;
  training_rating: number;
  match_rating: number;
  general_notes: string | null;
};

export const fetchPendingReportSubmissions = async (): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>("/report-submissions/pending");
  return data;
};

export const fetchMyReportSubmissions = async (): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>("/report-submissions/mine");
  return data;
};

export const fetchAthleteReportSubmissions = async (
  athleteId: number,
): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>(
    `/report-submissions/athlete/${athleteId}`,
  );
  return data;
};

export const approveReportSubmission = async (submissionId: number) => {
  const { data } = await api.post(`/report-submissions/${submissionId}/approve`);
  return data;
};

export const rejectReportSubmission = async (submissionId: number, notes: string) => {
  const { data } = await api.post(`/report-submissions/${submissionId}/reject`, { notes });
  return data;
};

export const submitReportCardRequest = async (payload: ReportCardPayload) => {
  const { data } = await api.post("/report-submissions/report-card", payload);
  return data;
};
