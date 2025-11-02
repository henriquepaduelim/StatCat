import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faFileCode, faHouse, faRankingStar } from "@fortawesome/free-solid-svg-icons";

import type { TranslationDictionary } from "../i18n/translations";
import type { Permissions } from "../hooks/usePermissions";

export type NavItem = {
  to: string;
  icon: IconDefinition;
  label: (t: TranslationDictionary) => string;
  isUppercase?: boolean;
  requiredPermission: keyof Permissions;
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
    to: "/reports",
    icon: faFileCode,
    label: (t) => t.common.reports,
    requiredPermission: "canViewReports",
  },
];
