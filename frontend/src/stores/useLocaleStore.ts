import { create } from "zustand";
import type { Locale } from "../i18n/translations";

export type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>(() => ({
  locale: "en",
  setLocale: () => undefined,
}));
