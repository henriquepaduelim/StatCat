import type { ThemeDefinition } from "./themes";

export const activeTheme: ThemeDefinition = {
  id: "statcat-sports-analysis",
  name: "StatCat Sports Analysis",
  description: "Default StatCat color palette",
  colors: {
    page: {
      background: "#F5F5F5",
      foreground: "#000000",
    },
    container: {
      background: "#FFFFFF",
      foreground: "#000000",
    },
    header: {
      background: "#039903",
      foreground: "#000000",
    },
    sidebar: {
      background: "#212529",
      foreground: "#000000",
    },
    footer: {
      background: "#000000",
      foreground: "#000000",
    },
    action: {
      primary: {
        background: "#040404",
        foreground: "#FFFFFF",
      },  
    },
    accent: "#2191FB",
    border: "#000000",
    muted: "#000000",
  },
  logo: {
    label: "STATCAT",
    background: "#2191FB",
    color: "#FFFFFF",
  },
};

export default activeTheme;
