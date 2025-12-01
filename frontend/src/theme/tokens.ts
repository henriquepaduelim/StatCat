import type { ThemeDefinition } from "./themes";

// Cores por tema (hex), mantidas iguais às definições atuais.
export const themeTokens: Record<"light" | "dark", ThemeDefinition> = {
  light: {
    id: "statcat-sports-analysis",
    name: "StatCat Sports Analysis",
    description: "Default StatCat color palette",
    colors: {
      page: { background: "#F5F5F5", foreground: "#000000" },
      container: { background: "#FFFFFF", foreground: "#000000" },
      header: { background: "#039903", foreground: "#000000" },
      sidebar: { background: "#212529", foreground: "#000000" },
      footer: { background: "#000000", foreground: "#000000" },
      action: { primary: { background: "#040404", foreground: "#FFFFFF" } },
      accent: "#2191FB",
      border: "#000000",
      muted: "#000000",
    },
    logo: { label: "STATCAT", background: "#2191FB", color: "#FFFFFF" },
  },
  dark: {
    id: "statcat-sports-analysis-dark",
    name: "StatCat Sports Analysis Dark",
    description: "Default StatCat dark color palette",
    colors: {
      page: { background: "#0B0B0B", foreground: "#F5F5F5" },
      container: { background: "#161616", foreground: "#FFFFFF" },
      header: { background: "#1F1F1F", foreground: "#FFFFFF" },
      sidebar: { background: "#121212", foreground: "#E5E5E5" },
      footer: { background: "#0D0D0D", foreground: "#E5E5E5" },
      action: { primary: { background: "#F4A240", foreground: "#0B0B0B" } },
      accent: "#F4A240",
      border: "#2C2C2C",
      muted: "#9E9E9E",
    },
    logo: { label: "STATCAT", background: "#F4A240", color: "#0B0B0B" },
  },
};

// Global style tokens (static across themes, centralized for future edits).
export const globalStyleTokens = {
  typography: {
    fontFamily:
      '"Geist", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
    },
    lineHeight: {
      tight: "1.1",
      normal: "1.5",
      relaxed: "1.7",
    },
  },
  radii: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
  },
  shadows: {
    card: "0 10px 20px rgba(15, 23, 42, 0.08)",
    modal: "0 25px 50px rgba(15, 23, 42, 0.25)",
    popover: "0 10px 30px rgba(0, 0, 0, 0.15)",
  },
};

// Cores de suporte para componentes (nav mobile, inputs, toggle etc.) por tema.
export const supportColors: Record<
  "light" | "dark",
  {
    navMobileBg: string;
    navMobileBorder: string;
    navMobileAccent: string;
    navMobileLabel: string;
    inputBg: string;
    inputText: string;
    inputBorder: string;
    inputPlaceholder: string;
    toggleMuted: string;
    toggleLight: string;
    toggleDark: string;
    toggleLink: string;
    toggleLinkHover: string;
    borderTableLight: string;
    borderTableDark: string;
    bgSoftBlue: string;
  }
> = {
  light: {
    navMobileBg: "#14203c",
    navMobileBorder: "#eab308",
    navMobileAccent: "#f4a240",
    navMobileLabel: "#ffffff",
    inputBg: "#cccccc",
    inputText: "#000000",
    inputBorder: "rgba(15, 23, 42, 0.25)",
    inputPlaceholder: "rgba(0, 0, 0, 0.65)",
    toggleMuted: "#9e9e9e",
    toggleLight: "#d8dbe0",
    toggleDark: "#28292c",
    toggleLink: "rgb(27, 129, 112)",
    toggleLinkHover: "rgb(24, 94, 82)",
    borderTableLight: "#e7e8e9",
    borderTableDark: "#e5e5e5",
    bgSoftBlue: "rgba(239, 246, 255, 0.3)", // tailwind blue-50 @30%
  },
  dark: {
    navMobileBg: "#14203c",
    navMobileBorder: "#eab308",
    navMobileAccent: "#f4a240",
    navMobileLabel: "#ffffff",
    inputBg: "#f5e6c6",
    inputText: "#000000",
    inputBorder: "rgba(0, 0, 0, 0.55)",
    inputPlaceholder: "rgba(0, 0, 0, 0.7)",
    toggleMuted: "#9e9e9e",
    toggleLight: "#d8dbe0",
    toggleDark: "#28292c",
    toggleLink: "rgb(27, 129, 112)",
    toggleLinkHover: "rgb(24, 94, 82)",
    borderTableLight: "#e7e8e9",
    borderTableDark: "#e5e5e5",
    bgSoftBlue: "rgba(239, 246, 255, 0.3)",
  },
};
