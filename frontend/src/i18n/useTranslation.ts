import { useMemo } from "react";

import { translations, type Locale, type TranslationDictionary } from "./translations";
import { useLocaleStore } from "../stores/useLocaleStore";

export const useLocale = (): [Locale, (locale: Locale) => void] => {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  return [locale, setLocale];
};

export const useTranslation = (): TranslationDictionary => {
  const locale = useLocaleStore((state) => state.locale);
  return useMemo(() => translations[locale], [locale]);
};
