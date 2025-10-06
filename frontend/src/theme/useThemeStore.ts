import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fallbackTheme, themeFromClient } from "./themes";
import type { ThemeDefinition } from "./themes";
import type { Client } from "../types/client";

export type ThemeState = {
  themes: ThemeDefinition[];
  theme: ThemeDefinition;
  selectedThemeId: string;
  setTheme: (id: string) => void;
  setThemesFromClients: (clients: Client[]) => void;
};

const fallbackState: ThemeState = {
  themes: [fallbackTheme],
  theme: fallbackTheme,
  selectedThemeId: fallbackTheme.id,
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
          set({ themes: [fallbackTheme], theme: fallbackTheme, selectedThemeId: fallbackTheme.id });
          return;
        }

        const themes = clients.map(themeFromClient);
        const storedId = get().selectedThemeId;
        const defaultTheme =
          themes.find((item) => item.id === storedId) ?? themes[0] ?? fallbackTheme;

        set({ themes, theme: defaultTheme, selectedThemeId: defaultTheme.id });
      },
    }),
    {
      name: "combine-theme",
      partialize: (state) => ({ selectedThemeId: state.selectedThemeId }),
    }
  )
);

export const selectCurrentTheme = () => useThemeStore.getState().theme;
