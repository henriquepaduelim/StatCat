import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useTranslation } from "../i18n/useTranslation";
import type { Athlete, AthleteReport } from "../types/athlete";
import { getMediaUrl } from "../utils/media";
import type { TestDefinition } from "../types/test";
import {
  ATHLETE_CATEGORY_COLORS,
  CATEGORY_KEYS,
  calculateAge,
  calculateSessionCategoryStats,
  computeBmi,
  normalizeCategory,
  safeParseDate,
} from "../utils/athlete-report";

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

const chartPalette = ATHLETE_CATEGORY_COLORS;

const timeframeDurations = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
} as const;

type TimeframeValue = keyof typeof timeframeDurations | "all";

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

const AthleteReportCard = ({
  athlete,
  detailedAthlete,
  report,
  tests,
  hideRecentSessions = false,
  className,
}: AthleteReportCardProps) => {
  const t = useTranslation();
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeValue>("all");

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

  const testOptions = useMemo(() => {
    if (!report) {
      return [] as Array<{ id: number; name: string; unit?: string }>;
    }
    const lookup = new Map<number, { name: string; unit?: string | null }>();
    report.sessions.forEach((session) => {
      session.results.forEach((metric) => {
        if (!lookup.has(metric.test_id)) {
          lookup.set(metric.test_id, {
            name: metric.test_name,
            unit: metric.unit,
          });
        }
      });
    });
    return Array.from(lookup.entries()).map(([id, meta]) => ({
      id,
      name: meta.name,
      unit: meta.unit ?? undefined,
    }));
  }, [report]);

  useEffect(() => {
    if (!testOptions.length) {
      setSelectedTestId(null);
      return;
    }
    if (!selectedTestId || !testOptions.some((option) => option.id === selectedTestId)) {
      setSelectedTestId(testOptions[0].id);
    }
  }, [testOptions, selectedTestId]);

  const selectedTestMeta = useMemo(() => {
    if (!selectedTestId) {
      return null;
    }
    const fromReport = testOptions.find((option) => option.id === selectedTestId);
    const fromDefinitions = displayTests.find((test) => test.id === selectedTestId);
    return {
      name: fromReport?.name ?? fromDefinitions?.name ?? "",
      unit: fromReport?.unit ?? fromDefinitions?.unit ?? undefined,
      targetDirection: fromDefinitions?.target_direction === "lower" ? "lower" : "higher",
    };
  }, [selectedTestId, testOptions, displayTests]);

  const timeframeOptions = t.dashboard.filters.rangeOptions as Array<{
    value: TimeframeValue;
    label: string;
  }>;

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

  const performanceSeries = useMemo(() => {
    if (!filteredSessions.length || !selectedTestId) {
      return [] as PerformancePoint[];
    }
    const rows: PerformancePoint[] = [];
    filteredSessions.forEach((session) => {
      const metric = session.results.find((result) => result.test_id === selectedTestId);
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
  }, [filteredSessions, selectedTestId]);

  const performanceTicks = useMemo(
    () => performanceSeries.map((entry) => entry.dateValue),
    [performanceSeries]
  );

  const performanceValues = performanceSeries.map((entry) => entry.value);
  const hasPeerAverageLine = performanceSeries.some((entry) => entry.peerAverage != null);
  const bestValue = performanceValues.length
    ? selectedTestMeta?.targetDirection === "lower"
      ? Math.min(...performanceValues)
      : Math.max(...performanceValues)
    : null;
  const averageValue = performanceValues.length
    ? performanceValues.reduce((acc, value) => acc + value, 0) / performanceValues.length
    : null;
  const lastValue = performanceSeries.length
    ? performanceSeries[performanceSeries.length - 1].value
    : null;

  const selectedTestUnit = selectedTestMeta?.unit;

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





          <div className="mt-6 space-y-4 overflow-hidden rounded-xl border border-white/10 bg-container/60 px-0 py-3 sm:px-2 md:px-6 md:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-xl font-semibold text-container-foreground">
                  {t.dashboard.athleteReport.chartTitle}
                </h4>
                <p className="text-sm text-muted">
                  {selectedTestMeta?.name || t.dashboard.filters.athletePlaceholder}
                </p>
              </div>
              <div className="flex flex-col gap-2 print-hidden sm:flex-row sm:items-center sm:gap-3">
                <label className="text-xs font-medium text-muted">
                  {t.dashboard.filters.timeRangeLabel}
                  <select
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value as TimeframeValue)}
                    className="ml-2 w-32 rounded-md border border-action-primary/30 bg-container/80 px-2 py-1 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    {timeframeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-muted">
                  {t.dashboard.athleteReport.selectTestLabel}
                  <select
                    value={selectedTestId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedTestId(value ? Number(value) : null);
                    }}
                    className="ml-2 w-40 rounded-md border border-action-primary/30 bg-container/80 px-2 py-1 text-sm text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
                  >
                    {testOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="h-64">
              {performanceSeries.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceSeries} margin={{ top: 10, right: 5, bottom: 0, left: -15 }}>
                    <CartesianGrid stroke="rgba(0,0,0,0.1)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateValue"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      ticks={performanceTicks}
                      tick={{ fill: "rgba(0,0,0,0.5)" }}
                      tickFormatter={(value: number) => {
                        const match = performanceSeries.find((entry) => entry.dateValue === value);
                        return match?.label ?? dateFormatter.format(new Date(value));
                      }}
                    />
                    <YAxis tick={{ fill: "rgba(0,0,0,0.5)" }} />
                    <Tooltip
                      formatter={(value: number | string, name: string) => {
                        if (typeof value !== "number") {
                          const label =
                            name === "peerAverage"
                              ? t.dashboard.athleteReport.peerAverageLabel
                              : selectedTestMeta?.name ?? t.dashboard.athleteReport.selectTestLabel;
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
                          selectedTestMeta?.name ?? t.dashboard.athleteReport.selectTestLabel,
                        ];
                      }}
                      labelFormatter={(value) => {
                        const numeric = Number(value);
                        const match = performanceSeries.find((entry) => entry.dateValue === numeric);
                        return match?.label ?? dateFormatter.format(new Date(numeric));
                      }}
                      contentStyle={{
                        backgroundColor: "rgba(5, 12, 24, 0.92)",
                        border: "1px solid rgba(123, 97, 255, 0.3)",
                        borderRadius: "0.75rem",
                        color: "#E2F2FF",
                      }}
                    />
                    {hasPeerAverageLine ? (
                      <Line
                        type="monotone"
                        dataKey="peerAverage"
                        stroke="#f97316"
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        dot={false}
                        isAnimationActive={false}
                      />
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#7B61FF"
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.dashboard.athleteReport.bestValueLabel}
                </p>
                <p className="mt-1 text-lg font-semibold text-container-foreground">
                  {bestValue !== null
                    ? `${decimalFormatter.format(bestValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                    : t.dashboard.athleteReport.notAvailable}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.dashboard.athleteReport.lastValueLabel}
                </p>
                <p className="mt-1 text-lg font-semibold text-container-foreground">
                  {lastValue !== null
                    ? `${decimalFormatter.format(lastValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                    : t.dashboard.athleteReport.notAvailable}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t.dashboard.athleteReport.averageLabel}
                </p>
                <p className="mt-1 text-lg font-semibold text-container-foreground">
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
                                  style={{ backgroundColor: chartPalette[category] }}
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
