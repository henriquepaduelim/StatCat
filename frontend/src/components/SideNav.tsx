import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faAngleUp, faGear, faUserAstronaut } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
          
import { useAuthStore } from "../stores/useAuthStore";
import { useTranslation } from "../i18n/useTranslation";
import { useIsRole, usePermissions } from "../hooks/usePermissions";
import { usePendingAthletesCount } from "../hooks/usePendingAthletesCount";
import NotificationBadge from "./NotificationBadge";
import { NAV_ITEMS, type NavItem, type NavChild } from "./navigationItems";

const LOGOUT_ICON = faRightFromBracket;
const SETTINGS_ICON = faGear;

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `interactive-hover block w-full px-3 py-2 text-left text-sm font-medium shadow-lg transition-colors duration-100 ease-in-out ${
    isActive ? "" : "hover:bg-action-primary/85"
  }`;

type AllowedNavItem = NavItem & {
  children?: NavChild[];
  isStandaloneChild?: boolean;
  parentTo?: string;
};
type MobileNavEntry = {
  to: string;
  icon: IconDefinition;
  label: NavItem["label"];
};

const SideNav = () => {
  const t = useTranslation();
  const clearAuth = useAuthStore((state) => state.clear);
  const permissions = usePermissions();
  const isAthlete = useIsRole("athlete");
  const location = useLocation();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const navigate = useNavigate();
  const { data: pendingCount } = usePendingAthletesCount();

  // Filter navigation items based on user permissions
  const allowedNavItems = useMemo<AllowedNavItem[]>(() => {
    return NAV_ITEMS.reduce<AllowedNavItem[]>((acc, item) => {
      if (!permissions[item.requiredPermission]) {
        return acc;
      }
      const allowedChildren = item.children?.filter((child) => permissions[child.requiredPermission]);
      acc.push({
        ...item,
        children: allowedChildren && allowedChildren.length ? allowedChildren : undefined,
      });
      return acc;
    }, []);
  }, [permissions]);

  const desktopNavItems = useMemo<AllowedNavItem[]>(() => {
    // Keep the "Player Profile" parent visible for athletes, including its children.
    return allowedNavItems;
  }, [allowedNavItems]);

  const mobileNavItems = useMemo<MobileNavEntry[]>(() => {
    if (isAthlete) {
      // Ordem desejada para atleta: Team Hub, Community, Profile, Combine, Report Cards, Scheduling
      const findItem = (path: string) => allowedNavItems.find((item) => item.to === path);
      const teamHub = findItem("/team-dashboard");
      const community = findItem("/team-feed");
      const playerProfile = findItem("/player-profile");
      const children = playerProfile?.children ?? [];

      const desiredOrder: Array<MobileNavEntry | null> = [
        teamHub
          ? { to: teamHub.to, icon: teamHub.icon, label: teamHub.label }
          : null,
        community
          ? { to: community.to, icon: community.icon, label: community.label }
          : null,
        ...children.map((child) => ({
          to: child.to,
          icon: child.icon ?? playerProfile?.icon ?? faUserAstronaut,
          label: child.label,
        })),
      ];

      return desiredOrder.filter(Boolean) as MobileNavEntry[];
    }

    // Other roles: only parent items on mobile.
    return allowedNavItems.map<MobileNavEntry>((item) => ({
      to: item.to,
      icon: item.icon,
      label: item.label,
    }));
  }, [allowedNavItems, isAthlete]);

  useEffect(() => {
    if (isAthlete) {
      setExpandedItem(null);
    }
  }, [isAthlete]);

  const handleParentClick = (itemTo: string) => {
    setExpandedItem((prev) => (prev === itemTo ? null : itemTo));
  };

  return (
    <>
      {/* Mobile Logout Icon */}
      {/* Mobile Navigation - Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 nav-mobile shadow-2xl">
        <nav className="flex items-stretch justify-around h-20">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1.5 relative transition-all duration-200 ${
                  isActive ? "bg-white/5" : "hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative flex items-center justify-center ${
                      isActive ? "transform -translate-y-0.5" : "transform translate-y-0"
                    } transition-transform duration-200`}
                  >
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`${isActive ? "text-2xl" : "text-xl"} nav-mobile-icon transition-all duration-200 drop-shadow-sm`}
                    />
                    {item.to === "/athletes" && pendingCount && pendingCount.count > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <NotificationBadge count={pendingCount.count} />
                      </div>
                    )}
                  </div>
                  <span className={`text-center text-[9px] font-semibold uppercase tracking-wider transition-all duration-200 nav-mobile-label ${isActive ? "opacity-100" : "opacity-70"}`}>
                    {item.label(t)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Desktop Navigation - Side Bar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-72 text-sidebar-foreground">
        <div className="flex-1 flex flex-col min-h-0 bg-sidebar">
          <div className="flex-1 flex flex-col pt-36 pb-4 overflow-y-auto">
            <nav className="mt-8 flex-1 space-y-0.5 px-0">
              {desktopNavItems.map((item) => {
                const childLinks = item.children ?? [];
                const hasChildren = childLinks.length > 0;
                const hasActiveChild =
                  hasChildren && childLinks.some((child) => location.pathname.startsWith(child.to));
                const shouldExpand = hasChildren && (hasActiveChild || expandedItem === item.to);

                return (
                <div key={item.to} className="space-y-0.5">
                  <NavLink
                    to={item.to}
                    className={(props) =>
                      `${linkClasses(props)} ${item.isUppercase ? "uppercase" : ""}`
                    }
                    onClick={(event) => {
                      if (hasChildren) {
                        event.preventDefault();
                        handleParentClick(item.to);
                      }
                    }}
                  >
                    <span
                      className={`flex items-center justify-between gap-3 ${
                        item.isUppercase ? "tracking-wider" : ""
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <FontAwesomeIcon
                          icon={item.icon}
                          className="text-base leading-none w-4 flex-shrink-0 text-center"
                        />
                        {item.label(t)}
                      </span>
                      <span className="flex items-center gap-2">
                        {item.children && item.children.length > 0 && (
                          <FontAwesomeIcon
                            icon={faAngleUp}
                            className={`text-xs text-current transition-transform ${
                              expandedItem === item.to ? "rotate-0" : "rotate-180"
                            }`}
                          />
                        )}
                        {item.to === "/athletes" && pendingCount && pendingCount.count > 0 && (
                          <NotificationBadge count={pendingCount.count} />
                        )}
                      </span>
                    </span>
                  </NavLink>
                  {hasChildren && (
                    <div
                      className={`space-y-0.5 transition-all duration-200 ${
                        shouldExpand ? "max-h-80 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                      }`}
                    >
                      {childLinks.map((child) => (
                        <NavLink
                          key={`${item.to}-${child.to}`}
                          to={child.to}
                          className={(props) =>
                            `${linkClasses(props)} text-xs uppercase tracking-wider pl-6 border-l border-white/5`
                          }
                        >
                          <span className="flex items-center gap-2">
                            {child.icon && (
                              <FontAwesomeIcon
                                icon={child.icon}
                                className="text-xs leading-none text-current w-4 text-center"
                              />
                            )}
                            {child.label(t)}
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )})}
            </nav>
          </div>
          <div className="flex-shrink-0 flex items-center gap-3 border-t border-yellow-600 px-2 py-4">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-action-primary text-action-primary-foreground shadow-sm transition-all duration-100 ease-in-out hover:w-full"
            >
              <span className="absolute inset-y-0 left-0 flex w-10 items-center justify-center text-base">
                <FontAwesomeIcon icon={SETTINGS_ICON} className="leading-none" />
              </span>
              <span className="pl-12 pr-6 text-left text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                Settings
              </span>
            </button>
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
