import { PropsWithChildren, useEffect } from "react";

import { useThemeStore } from "./useThemeStore";
import type { ThemeColors } from "./themes";

const cssVariablesMap: Array<[keyof ThemeColors, string]> = [
  ["primary", "--color-primary"],
  ["accent", "--color-accent"],
  ["background", "--color-background"],
  ["surface", "--color-surface"],
  ["muted", "--color-muted"],
  ["onPrimary", "--color-on-primary"],
  ["onSurface", "--color-on-surface"],
];

const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    cssVariablesMap.forEach(([key, variable]) => {
      root.style.setProperty(variable, theme.colors[key]);
    });

    document.body.style.backgroundColor = `rgb(${theme.colors.background})`;
    document.body.style.color = `rgb(${theme.colors.onSurface})`;
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
