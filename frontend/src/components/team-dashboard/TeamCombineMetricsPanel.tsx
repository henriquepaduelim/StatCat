import type { TeamCombineMetric } from "../../api/teamMetrics";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type TeamCombineMetricsPanelProps = {
  metrics: TeamCombineMetric[];
  athleteNameById: Record<number, string>;
  onAdd?: () => void;
  canAdd?: boolean;
};

const formatValue = (value: number | null, suffix = "") => {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${value}${suffix}`;
};

const TeamCombineMetricsPanel = ({
  metrics,
  athleteNameById,
  onAdd,
  canAdd = false,
}: TeamCombineMetricsPanelProps) => {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow-lg sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-container-foreground">Recent Entries</h3>
          <p className="text-sm text-muted">Captured performance data for this roster.</p>
        </div>
        {canAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center justify-center gap-1 rounded-md bg-action-primary px-3 py-2 text-sm font-semibold tracking-wide text-action-primary-foreground shadow-sm transition hover:bg-action-primary/90 focus-visible:ring-2"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" /> 
            New Session
          </button>
        ) : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-xs text-muted">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">Athlete</th>
              <th className="px-3 py-2 font-semibold">Sitting (cm)</th>
              <th className="px-3 py-2 font-semibold">Standing (cm)</th>
              <th className="px-3 py-2 font-semibold">Weight (kg)</th>
              <th className="px-3 py-2 font-semibold">10m (s)</th>
              <th className="px-3 py-2 font-semibold">20m (s)</th>
              <th className="px-3 py-2 font-semibold">35m (s)</th>
              <th className="px-3 py-2 font-semibold">YoYo (m)</th>
              <th className="px-3 py-2 font-semibold">Jump (cm)</th>
              <th className="px-3 py-2 font-semibold">Max Power (km/h)</th>
              <th className="px-3 py-2 font-semibold">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {!metrics.length ? (
              <tr>
                <td className="px-3 py-4 text-sm text-muted" colSpan={11}>
                  No combine data has been recorded for this team yet.
                </td>
              </tr>
            ) : (
              metrics.map((metric) => (
                <tr key={metric.id} className="border-t border-black/5 text-[13px]">
                  <td className="px-3 py-3 font-semibold text-container-foreground">
                    {metric.athlete_id ? athleteNameById[metric.athlete_id] ?? `#${metric.athlete_id}` : "Team entry"}
                  </td>
                  <td className="px-3 py-3">{formatValue(metric.sitting_height_cm)}</td>
                  <td className="px-3 py-3">{formatValue(metric.standing_height_cm)}</td>
                  <td className="px-3 py-3">{formatValue(metric.weight_kg)}</td>
                  <td className="px-3 py-3">{formatValue(metric.split_10m_s)}</td>
                  <td className="px-3 py-3">{formatValue(metric.split_20m_s)}</td>
                  <td className="px-3 py-3">{formatValue(metric.split_35m_s)}</td>
                  <td className="px-3 py-3">{formatValue(metric.yoyo_distance_m)}</td>
                  <td className="px-3 py-3">{formatValue(metric.jump_cm)}</td>
                  <td className="px-3 py-3">{formatValue(metric.max_power_kmh)}</td>
                  <td className="px-3 py-3">
                    {new Date(metric.recorded_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamCombineMetricsPanel;
