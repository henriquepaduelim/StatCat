// types.ts
export type ThemeColorPair = {
  background: string;
  foreground: string;
};

export type ThemeColors = {
  page: ThemeColorPair;
  container: ThemeColorPair;
  header: ThemeColorPair;
  sidebar: {
    background: string;
    foreground: string;
    button: string;
    buttonHover: string;
  };
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

import { themeTokens } from "./tokens";

export const THEMES = themeTokens;

export type ThemeId = keyof typeof themeTokens;

export const DEFAULT_THEME_ID: ThemeId = "light";

export const getThemeDefinition = (themeId: ThemeId): ThemeDefinition =>
  THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];

export const activeTheme: ThemeDefinition = THEMES[DEFAULT_THEME_ID];

export default activeTheme;
