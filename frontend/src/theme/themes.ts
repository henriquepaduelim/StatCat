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
  name: " MVP Sports Analytics",
  description: "MVP pallete",
  colors: {
    primary: hexToRgb("#FDE12D"),
    accent: hexToRgb("#552BFD"),
    background: hexToRgb("#FDE12D"),
    surface: hexToRgb("#ffffff"),
    muted: hexToRgb("#000000"),
    onPrimary: hexToRgb("#000000"),
    onSurface: hexToRgb("#000000"),
  },
  logo: {
    label: "MVP Sports Analytics",
    background: hexToRgb("#552BFD"),
    color: hexToRgb("#552BFD"),
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
