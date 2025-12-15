import type { ThemeDefinition } from "./themes";

const parseComponent = (value: string) => {
  const parsed = Number.parseInt(value, 16);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const hexToRgb = (hex: string): string => {
  const trimmed = hex.trim();
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  let normalized = raw;

  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (normalized.length !== 6) {
    return "0 0 0";
  }

  const r = parseComponent(normalized.slice(0, 2));
  const g = parseComponent(normalized.slice(2, 4));
  const b = parseComponent(normalized.slice(4, 6));

  return `${r} ${g} ${b}`;
};

export const mapThemeToCssVariables = (theme: ThemeDefinition): Record<string, string> => ({
  "--color-page-background": hexToRgb(theme.colors.page.background),
  "--color-page-foreground": hexToRgb(theme.colors.page.foreground),
  "--color-container-background": hexToRgb(theme.colors.container.background),
  "--color-container-foreground": hexToRgb(theme.colors.container.foreground),
  "--color-surface-primary": hexToRgb(theme.colors.page.background),
  "--color-surface-secondary": hexToRgb(theme.colors.container.background),
  "--color-header-background": hexToRgb(theme.colors.header.background),
  "--color-header-foreground": hexToRgb(theme.colors.header.foreground),
  "--color-sidebar-background": hexToRgb(theme.colors.sidebar.background),
  "--color-sidebar-foreground": hexToRgb(theme.colors.sidebar.foreground),
  "--color-sidebar-button-background": hexToRgb(theme.colors.sidebar.button),
  "--color-sidebar-button-hover-background": hexToRgb(theme.colors.sidebar.buttonHover),
  "--color-footer-background": hexToRgb(theme.colors.footer.background),
  "--color-footer-foreground": hexToRgb(theme.colors.footer.foreground),
  "--color-action-primary-background": hexToRgb(theme.colors.action.primary.background),
  "--color-action-primary-foreground": hexToRgb(theme.colors.action.primary.foreground),
  "--color-accent": hexToRgb(theme.colors.accent),
  "--color-border": hexToRgb(theme.colors.border),
  "--color-border-muted": hexToRgb(theme.colors.border),
  "--color-muted": hexToRgb(theme.colors.muted),
  "--color-logo-background": hexToRgb(theme.logo.background),
  "--color-logo-foreground": hexToRgb(theme.logo.color),
});
