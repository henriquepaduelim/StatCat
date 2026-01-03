export interface Team {
  id: number;
  name: string;
  age_category: string;
  description?: string | null;
  coach_name?: string | null; // legacy
  coach_full_name?: string | null;
  coach_user_id?: number | null;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
  athlete_count: number;
}
