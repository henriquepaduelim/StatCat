import { create } from "zustand";

import { fallbackTheme } from "./themes";
import type { ThemeDefinition } from "./themes";

export type ThemeState = {
  theme: ThemeDefinition;
};

export const useThemeStore = create<ThemeState>(() => ({
  theme: fallbackTheme,
}));

export const selectCurrentTheme = () => useThemeStore.getState().theme;
