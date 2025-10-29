import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { NAV_ITEMS } from "./navigationItems";

const LOGOUT_ICON = faRightFromBracket;

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `interactive-hover block w-full px-3 py-2 text-left text-sm font-medium shadow-lg transition-colors duration-100 ease-in-out ${
    isActive ? "" : "hover:bg-action-primary/85"
  }`;

const SideNav = () => {
  const t = useTranslation();
  const clearAuth = useAuthStore((state) => state.clear);

  return (
    <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-72 text-sidebar-foreground">
      <div className="flex-1 flex flex-col min-h-0 bg-sidebar">
        <div className="flex-1 flex flex-col pt-28 pb-4 overflow-y-auto">
          <nav className="mt-8 flex-1 space-y-0.5 px-0">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={(props) =>
                  `${linkClasses(props)} ${item.isUppercase ? "uppercase" : ""}`
                }
              >
                <span
                  className={`flex items-center gap-3 ${
                    item.isUppercase ? "tracking-wider" : ""
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} className="text-base leading-none" />
                  {item.label(t)}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-yellow-600 px-2 py-4">
          <button
            type="button"
            onClick={() => {
              clearAuth();
            }}
            className="group relative inline-flex h-10 w-10 items-center justify-center overflow- rounded-full bg-action-primary text-action-primary-foreground shadow-sm transition-all duration-100 ease-in-out hover:w-full"
          >
            <span className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-base">
              <FontAwesomeIcon icon={LOGOUT_ICON} className="leading-none" />
            </span>
            <span className="pl-12 pr-6 text-left text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {t.common.logout}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SideNav;
