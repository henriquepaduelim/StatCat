import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal } from "@fortawesome/free-solid-svg-icons";

import type { CombineMetricId, CombineLeaderboardEntry } from "../../api/leaderboards";
import { useCombineLeaderboard } from "../../hooks/useCombineLeaderboard";
import { chartPalette } from "../../theme/chartPalette";
import { getMediaUrl } from "../../utils/media";

const COMBINE_METRICS: Array<{
  id: CombineMetricId;
  label: string;
  helper: string;
  unit: string;
  direction: "higher_is_better" | "lower_is_better";
}> = [
  { id: "split_10m_s", label: "10m Split", helper: "Lower is better", unit: "s", direction: "lower_is_better" },
  { id: "split_20m_s", label: "20m Split", helper: "Lower is better", unit: "s", direction: "lower_is_better" },
  { id: "split_35m_s", label: "35m Split", helper: "Lower is better", unit: "s", direction: "lower_is_better" },
  { id: "jump_cm", label: "Jump", helper: "Higher is better", unit: "cm", direction: "higher_is_better" },
  { id: "max_power_kmh", label: "Max Power", helper: "Higher is better", unit: "km/h", direction: "higher_is_better" },
  { id: "yoyo_distance_m", label: "YoYo Test", helper: "Higher is better", unit: "m", direction: "higher_is_better" },
];

type CombineLeaderboardCardProps = {
  limit?: number;
  teamId: number | null;
};

const formatValue = (value: number | null, unit: string) => {
  if (value === null || value === undefined) {
    return "—";
  }
  const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return `${rounded}${unit ? ` ${unit}` : ""}`;
};

const CombineLeaderboardCard = ({ limit = 5, teamId }: CombineLeaderboardCardProps) => {
  const [activeMetric, setActiveMetric] = useState<CombineMetricId>("split_35m_s");
  const metricMeta = useMemo(
    () => COMBINE_METRICS.find((metric) => metric.id === activeMetric) ?? COMBINE_METRICS[0],
    [activeMetric],
  );

  const leaderboardQuery = useCombineLeaderboard({
    metric: activeMetric,
    limit,
    team_id: teamId ?? undefined,
  });

  const entries: CombineLeaderboardEntry[] = leaderboardQuery.data?.entries ?? [];

  return (
    <div className="w-full rounded-xl border border-action-primary/25 bg-container-gradient p-4 sm:p-6 shadow-xl backdrop-blur">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-container-foreground">Combine Leaderboard</h2>
            <p className="text-sm text-muted">Top performers per metric for this team.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="combine-metric">
              Metric
            </label>
            <select
              id="combine-metric"
              value={activeMetric}
              onChange={(event) => setActiveMetric(event.target.value as CombineMetricId)}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
            >
              {COMBINE_METRICS.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="rounded-2xl border p-4 shadow-inner"
          style={{
            backgroundColor: "rgb(var(--color-container-background))",
            borderColor: "rgb(var(--color-border) / 0.4)",
          }}
        >
          {leaderboardQuery.isLoading ? (
            <p className="text-sm text-muted">Loading leaderboard...</p>
          ) : leaderboardQuery.isError ? (
            <p className="text-sm text-red-500">Unable to load leaderboard. Try refreshing.</p>
          ) : !entries.length ? (
            <div className="flex flex-col items-center gap-2 text-center text-sm text-muted">
              <FontAwesomeIcon icon={faMedal} className="text-2xl text-action-primary" />
              <p>Leaderboard data is not available yet.</p>
              <p className="text-xs">Once combine sessions are recorded, scores will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry: CombineLeaderboardEntry, index: number) => {
                const avatarSrc = entry.photo_url ? getMediaUrl(entry.photo_url) : null;
                const initials = entry.full_name
                  .split(" ")
                  .filter(Boolean)
                  .map((chunk) => chunk[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                <li
                  key={`${entry.athlete_id}-${entry.full_name}-${activeMetric}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "rgb(var(--color-container-background))",
                    borderColor: "rgb(var(--color-border))",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full overflow-hidden bg-action-primary/10 text-sm font-semibold text-action-primary">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={entry.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold shadow-sm"
                          style={{
                            backgroundColor:
                              index === 0
                                ? chartPalette.podium.gold
                                : index === 1
                                  ? chartPalette.podium.silver
                                  : index === 2
                                    ? chartPalette.podium.bronze
                                    : "rgb(var(--color-border))",
                            color: index <= 2 ? chartPalette.podium.textDark : "rgb(var(--color-foreground))",
                          }}
                        >
                          {initials || index + 1}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-container-foreground leading-tight">{entry.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-action-primary">
                      {formatValue(entry.value, metricMeta.unit)}
                    </p>
                    <p className="text-[0.65rem] text-muted">{metricMeta.helper}</p>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombineLeaderboardCard;
