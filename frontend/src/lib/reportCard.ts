import type { ReportCardCategory } from "../types/reportCard";

export type ScoreBand = "low" | "medium" | "high";

export const getScoreBand = (score: number | null | undefined): ScoreBand | null => {
  if (score === null || score === undefined) {
    return null;
  }
  if (score < 35) return "low";
  if (score <= 65) return "medium";
  return "high";
};

const templateCategories: ReportCardCategory[] = [
  {
    name: "Mindset",
    metrics: [
      { name: "Self-Awareness", score: null },
      { name: "Regulation", score: null },
      { name: "Self-Confidence", score: null },
      { name: "Leadership", score: null },
      { name: "Resilience", score: null },
      { name: "Motivation", score: null },
    ],
  },
  {
    name: "Physicality",
    metrics: [
      { name: "Speed + Agility", score: null },
      { name: "Power", score: null },
      { name: "Balance + Coordination", score: null },
      { name: "Flexibility + Mobility", score: null },
      { name: "Repeat Power + Endurance", score: null },
    ],
  },
  {
    name: "Technical Foundation",
    metrics: [
      { name: "Footwork + Positioning", score: null },
      { name: "First Touch + Ball Mastery", score: null },
      { name: "Short-Range Passing", score: null },
      { name: "Mid/Long-Range Distribution", score: null },
      { name: "Distribution with Hands", score: null },
      { name: "High Balls + Aerial Challenges", score: null },
      { name: "Catching/Handling", score: null },
      { name: "Low Dives + Smothers", score: null },
      { name: "Mid/Half Dives", score: null },
      { name: "High Dives/Parries/Tips", score: null },
      { name: "Breakaways", score: null },
      { name: "Penalties", score: null },
    ],
  },
];

export const createEmptyReportCardCategories = (): ReportCardCategory[] =>
  templateCategories.map((category) => ({
    name: category.name,
    metrics: category.metrics.map((metric) => ({ ...metric })),
  }));

export const countFilledScores = (categories: ReportCardCategory[]): number => {
  return categories.reduce((total, category) => {
    const filled = category.metrics.filter((metric) => metric.score !== null && metric.score !== undefined);
    return total + filled.length;
  }, 0);
};
