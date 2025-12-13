import { Fragment } from "react";
import type { ReportSubmissionSummary } from "../api/reportSubmissions";
import type { Athlete } from "../types/athlete";
import { extractReportMetricScores, type MetricKey } from "../lib/reportCardMetrics";
import { getMediaUrl } from "../utils/media";

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

  const { metricScores, leadershipScore } = extractReportMetricScores(submission);

  const apiBase =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const photoUrl = athlete?.photo_url
    ? athlete.photo_url.startsWith("http")
      ? athlete.photo_url
      : `${apiBase.replace(/\/$/, "")}/${athlete.photo_url.replace(/^\//, "")}`
    : null;
  // Flag now served from frontend public assets
  const flagUrl = getMediaUrl("/media/flags/ca.svg");

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
            {flagUrl ? (
              <img src={flagUrl} alt="Canada flag" className="block h-auto w-full" />
            ) : null}
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

      <div className="relative grid grid-cols-[1fr,auto,auto,1fr] gap-y-2 px-3 py-3">
        <div className="pointer-events-none absolute inset-y-2 left-1/2 w-px bg-white/15" aria-hidden="true" />
        {([
          ["SRS", "TEC"],
          ["LRS", "MIN"],
          ["DIS", "PHY"],
        ] as [MetricKey, MetricKey][]).map(([leftKey, rightKey]) => (
          <Fragment key={`${leftKey}-${rightKey}`}>
            <div className="flex items-baseline justify-start text-sm pr-2">
              <span className="text-[0.9rem] font-semibold tracking-wide leading-none">
                {leftKey}
              </span>
            </div>
            <div className="flex items-baseline justify-start text-sm pr-2">
              <span className="text-[1.21rem] font-extrabold leading-none">
                {metricScores[leftKey] ?? "—"}
              </span>
            </div>
            <div className="flex items-baseline justify-end text-sm pl-2">
              <span className="text-[0.9rem] font-semibold tracking-wide leading-none">
                {rightKey}
              </span>
            </div>
            <div className="flex items-baseline justify-end text-sm pl-2">
              <span className="text-[1.21rem] font-extrabold leading-none">
                {metricScores[rightKey] ?? "—"}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default ReportCardBadge;
