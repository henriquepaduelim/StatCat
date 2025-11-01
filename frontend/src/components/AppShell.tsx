import { PropsWithChildren, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import SideNav from "./SideNav";
import { NAV_ITEMS } from "./navigationItems";

const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const clearAuth = useAuthStore((state) => state.clear);
  const t = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavItems = useMemo(
    () => NAV_ITEMS.map((item) => ({ ...item, label: item.label(t) })),
    [t]
  );
  const isAthletesListPage =
    location.pathname === "/athletes" || location.pathname === "/athletes/";
  const baseMainClasses =
    "flex flex-1 min-h-0 w-full flex-col px-6 pb-10 pt-4 md:pt-6 md:[&>*:nth-child(n+3)]:mt-16";
  const mainClassName = `${baseMainClasses} ${
    isAthletesListPage ? "max-w-none" : "mx-auto max-w-6xl"
  }`;

  return (
    <div className="relative min-h-screen bg-page text-page-foreground">
      <div className="hidden md:flex fixed left-0 top-0 z-20 w-72 flex-col items-center pt-8 pointer-events-none">
        <a
          href="/dashboard"
          className="pointer-events-auto inline-flex items-center justify-center"
          aria-label="Go to dashboard"
        >
          <img src="/media/logo.png" alt="Logo" className="h-20 w-auto" />
        </a>
      </div>
      <SideNav />
      <div className="md:pl-72 flex flex-col flex-1">
        <header className="print-hidden md:hidden flex items-center justify-between px-6 pt-6 pb-4 text-sidebar-foreground">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-800 hover:bg-sidebar/30 focus:outline-none focus:ring-2 focus:ring-sidebar-foreground/40"
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            <svg
              className={`${mobileMenuOpen ? "hidden" : "block"} h-6 w-6`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg
              className={`${mobileMenuOpen ? "block" : "hidden"} h-6 w-6`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        {mobileMenuOpen && (
          <div className="md:hidden bg-sidebar">
            <div className="px-6 pt-4 flex justify-center">
              <img src="/media/logo.png" alt="Logo" className="h-16 w-auto" />
            </div>
            <nav className="px-6 pt-4 pb-6">
              <ul className="flex flex-wrap gap-3 justify-center">
                {mobileNavItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label={item.label}
                      title={item.label}
                      className={({ isActive }) =>
                        `flex h-12 w-12 items-center justify-center rounded-lg border border-sidebar-foreground/20 text-base transition-colors duration-150 ${
                          isActive
                            ? "bg-action-primary text-action-primary-foreground shadow-sm"
                            : "bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20"
                        }`
                      }
                    >
                      <FontAwesomeIcon icon={item.icon} className="text-lg leading-none" />
                    </NavLink>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      clearAuth();
                      setMobileMenuOpen(false);
                    }}
                    aria-label={t.common.logout}
                    title={t.common.logout}
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-sidebar-foreground/20 bg-action-primary text-action-primary-foreground transition-colors duration-150 hover:bg-action-primary/90"
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} className="text-lg leading-none" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
        <main className={mainClassName}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
