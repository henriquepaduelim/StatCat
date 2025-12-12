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

  if (!hasAnyValue) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-xl border border-black/10 bg-[#1f1f27] px-4 py-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-white/80">Radar</p>
        <p className="text-xs text-white/60">No radar data available yet.</p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full max-w-xl rounded-xl border border-black/10 px-4 pb-4 pt-3 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-semibold text-white">Radar</p>
      </div>
      <div className={heightClass ?? "h-64 w-full"}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#ffffff1f" />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: "#e5e7eb", fontSize: 12, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={22.5}
              domain={[0, 100]}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              stroke="#ffffff1f"
              tickCount={6}
            />
            <Radar
              name="Scores"
              dataKey="value"
              stroke="#c9184a"
              fill="#c9184a"
              fillOpacity={0.25}
              strokeWidth={2}
              dot={{ r: 2, fill: "#7af7b4", strokeWidth: 0 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#111118", border: "1px  #1f1f27" }}
              itemStyle={{ color: "#e5e7eb" }}
              formatter={(val: number, name: string) => [`${val}`, name]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportCardRadar;
