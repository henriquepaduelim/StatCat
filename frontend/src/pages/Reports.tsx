import { useEffect, useMemo, useState } from "react";

import { useAthletes } from "../hooks/useAthletes";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthlete } from "../hooks/useAthlete";
import { useTests } from "../hooks/useTests";
import { useThemeStore } from "../theme/useThemeStore";
import { useTranslation } from "../i18n/useTranslation";
import AthleteReportCard from "../components/AthleteReportCard";

const Reports = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: athletes } = useAthletes(clientId);
  const [currentAthleteId, setCurrentAthleteId] = useState<number | undefined>(undefined);
  const t = useTranslation();

  useEffect(() => {
    if (athletes && athletes.length && !currentAthleteId) {
      setCurrentAthleteId(athletes[0].id);
    }
  }, [athletes, currentAthleteId]);

  const reportQuery = useAthleteReport(currentAthleteId);
  const testsQuery = useTests(clientId);
  const detailedAthleteQuery = useAthlete(
    currentAthleteId !== undefined ? currentAthleteId : Number.NaN
  );

  const currentAthlete = useMemo(
    () => athletes?.find((athlete) => athlete.id === currentAthleteId),
    [athletes, currentAthleteId]
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-on-surface">{t.reports.title}</h1>
        <p className="text-sm text-muted">{t.reports.description}</p>
      </header>

      <div className="print-hidden flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <label className="flex-1 text-sm font-medium text-muted">
          {t.reports.selectAthlete}
          <select
            value={currentAthleteId ?? ""}
            onChange={(event) => setCurrentAthleteId(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t.reports.selectPlaceholder}</option>
            {athletes?.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.first_name} {athlete.last_name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary shadow-sm"
          disabled={!currentAthlete || reportQuery.isError || reportQuery.isLoading}
        >
          {t.reports.export} ({t.reports.soon})
        </button>
      </div>

      <section className="rounded-xl bg-background/40 p-6 shadow-sm print:bg-white">
        {!currentAthlete && <p className="text-sm text-muted">{t.reports.noAthlete}</p>}

        {currentAthlete && reportQuery.isLoading && (
          <p className="text-sm text-muted">{t.reports.loading}</p>
        )}

        {reportQuery.isError && (
          <p className="text-sm text-red-500">{t.reports.error}</p>
        )}

        {currentAthlete && (
          <div className="space-y-6" id="report-print-area">
            <AthleteReportCard
              athlete={currentAthlete}
              detailedAthlete={detailedAthleteQuery.data}
              report={reportQuery.data}
              tests={testsQuery.data ?? []}
              hideRecentSessions
            />
            {reportQuery.data ? (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted">
                  {t.reports.summarySessions(reportQuery.data.sessions.length)}
                </p>
                <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary">
                  {t.reports.summary}
                </div>
              </div>
            ) : null}

            {reportQuery.data ? (
              <div className="space-y-4">
                {reportQuery.data.sessions.map((session) => (
                  <div key={session.session_id} className="rounded-lg border border-black/10 bg-background/60 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-on-surface">{session.session_name}</h3>
                        <p className="text-xs text-muted">
                          {t.reports.sessionDate(session.scheduled_at ?? null)}
                          {session.location ? ` • ${session.location}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                        {t.reports.metricsBadge(session.results.length)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {session.results.map((metric) => (
                        <div
                          key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`}
                          className="rounded-lg bg-surface px-4 py-3 text-sm"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            {metric.category ?? t.reports.metricFallback}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-on-surface">
                            {metric.value}
                            {metric.unit ? <span className="text-sm text-muted"> {metric.unit}</span> : null}
                          </p>
                          <p className="text-xs text-muted">{metric.test_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};

export default Reports;
