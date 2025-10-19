import { PropsWithChildren, useEffect } from "react";

import { useThemeStore } from "./useThemeStore";
import { mapThemeToCssVariables } from "./colorUtils";

const ThemeProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
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
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
