import type { ReportSubmissionSummary } from "../api/reportSubmissions";
import type { Athlete } from "../types/athlete";

type MetricKey = "SRS" | "LRS" | "DIS" | "TEC" | "MIN" | "PHY";

const METRIC_LABELS: Record<MetricKey, string> = {
  SRS: "Short-Range Saves",
  LRS: "Long-Range Saves",
  DIS: "Distribution",
  TEC: "Technical Foundation",
  MIN: "Mindset",
  PHY: "Physicality",
};

const POSITION_MAP: Record<string, string> = {
  goalkeeper: "GK",
  gk: "GK",

  "right back": "RB",
  rb: "RB",
  "center back": "CB",
  "centre back": "CB",
  cb: "CB",
  "left back": "LB",
  lb: "LB",

  "defensive midfielder": "CDM",
  cdm: "CDM",
  "central midfielder": "CM",
  cm: "CM",
  "attacking midfielder": "CAM",
  cam: "CAM",

  "right winger": "RW",
  rw: "RW",
  "left winger": "LW",
  lw: "LW",

  striker: "ST",
  st: "ST",
  "center forward": "CF",
  "centre forward": "CF",
  cf: "CF",
};

type ReportCardBadgeProps = {
  submission: ReportSubmissionSummary;
  athlete: Athlete | undefined;
};

const formatScore = (value: number | null | undefined) => {
  if (typeof value === "number") {
    return Math.round(value);
  }
  return null;
};

export const ReportCardBadge = ({ submission, athlete }: ReportCardBadgeProps) => {
  const overall = formatScore(submission.overall_average);

  const categories = submission.categories ?? [];
  const findCategory = (name: string) =>
    categories.find((cat) => cat.name?.toLowerCase() === name.toLowerCase());

  const categoryAverage = (name: string) => {
    const category = findCategory(name);
    if (!category) return null;
    if (typeof category.group_average === "number") return formatScore(category.group_average);
    const scores = category.metrics?.map((m) => m.score).filter((s): s is number => typeof s === "number") ?? [];
    if (!scores.length) return null;
    return formatScore(scores.reduce((sum, val) => sum + val, 0) / scores.length);
  };

  const scoreFromCategoryMetric = (categoryName: string, metricLabel: string) => {
    const category = findCategory(categoryName);
    if (!category) return null;
    const match = category.metrics?.find(
      (metric) => metric.name?.toLowerCase() === metricLabel.toLowerCase(),
    );
    return formatScore(match?.score);
  };

  const leadershipScore = scoreFromCategoryMetric("Mindset", "Leadership");

  const metricScores: Record<MetricKey, number | null> = {
    SRS: scoreFromCategoryMetric(METRIC_LABELS.TEC, METRIC_LABELS.SRS),
    LRS: scoreFromCategoryMetric(METRIC_LABELS.TEC, METRIC_LABELS.LRS),
    DIS: scoreFromCategoryMetric(METRIC_LABELS.TEC, METRIC_LABELS.DIS),
    TEC: categoryAverage(METRIC_LABELS.TEC),
    MIN: categoryAverage(METRIC_LABELS.MIN),
    PHY: categoryAverage(METRIC_LABELS.PHY),
  };

  const apiBase =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const photoUrl = athlete?.photo_url
    ? athlete.photo_url.startsWith("http")
      ? athlete.photo_url
      : `${apiBase.replace(/\/$/, "")}/${athlete.photo_url.replace(/^\//, "")}`
    : null;
  const flagUrl = `${apiBase.replace(/\/$/, "")}/media/flags/ca.svg`;

  const positionLabel = (() => {
    const raw = athlete?.primary_position?.toLowerCase().trim();
    if (!raw) return "";
    if (["unknown", "unk", "n/a", "na"].includes(raw)) return "";
    if (POSITION_MAP[raw]) return POSITION_MAP[raw];
    if (athlete?.primary_position) return athlete.primary_position.toUpperCase();
    return "";
  })();

  return (
    <div className="w-full max-w-[17.25rem] rounded-2xl bg-[#22232f] text-white shadow-md">
      <div className="flex h-64 overflow-hidden rounded-t-2xl">
        <div className="flex w-[20%] flex-col items-center justify-center gap-3 py-4">
          <div className="text-4xl font-extrabold leading-none">{overall ?? "—"}</div>
          <div className="w-full text-center text-lg font-semibold uppercase tracking-[0.2em] leading-none">
            {positionLabel}
          </div>
          <div className="h-px w-10 bg-white/70" />
          <div className="w-12">
            <img src={flagUrl} alt="Canada flag" className="block h-auto w-full" />
          </div>
        </div>
        <div className="flex w-[80%] items-center justify-center bg-[#d9d9d9]">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${athlete?.first_name ?? "Athlete"} photo`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/50 bg-white/40 text-xs font-semibold text-[#22232f]">
              No photo
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#7af7b4] px-3 py-2 text-[#121212]">
        <span className="text-xs font-semibold uppercase tracking-[0.15em]">Leadership score</span>
        <span className="text-lg font-bold">{leadershipScore ?? "—"}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 px-3 py-3">
        {(
          [
            ["SRS", "LRS", "DIS"],
            ["TEC", "MIN", "PHY"],
          ] as MetricKey[][]
        ).map((column, index) => (
          <div
            key={index}
            className="space-y-1.5 border-l border-white/10 pl-3 first:border-none first:pl-0"
          >
            {column.map((key) => (
              <div key={key} className="flex items-baseline justify-between text-sm">
                <span className="text-[1.1rem] font-extrabold">{metricScores[key] ?? "—"}</span>
                <span className="text-[0.82rem] font-semibold tracking-wide">{key}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportCardBadge;
