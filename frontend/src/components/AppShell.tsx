import { PropsWithChildren, useEffect } from "react";
import { NavLink } from "react-router-dom";

import { useClients } from "../hooks/useClients";
import { useThemeStore } from "../theme/useThemeStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-on-primary shadow-sm"
      : "text-muted hover:bg-primary/10 hover:text-primary"
  }`;

const AppShell = ({ children }: PropsWithChildren) => {
  const { data: clients } = useClients();
  const userRole = useAuthStore((state) => state.user?.role ?? "staff");
  const clearAuth = useAuthStore((state) => state.clear);
  const { theme, setTheme, themes, setThemesFromClients } = useThemeStore(
    (state) => ({
      theme: state.theme,
      themes: state.themes,
      setTheme: state.setTheme,
      setThemesFromClients: state.setThemesFromClients,
    })
  );
  const t = useTranslation();

  useEffect(() => {
    if (clients) {
      setThemesFromClients(clients);
    }
  }, [clients, setThemesFromClients]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="print-hidden border-b border-black/5 bg-primary backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/media/logo.png" alt="Logo" className="h-12 w-auto" />
          </div>
          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:gap-6">
            <nav className="flex gap-2">
              <NavLink to="/dashboard" className={linkClasses}>
                {t.common.dashboard}
              </NavLink>
              <NavLink to="/athletes" className={linkClasses}>
                {t.common.athletes}
              </NavLink>
              <NavLink to="/reports" className={linkClasses}>
                {t.common.reports}
              </NavLink>
            </nav>
            {userRole === "staff" && themes.length > 1 ? (
              <label className="flex items-center gap-2 text-xs font-medium text-muted">
                {t.common.theme}
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
            ) : null}
            <button
              type="button"
              onClick={() => {
                clearAuth();
                setThemesFromClients([]);
              }}
              className="rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary shadow-sm"
            >
              {t.common.logout}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
};

export default AppShell;
