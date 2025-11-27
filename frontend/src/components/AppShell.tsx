import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faGear } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from "react-router-dom";

import SideNav from "./SideNav";
import { useAuthStore } from "../stores/useAuthStore";
import branding from "../theme/branding.generated";

import BackToTopButton from "./BackToTopButton";

const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [hasModalTarget, setHasModalTarget] = useState(false);

  useEffect(() => {
    const selector = ".modal-overlay .modal-surface";
    const checkModalVisible = () => {
      if (typeof document === "undefined") return;
      const el = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
        (node) => node.offsetParent !== null
      );
      setHasModalTarget(Boolean(el));
    };

    checkModalVisible();
    const observer = new MutationObserver(checkModalVisible);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", checkModalVisible);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkModalVisible);
    };
  }, []);

  const greeting = useMemo(() => {
    if (!user || !user.full_name) return "";
    return `Hello, ${user.full_name}`;
  }, [user]);

  const isAthletesListPage =
    location.pathname === "/athletes" || location.pathname === "/athletes/";
  const isPlayerProfilePage = location.pathname.startsWith("/player-profile");
  const baseMainClasses =
    "flex flex-1 min-h-0 w-full flex-col px-3 sm:px-6 pb-20 md:pb-8 pt-1 md:pt-3 md:[&>*:nth-child(n+3)]:mt-12";
  const mainClassName = `${baseMainClasses} ${
    isAthletesListPage || isPlayerProfilePage ? "max-w-none" : "mx-auto w-full md:max-w-6xl"
  }`;

  return (
    <div className="relative min-h-screen bg-page text-page-foreground">
      {greeting}
      <div className="hidden md:flex fixed left-0 top-0 z-20 w-72 flex-col items-center pt-0 pointer-events-none">
        <a
          href="/dashboard"
          className="pointer-events-auto inline-flex items-center justify-center"
          aria-label="Go to dashboard"
        >
          <img src={branding.assets.logo} alt={`${branding.name} logo`} className="h-48 w-auto" />
        </a>
      </div>
      <SideNav />
      <div className="md:pl-72 flex flex-col flex-1">
        <header className="print-hidden md:hidden flex items-center justify-between px-2 pt-6 pb-4">
          <img src={branding.assets.logo} alt={`${branding.name} logo`} className="h-16 w-auto" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="rounded-full bg-action-primary p-2 text-action-primary-foreground shadow-lg"
              aria-label="Open settings"
            >
              <FontAwesomeIcon icon={faGear} className="text-base" />
            </button>
            <button
              type="button"
              onClick={() => useAuthStore.getState().clear()}
              className="rounded-full bg-action-primary p-2 text-action-primary-foreground shadow-lg"
              aria-label="Log out"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="text-base" />
            </button>
          </div>
        </header>
        <header className="print-hidden hidden md:flex items-center justify-start px-6 py-4" />
        <main className={mainClassName}>
          {children}
        </main>
      </div>
      {!hasModalTarget && <BackToTopButton className="bottom-16 md:bottom-6" />}
      {hasModalTarget && (
        <BackToTopButton
          targetSelector=".modal-overlay .modal-surface"
          fallbackToWindow={false}
          mobileOnly
          className="bottom-16 md:bottom-6"
        />
      )}
    </div>
  );
};

export default AppShell;
