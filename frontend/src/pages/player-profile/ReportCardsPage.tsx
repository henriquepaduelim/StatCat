import CollapsibleSection from "../../components/CollapsibleSection";
import { usePlayerProfileContext } from "./context";
import { useTranslation } from "../../i18n/useTranslation";
import { getScoreBand, type ScoreBand } from "../../lib/reportCard";

const bandClasses: Record<ScoreBand, string> = {
  low: "text-orange-600",
  medium: "text-amber-600",
  high: "text-emerald-600",
};

const bandBgClasses: Record<ScoreBand, string> = {
  low: "bg-orange-400",
  medium: "bg-amber-500",
  high: "bg-emerald-500",
};

const CATEGORY_ICONS: Record<string, string> = {
  mindset: "/media/Asset 1BRAIN4 1.png",
  physicality: "/media/Asset 1person-2 1.png",
  "physicality ": "/media/Asset 1person-2 1.png",
  "physicality": "/media/Asset 1person-2 1.png",
  "technical foundation": "/media/Asset 1blocks1 1.png",
};

const ReportCardsPage = () => {
  const { currentAthlete, reportCards, reportCardsLoading, reportCardsError } =
    usePlayerProfileContext();
  const t = useTranslation();

  return (
    <CollapsibleSection
      title={t.playerProfile.reportCardsTitle}
      subtitle={t.playerProfile.reportCardsSubtitle}
    >
      {!currentAthlete && <p className="mt-4 text-sm text-muted">{t.playerProfile.noAthlete}</p>}

      {currentAthlete && reportCardsLoading && (
        <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsLoading}</p>
      )}

      {currentAthlete && reportCardsError && (
        <p className="mt-4 text-sm text-red-500">{t.playerProfile.error}</p>
      )}

      {currentAthlete && !reportCardsLoading && !reportCardsError && reportCards.length === 0 && (
        <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsEmpty}</p>
      )}

      {currentAthlete && reportCards.length > 0 && (
        <div className="mt-6 space-y-4">
          {reportCards.map((submission) => {
            const categories = submission.categories ?? [];
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

                <div className="mt-3 space-y-3">
                  <div className="rounded-lg bg-container px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Coach report</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-container-foreground">
                      {submission.coach_report?.trim() || t.playerProfile.reportCardNoNotes}
                    </p>
                  </div>

                  {typeof submission.overall_average === "number" ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-container px-4 py-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Overall average</p>
                        <p className="text-2xl font-semibold text-container-foreground">
                          {submission.overall_average.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {categories.length ? (
                    <div className="space-y-3">
                      {categories.map((category) => {
                        const iconSrc = CATEGORY_ICONS[category.name.toLowerCase()] ?? null;
                        return (
                          <div key={category.name} className="rounded-lg bg-container px-4 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {iconSrc ? (
                                  <img
                                    src={iconSrc}
                                    alt={`${category.name} icon`}
                                    className="h-5 w-5 object-contain"
                                  />
                                ) : null}
                                <p className="text-sm font-semibold text-container-foreground">{category.name}</p>
                              </div>
                              <p className="text-xs font-semibold text-muted">
                                {typeof category.group_average === "number"
                                  ? `Avg ${category.group_average.toFixed(1)}`
                                  : "No scores"}
                              </p>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {category.metrics.map((metric) => {
                                const band = getScoreBand(metric.score);
                                const bandClass = band ? bandClasses[band] : "text-muted";
                                const barClass = band ? bandBgClasses[band] : "bg-slate-300";
                                return (
                                  <div key={`${category.name}-${metric.name}`} className="rounded-md bg-container px-3 py-2 shadow-sm">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="font-semibold text-container-foreground">{metric.name}</span>
                                      <span className={`text-xs font-semibold ${bandClass}`}>
                                        {typeof metric.score === "number" ? metric.score : "—"}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                                      {typeof metric.score === "number" ? (
                                        <div
                                          className={`h-2 rounded-full ${barClass}`}
                                          style={{ width: `${Math.min(100, Math.max(0, metric.score))}%` }}
                                        />
                                      ) : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
};

export default ReportCardsPage;
