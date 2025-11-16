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

export const activeTheme: ThemeDefinition = generatedTheme;

export default activeTheme;
