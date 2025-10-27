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
  name: string;
  description: string | null;
  colors: ThemeColors;
  logo: ThemeLogo;
};

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
