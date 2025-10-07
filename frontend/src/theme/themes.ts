import type { Client } from "../types/client";

export type ThemeColors = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  muted: string;
  onPrimary: string;
  onSurface: string;
};

export type ThemeLogo = {
  label: string;
  background: string;
  color: string;
};

export type ThemeDefinition = {
  id: string;
  clientId?: number;
  name: string;
  description: string | null;
  colors: ThemeColors;
  logo: ThemeLogo;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
};

export const fallbackTheme: ThemeDefinition = {
  id: "combine",
  clientId: undefined,
  name: "Combine Geral",
  description: "Paleta padrão do evento",
  colors: {
    primary: hexToRgb("#449DD1"),
    accent: hexToRgb("#F97316"),
    background: hexToRgb("#B8BACF"),
    surface: hexToRgb("#0E0E52"),
    muted: hexToRgb("#ffffff"),
    onPrimary: hexToRgb("#FFFFFF"),
    onSurface: hexToRgb("#111827"),
  },
  logo: {
    label: "Marvin Soccer Analytics",
    background: hexToRgb("#78C0E0"),
    color: hexToRgb("#FFFFFF"),
  },
};

export const themeFromClient = (client: Client): ThemeDefinition => {
  const branding = client.branding;
  return {
    id: client.slug,
    clientId: client.id,
    name: client.name,
    description: client.description ?? null,
    colors: {
      primary: hexToRgb(branding.primary_color),
      accent: hexToRgb(branding.accent_color),
      background: hexToRgb(branding.background_color),
      surface: hexToRgb(branding.surface_color),
      muted: hexToRgb(branding.muted_color),
      onPrimary: hexToRgb(branding.on_primary_color),
      onSurface: hexToRgb(branding.on_surface_color),
    },
    logo: {
      label: branding.logo_label,
      background: hexToRgb(branding.logo_background_color),
      color: hexToRgb(branding.logo_text_color),
    },
  };
};
