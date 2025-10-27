import type { ThemeDefinition } from "./themes";

export const THEME_PRESETS: ThemeDefinition[] = [
  {
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
          background: "#E0F8A3",
          foreground: "#000000",
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
  },
  {
    id: "sunrise-burst",
    name: "Sunrise Burst",
    description: "Gradientes quentes e vibrantes",
    colors: {
      page: {
        background: "#FFF5EB",
        foreground: "#2B0600",
      },
      container: {
        background: "#FFFFFF",
        foreground: "#2B0600",
      },
      header: {
        background: "#FFC48C",
        foreground: "#301312",
      },
      sidebar: {
        background: "#FF9F68",
        foreground: "#301312",
      },
      footer: {
        background: "#FF9F68",
        foreground: "#301312",
      },
      action: {
        primary: {
          background: "#FF6F61",
          foreground: "#2B0600",
        },
      },
      accent: "#FF6F61",
      border: "#FFB79E",
      muted: "#924C3B",
    },
    logo: {
      label: "Sunrise",
      background: "#FF6F61",
      color: "#FFE7DC",
    },
  },
  {
    id: "midnight-wave",
    name: "Midnight Wave",
    description: "Azuis profundos com destaques neon",
    colors: {
      page: {
        background: "#0B1120",
        foreground: "#E2E8F0",
      },
      container: {
        background: "#111827",
        foreground: "#F8FAFC",
      },
      header: {
        background: "#1E293B",
        foreground: "#E2E8F0",
      },
      sidebar: {
        background: "#1E293B",
        foreground: "#E2E8F0",
      },
      footer: {
        background: "#111827",
        foreground: "#E2E8F0",
      },
      action: {
        primary: {
          background: "#3B82F6",
          foreground: "#0B1120",
        },
      },
      accent: "#38BDF8",
      border: "#334155",
      muted: "#94A3B8",
    },
    logo: {
      label: "Midnight",
      background: "#3B82F6",
      color: "#0B1120",
    },
  },
  {
    id: "forest-edge",
    name: "Forest Edge",
    description: "Verdes naturais com contrastes escuros",
    colors: {
      page: {
        background: "#F0F8F4",
        foreground: "#1A2E22",
      },
      container: {
        background: "#FFFFFF",
        foreground: "#1A2E22",
      },
      header: {
        background: "#B4E0C3",
        foreground: "#0E1C14",
      },
      sidebar: {
        background: "#89C59C",
        foreground: "#0E1C14",
      },
      footer: {
        background: "#89C59C",
        foreground: "#0E1C14",
      },
      action: {
        primary: {
          background: "#2F855A",
          foreground: "#F0F8F4",
        },
      },
      accent: "#2F855A",
      border: "#9FD7B3",
      muted: "#4A6B55",
    },
    logo: {
      label: "Forest",
      background: "#2F855A",
      color: "#E4FFE7",
    },
  },
  {
    id: "graphite-lime",
    name: "Graphite Lime",
    description: "Minimalista com acentos neon",
    colors: {
      page: {
        background: "#111111",
        foreground: "#F3F4F6",
      },
      container: {
        background: "#1F1F1F",
        foreground: "#F9FAFB",
      },
      header: {
        background: "#1B1B1B",
        foreground: "#F3F4F6",
      },
      sidebar: {
        background: "#1B1B1B",
        foreground: "#F3F4F6",
      },
      footer: {
        background: "#1B1B1B",
        foreground: "#F3F4F6",
      },
      action: {
        primary: {
          background: "#A3E635",
          foreground: "#1A1A1A",
        },
      },
      accent: "#84CC16",
      border: "#3F3F46",
      muted: "#9CA3AF",
    },
    logo: {
      label: "Graphite",
      background: "#A3E635",
      color: "#111111",
    },
  },
];

export const DEFAULT_THEME_ID = "players-to-pro";
