import { PropsWithChildren, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { useClients } from "../hooks/useClients";
import { useThemeStore } from "../theme/useThemeStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import SideNav from "./SideNav";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-colors bg-action-primary text-action-primary-foreground shadow-sm ${
    isActive ? "" : "hover:bg-action-primary/80"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (clients) {
      setThemesFromClients(clients);
    }
  }, [clients, setThemesFromClients]);

  return (
    <div className="min-h-screen bg-page text-page-foreground">
      <SideNav />
      <div className="md:pl-64 flex flex-col flex-1">
        <header className="print-hidden sticky top-0 z-10 border-b border-black/5 bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/80 h-20 md:h-28 flex items-center relative text-header-foreground">
          <div className="hidden md:flex absolute inset-y-0 left-[-16rem] w-64 items-center justify-center">
            <img src="/media/logo.png" alt="Logo" className="h-16 w-auto" />
          </div>
          <div className="mx-auto flex max-w-6xl w-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="-ml-2 flex items-center md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-controls="mobile-menu"
                  aria-expanded="false"
                >
                  <span className="sr-only">Open main menu</span>
                  {/* Icon when menu is closed. */}
                  {/* Menu open: "hidden", Menu closed: "block" */}
                  <svg
                    className={`${mobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  {/* Icon when menu is open. */}
                  {/* Menu open: "block", Menu closed: "hidden" */}
                  <svg
                    className={`${mobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              {userRole === "staff" && themes.length > 1 ? (
                <label className="flex items-center gap-2 text-xs font-medium text-muted">
                  {t.common.theme}
                  <select
                    value={theme.id}
                    onChange={(event) => setTheme(event.target.value)}
                    className="rounded-md border border-black/10 bg-container px-3 py-2 text-sm font-medium text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    {themes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

            </div>
          </div>
        </header>
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-6 pt-4">
              <img src="/media/logo.png" alt="Logo" className="h-16 w-auto" />
            </div>
            <nav className="px-6 pt-4 pb-3 space-y-1">
              <NavLink to="/dashboard" className={linkClasses}>
                {t.common.dashboard}
              </NavLink>
              <NavLink to="/athletes" className={linkClasses}>
                {t.common.athletes}
              </NavLink>
              <NavLink to="/reports" className={linkClasses}>
                {t.common.reports}
              </NavLink>
              <NavLink to="/scheduling" className={(props) => `${linkClasses(props)} uppercase`}>
                Scheduling
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  setThemesFromClients([]);
                }}
                className="w-full mt-4 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-action-primary text-action-primary-foreground shadow-sm hover:bg-action-primary/80"
              >
                {t.common.logout}
              </button>
            </nav>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
