export interface TeamCoach {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  role: string;
  athlete_id?: number | null;
  is_active: boolean;
}
