import api from "./client";
import type {
  ReportCardCategory,
  ReportCardPayload,
  ReportSubmissionStatus,
} from "../types/reportCard";

export type ReportSubmissionSummary = {
  id: number;
  report_type: "game_report" | "report_card";
  status: ReportSubmissionStatus;
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
  coach_report: string | null;
  categories: ReportCardCategory[] | null;
  overall_average: number | null;
  review_notes: string | null;
  submitted_by: string;
  created_at: string;
};

const normalizeStatus = (status: string): ReportSubmissionStatus => {
  switch (status.toLowerCase()) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "reopened":
      return "reopened";
    case "pending":
    default:
      return "pending";
  }
};

const normalizeReportType = (value: string): "game_report" | "report_card" => {
  const normalized = value.toLowerCase();
  return normalized === "game" || normalized === "game_report" ? "game_report" : "report_card";
};

const normalizeSubmission = (raw: ReportSubmissionSummary): ReportSubmissionSummary => ({
  ...raw,
  status: normalizeStatus(raw.status as string),
  report_type: normalizeReportType(raw.report_type as string),
});

export const fetchPendingReportSubmissions = async (): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>("/report-submissions/pending");
  return data.map(normalizeSubmission);
};

export const fetchMyReportSubmissions = async (): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>("/report-submissions/mine");
  return data.map(normalizeSubmission);
};

export const fetchAthleteReportSubmissions = async (
  athleteId: number,
): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>(
    `/report-submissions/athlete/${athleteId}`,
  );
  return data.map(normalizeSubmission);
};

export const fetchApprovedReportSubmissions = async (): Promise<ReportSubmissionSummary[]> => {
  const { data } = await api.get<ReportSubmissionSummary[]>("/report-submissions/approved");
  return data.map(normalizeSubmission);
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

export const reopenReportSubmission = async (submissionId: number) => {
  const { data } = await api.post(`/report-submissions/${submissionId}/reopen`);
  return data;
};

export const updateReportCard = async (submissionId: number, payload: ReportCardPayload) => {
  const { data } = await api.put(`/report-submissions/${submissionId}`, payload);
  return data;
};
