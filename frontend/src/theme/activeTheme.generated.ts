import type { ThemeDefinition } from "./themes";

export const activeTheme: ThemeDefinition = {
  id: "elite-1-academy",
  name: "ELITE 1 ACADEMY",
  description: "Default Elite 1 color palette",
  colors: {
    page: {
      background: "#F5F5F5",
      foreground: "#000000",
    },
    container: {
      background: "#FFFFFF",
      foreground: "#dee2e6",
    },
    header: {
      background: "#039903",
      foreground: "#F0F8EB",
    },
    sidebar: {
      background: "#212529",
      foreground: "#F0F8EB",
    },
    footer: {
      background: "#C3E1FE",
      foreground: "#0B0B0B",
    },
    action: {
      primary: {
        background: "#dee2e6",
        foreground: "#212529",
      },
    },
    accent: "#2191FB",
    border: "#9CC6F8",
    muted: "#6B7280",
  },
  logo: {
    label: "ELITE 1",
    background: "#2191FB",
    color: "#FFFFFF",
  },
};

export default activeTheme;
