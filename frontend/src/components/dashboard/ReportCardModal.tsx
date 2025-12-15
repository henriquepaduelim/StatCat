import { FormEvent } from "react";

import type { ReportCardCategory } from "../../types/reportCard";
import { getScoreBand, type ScoreBand } from "../../lib/reportCard";
import type { Athlete } from "../../types/athlete";
import type { Team } from "../../types/team";
import { getMediaUrl } from "../../utils/media";

type ReportCardModalProps = {
  isOpen: boolean;
  athletes: Athlete[];
  teams: Team[];
  selectedAthleteId: number | null;
  selectedTeamId: number | null;
  coachReport: string;
  categories: ReportCardCategory[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onAthleteSelect: (athleteId: number | null) => void;
  onTeamSelect: (teamId: number | null) => void;
  onCoachReportChange: (notes: string) => void;
  onMetricChange: (categoryName: string, metricName: string, value: number | null) => void;
  onClear: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const bandClasses: Record<ScoreBand, string> = {
  low: "text-orange-600",
  medium: "text-amber-600",
  high: "text-emerald-600",
};

const bandLabels: Record<ScoreBand, string> = {
  low: "Low",
  medium: "Avg",
  high: "High",
};

const CATEGORY_ICONS: Record<string, string | null> = {
  mindset: getMediaUrl("/media/Asset 1BRAIN4 1.png"),
  physicality: getMediaUrl("/media/Asset 1person-2 1.png"),
  "technical foundation": getMediaUrl("/media/Asset 1blocks1 1.png"),
};

const ReportCardModal = ({
  isOpen,
  athletes,
  teams,
  selectedAthleteId,
  selectedTeamId,
  coachReport,
  categories,
  isSubmitting,
  errorMessage,
  onAthleteSelect,
  onTeamSelect,
  onCoachReportChange,
  onMetricChange,
  onClear,
  onSubmit,
  onCancel,
}: ReportCardModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 modal-overlay backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-start justify-center px-3 py-4 sm:items-center sm:px-6 sm:py-8" onClick={onCancel}>
        <div
          className="modal-surface w-full max-w-4xl max-h-[90vh] space-y-4 overflow-y-auto rounded-2xl p-4 shadow-2xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-container-foreground">New Report Card</h2>
              <p className="text-sm text-muted">
                Add the coach report and set 1-100 scores for each item. Leave items blank if not assessed.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-container text-muted hover:text-accent"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                Athlete
                <select
                  value={selectedAthleteId ?? ""}
                  onChange={(event) =>
                    onAthleteSelect(event.target.value ? Number(event.target.value) : null)
                  }
                  required
                  className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                >
                  <option value="">Select athlete</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.first_name} {athlete.last_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-muted">
                Team (optional)
                <select
                  value={selectedTeamId ?? ""}
                  onChange={(event) =>
                    onTeamSelect(event.target.value ? Number(event.target.value) : null)
                  }
                  className="mt-1 w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                >
                  <option value="">No specific team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Coach report <span className="ml-1 text-[11px] font-normal text-muted">(max 1000 chars)</span>
                </label>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs font-semibold text-action-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
              <textarea
                value={coachReport.slice(0, 1000)}
                onChange={(event) => onCoachReportChange(event.target.value.slice(0, 1000))}
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border border-black/10 bg-container px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                placeholder="Add observations, context, and priorities for the athlete… (max 1000 chars)"
                required
              />
              <div className="flex justify-end text-[11px] text-muted">
                {Math.min(coachReport.length, 1000)} / 1000 characters
              </div>
            </div>

            <div className="space-y-5">
              {categories.map((category) => {
                const iconSrc = CATEGORY_ICONS[category.name.toLowerCase()] ?? null;
                return (
                  <div key={category.name} className="rounded-xl border border-black/10 bg-container/70 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
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
                          : "No scores yet"}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {category.metrics.map((metric) => {
                        const band = getScoreBand(metric.score);
                        const bandClass = band ? bandClasses[band] : "text-muted";
                        const bandLabel = band ? bandLabels[band] : "Not set";
                        const sliderValue = metric.score ?? 0;

                        return (
                          <div key={`${category.name}-${metric.name}`} className="space-y-1 rounded-lg bg-container p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="font-semibold text-container-foreground">{metric.name}</span>
                              <span className={`text-xs font-semibold ${bandClass}`}>
                                {bandLabel}
                                {typeof metric.score === "number" ? ` • ${metric.score}` : ""}
                              </span>
                            </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={sliderValue}
                                    onChange={(event) =>
                                      onMetricChange(category.name, metric.name, Number(event.target.value))
                                    }
                                    className="h-2 w-full cursor-pointer accent-action-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onMetricChange(category.name, metric.name, null)}
                                    className="text-xs font-semibold text-muted hover:text-container-foreground"
                                    aria-label={`Clear ${metric.name}`}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full rounded-md border border-black/10 px-4 py-2 text-sm font-semibold text-container-foreground hover:bg-container/80 sm:w-auto"
                >
                  Cancel
                </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-action-primary-foreground hover:bg-action-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? "Submitting..." : "Submit for approval"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportCardModal;
