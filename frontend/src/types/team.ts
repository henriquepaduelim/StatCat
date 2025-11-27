export interface Team {
  id: number;
  name: string;
  age_category: string;
  description?: string | null;
  coach_name?: string | null;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
  athlete_count: number;
}