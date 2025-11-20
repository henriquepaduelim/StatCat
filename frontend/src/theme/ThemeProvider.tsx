import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_THEME_ID, getThemeDefinition, type ThemeId } from "./themes";
import { mapThemeToCssVariables } from "./colorUtils";

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "players-to-pro-theme";

const applyTheme = (themeId: ThemeId) => {
  const theme = getThemeDefinition(themeId);
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(`theme-${themeId}`);
  const variables = mapThemeToCssVariables(theme);

  Object.entries(variables).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });

  const pageBackground = variables["--color-page-background"];
  const pageForeground = variables["--color-page-foreground"];

  if (pageBackground) {
    document.body.style.backgroundColor = `rgb(${pageBackground})`;
  }

  if (pageForeground) {
    document.body.style.color = `rgb(${pageForeground})`;
  }
};

const getInitialTheme = (): ThemeId => {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_ID;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : DEFAULT_THEME_ID;
};

const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [themeId, setThemeId] = useState<ThemeId>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(themeId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, themeId);
    }
  }, [themeId]);

  const toggleTheme = useCallback(() => {
    setThemeId((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      setThemeId,
      toggleTheme,
    }),
    [themeId, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
