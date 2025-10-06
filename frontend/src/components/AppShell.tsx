import { PropsWithChildren, useEffect } from "react";
import { NavLink } from "react-router-dom";

import { useClients } from "../hooks/useClients";
import { useThemeStore } from "../theme/useThemeStore";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-on-primary shadow-sm"
      : "text-muted hover:bg-primary/10 hover:text-primary"
  }`;

const AppShell = ({ children }: PropsWithChildren) => {
  const { data: clients } = useClients();
  const { theme, setTheme, themes, setThemesFromClients } = useThemeStore(
    (state) => ({
      theme: state.theme,
      themes: state.themes,
      setTheme: state.setTheme,
      setThemesFromClients: state.setThemesFromClients,
    })
  );

  useEffect(() => {
    if (clients) {
      setThemesFromClients(clients);
    }
  }, [clients, setThemesFromClients]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="border-b border-black/5 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-tight shadow-sm"
              style={{
                backgroundColor: `rgb(${theme.logo.background})`,
                color: `rgb(${theme.logo.color})`,
              }}
            >
              {theme.logo.label.slice(0, 2)}
            </div>
            <div className="space-y-1">
              <span className="block text-lg font-semibold text-primary">
                {theme.logo.label}
              </span>
              <p className="text-xs text-muted">{theme.description}</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:gap-6">
            <nav className="flex gap-2">
              <NavLink to="/dashboard" className={linkClasses}>
                Dashboard
              </NavLink>
              <NavLink to="/athletes" className={linkClasses}>
                Atletas
              </NavLink>
              <NavLink to="/sessions" className={linkClasses}>
                Sessões
              </NavLink>
              <NavLink to="/reports" className={linkClasses}>
                Relatórios
              </NavLink>
            </nav>
            <label className="flex items-center gap-2 text-xs font-medium text-muted">
              Tema
              <select
                value={theme.id}
                onChange={(event) => setTheme(event.target.value)}
                className="rounded-md border border-black/10 bg-background px-3 py-2 text-sm font-medium text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {themes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
};

export default AppShell;
