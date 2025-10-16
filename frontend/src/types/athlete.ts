export type AthleteStatus = "active" | "inactive";

export interface Athlete {
  id: number;
  client_id?: number | null;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  dominant_foot?: string | null;
  gender?: "male" | "female" | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  club_affiliation?: string | null;
  photo_url?: string | null;
  status: AthleteStatus;
}

export type AthletePayload = Omit<Athlete, "id">;

export interface AthleteReportMetric {
  test_id: number;
  test_name: string;
  category: string | null;
  value: number;
  unit?: string | null;
  recorded_at?: string | null;
  notes?: string | null;
  peer_average?: number | null;
}

export interface AthleteReportSession {
  session_id: number;
  session_name: string;
  scheduled_at?: string | null;
  location?: string | null;
  results: AthleteReportMetric[];
}

export interface AthleteReport {
  athlete: Athlete;
  sessions: AthleteReportSession[];
}
