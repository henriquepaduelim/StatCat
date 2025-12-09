export interface ReportSubmissionItem {
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
  submitted_by: string | null;
  created_at: string;
}
