import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { usePermissions } from "../hooks/usePermissions";
import { usePendingAthletesCount } from "../hooks/usePendingAthletesCount";
import NotificationBadge from "./NotificationBadge";
import { NAV_ITEMS } from "./navigationItems";

const LOGOUT_ICON = faRightFromBracket;

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `interactive-hover block w-full px-3 py-2 text-left text-sm font-medium shadow-lg transition-colors duration-100 ease-in-out ${
    isActive ? "" : "hover:bg-action-primary/85"
  }`;

const SideNav = () => {
  const t = useTranslation();
  const clearAuth = useAuthStore((state) => state.clear);
  const permissions = usePermissions();
  const { data: pendingCount } = usePendingAthletesCount();

  // Filter navigation items based on user permissions
  const allowedNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => permissions[item.requiredPermission]);
  }, [permissions]);

  return (
    <>
      {/* Mobile Navigation - Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t-2 border-yellow-600/50 shadow-2xl">
        <nav className="flex items-stretch justify-around h-20">
          {allowedNavItems.slice(0, 3).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1.5 relative transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-t from-action-primary/10 to-transparent" 
                    : "hover:bg-action-primary/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative ${
                    isActive 
                      ? "transform -translate-y-0.5" 
                      : "transform translate-y-0"
                  } transition-transform duration-200`}>
                    <div className={`
                      w-12 h-12 flex items-center justify-center rounded-xl
                      ${isActive 
                        ? "bg-gradient-to-br from-action-primary/30 via-action-primary/20 to-action-primary/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.25)] border border-white/10" 
                        : "bg-gradient-to-br from-sidebar-accent/20 via-sidebar-accent/10 to-transparent shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.15)] border border-white/5"
                      }
                      transition-all duration-200 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1),0_6px_16px_rgba(0,0,0,0.2)]
                    `}>
                      <FontAwesomeIcon 
                        icon={item.icon} 
                        className={`${isActive ? "text-2xl" : "text-xl"} text-sidebar-foreground transition-all duration-200 drop-shadow-sm`}
                      />
                    </div>
                    {item.to === "/athletes" && pendingCount && pendingCount.count > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <NotificationBadge count={pendingCount.count} />
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                    isActive 
                      ? "text-sidebar-foreground" 
                      : "text-sidebar-foreground/70"
                  }`}>
                    {item.label(t)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          
          {/* Logout Button */}
          <button
            type="button"
            onClick={() => clearAuth()}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 relative transition-all duration-200 hover:bg-action-primary/5"
          >
            <div className="relative transform translate-y-0 transition-transform duration-200">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-accent/20 via-sidebar-accent/10 to-transparent shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.15)] border border-white/5 transition-all duration-200 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.1),0_6px_16px_rgba(0,0,0,0.2)]">
                <FontAwesomeIcon 
                  icon={LOGOUT_ICON} 
                  className="text-xl text-sidebar-foreground transition-all duration-200 drop-shadow-sm"
                />
              </div>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wider transition-all duration-200 text-sidebar-foreground/70">
              {t.common.logout}
            </span>
          </button>
        </nav>
      </div>

      {/* Desktop Navigation - Side Bar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-72 text-sidebar-foreground">
        <div className="flex-1 flex flex-col min-h-0 bg-sidebar">
          <div className="flex-1 flex flex-col pt-28 pb-4 overflow-y-auto">
            <nav className="mt-8 flex-1 space-y-0.5 px-0">
              {allowedNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={(props) =>
                    `${linkClasses(props)} ${item.isUppercase ? "uppercase" : ""}`
                  }
                >
                  <span
                    className={`flex items-center justify-between gap-3 ${
                      item.isUppercase ? "tracking-wider" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <FontAwesomeIcon icon={item.icon} className="text-base leading-none" />
                      {item.label(t)}
                    </span>
                    {item.to === "/athletes" && pendingCount && pendingCount.count > 0 && (
                      <NotificationBadge count={pendingCount.count} />
                    )}
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
    </>
  );
};

export default SideNav;
