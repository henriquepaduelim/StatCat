// types.ts
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

import generatedTheme from "./activeTheme.generated";

const darkTheme: ThemeDefinition = {
  id: "elite-1-academy-dark",
  name: "ELITE 1 ACADEMY (Night)",
  description: "High contrast palette optimized for low light",
  colors: {
    page: {
      background: "#050913",
      foreground: "#F5F7FF",
    },
    container: {
      background: "#11182B",
      foreground: "#F9FBFF",
    },
    header: {
      background: "#0F172A",
      foreground: "#F9FBFF",
    },
    sidebar: {
      background: "#0C1324",
      foreground: "#11182A",
    },
    footer: {
      background: "#0C1324",
      foreground: "#E5E7F5",
    },
    action: {
      primary: {
        background: "#F4A240",
        foreground: "#1B1206",
      },
    },
    accent: "#F4A240",
    border: "#F4A240",
    muted: "#9CA7C7",
  },
  logo: {
    label: "ELITE 1",
    background: "#F4A240",
    color: "#1B1206",
  },
};

export const THEMES = {
  light: generatedTheme,
  dark: darkTheme,
};

export type ThemeId = keyof typeof THEMES;

export const DEFAULT_THEME_ID: ThemeId = "light";

export const getThemeDefinition = (themeId: ThemeId): ThemeDefinition =>
  THEMES[themeId] ?? generatedTheme;

export const activeTheme: ThemeDefinition = generatedTheme;

export default activeTheme;
