import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useAthlete } from "../hooks/useAthlete";
import { useAthleteMetrics } from "../hooks/useAthleteMetrics";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { activeTheme } from "../theme/themes";
import { useTranslation } from "../i18n/useTranslation";
import type { AthleteReportSession } from "../types/athlete";

const AthleteReport = () => {
  const params = useParams<{ id: string }>();
  const athleteId = Number(params.id);
  const { data: athlete, isLoading, isError } = useAthlete(athleteId);
  const reportQuery = useAthleteReport(Number.isNaN(athleteId) ? undefined : athleteId);
  const metricsQuery = useAthleteMetrics(athleteId);
  const t = useTranslation();
  const theme = activeTheme;

  const sessions = useMemo<AthleteReportSession[]>(() => {
    if (reportQuery.data?.sessions?.length) {
      return reportQuery.data.sessions;
    }
    return [];
  }, [reportQuery.data]);

  if (Number.isNaN(athleteId)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-accent hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  if (isLoading || reportQuery.isLoading) {
    return <p className="text-sm text-muted">{t.common.loading}...</p>;
  }

  if (isError || reportQuery.isError || !athlete) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-500">{t.athletes.error}</p>
        <Link to="/athletes" className="text-sm font-semibold text-accent hover:underline">
          {t.athleteDetail.backToList}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted">{theme.logo.label}</p>
          <h1 className="text-3xl font-semibold text-container-foreground">
            {athlete.first_name} {athlete.last_name}
          </h1>
          <p className="text-sm text-muted">{t.dashboard.athleteReport.subtitle}</p>
        </div>
        <Link
          to="/athletes"
          className="inline-flex items-center rounded-md border border-action-primary/40 bg-action-primary px-3 py-2 text-xs font-semibold text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90"
        >
          {t.athleteDetail.backToList}
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-black/10 bg-container-gradient p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t.newAthlete.birthDate}
          </p>
          <p className="mt-1 text-lg font-semibold text-container-foreground">
            {athlete.birth_date ?? t.dashboard.athleteReport.notAvailable}
          </p>
        </div>
        <div className="rounded-xl border border-black/10 bg-container-gradient p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t.newAthlete.height}
          </p>
          <p className="mt-1 text-lg font-semibold text-container-foreground">
            {athlete.height_cm ? `${athlete.height_cm} cm` : t.dashboard.athleteReport.notAvailable}
          </p>
        </div>
        <div className="rounded-xl border border-black/10 bg-container-gradient p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t.newAthlete.weight}
          </p>
          <p className="mt-1 text-lg font-semibold text-container-foreground">
            {athlete.weight_kg ? `${athlete.weight_kg} kg` : t.dashboard.athleteReport.notAvailable}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-container-foreground">
            {t.dashboard.athleteReport.metricsTitle}
          </h2>
          {metricsQuery.isFetching ? (
            <span className="text-xs text-muted">{t.common.loading}...</span>
          ) : null}
        </div>
        {metricsQuery.isError ? (
          <p className="text-sm text-red-500">{t.athletes.error}</p>
        ) : null}
        {!metricsQuery.data?.metrics.length ? (
          <p className="text-sm text-muted">{t.dashboard.athleteReport.chartEmpty}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricsQuery.data.metrics.map((metric) => (
              <article
                key={metric.id}
                className="rounded-xl border border-black/10 bg-container-gradient p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {metric.category}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-container-foreground">
                      {metric.name}
                    </h3>
                  </div>
                  {metric.tags.length ? (
                    <span className="rounded-full bg-action-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-action-primary">
                      {metric.tags[0]}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-semibold text-accent">
                    {metric.value !== null ? metric.value.toFixed(2) : "—"}
                    {metric.unit ? (
                      <span className="ml-1 text-xs text-muted">{metric.unit}</span>
                    ) : null}
                  </p>
                  <p className="mt-2 text-xs text-muted">{metric.description}</p>
                </div>
                {metric.components.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-muted">
                    {metric.components.map((component) => (
                      <li key={`${metric.id}-${component.label}`} className="flex justify-between gap-2">
                        <span className="truncate">{component.label}</span>
                        <span className="font-semibold text-container-foreground">
                          {component.value !== null ? component.value.toFixed(2) : "—"}
                          {component.unit ? ` ${component.unit}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-container-foreground">
            {t.dashboard.athleteReport.recentSessionsTitle}
          </h2>
          <span className="text-xs text-muted">
            {t.dashboard.athleteReport.selectTestLabel}
          </span>
        </div>
        {!sessions.length ? (
          <p className="text-sm text-muted">{t.dashboard.athleteReport.chartEmpty}</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <article key={session.session_id} className="rounded-xl border border-black/10 bg-container-gradient">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-container-foreground">{session.session_name}</h3>
                    <p className="text-xs text-muted">
                      {t.reports.sessionDate(session.scheduled_at ?? null)}
                      {session.location ? ` • ${session.location}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-action-primary/10 px-3 py-1 text-xs font-semibold uppercase text-accent">
                    {t.reports.metricsBadge(session.results.length)}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {session.results.map((metric) => (
                    <div key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`} className="rounded-lg border border-black/10 bg-container px-4 py-3 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {metric.category ?? t.reports.metricFallback}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-container-foreground">
                        {metric.value}
                        {metric.unit ? <span className="text-sm text-muted"> {metric.unit}</span> : null}
                      </p>
                      <p className="text-xs text-muted">{metric.test_name}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AthleteReport;
