import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../../stores/useAuthStore";
import { usePermissions } from "../../hooks/usePermissions";
import { useAthletes } from "../../hooks/useAthletes";
import { useAthleteReport } from "../../hooks/useAthleteReport";
import { useAthlete } from "../../hooks/useAthlete";
import { useAthleteReportSubmissions } from "../../hooks/useAthleteReportSubmissions";
import { useTests } from "../../hooks/useTests";
import { useTranslation } from "../../i18n/useTranslation";
import type { Athlete } from "../../types/athlete";
import type { PlayerProfileContextValue } from "./context";

const linkClass =
  "rounded-full border px-2 py-1 text-sm font-semibold transition hover:text-action-primary";

function buildContextValue(params: {
  athletes: Athlete[] | undefined;
  currentAthleteId: number | undefined;
  setCurrentAthleteId: (value: number) => void;
  currentAthlete: Athlete | undefined;
  reportQueryReturn: ReturnType<typeof useAthleteReport>;
  tests: ReturnType<typeof useTests>["data"];
  athleteDetail: ReturnType<typeof useAthlete>["data"];
  reportCards: ReturnType<typeof useAthleteReportSubmissions>["data"];
  reportCardsQueryReturn: ReturnType<typeof useAthleteReportSubmissions>;
}): PlayerProfileContextValue {
  return {
    athletes: params.athletes,
    currentAthleteId: params.currentAthleteId,
    setCurrentAthleteId: params.setCurrentAthleteId,
    currentAthlete: params.currentAthlete,
    report: params.reportQueryReturn.data,
    reportLoading: params.reportQueryReturn.isLoading,
    reportError: Boolean(params.reportQueryReturn.error),
    tests: params.tests ?? [],
    athleteDetail: params.athleteDetail,
    reportCards: params.reportCards ?? [],
    reportCardsLoading: params.reportCardsQueryReturn.isLoading,
    reportCardsError: Boolean(params.reportCardsQueryReturn.error),
  };
}

const PlayerProfileLayout = () => {
  const user = useAuthStore((state) => state.user);
  const permissions = usePermissions();
  const { data: allAthletes } = useAthletes();
  const [currentAthleteId, setCurrentAthleteId] = useState<number | undefined>(undefined);
  const t = useTranslation();

  const athletes = useMemo(() => {
    if (!allAthletes) return undefined;

    if (permissions.canViewAllReports) {
      return allAthletes;
    }

    if (user?.role === "athlete") {
      return allAthletes.filter((athlete) => athlete.email === user.email);
    }

    return allAthletes;
  }, [allAthletes, permissions.canViewAllReports, user]);

  useEffect(() => {
    if (athletes && athletes.length && !currentAthleteId) {
      setCurrentAthleteId(athletes[0].id);
    }
  }, [athletes, currentAthleteId]);

  const reportQuery = useAthleteReport(currentAthleteId);
  const testsQuery = useTests();
  const detailedAthleteQuery = useAthlete(
    currentAthleteId !== undefined ? currentAthleteId : Number.NaN,
  );
  const currentAthlete = useMemo(
    () => athletes?.find((athlete) => athlete.id === currentAthleteId),
    [athletes, currentAthleteId],
  );

  const reportCardsQuery = useAthleteReportSubmissions(currentAthleteId, Boolean(currentAthleteId));

  const contextValue = buildContextValue({
    athletes,
    currentAthleteId,
    setCurrentAthleteId,
    currentAthlete,
    reportQueryReturn: reportQuery,
    tests: testsQuery.data,
    athleteDetail: detailedAthleteQuery.data,
    reportCards: reportCardsQuery.data,
    reportCardsQueryReturn: reportCardsQuery,
  });

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-container-foreground">
          {t.playerProfile.title}
        </h1>
        <p className="text-sm text-muted">{t.playerProfile.description}</p>
      </header>

      <div className="print-hidden flex flex-col gap-4 rounded-xl bg-container p-3 shadow-sm md:flex-row md:items-end md:justify-between">
        <label className="flex-1 text-sm font-medium text-muted">
          {t.playerProfile.selectAthlete}
          <select
            value={currentAthleteId ?? ""}
            onChange={(event) => setCurrentAthleteId(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
          >
            <option value="">{t.playerProfile.selectPlaceholder}</option>
            {athletes?.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.first_name} {athlete.last_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav className="flex flex-wrap gap-1 md:gap-2 text-muted">
        <NavLink
          to="/player-profile"
          end
          className={({ isActive }) =>
            `${linkClass} ${
              isActive ? "border-action-primary text-action-primary" : "border-transparent"
            }`
          }
        >
          {t.playerProfile.tabs.profile}
        </NavLink>
        <NavLink
          to="/player-profile/combine"
          className={({ isActive }) =>
            `${linkClass} ${
              isActive ? "border-action-primary text-action-primary" : "border-transparent"
            }`
          }
        >
          {t.playerProfile.tabs.combine}
        </NavLink>
        <NavLink
          to="/player-profile/report-cards"
          className={({ isActive }) =>
            `${linkClass} ${
              isActive ? "border-action-primary text-action-primary" : "border-transparent"
            }`
          }
        >
          {t.playerProfile.tabs.reportCards}
        </NavLink>
        <NavLink
          to="/player-profile/scheduling"
          className={({ isActive }) =>
            `${linkClass} ${
              isActive ? "border-action-primary text-action-primary" : "border-transparent"
            }`
          }
        >
          {t.playerProfile.tabs.scheduling}
        </NavLink>
      </nav>

      <Outlet context={contextValue} />
    </div>
  );
};

export default PlayerProfileLayout;
