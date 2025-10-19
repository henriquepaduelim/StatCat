import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faRankingStar,
  faFileCode,
  faCalendarCheck,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";

const byPrefixAndName = {
  fas: {
    house: faHouse,
    "ranking-star": faRankingStar,
    "file-code": faFileCode,
    "calendar-check": faCalendarCheck,
    "right-from-bracket": faRightFromBracket,
  },
};

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `interactive-hover block w-full rounded-sm px-6 py-2 text-left text-sm font-medium shadow-sm transition-colors duration-150 ease-in-out ${
    isActive ? "" : "hover:bg-action-primary/85"
  }`;

const SideNav = () => {
  const t = useTranslation();
  const clearAuth = useAuthStore((state) => state.clear);
  const setThemesFromClients = useThemeStore((state) => state.setThemesFromClients);

  return (
    <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 text-sidebar-foreground">
      <div className="flex-1 flex flex-col min-h-0 bg-sidebar">
        <div className="flex-1 flex flex-col pt-28 pb-4 overflow-y-auto">
          <nav className="mt-8 flex-1 space-y-2 px-0">
            <NavLink to="/dashboard" className={linkClasses}>
              <span className="flex items-center gap-3">
                <FontAwesomeIcon icon={byPrefixAndName.fas["house"]} className="text-base" />
                {t.common.dashboard}
              </span>
            </NavLink>
            <NavLink to="/athletes" className={linkClasses}>
              <span className="flex items-center gap-3">
                <FontAwesomeIcon icon={byPrefixAndName.fas["ranking-star"]} className="text-base" />
                {t.common.athletes}
              </span>
            </NavLink>
            <NavLink to="/reports" className={linkClasses}>
              <span className="flex items-center gap-3">
                <FontAwesomeIcon icon={byPrefixAndName.fas["file-code"]} className="text-base" />
                {t.common.reports}
              </span>
            </NavLink>
            <NavLink to="/scheduling" className={(props) => `${linkClasses(props)} uppercase`}>
              <span className="flex items-center gap-3">
                <FontAwesomeIcon icon={byPrefixAndName.fas["calendar-check"]} className="text-base" />
                Scheduling
              </span>
            </NavLink>
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-700 px-0 py-4">
          <button
            type="button"
            onClick={() => {
              clearAuth();
              setThemesFromClients([]);
            }}
            className="interactive-hover w-full rounded-sm px-6 py-2 text-left text-sm font-medium shadow-sm transition-colors duration-150 ease-in-out hover:bg-action-primary/85"
          >
            <span className="flex items-center gap-3">
              <FontAwesomeIcon icon={byPrefixAndName.fas["right-from-bracket"]} className="text-base" />
              {t.common.logout}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideNav;
