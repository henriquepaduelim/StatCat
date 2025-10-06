export interface Athlete {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  birth_date?: string | null;
  dominant_foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  club_affiliation?: string | null;
}

export type AthletePayload = Omit<Athlete, "id">;
