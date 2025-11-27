import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendUp, faArrowTrendDown, faEquals } from "@fortawesome/free-solid-svg-icons";
import CollapsibleSection from "../../components/CollapsibleSection";
import { usePlayerProfileContext } from "./context";
import { useAthleteCombineMetrics } from "../../hooks/useAthleteCombineMetrics";
import { format } from "date-fns";
import type { TeamCombineMetric } from "../../api/teamMetrics";
import { useTranslation } from "../../i18n/useTranslation";

const CombineResultsPage = () => {
  const { report, currentAthleteId } = usePlayerProfileContext();
  const combineQuery = useAthleteCombineMetrics(currentAthleteId);
  const t = useTranslation();
  const lastValueByTest = new Map<number, number>();

  const combineMetrics: TeamCombineMetric[] = combineQuery.data ?? [];
  const hasCombineData = combineMetrics.length > 0;

  if (!report && !hasCombineData) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {combineQuery.isLoading ? t.common.loading : t.playerProfile.noReportData}
      </div>
    );
  }

  const isLowerBetter = (testName: string) => {
    const normalized = testName.toLowerCase();
    const speedKeys = ["10m", "20m", "30m", "35m", "40m", "sprint"];
    return speedKeys.some((key) => normalized.includes(key));
  };

  return (
    <div className="space-y-4">
      {report ? (
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">{t.playerProfile.summarySessions(report.sessions.length)}</p>
          <div className="rounded-lg bg-action-primary/10 px-4 py-2 text-sm text-accent">
            {t.playerProfile.summary}
          </div>
        </div>
      ) : null}

      {report ? (
        <div className="space-y-4">
          {report.sessions.map((session) => (
            <CollapsibleSection
              key={session.session_id}
              title={session.session_name}
              subtitle={`${t.playerProfile.sessionDate(session.scheduled_at ?? null)}${
                session.location ? ` • ${session.location}` : ""
              }`}
              defaultOpen={false}
            >
              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                {session.results.map((metric) => {
                  const previousValue = lastValueByTest.get(metric.test_id);
                  let trend: "up" | "down" | "same" | "none" = "none";
                  const lowerIsBetter = isLowerBetter(metric.test_name);
                  if (previousValue !== undefined) {
                    if (metric.value === previousValue) {
                      trend = "same";
                    } else if (metric.value > previousValue) {
                      trend = lowerIsBetter ? "down" : "up";
                    } else {
                      trend = lowerIsBetter ? "up" : "down";
                    }
                  }
                  lastValueByTest.set(metric.test_id, metric.value);

                  const trendChip =
                    trend === "none" ? null : (
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[0.7rem] font-semibold ${
                          trend === "up"
                            ? "border-emerald-500 bg-emerald-500 text-emerald-50"
                            : trend === "down"
                              ? "border-rose-500 bg-rose-500 text-rose-50"
                              : "border-slate-500 bg-slate-500 text-slate-50"
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={trend === "up" ? faArrowTrendUp : trend === "down" ? faArrowTrendDown : faEquals}
                          className="h-3.5 w-3.5"
                        />
                      </span>
                    );

                  return (
                    <div
                      key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`}
                      className="relative flex flex-nowrap items-center justify-between gap-2 rounded-lg bg-container px-4 py-3 pr-14 text-sm"
                    >
                      {trendChip ? (
                        <div className="pointer-events-none absolute -right-2 -top-2">
                          {trendChip}
                        </div>
                      ) : null}
                      <div>
                        <p className="max-w-[60%] truncate text-sm font-semibold text-container-foreground">
                          {metric.test_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="whitespace-nowrap text-lg font-semibold text-container-foreground">
                          {metric.value}
                          {metric.unit ? <span className="text-sm text-muted"> {metric.unit}</span> : null}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          ))}
        </div>
      ) : null}

      {hasCombineData ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-container-foreground">{t.playerProfile.tabs.combine}</h3>
          <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-container-background))] shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">10m</th>
                    <th className="px-3 py-2">20m</th>
                    <th className="px-3 py-2">35m</th>
                    <th className="px-3 py-2">Yo-Yo</th>
                    <th className="px-3 py-2">Jump</th>
                    <th className="px-3 py-2">Max Power</th>
                  </tr>
                </thead>
                <tbody>
                  {combineMetrics.map((metric) => (
                    <tr key={metric.id} className="border-b border-black/5">
                      <td className="px-3 py-2">
                        {metric.recorded_at ? format(new Date(metric.recorded_at), "MMM d, yyyy") : "–"}
                      </td>
                      <td className="px-3 py-2">{metric.split_10m_s ?? "–"}</td>
                      <td className="px-3 py-2">{metric.split_20m_s ?? "–"}</td>
                      <td className="px-3 py-2">{metric.split_35m_s ?? "–"}</td>
                      <td className="px-3 py-2">{metric.yoyo_distance_m ?? "–"}</td>
                      <td className="px-3 py-2">{metric.jump_cm ?? "–"}</td>
                      <td className="px-3 py-2">{metric.max_power_kmh ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CombineResultsPage;
