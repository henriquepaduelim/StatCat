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

// The single, final theme for the application
export const activeTheme: ThemeDefinition = {
  id: "players-to-pro",
  name: "Players To Pro Football",
  description: "Standard Colors",
  colors: {
    page: {
      background: "#F3F9FF",
      foreground: "#141414",
    },
    container: {
      background: "#FFFFFF",
      foreground: "#1F2933",
    },
    header: {
      background: "#264D1E",
      foreground: "#F0F8EB",
    },
    sidebar: {
      background: "#264D1E",
      foreground: "#F0F8EB",
    },
    footer: {
      background: "#C3E1FE",
      foreground: "#0B0B0B",
    },
    action: {
      primary: {
        background: "#14213D",
        foreground: "#E1E1E1",
      },
    },
    accent: "#2191FB",
    border: "#9CC6F8",
    muted: "#6B7280",
  },
  logo: {
    label: "Players To Pro",
    background: "#2191FB",
    color: "#FFFFFF",
  },
};
