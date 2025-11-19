import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  faAddressCard,
  faArrowTrendUp,
  faCalendarDays,
  faHouse,
  faIdBadge,
  faRankingStar,
  faUserAstronaut,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

import type { TranslationDictionary } from "../i18n/translations";
import type { Permissions } from "../hooks/usePermissions";

export type NavChild = {
  to: string;
  label: (t: TranslationDictionary) => string;
  requiredPermission: keyof Permissions;
  icon?: IconDefinition;
};

export type NavItem = {
  to: string;
  icon: IconDefinition;
  label: (t: TranslationDictionary) => string;
  isUppercase?: boolean;
  requiredPermission: keyof Permissions;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    icon: faHouse,
    label: (t) => t.common.dashboard,
    requiredPermission: "canViewDashboard",
  },
  {
    to: "/athletes",
    icon: faRankingStar,
    label: (t) => t.common.athletes,
    requiredPermission: "canViewAthletes",
  },
  {
    to: "/team-dashboard",
    icon: faUsers,
    label: () => "TEAM HUB",
    requiredPermission: "canViewReports",
  },
  {
    to: "/team-feed",
    icon: faAddressCard,
    label: () => "COMMUNITY",
    requiredPermission: "canViewReports",
  },
  {
    to: "/player-profile",
    icon: faUserAstronaut,
    label: (t) => t.common.playerProfile,
    requiredPermission: "canViewReports",
    children: [
      {
        to: "/player-profile",
        label: (t) => t.playerProfile.tabs.profile,
        requiredPermission: "canViewReports",
        icon: faIdBadge,
      },
      {
        to: "/player-profile/combine",
        label: (t) => t.playerProfile.tabs.combine,
        requiredPermission: "canViewReports",
        icon: faArrowTrendUp,
      },
      {
        to: "/player-profile/report-cards",
        label: (t) => t.playerProfile.tabs.reportCards,
        requiredPermission: "canViewReports",
        icon: faAddressCard,
      },
      {
        to: "/player-profile/scheduling",
        label: (t) => t.playerProfile.tabs.scheduling,
        requiredPermission: "canViewReports",
        icon: faCalendarDays,
      },
    ],
  },
];
