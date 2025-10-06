export interface ClientBranding {
  primary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  muted_color: string;
  on_primary_color: string;
  on_surface_color: string;
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
