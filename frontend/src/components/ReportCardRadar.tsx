import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ReportSubmissionSummary } from "../api/reportSubmissions";
import { extractReportMetricScores } from "../lib/reportCardMetrics";

type ReportCardRadarProps = {
  submission: ReportSubmissionSummary;
  className?: string;
  heightClass?: string;
};

const ReportCardRadar = ({ submission, className = "", heightClass }: ReportCardRadarProps) => {
  const { metricScores, leadershipScore } = extractReportMetricScores(submission);

  const data = [
    { label: "SRS", value: metricScores.SRS ?? 0 },
    { label: "LRS", value: metricScores.LRS ?? 0 },
    { label: "DIS", value: metricScores.DIS ?? 0 },
    { label: "TEC", value: metricScores.TEC ?? 0 },
    { label: "MIN", value: metricScores.MIN ?? 0 },
    { label: "PHY", value: metricScores.PHY ?? 0 },
    { label: "LEAD", value: leadershipScore ?? 0 },
  ];

  const hasAnyValue = data.some((point) => typeof point.value === "number" && point.value > 0);

  const radarColors = {
    background: "var(--radar-bg, transparent)",
    grid: "var(--radar-grid, #ffffff1f)",
    axis: "var(--radar-axis, #e5e7eb)",
    radius: "var(--radar-radius, #9ca3af)",
    stroke: "var(--radar-stroke, #c9184a)",
    fill: "var(--radar-fill, #c9184a)",
    dot: "var(--radar-dot, #7af7b4)",
    tooltipBg: "var(--radar-tooltip-bg, #111118)",
    tooltipBorder: "var(--radar-tooltip-border, #111118)",
    tooltipText: "var(--radar-tooltip-text, #e5e7eb)",
    title: "var(--radar-title, #ffffff)",
    subtitle: "var(--radar-subtitle, #e5e7eb)",
  };

  if (!hasAnyValue) {
    return (
      <div
        className="report-card-radar mx-auto w-full max-w-xl rounded-xl border border-black/10 px-4 py-6 text-center shadow-sm"
        style={{ backgroundColor: radarColors.background }}
      >
        <p className="text-sm font-semibold" style={{ color: radarColors.title }}>
          Radar
        </p>
        <p className="text-xs" style={{ color: radarColors.subtitle }}>
          No radar data available yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`report-card-radar mx-auto w-full max-w-xl rounded-xl border border-black/10 px-4 pb-4 pt-3 shadow-sm ${className}`}
      style={{ backgroundColor: radarColors.background }}
    >
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-semibold" style={{ color: radarColors.title }}>
          Radar
        </p>
      </div>
      <div className={heightClass ?? "h-64 w-full"}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke={radarColors.grid} />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: radarColors.axis, fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={67.5}
              domain={[0, 100]}
              tick={{ fill: radarColors.radius, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              stroke={radarColors.grid}
              tickCount={6}
            />
            <Radar
              name="Scores"
              dataKey="value"
              stroke={radarColors.stroke}
              fill={radarColors.fill}
              fillOpacity={0.25}
              strokeWidth={2}
              dot={{ r: 2, fill: radarColors.dot, strokeWidth: 0 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: radarColors.tooltipBg,
                border: `1px solid ${radarColors.tooltipBorder}`,
              }}
              itemStyle={{ color: radarColors.tooltipText }}
              formatter={(val: number, name: string) => [`${val}`, name]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportCardRadar;
