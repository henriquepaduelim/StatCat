import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  faCalendarCheck,
  faFileCode,
  faHouse,
  faRankingStar,
} from "@fortawesome/free-solid-svg-icons";

import type { TranslationDictionary } from "../i18n/translations";

export type NavItem = {
  to: string;
  icon: IconDefinition;
  label: (t: TranslationDictionary) => string;
  isUppercase?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    icon: faHouse,
    label: (t) => t.common.dashboard,
  },
  {
    to: "/athletes",
    icon: faRankingStar,
    label: (t) => t.common.athletes,
  },
  {
    to: "/reports",
    icon: faFileCode,
    label: (t) => t.common.reports,
  },
  {
    to: "/scheduling",
    icon: faCalendarCheck,
    label: () => "Scheduling",
    isUppercase: true,
  },
];
