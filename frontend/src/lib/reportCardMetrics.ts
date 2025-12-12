import type { ReportSubmissionSummary } from "../api/reportSubmissions";

export type MetricKey = "SRS" | "LRS" | "DIS" | "TEC" | "MIN" | "PHY";

export const METRIC_LABELS: Record<MetricKey, string> = {
  SRS: "Short-Range Saves",
  LRS: "Long-Range Saves",
  DIS: "Distribution",
  TEC: "Technical Foundation",
  MIN: "Mindset",
  PHY: "Physicality",
};

const formatScore = (value: number | null | undefined) => {
  if (typeof value === "number") {
    return Math.round(value);
  }
  return null;
};

export const extractReportMetricScores = (
  submission: ReportSubmissionSummary,
): { metricScores: Record<MetricKey, number | null>; leadershipScore: number | null } => {
  const categories = submission.categories ?? [];
  const findCategory = (name: string) =>
    categories.find((cat) => cat.name?.toLowerCase() === name.toLowerCase());

  const categoryAverage = (name: string) => {
    const category = findCategory(name);
    if (!category) return null;
    if (typeof category.group_average === "number") return formatScore(category.group_average);
    const scores =
      category.metrics?.map((m) => m.score).filter((s): s is number => typeof s === "number") ??
      [];
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

  return { metricScores, leadershipScore };
};
