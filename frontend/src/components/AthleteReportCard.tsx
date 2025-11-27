import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useTranslation } from "../i18n/useTranslation";
import type { Athlete, AthleteReport } from "../types/athlete";
import { getMediaUrl } from "../utils/media";
import type { TestDefinition } from "../types/test";
import { useAthleteCombineMetrics } from "../hooks/useAthleteCombineMetrics";
import {
  ATHLETE_CATEGORY_COLORS,
  CATEGORY_KEYS,
  calculateAge,
  calculateSessionCategoryStats,
  computeBmi,
  normalizeCategory,
  safeParseDate,
} from "../utils/athlete-report";
import { chartPalette } from "../theme/chartPalette";

const numberFormatter = new Intl.NumberFormat("en-US");
const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const categoryColors = ATHLETE_CATEGORY_COLORS;

const timeframeDurations = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
} as const;

type TimeframeValue = keyof typeof timeframeDurations | "all";

type CombineMetricKey =
  | "sitting_height_cm"
  | "standing_height_cm"
  | "weight_kg"
  | "split_10m_s"
  | "split_20m_s"
  | "split_35m_s"
  | "yoyo_distance_m"
  | "jump_cm"
  | "max_power_kmh";

type MetricOption = {
  key: string;
  name: string;
  unit?: string;
  kind: "report" | "combine";
  targetDirection: "higher" | "lower";
  combineKey?: CombineMetricKey;
};

type AthleteReportCardProps = {
  athlete: Athlete | null | undefined;
  detailedAthlete?: Athlete | null;
  report?: AthleteReport;
  tests: TestDefinition[];
  hideRecentSessions?: boolean;
  className?: string;
};

type PerformancePoint = {
  sessionId: number;
  label: string;
  value: number;
  peerAverage: number | null;
  dateValue: number;
};

const COMBINE_METRIC_DEFINITIONS: Array<{
  key: CombineMetricKey;
  name: string;
  unit?: string;
  targetDirection: "higher" | "lower";
}> = [
  { key: "sitting_height_cm", name: "Sitting height (cm)", unit: "cm", targetDirection: "higher" },
  { key: "standing_height_cm", name: "Standing height (cm)", unit: "cm", targetDirection: "higher" },
  { key: "weight_kg", name: "Weight (kg)", unit: "kg", targetDirection: "lower" },
  { key: "split_10m_s", name: "10m sprint (s)", unit: "s", targetDirection: "lower" },
  { key: "split_20m_s", name: "20m sprint (s)", unit: "s", targetDirection: "lower" },
  { key: "split_35m_s", name: "35m sprint (s)", unit: "s", targetDirection: "lower" },
  { key: "yoyo_distance_m", name: "YoYo Distance (m)", unit: "m", targetDirection: "higher" },
  { key: "jump_cm", name: "Jump (cm)", unit: "cm", targetDirection: "higher" },
  { key: "max_power_kmh", name: "Max Shot Power (km/h)", unit: "km/h", targetDirection: "higher" },
];

const AthleteReportCard = ({
  athlete,
  detailedAthlete,
  report,
  tests,
  hideRecentSessions = false,
  className,
}: AthleteReportCardProps) => {
  const t = useTranslation();
  const [selectedMetricKey, setSelectedMetricKey] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeValue>("all");

  const combineMetricsQuery = useAthleteCombineMetrics(athlete?.id ?? detailedAthlete?.id);
  const combineMetrics = useMemo(() => combineMetricsQuery.data ?? [], [combineMetricsQuery.data]);

  const displayTests = useMemo(() => tests ?? [], [tests]);

  const testMetaMap = useMemo(() => {
    const map = new Map<
      number,
      {
        category: ReturnType<typeof normalizeCategory>;
        targetDirection: "higher" | "lower";
      }
    >();
    displayTests.forEach((test) => {
      map.set(test.id, {
        category: normalizeCategory(test.category),
        targetDirection: test.target_direction === "lower" ? "lower" : "higher",
      });
    });
    return map;
  }, [displayTests]);

  const sessionCategoryStats = useMemo(
    () => calculateSessionCategoryStats(report, testMetaMap),
    [report, testMetaMap]
  );

  const sessionSummaries = useMemo(
    () =>
      sessionCategoryStats
        .slice()
        .reverse()
        .map((stat) => ({
          id: stat.sessionId,
          name: stat.sessionName,
          date: stat.scheduledAt ? dateFormatter.format(stat.scheduledAt) : null,
          location: stat.location ?? null,
          categoryIndexes: stat.categoryIndexes,
        })),
    [sessionCategoryStats]
  );

  const recentSessions = sessionSummaries.slice(0, 3);

  const availableCombineKeys = useMemo(() => {
    const keys = new Set<CombineMetricKey>();
    combineMetrics.forEach((metric) => {
      COMBINE_METRIC_DEFINITIONS.forEach((definition) => {
        if (metric[definition.key] !== null && metric[definition.key] !== undefined) {
          keys.add(definition.key);
        }
      });
    });
    return keys;
  }, [combineMetrics]);

  const combineMetricOptions = useMemo<MetricOption[]>(() => {
    return COMBINE_METRIC_DEFINITIONS
      .filter((definition) => availableCombineKeys.has(definition.key))
      .map((definition) => ({
        key: `combine-${definition.key}`,
        name: definition.name,
        unit: definition.unit,
        kind: "combine" as const,
        targetDirection: definition.targetDirection,
        combineKey: definition.key,
      }));
  }, [availableCombineKeys]);

  // Only expose metrics that are collected via the UI (combine)
  const metricOptions: MetricOption[] = useMemo(() => [...combineMetricOptions], [combineMetricOptions]);

  useEffect(() => {
    if (!metricOptions.length) {
      setSelectedMetricKey(null);
      return;
    }
    if (!selectedMetricKey || !metricOptions.some((option) => option.key === selectedMetricKey)) {
      setSelectedMetricKey(metricOptions[0].key);
    }
  }, [metricOptions, selectedMetricKey]);

  const selectedMetricMeta = useMemo(() => {
    if (!selectedMetricKey) {
      return null;
    }
    return metricOptions.find((option) => option.key === selectedMetricKey) ?? null;
  }, [selectedMetricKey, metricOptions]);

  const timeframeOptions =
    (t.dashboard?.filters?.rangeOptions as Array<{ value: TimeframeValue; label: string }> | undefined) ??
    [
      { value: "30d", label: "30 days" },
      { value: "90d", label: "90 days" },
      { value: "180d", label: "180 days" },
      { value: "365d", label: "12 months" },
      { value: "all", label: "All time" },
    ];

  const filteredSessions = useMemo(() => {
    if (!report) {
      return [] as AthleteReport["sessions"];
    }
    if (timeframe === "all") {
      return report.sessions;
    }
    const days = timeframeDurations[timeframe];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return report.sessions.filter((session) => {
      const sessionDate =
        safeParseDate(session.scheduled_at) ??
        (session.results.length ? safeParseDate(session.results[0].recorded_at) : null);
      if (!sessionDate) {
        return true;
      }
      return sessionDate.getTime() >= cutoff;
    });
  }, [report, timeframe]);

  const filteredCombineMetrics = useMemo(() => {
    if (!combineMetrics.length) {
      return [] as typeof combineMetrics;
    }
    if (timeframe === "all") {
      return combineMetrics;
    }
    const days = timeframeDurations[timeframe];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return combineMetrics.filter((metric) => {
      const recorded = safeParseDate(metric.recorded_at);
      if (!recorded) {
        return true;
      }
      return recorded.getTime() >= cutoff;
    });
  }, [combineMetrics, timeframe]);

  const performanceSeries = useMemo(() => {
    if (!selectedMetricMeta) {
      return [] as PerformancePoint[];
    }

    if (selectedMetricMeta.kind === "combine" && selectedMetricMeta.combineKey) {
      const rows: PerformancePoint[] = [];
      filteredCombineMetrics.forEach((metric) => {
        const value = metric[selectedMetricMeta.combineKey!];
        if (value === null || value === undefined) {
          return;
        }
        const recorded = safeParseDate(metric.recorded_at);
        const dateValue = recorded ? recorded.getTime() : Date.now();
        rows.push({
          sessionId: metric.id,
          label: recorded ? dateFormatter.format(recorded) : `Entry ${metric.id}`,
          value,
          peerAverage: null,
          dateValue,
        });
      });
      return rows.sort((a, b) => a.dateValue - b.dateValue);
    }

    if (!filteredSessions.length) {
      return [] as PerformancePoint[];
    }
    const rows: PerformancePoint[] = [];
    filteredSessions.forEach((session) => {
      const metric = session.results.find(
        (result) => `report-${result.test_id}` === selectedMetricMeta.key
      );
      if (!metric) {
        return;
      }

      const referenceDate =
        safeParseDate(session.scheduled_at) ??
        safeParseDate(metric.recorded_at) ??
        null;

      rows.push({
        sessionId: session.session_id,
        label: referenceDate ? dateFormatter.format(referenceDate) : session.session_name,
        value: metric.value,
        peerAverage:
          typeof metric.peer_average === "number" ? Number(metric.peer_average) : null,
        dateValue: referenceDate ? referenceDate.getTime() : Date.now(),
      });
    });
    return rows.sort((a, b) => a.dateValue - b.dateValue);
  }, [filteredSessions, filteredCombineMetrics, selectedMetricMeta]);

  const performanceTicks = useMemo(
    () => performanceSeries.map((entry) => entry.dateValue),
    [performanceSeries]
  );

  const performanceValues = performanceSeries.map((entry) => entry.value);
  const hasPeerAverageLine =
    selectedMetricMeta?.kind === "report" && performanceSeries.some((entry) => entry.peerAverage != null);
  const bestValue = performanceValues.length
    ? selectedMetricMeta?.targetDirection === "lower"
      ? Math.min(...performanceValues)
      : Math.max(...performanceValues)
    : null;
  const averageValue = performanceValues.length
    ? performanceValues.reduce((acc, value) => acc + value, 0) / performanceValues.length
    : null;
  const lastValue = performanceSeries.length
    ? performanceSeries[performanceSeries.length - 1].value
    : null;
  const hasErrorOrEmpty = !selectedMetricMeta || performanceSeries.length === 0;

  const selectedTestUnit = selectedMetricMeta?.unit;

  const dominantFootOptions = t.newAthlete.dominantFootOptions;
  const dominantFootLabels: Record<string, string> = {
    right: dominantFootOptions.right,
    left: dominantFootOptions.left,
    both: dominantFootOptions.both,
  };

  const athleteAge = calculateAge(athlete?.birth_date ?? detailedAthlete?.birth_date);
  const athleteHeight = detailedAthlete?.height_cm ?? athlete?.height_cm;
  const athleteWeight = detailedAthlete?.weight_kg ?? athlete?.weight_kg;
  const athleteBmi = computeBmi(athleteHeight, athleteWeight);



  const metricsSummary = [
    {
      label: t.dashboard.athleteReport.ageLabel,
      value:
        athleteAge !== null ? numberFormatter.format(athleteAge) : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.athleteDetail.metrics.height,
      value:
        athleteHeight != null
          ? `${decimalFormatter.format(athleteHeight)} cm`
          : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.athleteDetail.metrics.weight,
      value:
        athleteWeight != null
          ? `${decimalFormatter.format(athleteWeight)} kg`
          : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.dashboard.athleteReport.bmiLabel,
      value:
        athleteBmi !== null ? decimalFormatter.format(athleteBmi) : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.athleteDetail.metrics.dominantFoot,
      value:
        (detailedAthlete?.dominant_foot ?? athlete?.dominant_foot)
          ? dominantFootLabels[detailedAthlete?.dominant_foot ?? athlete?.dominant_foot ?? ""] ??
            detailedAthlete?.dominant_foot ?? athlete?.dominant_foot ?? t.dashboard.athleteReport.notAvailable
          : t.dashboard.athleteReport.notAvailable,
    },
  ];

  const athletePhoto = getMediaUrl(detailedAthlete?.photo_url ?? athlete?.photo_url ?? null);

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-4 lg:w-84">
          <div className="relative h-64 w-56 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-primary/15 to-accent/10 shadow-lg">
            {athletePhoto ? (
              <img
                src={athletePhoto}
                alt={athlete ? `${athlete.first_name} ${athlete.last_name}` : "Athlete"}
                className="h-full w-full object-cover"
              />
            ) : athlete ? (
              <div className="flex h-full w-full items-center justify-center bg-action-primary/20 text-5xl font-semibold text-accent">
                {athlete.first_name.slice(0, 1)}
                {athlete.last_name.slice(0, 1)}
              </div>
            ) : null}
          </div>
          {athlete ? (
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-semibold text-container-foreground">
                {athlete.first_name} {athlete.last_name}
              </h3>
              <p className="text-base text-muted">
                {athlete.club_affiliation ?? t.dashboard.athleteReport.notAvailable}
              </p>
              {athlete.email ? <p className="text-xs text-muted">{athlete.email}</p> : null}
            </div>
          ) : null}
        </div>

        <div>
          <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {metricsSummary.map((item) => (
              
              <div
                key={item.label}
                className="min-w-0 rounded-xl border border-white/10 bg-container/60 px-5 py-4 text-base"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-container-foreground">{item.value}</p>
              </div>
            ))}
          </div>





          <div className="mt-6 space-y-4 overflow-hidden rounded-xl border border-white/10 bg-container/60 px-3 py-3 sm:px-4 md:px-6 md:py-6">
            {hasErrorOrEmpty ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t.playerProfile.noReportData}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-xl font-semibold text-container-foreground">
                  {t.dashboard.athleteReport.chartTitle}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2 print-hidden sm:flex sm:items-center sm:gap-3">
                <label className="text-xs font-medium text-muted">
                  {t.dashboard.filters.timeRangeLabel}
                  <select
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value as TimeframeValue)}
                    className="mt-1 w-full min-w-0 rounded-md border border-action-primary/30 bg-container/80 px-2 py-1 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary sm:ml-2 sm:w-28 sm:min-w-[7rem]"
                  >
                    {timeframeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <select
                  aria-label={t.dashboard.athleteReport.selectTestLabel}
                  value={selectedMetricKey ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedMetricKey(value || null);
                  }}
                  className="mt-1 w-full min-w-0 rounded-md border border-action-primary/30 bg-container/80 px-2 py-1 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary sm:ml-2 sm:w-32 sm:min-w-[8rem]"
                >
                  {metricOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-64">
              {performanceSeries.length ? (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceSeries} margin={{ top: 10, right: 20, bottom: 0, left: -40 }}>
                    <CartesianGrid stroke="rgba(244,162,64,0.1)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateValue"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      ticks={performanceTicks}
                      tick={{ fill: "rgba(244,162,64,0.8)" }}
                      tickFormatter={(value: number) => {
                        const match = performanceSeries.find((entry) => entry.dateValue === value);
                        return match?.label ?? dateFormatter.format(new Date(value));
                      }}
                    />
                    <YAxis tick={{ fill: "rgba(244,162,64,0.8)" }} />
                    <Tooltip
                      formatter={(value: number | string, name: string) => {
                        if (typeof value !== "number") {
                          const label =
                            name === "peerAverage"
                              ? t.dashboard.athleteReport.peerAverageLabel
                              : selectedMetricMeta?.name ?? t.dashboard.athleteReport.selectTestLabel;
                          return ["--", label];
                        }
                        const formattedValue = `${decimalFormatter.format(value)}${
                          selectedTestUnit ? ` ${selectedTestUnit}` : ""
                        }`;
                        if (name === "peerAverage") {
                          return [formattedValue, t.dashboard.athleteReport.peerAverageLabel];
                        }
                        return [
                          formattedValue,
                          selectedMetricMeta?.name ?? t.dashboard.athleteReport.selectTestLabel,
                        ];
                      }}
                      labelFormatter={(value) => {
                        const numeric = Number(value);
                        const match = performanceSeries.find((entry) => entry.dateValue === numeric);
                        return match?.label ?? dateFormatter.format(new Date(numeric));
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(5, 12, 24, 0.92)",
                        border: `1px solid ${chartPalette.athleteLines.value}4D`, // 0.3 alpha
                        borderRadius: "0.75rem",
                        color: chartPalette.athleteLines.fill,
                      }}
                    />
                    {hasPeerAverageLine ? (
                      <Line
                        type="monotone"
                        dataKey="peerAverage"
                        stroke={chartPalette.athleteLines.peer}
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        dot={false}
                        isAnimationActive={false}
                      />
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="value"
                    stroke={chartPalette.athleteLines.value}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted">{t.dashboard.athleteReport.chartEmpty}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 px-2 sm:px-0">
              <div className="rounded-lg border border-black/30 bg-container px-2.5 py-2 text-sm dark:border-[rgb(var(--color-border))] sm:px-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.dashboard.athleteReport.bestValueLabel}
                </p>
                <p className="mt-1 text-base font-semibold text-container-foreground sm:text-lg">
                  {bestValue !== null
                    ? `${decimalFormatter.format(bestValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                    : t.dashboard.athleteReport.notAvailable}
                </p>
              </div>
              <div className="rounded-lg border border-black/30 bg-container px-2.5 py-2 text-sm dark:border-[rgb(var(--color-border))] sm:px-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.dashboard.athleteReport.lastValueLabel}
                </p>
                <p className="mt-1 text-base font-semibold text-container-foreground sm:text-lg">
                  {lastValue !== null
                    ? `${decimalFormatter.format(lastValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                    : t.dashboard.athleteReport.notAvailable}
                </p>
              </div>
              <div className="rounded-lg border border-black/30 bg-container px-2.5 py-2 text-sm dark:border-[rgb(var(--color-border))] sm:px-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.dashboard.athleteReport.averageLabel}
                </p>
                <p className="mt-1 text-base font-semibold text-container-foreground sm:text-lg">
                  {averageValue !== null
                    ? `${decimalFormatter.format(averageValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                    : t.dashboard.athleteReport.notAvailable}
                </p>
              </div>
            </div>
          </div>

          {hideRecentSessions ? null : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-container-foreground">
                {t.dashboard.athleteReport.recentSessionsTitle}
              </h4>
              {recentSessions.length ? (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-white/10 bg-container/60 p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-container-foreground">{session.name}</p>
                          <p className="text-xs text-muted">
                            {session.date ?? t.dashboard.athleteReport.notAvailable}
                            {session.location ? ` • ${session.location}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          {CATEGORY_KEYS.map((category) => {
                            const value = session.categoryIndexes[category];
                            return (
                            <span key={`${session.id}-${category}`} className="flex items-center gap-1">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: categoryColors[category] }}
                              />
                                {value != null
                                  ? numberFormatter.format(value)
                                  : t.dashboard.athleteReport.notAvailable}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t.dashboard.athleteReport.chartEmpty}</p>
              )}
            </div>  
          )}
        </div>
      </div>
    </div>
  );
};

export default AthleteReportCard;
