import type { Client } from "../types/client";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "./presets";

export type ThemeColorPair = {
  background: string;
  foreground: string;
};

export type ThemeColors = {
  page: ThemeColorPair;
  container: ThemeColorPair;
  header: ThemeColorPair;
  sidebar: ThemeColorPair;
  footer: ThemeColorPair;
  action: {
    primary: ThemeColorPair;
  };
  accent: string;
  border: string;
  muted: string;
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

const ensureHex = (value: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const withoutPrefix = value.startsWith("#") ? value.slice(1) : value;

  if (withoutPrefix.length === 3) {
    const expanded = withoutPrefix
      .split("")
      .map((char) => char + char)
      .join("");
    return `#${expanded}`;
  }

  if (withoutPrefix.length === 6) {
    return `#${withoutPrefix}`;
  }

  return fallback;
};

const brandingValue = (value: string | undefined, fallback: string) =>
  value ? ensureHex(value, fallback) : fallback;

const cloneTheme = (theme: ThemeDefinition): ThemeDefinition => ({
  ...theme,
  colors: {
    page: { ...theme.colors.page },
    container: { ...theme.colors.container },
    header: { ...theme.colors.header },
    sidebar: { ...theme.colors.sidebar },
    footer: { ...theme.colors.footer },
    action: {
      primary: { ...theme.colors.action.primary },
    },
    accent: theme.colors.accent,
    border: theme.colors.border,
    muted: theme.colors.muted,
  },
  logo: { ...theme.logo },
});

const fallbackPreset =
  THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_ID) ?? THEME_PRESETS[0];

export const fallbackTheme: ThemeDefinition = cloneTheme(fallbackPreset);

const ensurePreset = (id?: string) =>
  id ? THEME_PRESETS.find((preset) => preset.id === id) : undefined;

export const themeFromClient = (client: Client): ThemeDefinition => {
  const branding = client.branding;

  const preset = ensurePreset(branding.theme_preset_id);
  if (preset) {
    const duplicated = cloneTheme(preset);
    duplicated.clientId = client.id;
    return duplicated;
  }

  return {
    id: client.slug,
    clientId: client.id,
    name: client.name,
    description: client.description ?? null,
    colors: {
      page: {
        background: brandingValue(
          branding.page_background_color ?? branding.background_color,
          fallbackPreset.colors.page.background
        ),
        foreground: brandingValue(
          branding.page_foreground_color ?? branding.on_surface_color,
          fallbackPreset.colors.page.foreground
        ),
      },
      container: {
        background: brandingValue(
          branding.container_background_color ?? branding.surface_color,
          fallbackPreset.colors.container.background
        ),
        foreground: brandingValue(
          branding.container_foreground_color ?? branding.on_surface_color,
          fallbackPreset.colors.container.foreground
        ),
      },
      header: {
        background: brandingValue(
          branding.header_background_color ?? branding.surface_color,
          fallbackPreset.colors.header.background
        ),
        foreground: brandingValue(
          branding.header_foreground_color ?? branding.on_surface_color,
          fallbackPreset.colors.header.foreground
        ),
      },
      sidebar: {
        background: brandingValue(
          branding.sidebar_background_color ?? branding.surface_color,
          fallbackPreset.colors.sidebar.background
        ),
        foreground: brandingValue(
          branding.sidebar_foreground_color ?? branding.on_surface_color,
          fallbackPreset.colors.sidebar.foreground
        ),
      },
      footer: {
        background: brandingValue(
          branding.footer_background_color ?? branding.surface_color,
          fallbackPreset.colors.footer.background
        ),
        foreground: brandingValue(
          branding.footer_foreground_color ?? branding.on_surface_color,
          fallbackPreset.colors.footer.foreground
        ),
      },
      action: {
        primary: {
          background: brandingValue(
            branding.button_primary_background_color ?? branding.primary_color,
            fallbackPreset.colors.action.primary.background
          ),
          foreground: brandingValue(
            branding.button_primary_foreground_color ?? branding.on_primary_color,
            fallbackPreset.colors.action.primary.foreground
          ),
        },
      },
      accent: brandingValue(branding.accent_color, fallbackPreset.colors.accent),
      border: brandingValue(
        branding.border_color ?? branding.accent_color,
        fallbackPreset.colors.border
      ),
      muted: brandingValue(branding.muted_color, fallbackPreset.colors.muted),
    },
    logo: {
      label: branding.logo_label,
      background: brandingValue(branding.logo_background_color, fallbackPreset.logo.background),
      color: brandingValue(branding.logo_text_color, fallbackPreset.logo.color),
    },
  };
};
