import type { ThemeDefinition } from "./themes";

// Cores por tema (hex), mantidas iguais às definições atuais.
export const themeTokens: Record<"light" | "dark", ThemeDefinition> = {
  light: {
    id: "light",
    name: "Light",
    description: "Bright palette",
    colors: {
      page: { background: "#edf2f4", foreground: "#111827" },
      container: { background: "#FFFFFF", foreground: "#111827" },
      header: { background: "#FFFFFF", foreground: "#111827" },
      sidebar: {
        background: "#6B7280",
        foreground: "#E5E7EB",
        button: "#2a2f32",
        buttonHover: "#3b4043",
      },
      footer: { background: "#FFFFFF", foreground: "#111827" },
      action: { primary: { background: "#fdc500", foreground: "#111827" } },
      accent: "#F5A623",
      border: "#000000",
      muted: "#6B7280",
    },
    logo: { label: "StatCat Sports Analysis", background: "#2191FB", color: "#FFFFFF" },
  },
  dark: {
    id: "dark",
    name: "Dark",
    description: "Dark blue palette",
    colors: {
      page: { background: "#2d3142", foreground: "#F8FAFC" }, // azul escuro
      container: { background: "#0d1726", foreground: "#F8FAFC" },
      header: { background: "#0D1421", foreground: "#F8FAFC" },
      sidebar: {
        background: "#090E18",
        foreground: "#F8FAFC",
        button: "#1F2937",
        buttonHover: "#374151",
      },
      footer: { background: "#0D1421", foreground: "#F8FAFC" },
      action: { primary: { background: "#fdc500", foreground: "#000000" } },
      accent: "#F5A623",
      border: "#D3D3D3",
      muted: "#9CA3AF",
    },
    logo: { label: "StatCat Sports Analysis", background: "#F4A240", color: "#0B0B0B" },
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
    navMobileBg: "#011627",
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
    borderTableLight: "#000000",
    borderTableDark: "#000000",
    bgSoftBlue: "rgba(239, 246, 255)", // tailwind blue-50 @30%
  },
  dark: {
    navMobileBg: "#001219",
    navMobileBorder: "#eab308",
    navMobileAccent: "#f4a240",
    navMobileLabel: "#ee9b00",
    inputBg: "#f5e6c6",
    inputText: "#000000",
    inputBorder: "rgba(0, 0, 0, 0.55)",
    inputPlaceholder: "rgba(255, 255, 250, 0.5)",
    toggleMuted: "#9e9e9e",
    toggleLight: "#d8dbe0", 
    toggleDark: "#28292c",
    toggleLink: "rgb(27, 129, 112)",
    toggleLinkHover: "rgb(24, 94, 82)",
    borderTableLight: "#ced3d8",
    borderTableDark: "#ced3d8",
    bgSoftBlue: "rgba(239, 246, 255, 0.3)",
  },
};
