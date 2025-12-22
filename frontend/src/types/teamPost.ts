export interface TeamPost {
  id: number;
  team_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  author_photo_url?: string | null;
  content: string;
  media_url?: string | null;
  created_at: string;
}
