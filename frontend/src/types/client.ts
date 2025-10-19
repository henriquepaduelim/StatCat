export interface ClientBranding {
  primary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  muted_color: string;
  on_primary_color: string;
  on_surface_color: string;
  theme_preset_id?: string;
  border_color?: string;
  page_background_color?: string;
  page_foreground_color?: string;
  container_background_color?: string;
  container_foreground_color?: string;
  header_background_color?: string;
  header_foreground_color?: string;
  sidebar_background_color?: string;
  sidebar_foreground_color?: string;
  footer_background_color?: string;
  footer_foreground_color?: string;
  button_primary_background_color?: string;
  button_primary_foreground_color?: string;
  logo_label: string;
  logo_background_color: string;
  logo_text_color: string;
}

export interface Client {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  branding: ClientBranding;
}
