import { PropsWithChildren, useMemo } from "react";
import { useLocation } from "react-router-dom";

import SideNav from "./SideNav";
import { useAuthStore } from "../stores/useAuthStore";

const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const greeting = useMemo(() => {
    if (!user || !user.full_name) return "";
    return `Hello, ${user.full_name}`;
  }, [user]);

  const isAthletesListPage =
    location.pathname === "/athletes" || location.pathname === "/athletes/";
  const isPlayerProfilePage = location.pathname === "/player-profile";
  const baseMainClasses =
    "flex flex-1 min-h-0 w-full flex-col px-6 pb-24 md:pb-10 pt-4 md:pt-6 md:[&>*:nth-child(n+3)]:mt-16";
  const mainClassName = `${baseMainClasses} ${
    isAthletesListPage || isPlayerProfilePage ? "max-w-none" : "mx-auto max-w-6xl"
  }`;

  return (
    <div className="relative min-h-screen bg-page text-page-foreground">
      <div className="hidden md:flex fixed left-0 top-0 z-20 w-72 flex-col items-center pt-8 pointer-events-none">
        <a
          href="/dashboard"
          className="pointer-events-auto inline-flex items-center justify-center"
          aria-label="Go to Home"
        >
          <img src="/media/logo.png" alt="Logo" className="h-20 w-auto" />
        </a>
      </div>
      <SideNav />
      <div className="md:pl-72 flex flex-col flex-1">
        <header className="print-hidden md:hidden flex items-center justify-between px-2 pt-6 pb-4">
          <img src="/media/logo.png" alt="Logo" className="h-16 w-auto" />
          <span className="text-sm font-medium text-muted">{greeting}</span>
        </header>
        <header className="print-hidden hidden md:flex items-center justify-start px-6 py-4">
          <span className="text-sm font-medium text-muted">{greeting}</span>
        </header>
        <main className={mainClassName}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;