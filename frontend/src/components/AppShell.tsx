import { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";

import SideNav from "./SideNav";

const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const isAthletesListPage =
    location.pathname === "/athletes" || location.pathname === "/athletes/";
  const baseMainClasses =
    "flex flex-1 min-h-0 w-full flex-col px-6 pb-24 md:pb-10 pt-4 md:pt-6 md:[&>*:nth-child(n+3)]:mt-16";
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
        <header className="print-hidden md:hidden flex items-center justify-center px-6 pt-6 pb-4">
          <img src="/media/logo.png" alt="Logo" className="h-16 w-auto" />
        </header>
        <main className={mainClassName}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
