import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_THEME_ID, getThemeDefinition, type ThemeId } from "./themes";
import { globalStyleTokens, supportColors } from "./tokens";
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

  // Global tokens (typography, radii, shadows) exposed as CSS vars for easier future edits.
  const { typography, radii, shadows } = globalStyleTokens;
  root.style.setProperty("--font-family-base", typography.fontFamily);
  root.style.setProperty("--font-weight-regular", typography.fontWeight.regular.toString());
  root.style.setProperty("--font-weight-medium", typography.fontWeight.medium.toString());
  root.style.setProperty("--font-weight-semibold", typography.fontWeight.semibold.toString());
  root.style.setProperty("--font-weight-bold", typography.fontWeight.bold.toString());
  Object.entries(typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });
  Object.entries(typography.lineHeight).forEach(([key, value]) => {
    root.style.setProperty(`--line-height-${key}`, value);
  });
  Object.entries(radii).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });
  Object.entries(shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Theme-specific support colors (inputs, mobile nav, toggle, auxiliary borders).
  const support = supportColors[themeId] ?? supportColors.light;
  root.style.setProperty("--nav-mobile-bg", support.navMobileBg);
  root.style.setProperty("--nav-mobile-border", support.navMobileBorder);
  root.style.setProperty("--nav-mobile-accent", support.navMobileAccent);
  root.style.setProperty("--nav-mobile-label", support.navMobileLabel);
  root.style.setProperty("--input-bg", support.inputBg);
  root.style.setProperty("--input-text", support.inputText);
  root.style.setProperty("--input-border", support.inputBorder);
  root.style.setProperty("--input-placeholder", support.inputPlaceholder);
  root.style.setProperty("--toggle-muted", support.toggleMuted);
  root.style.setProperty("--toggle-light", support.toggleLight);
  root.style.setProperty("--toggle-dark", support.toggleDark);
  root.style.setProperty("--toggle-link", support.toggleLink);
  root.style.setProperty("--toggle-link-hover", support.toggleLinkHover);
  root.style.setProperty("--border-table-light", support.borderTableLight);
  root.style.setProperty("--border-table-dark", support.borderTableDark);
  root.style.setProperty("--bg-soft-blue", support.bgSoftBlue);
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
