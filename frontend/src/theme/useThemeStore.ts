import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fallbackTheme } from "./themes";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "./presets";
import type { ThemeDefinition } from "./themes";
import type { Client } from "../types/client";

export type ThemeState = {
  themes: ThemeDefinition[];
  theme: ThemeDefinition;
  selectedThemeId: string;
  setTheme: (id: string) => void;
  setThemesFromClients: (clients: Client[]) => void;
};

const defaultPreset =
  THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_ID) ?? THEME_PRESETS[0] ?? fallbackTheme;

const fallbackState: ThemeState = {
  themes: THEME_PRESETS,
  theme: fallbackTheme,
  selectedThemeId: defaultPreset.id,
  setTheme: () => undefined,
  setThemesFromClients: () => undefined,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...fallbackState,
      setTheme: (id: string) => {
        const theme = get().themes.find((item) => item.id === id);
        if (!theme) {
          return;
        }
        set({ theme, selectedThemeId: theme.id });
      },
      setThemesFromClients: (clients: Client[]) => {
        if (!clients.length) {
          set({ themes: THEME_PRESETS, theme: fallbackTheme, selectedThemeId: fallbackTheme.id });
          return;
        }

        // Temporariamente ignoramos as cores vindas do backend para facilitar o ajuste do preset.
        set({ themes: THEME_PRESETS, theme: fallbackTheme, selectedThemeId: fallbackTheme.id });
      },
    }),
    {
      name: "combine-theme",
      partialize: (state) => ({ selectedThemeId: state.selectedThemeId }),
    }
  )
);

export const selectCurrentTheme = () => useThemeStore.getState().theme;
