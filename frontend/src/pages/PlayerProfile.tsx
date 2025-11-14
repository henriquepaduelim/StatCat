import { useEffect, useMemo, useState } from "react";

import { useAthletes } from "../hooks/useAthletes";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthlete } from "../hooks/useAthlete";
import { useAthleteReportSubmissions } from "../hooks/useAthleteReportSubmissions";
import { useTests } from "../hooks/useTests";
import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../stores/useAuthStore";
import { usePermissions } from "../hooks/usePermissions";
import AthleteReportCard from "../components/AthleteReportCard";
import CollapsibleSection from "../components/CollapsibleSection";

const PlayerProfile = () => {
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
    currentAthleteId !== undefined ? currentAthleteId : Number.NaN
  );

  const currentAthlete = useMemo(
    () => athletes?.find((athlete) => athlete.id === currentAthleteId),
    [athletes, currentAthleteId]
  );

  const tests = testsQuery.data ?? [];
  const reportCardsQuery = useAthleteReportSubmissions(currentAthleteId, Boolean(currentAthleteId));
  const reportCards = reportCardsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-container-foreground">{t.playerProfile.title}</h1>
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

      <CollapsibleSection title="Athlete Profile">
        {!currentAthlete && <p className="text-sm text-muted">{t.playerProfile.noAthlete}</p>}

        {currentAthlete && reportQuery.isLoading && (
          <p className="text-sm text-muted">{t.playerProfile.loading}</p>
        )}

        {currentAthlete && reportQuery.isError && (
          <p className="text-sm text-red-500">{t.playerProfile.error}</p>
        )}

        {currentAthlete && (
          <AthleteReportCard
            athlete={currentAthlete}
            detailedAthlete={detailedAthleteQuery.data}
            report={reportQuery.data}
            tests={tests}
            hideRecentSessions
          />
        )}
      </CollapsibleSection>

      {reportQuery.data && (
        <CollapsibleSection title="Combine Results">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted">
              {t.playerProfile.summarySessions(reportQuery.data.sessions.length)}
            </p>
            <div className="rounded-lg bg-action-primary/10 px-4 py-2 text-sm text-accent">
              {t.playerProfile.summary}
            </div>
          </div>

          <div className="space-y-4">
            {reportQuery.data.sessions.map((session) => (
              <div key={session.session_id} className="rounded-lg border border-black/10 bg-container/60 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-container-foreground">{session.session_name}</h3>
                    <p className="text-xs text-muted">
                      {t.playerProfile.sessionDate(session.scheduled_at ?? null)}
                      {session.location ? ` • ${session.location}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-action-primary/10 px-3 py-1 text-xs font-semibold uppercase text-accent">
                    {t.playerProfile.metricsBadge(session.results.length)}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {session.results.map((metric) => (
                    <div
                      key={`${session.session_id}-${metric.test_id}-${metric.recorded_at}`}
                      className="rounded-lg bg-container px-4 py-3 text-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {metric.category ?? t.playerProfile.metricFallback}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-container-foreground">
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
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title={t.playerProfile.reportCardsTitle}
        subtitle={t.playerProfile.reportCardsSubtitle}
      >
        {!currentAthlete && <p className="mt-4 text-sm text-muted">{t.playerProfile.noAthlete}</p>}

        {currentAthlete && reportCardsQuery.isLoading && (
          <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsLoading}</p>
        )}

        {currentAthlete && reportCardsQuery.isError && (
          <p className="mt-4 text-sm text-red-500">{t.playerProfile.reportCardsError}</p>
        )}

        {currentAthlete &&
          !reportCardsQuery.isLoading &&
          !reportCardsQuery.isError &&
          reportCards.length === 0 && (
            <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsEmpty}</p>
          )}

        {currentAthlete && reportCards.length > 0 && (
          <div className="mt-6 space-y-4">
            {reportCards.map((submission) => {
              const ratingCards = [
                { label: t.playerProfile.ratings.technical, value: submission.technical_rating },
                { label: t.playerProfile.ratings.physical, value: submission.physical_rating },
                { label: t.playerProfile.ratings.training, value: submission.training_rating },
                { label: t.playerProfile.ratings.match, value: submission.match_rating },
              ];
              return (
                <article
                  key={submission.id}
                  className="rounded-lg border border-black/10 bg-container/80 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-container-foreground">
                        {submission.team_name ?? t.playerProfile.reportCardIndividual}
                      </p>
                      <p className="text-xs text-muted">
                        {t.playerProfile.reportCardSubmittedBy(
                          submission.submitted_by,
                          submission.created_at,
                        )}
                      </p>
                    </div>
                    
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    {ratingCards.map((item) => (
                      <div key={item.label} className="rounded-lg bg-container px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {item.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-container-foreground">
                          {typeof item.value === "number"
                            ? item.value
                            : t.playerProfile.reportCardNoScore}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-1 rounded-lg bg-container px-1 py-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t.playerProfile.ratings.general}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-container-foreground">
                      {submission.general_notes?.trim()
                        ? submission.general_notes
                        : t.playerProfile.reportCardNoNotes}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};

export default PlayerProfile;