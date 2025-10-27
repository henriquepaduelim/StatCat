export type AthleteStatus = "active" | "inactive";
export type RegistrationCategory = "youth" | "senior" | "trial" | "return_player";
export type PlayerRegistrationStatus = "new" | "transfer" | "return_player" | "guest";

export interface Athlete {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  birth_date: string;
  dominant_foot?: string | null;
  gender?: "male" | "female" | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  club_affiliation?: string | null;
  team_id?: number | null;
  primary_position: string;
  secondary_position?: string | null;
  photo_url?: string | null;
  status: AthleteStatus;
  registration_year?: string | null;
  registration_category?: RegistrationCategory | null;
  player_registration_status?: PlayerRegistrationStatus | null;
  preferred_position?: string | null;
  desired_shirt_number?: string | null;
}

export type AthletePayload = Omit<Athlete, "id">;

export interface AthleteRegistrationPayload {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: "male" | "female";
  email: string;
  phone: string;
  registration_year: string;
  team_id?: number | null;
  registration_category: RegistrationCategory;
  player_registration_status: PlayerRegistrationStatus;
  preferred_position?: string;
  desired_shirt_number?: string;
}

export interface AthleteDocumentMetadata {
  id?: number;
  label: string;
  file_url: string;
  uploaded_at?: string;
}

export interface AthletePaymentPayload {
  amount?: number;
  currency?: string;
  method?: string;
  reference?: string;
  receipt_url?: string;
  paid_at?: string;
  id?: number;
  created_at?: string;
}

export interface AthleteRegistrationCompletionPayload {
  email?: string | null;
  phone?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_email?: string | null;
  guardian_phone?: string | null;
  secondary_guardian_name?: string | null;
  secondary_guardian_relationship?: string | null;
  secondary_guardian_email?: string | null;
  secondary_guardian_phone?: string | null;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  medical_allergies?: string | null;
  medical_conditions?: string | null;
  physician_name?: string | null;
  physician_phone?: string | null;
  documents?: AthleteDocumentMetadata[] | null;
  payment?: AthletePaymentPayload | null;
}

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
