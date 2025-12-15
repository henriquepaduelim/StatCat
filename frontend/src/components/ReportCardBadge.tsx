import { Fragment } from "react";
import type { ReportSubmissionSummary } from "../api/reportSubmissions";
import type { Athlete } from "../types/athlete";
import { extractReportMetricScores, type MetricKey } from "../lib/reportCardMetrics";
import { getMediaUrl } from "../utils/media";
import branding from "../theme/branding.generated";
import { useState } from "react";

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
  const [flipped, setFlipped] = useState(false);
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
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className="w-full max-w-[17.25rem] rounded-2xl shadow-md overflow-hidden focus:outline-none focus:ring-0 focus:ring-offset-0"
      style={{ perspective: "1200px", color: "rgb(var(--badge-text))" }}
      aria-pressed={flipped}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "26rem",
        }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            backgroundColor: "#1f202b",
            borderRadius: "0px",
            overflow: "hidden",
          }}
        >
          <div className="flex h-64 overflow-hidden">
            <div
              className="flex w-[20%] flex-col items-center justify-center gap-3 py-4"
              style={{ backgroundColor: "#1f202b" }}
            >
              <div className="text-4xl font-extrabold leading-none">{overall ?? "—"}</div>
              <div className="w-full text-center text-lg font-semibold uppercase tracking-[0.2em] leading-none">
                {positionLabel}
              </div>
              <div className="h-px w-10" style={{ backgroundColor: "rgba(255,255,255,0.6)" }} />
              <div className="w-12">
                {flagUrl ? (
                  <img src={flagUrl} alt="Canada flag" className="block h-auto w-full" />
                ) : null}
              </div>
            </div>
            <div className="flex w-[80%] items-center justify-center" style={{ backgroundColor: "#d9d9d9" }}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`${athlete?.first_name ?? "Athlete"} photo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-white/50 bg-white/40 text-xs font-semibold text-[#ffffff]">
                  No photo
                </div>
              )}
            </div>
          </div>

          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              backgroundColor: "#30e3a6",
              color: "#0b0f1a",
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.15em]">Leadership score</span>
            <span className="text-lg font-bold">{leadershipScore ?? "—"}</span>
          </div>

          <div
            className="relative grid grid-cols-[1fr,auto,auto,1fr] gap-y-2 px-3 py-3"
            style={{ backgroundColor: "#1f202b" }}
          >
            <div
              className="pointer-events-none absolute inset-y-2 left-1/2 w-px"
              aria-hidden="true"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            />
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

        {/* Back face */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "#212529",
            color: "#0b0f1a",
            
          }}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <img
              src={branding.assets.logo}
              alt={`${branding.name} logo`}
              className="h-48 w-auto drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </button>
  );
};

export default ReportCardBadge;
