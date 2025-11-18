export interface TeamPost {
  id: number;
  team_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  media_url?: string | null;
  created_at: string;
}
