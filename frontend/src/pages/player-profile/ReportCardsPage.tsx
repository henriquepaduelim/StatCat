import { useEffect, useMemo, useState } from "react";

import { usePlayerProfileContext } from "./context";
import { useTranslation } from "../../i18n/useTranslation";
import { getScoreBand, type ScoreBand } from "../../lib/reportCard";
import ReportCardBadge from "../../components/ReportCardBadge";
import Spinner from "../../components/Spinner";
import ReportCardRadar from "../../components/ReportCardRadar";
import { getMediaUrl } from "../../utils/media";

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

const CATEGORY_ICONS: Record<string, string | null> = {
  mindset: getMediaUrl("/media/Asset 1BRAIN4 1.png"),
  physicality: getMediaUrl("/media/Asset 1person-2 1.png"),
  "technical foundation": getMediaUrl("/media/Asset 1blocks1 1.png"),
};

const ReportCardsPage = () => {
  const { currentAthlete, athleteDetail, reportCards, reportCardsLoading, reportCardsError } =
    usePlayerProfileContext();
  const t = useTranslation();

  const sortedReportCards = useMemo(
    () =>
      [...reportCards].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [reportCards],
  );

  const [selectedId, setSelectedId] = useState<number | null>(
    sortedReportCards.length ? sortedReportCards[0].id : null,
  );

  useEffect(() => {
    if (!sortedReportCards.length) {
      setSelectedId(null);
      return;
    }
    const exists = sortedReportCards.some((submission) => submission.id === selectedId);
    if (!exists) {
      setSelectedId(sortedReportCards[0].id);
    }
  }, [sortedReportCards, selectedId]);

  const selectedSubmission = sortedReportCards.find((submission) => submission.id === selectedId);
  const categories = selectedSubmission?.categories ?? [];

  const subtitleText =
    currentAthlete && selectedSubmission
      ? `${currentAthlete.first_name} ${currentAthlete.last_name} · ${t.playerProfile.reportCardSubmittedBy(
          selectedSubmission.submitted_by,
          selectedSubmission.created_at,
        )}`
      : t.playerProfile.reportCardsSubtitle;

  const baseAthlete = athleteDetail ?? currentAthlete;
  const athleteForBadge =
    baseAthlete &&
    (() => {
      const primary =
        athleteDetail?.primary_position &&
        !["unknown", "unk", "n/a", "na"].includes(
          athleteDetail.primary_position.toLowerCase().trim(),
        )
          ? athleteDetail.primary_position
          : currentAthlete?.primary_position;
      return {
        ...baseAthlete,
        primary_position: primary ?? baseAthlete.primary_position,
      };
    })();

  return (
    <section className="rounded-xl border border-black/10 bg-container/80 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-container-foreground">Coach Report Cards</h2>
          <p className="text-xs text-muted">{subtitleText}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="report-card-select" className="text-xs font-semibold text-muted">
            Select report
          </label>
          <select
            id="report-card-select"
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(Number(event.target.value))}
            className="rounded-lg border border-black/10 bg-container px-3 py-2 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none"
          >
            {sortedReportCards.map((submission) => {
              const submittedOn = new Date(submission.created_at).toLocaleDateString();
              const labelParts = [
                submission.team_name ?? t.playerProfile.reportCardIndividual,
                submittedOn,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <option key={submission.id} value={submission.id}>
                  {labelParts}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!currentAthlete && <p className="mt-4 text-sm text-muted">{t.playerProfile.noAthlete}</p>}

      {currentAthlete && reportCardsLoading ? <Spinner className="py-6" /> : null}

      {currentAthlete && reportCardsError && (
        <p className="mt-4 text-sm text-red-500">{t.playerProfile.error}</p>
      )}

      {currentAthlete && !reportCardsLoading && !reportCardsError && reportCards.length === 0 && (
        <p className="mt-4 text-sm text-muted">{t.playerProfile.reportCardsEmpty}</p>
      )}

      {currentAthlete && reportCards.length > 0 && (
        <div className="mt-2 space-y-4">
          {selectedSubmission ? (
            <article className="rounded-lg border border-black/10 bg-container/80 p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[17.25rem,1fr] lg:items-stretch">
                <div className="flex flex-col items-center lg:items-start">
                  <ReportCardBadge submission={selectedSubmission} athlete={athleteForBadge} />
                </div>
                <div className="flex">
                  <ReportCardRadar
                    submission={selectedSubmission}
                    className="h-full min-h-[24rem] w-full"
                    heightClass="h-full"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-x-3 overflow-x-auto whitespace-nowrap text-xs font-semibold tracking-[0.12em]">
                <span>SRS = Short-Range Saves</span>
                <span>LRS = Long-Range Saves</span>
                <span>DIS = Distribution</span>
                <span>TEC = Technical Foundation</span>
                <span>MIN = Mindset</span>
                <span>PHY = Physicality</span>
              </div>

              <div className="mt-4 flex h-full flex-col rounded-lg bg-container px-4 py-3 shadow-sm border border-black/10">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-container-foreground">
                    {athleteForBadge?.first_name} {athleteForBadge?.last_name}
                  </p>
                  <p className="text-xs text-muted">
                    {athleteForBadge?.birth_date
                      ? new Date(athleteForBadge.birth_date).toLocaleDateString()
                      : t.playerProfile.noAthlete}
                    {" · "}
                    {athleteForBadge?.club_affiliation ||
                      selectedSubmission.team_name ||
                      t.common.select}
                  </p>
                </div>
                <div className="mt-3 flex flex-1 flex-col rounded-md bg-container px-3 py-3 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Coach report
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-container-foreground leading-relaxed overflow-hidden flex-1">
                    {selectedSubmission.coach_report?.trim() || t.playerProfile.reportCardNoNotes}
                  </p>
                </div>
              </div>

              {categories.length ? (
                <div className="mt-4 space-y-3">
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
                                className="h-5 w-5 category-icon"
                              />
                            ) : null}
                            <p className="text-sm font-semibold text-container-foreground">
                              {category.name}
                            </p>
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
                              <div
                                key={`${category.name}-${metric.name}`}
                                className="rounded-md bg-container px-3 py-2 shadow-sm"
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-container-foreground">
                                    {metric.name}
                                  </span>
                                  <span className={`text-xs font-semibold ${bandClass}`}>
                                    {typeof metric.score === "number" ? metric.score : "—"}
                                  </span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-slate-200">
                                  {typeof metric.score === "number" ? (
                                    <div
                                      className={`h-2 rounded-full ${barClass}`}
                                      style={{
                                        width: `${Math.min(100, Math.max(0, metric.score))}%`,
                                      }}
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
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default ReportCardsPage;
