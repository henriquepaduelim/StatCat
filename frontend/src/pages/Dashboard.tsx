import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchDashboardSummary } from "../api/dashboard";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthlete } from "../hooks/useAthlete";
import { useAthletes } from "../hooks/useAthletes";
import { useTests } from "../hooks/useTests";
import { useTranslation } from "../i18n/useTranslation";
import { useThemeStore } from "../theme/useThemeStore";
import type { Athlete, AthleteReport } from "../types/athlete";
import type { TestDefinition } from "../types/test";
import { useAuthStore } from "../stores/useAuthStore";
import AdminDashboard from "./AdminDashboard";
const chartPalette = {
  Physical: "#F11E48",
  Technical: "#7B61FF",
} as const;

const donutColors = {
  athlete: "#7B61FF",
  team: "#F11E48",
  remainder: "rgba(255, 255, 255, 0.5)",
} as const;

const summaryColors = {
  active: "#34d399",
  inactive: "#F11E48",
} as const;

const axisTickColor = "rgba(0, 0, 0, 0.50)";
const gridColor = "rgba(0, 0, 0, 0.3)";
const MAX_INDEX = 160;

const timeframeDurations = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
} as const;

type TimeframeValue = keyof typeof timeframeDurations | "all";

type CategoryKey = "Physical" | "Technical";

const CATEGORY_KEYS: CategoryKey[] = ["Physical", "Technical"];

type CategoryIndexes = Record<CategoryKey, number | null>;
type CategoryCounts = Record<CategoryKey, number>;

type SessionCategoryStat = {
  sessionId: number;
  sessionName: string;
  scheduledAt: Date | null;
  location?: string | null;
  categoryIndexes: CategoryIndexes;
  categoryCounts: CategoryCounts;
};

const safeParseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const calculateAge = (birthDate?: string | null): number | null => {
  const birth = safeParseDate(birthDate);
  if (!birth) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const computeBmi = (heightCm?: number | null, weightKg?: number | null): number | null => {
  if (!heightCm || !weightKg) {
    return null;
  }
  const heightMeters = heightCm / 100;
  if (heightMeters <= 0) {
    return null;
  }
  return weightKg / (heightMeters * heightMeters);
};

const createZeroRecord = (): Record<CategoryKey, number> =>
  CATEGORY_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<CategoryKey, number>);

const createEmptyIndexes = (): CategoryIndexes =>
  CATEGORY_KEYS.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as CategoryIndexes);

const computeIndexValue = (
  direction: "higher" | "lower",
  baselineValue: number,
  currentValue: number
): number => {
  if (!baselineValue || !currentValue) {
    return 100;
  }
  if (direction === "lower") {
    return clampIndex((baselineValue / currentValue) * 100);
  }
  return clampIndex((currentValue / baselineValue) * 100);
};

const calculateSessionCategoryStats = (
  report: AthleteReport | undefined,
  testMetaMap: Map<
    number,
    {
      category: CategoryKey | null;
      targetDirection: "higher" | "lower";
    }
  >
): SessionCategoryStat[] => {
  if (!report || !report.sessions.length) {
    return [];
  }

  const sessions = [...report.sessions].sort((a, b) => {
    const dateA = safeParseDate(a.scheduled_at)?.getTime() ?? 0;
    const dateB = safeParseDate(b.scheduled_at)?.getTime() ?? 0;
    if (dateA === dateB) {
      return a.session_id - b.session_id;
    }
    return dateA - dateB;
  });

  const baselineByTest = new Map<number, number>();
  const stats: SessionCategoryStat[] = [];

  sessions.forEach((sessionReport) => {
    const sums = createZeroRecord();
    const counts = createZeroRecord();

    sessionReport.results.forEach((metric) => {
      const meta = testMetaMap.get(metric.test_id);
      if (!meta || !meta.category || metric.value == null) {
        return;
      }

      if (!baselineByTest.has(metric.test_id)) {
        baselineByTest.set(metric.test_id, metric.value);
      }

      const baselineValue = baselineByTest.get(metric.test_id) ?? metric.value;
      const indexValue = computeIndexValue(meta.targetDirection, baselineValue, metric.value);
      sums[meta.category] += indexValue;
      counts[meta.category] += 1;
    });

    const categoryIndexes = createEmptyIndexes();
    CATEGORY_KEYS.forEach((category) => {
      const count = counts[category];
      categoryIndexes[category] = count ? Number((sums[category] / count).toFixed(1)) : null;
    });

    stats.push({
      sessionId: sessionReport.session_id,
      sessionName: sessionReport.session_name,
      scheduledAt: safeParseDate(sessionReport.scheduled_at),
      location: sessionReport.location,
      categoryIndexes,
      categoryCounts: counts,
    });
  });

  return stats;
};

const normalizeCategory = (value?: string | null): CategoryKey | null => {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (
    ["physical", "speed", "power", "strength", "endurance"].some((term) => normalized.includes(term))
  ) {
    return "Physical";
  }
  if (["technical", "skills", "dribble"].some((term) => normalized.includes(term))) {
    return "Technical";
  }
  return null;
};

const clampIndex = (value: number) => Math.max(40, Math.min(value, 160));

const Dashboard = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: _athletes } = useAthletes(clientId);
  const { data: _tests } = useTests(clientId);

  const athletes = _athletes ?? [];
  const tests = _tests ?? [];
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeValue>("90d");
  const t = useTranslation();
  const userRole = useAuthStore((state) => state.user?.role ?? "staff");
  const reportQuery = useAthleteReport(selectedAthleteId ?? undefined);
  const report = reportQuery.data;
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 1000 * 60,
  });
  const { data: detailedAthlete } = useAthlete(
    Number.isFinite(selectedAthleteId) ? (selectedAthleteId as number) : Number.NaN
  );
  const summaryLabels = t.dashboard.summary;
  const athletesSummary = summaryQuery.data?.athletes;
  const athleteSummaryData = useMemo(() => {
    if (!athletesSummary) {
      return [] as Array<{ name: string; value: number; color: string }>;
    }
    return [
      {
        name: summaryLabels.activeAthletes,
        value: athletesSummary.active,
        color: summaryColors.active,
      },
      {
        name: summaryLabels.inactiveAthletes,
        value: athletesSummary.inactive,
        color: summaryColors.inactive,
      },
    ];
  }, [athletesSummary, summaryLabels.activeAthletes, summaryLabels.inactiveAthletes]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 }),
    []
  );
  const signedFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { signDisplay: "always", maximumFractionDigits: 1 }),
    []
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }),
    []
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }),
    []
  );

  const displayAthletes = useMemo(() => athletes, [athletes]);

  useEffect(() => {
    if (!selectedAthleteId && displayAthletes.length) {
      setSelectedAthleteId(displayAthletes[0].id);
    }
  }, [displayAthletes, selectedAthleteId]);

  const displayTests = useMemo(() => tests, [tests]);

  const testMetaMap = useMemo(
    () => {
      const map = new Map<
        number,
        {
          category: CategoryKey | null;
          targetDirection: "higher" | "lower";
        }
      >();
      displayTests.forEach((test) => {
        map.set(test.id, {
          category: normalizeCategory(test.category) as CategoryKey | null,
          targetDirection: test.target_direction === "lower" ? "lower" : "higher",
        });
      });
      return map;
    },
    [displayTests]
  );

  const sessionCategoryStats = useMemo(
    () => calculateSessionCategoryStats(report, testMetaMap),
    [report, testMetaMap]
  );

  const latestStat = sessionCategoryStats.length
    ? sessionCategoryStats[sessionCategoryStats.length - 1]
    : null;
  const previousStat = sessionCategoryStats.length > 1
    ? sessionCategoryStats[sessionCategoryStats.length - 2]
    : null;

  const mainSkills = useMemo(() => {
    if (!latestStat) {
      return [] as Array<{ category: CategoryKey; current: number | null; delta: number | null }>;
    }
    return CATEGORY_KEYS.map((category) => {
      const current = latestStat.categoryIndexes[category] ?? null;
      const previous = previousStat?.categoryIndexes[category] ?? null;
      const delta =
        current != null && previous != null
          ? Number((current - previous).toFixed(1))
          : null;
      return { category, current, delta };
    });
  }, [latestStat, previousStat]);

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
    [sessionCategoryStats, dateFormatter]
  );

  const testOptions = useMemo(() => {
    if (!report) {
      return [];
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

  const selectedAthlete = useMemo(() => {
    if (selectedAthleteId === null) {
      return null;
    }
    return displayAthletes.find((athlete) => athlete.id === selectedAthleteId) ?? null;
  }, [displayAthletes, selectedAthleteId]);

  const selectedTestMeta = useMemo(() => {
    if (!selectedTestId) {
      return null;
    }
    const fromReport = testOptions.find((option) => option.id === selectedTestId);
    const fromDefinitions = displayTests.find((test) => test.id === selectedTestId);
    return {
      name: fromReport?.name ?? fromDefinitions?.name ?? "",
      unit: fromReport?.unit ?? fromDefinitions?.unit ?? undefined,
      targetDirection: fromDefinitions?.target_direction ?? "higher",
    };
  }, [selectedTestId, testOptions, displayTests]);

  const performanceSeries = useMemo(() => {
    if (!report || !selectedTestId) {
      return [];
    }
    const rows: Array<{ sessionId: number; label: string; value: number }> = [];
    report.sessions.forEach((session) => {
      const metric = session.results.find((result) => result.test_id === selectedTestId);
      if (!metric) {
        return;
      }
      const referenceDate =
        safeParseDate(metric.recorded_at) ?? safeParseDate(session.scheduled_at) ?? null;
      const label = referenceDate ? dateFormatter.format(referenceDate) : session.session_name;
      rows.push({
        sessionId: session.session_id,
        label,
        value: metric.value,
      });
    });
    return rows;
  }, [report, selectedTestId, dateFormatter]);

  const performanceValues = performanceSeries.map((entry) => entry.value);
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

  const mainSkillLabels: Record<CategoryKey, string> = {
    Physical: t.dashboard.mainSkills.labels.physical,
    Technical: t.dashboard.mainSkills.labels.technical,
  };

  const athleteAge = calculateAge(selectedAthlete?.birth_date);
  const athleteBmi = computeBmi(selectedAthlete?.height_cm, selectedAthlete?.weight_kg);

  const metricsSummary = [
    {
      label: t.dashboard.athleteReport.ageLabel,
      value:
        athleteAge !== null ? numberFormatter.format(athleteAge) : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.athleteDetail.metrics.height,
      value:
        selectedAthlete?.height_cm != null
          ? `${decimalFormatter.format(selectedAthlete.height_cm)} cm`
          : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.athleteDetail.metrics.weight,
      value:
        selectedAthlete?.weight_kg != null
          ? `${decimalFormatter.format(selectedAthlete.weight_kg)} kg`
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
        selectedAthlete?.dominant_foot
          ? dominantFootLabels[selectedAthlete.dominant_foot] ?? selectedAthlete.dominant_foot
          : t.dashboard.athleteReport.notAvailable,
    },
  ];

  const timeframeOptions = t.dashboard.filters.rangeOptions as Array<{
    value: TimeframeValue;
    label: string;
  }>;

  const athletePhoto = detailedAthlete?.photo_url ?? selectedAthlete?.photo_url ?? null;

  const recentSessions = sessionSummaries.slice(0, 3);

  const showDemoNotice = !report || !report.sessions.length;

  if (userRole === "staff") {
    return <AdminDashboard />;
  }

  

<section className="grid gap-4 md:grid-cols-3">
  <div className="rounded-xl border border-primary/25 bg-surface/80 p-6 shadow-xl backdrop-blur">
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">{t.dashboard.summary.title}</h2>
        {athletesSummary ? (
          <p className="text-xs text-muted">
            {t.dashboard.summary.totalAthletes}: {numberFormatter.format(athletesSummary.total)}
          </p>
        ) : null}
      </div>
      {summaryQuery.isError ? (
        <p className="text-xs text-red-500">{t.dashboard.summary.error}</p>
      ) : null}
    </div>
    <div className="mt-6 space-y-4">
      <div className="h-52 w-full md:w-48">
        {summaryQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            {t.common.loading}...
          </div>
        ) : athleteSummaryData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={athleteSummaryData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
              >
                {athleteSummaryData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name) => [numberFormatter.format(value as number), name as string]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            {t.dashboard.summary.empty}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {athleteSummaryData.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between rounded-lg border border-black/10 bg-background/60 px-4 py-2 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-on-surface">{numberFormatter.format(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
  {mainSkills.map((skill) => {
    const label = mainSkillLabels[skill.category];
    const currentValue = skill.current;
    const normalizedValue = Math.max(0, Math.min(currentValue ?? 0, MAX_INDEX));
    const donutData = [
      { name: label, value: normalizedValue, fill: chartPalette[skill.category] },
      {
        name: t.dashboard.mainSkills.remainingLabel,
        value: Math.max(0, MAX_INDEX - normalizedValue),
        fill: donutColors.remainder,
      },
    ];
    const tone = skill.delta != null && skill.delta < 0 ? "text-red-400" : "text-emerald-400";

    return (
      <div
        key={skill.category}
        className="rounded-xl border border-primary/25 bg-surface/80 p-5 shadow-xl backdrop-blur"
      >
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {donutData.map((segment) => (
                  <Cell key={segment.name} fill={segment.fill} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-col items-center text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
          <span className="mt-2 text-3xl font-semibold text-on-surface">
            {currentValue != null
              ? numberFormatter.format(currentValue)
              : t.dashboard.athleteReport.notAvailable}
          </span>
          <span className="text-xs text-muted">{t.dashboard.mainSkills.currentLabel}</span>
          <span className="mt-2 text-xs font-semibold">
            {skill.delta != null ? (
              <span className={tone}>
                {signedFormatter.format(skill.delta)} {t.dashboard.mainSkills.deltaLabel}
              </span>
            ) : (
              <span className="text-muted">{t.dashboard.mainSkills.noPrevious}</span>
            )}
          </span>
        </div>
      </div>
    );
  })}
</section>
return (
    <div className="space-y-8">
      <section className="print-hidden space-y-2">
        <h1 className="text-3xl font-semibold text-on-surface">{t.dashboard.title}</h1>
        <p className="text-sm text-muted">{t.dashboard.description}</p>
      </section>

      {showDemoNotice ? (
        <div className="print-hidden rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-medium text-accent backdrop-blur">
          {t.dashboard.demoNotice}
        </div>
      ) : null}

      <section className="print-hidden flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <label className="text-sm font-medium text-muted">
          {t.dashboard.filters.timeRangeLabel}
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as TimeframeValue)}
            className="ml-2 rounded-md border border-primary/30 bg-background/80 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-muted">
          {t.dashboard.filters.athleteLabel}
          <select
            value={selectedAthleteId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedAthleteId(value ? Number(value) : null);
            }}
            className="ml-2 rounded-md border border-primary/30 bg-background/80 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t.dashboard.filters.athletePlaceholder}</option>
            {displayAthletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.first_name} {athlete.last_name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="print-hidden grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-primary/25 bg-surface/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">{t.dashboard.summary.title}</h2>
              {athletesSummary ? (
                <p className="text-xs text-muted">
                  {t.dashboard.summary.totalAthletes}: {numberFormatter.format(athletesSummary.total)}
                </p>
              ) : null}
            </div>
            {summaryQuery.isError ? (
              <p className="text-xs text-red-500">{t.dashboard.summary.error}</p>
            ) : null}
          </div>
          <div className="mt-6 space-y-4">
            <div className="h-52 w-full md:w-48">
              {summaryQuery.isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  {t.common.loading}...
                </div>
            ) : athleteSummaryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={athleteSummaryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {athleteSummaryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name) => [numberFormatter.format(value as number), name as string]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                {t.dashboard.summary.empty}
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {athleteSummaryData.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-lg border border-black/10 bg-background/60 px-4 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-semibold text-on-surface">{numberFormatter.format(entry.value)}</span>
              </div>
            ))}
            </div>
          </div>
        </div>
        {mainSkills.map((skill) => {
          const label = mainSkillLabels[skill.category];
          const currentValue = skill.current;
          const normalizedValue = Math.max(0, Math.min(currentValue ?? 0, MAX_INDEX));
          const donutData = [
            { name: label, value: normalizedValue, fill: chartPalette[skill.category] },
            {
              name: t.dashboard.mainSkills.remainingLabel,
              value: Math.max(0, MAX_INDEX - normalizedValue),
              fill: donutColors.remainder,
            },
          ];
          const tone = skill.delta != null && skill.delta < 0 ? "text-red-400" : "text-emerald-400";

          return (
            <div
              key={skill.category}
              className="rounded-xl border border-primary/25 bg-surface/80 p-5 shadow-xl backdrop-blur"
            >
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {donutData.map((segment) => (
                        <Cell key={segment.name} fill={segment.fill} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col items-center text-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
                <span className="mt-2 text-3xl font-semibold text-on-surface">
                  {currentValue != null
                    ? numberFormatter.format(currentValue)
                    : t.dashboard.athleteReport.notAvailable}
                </span>
                <span className="text-xs text-muted">{t.dashboard.mainSkills.currentLabel}</span>
                <span className="mt-2 text-xs font-semibold">
                  {skill.delta != null ? (
                    <span className={tone}>
                      {signedFormatter.format(skill.delta)} {t.dashboard.mainSkills.deltaLabel}
                    </span>
                  ) : (
                    <span className="text-muted">{t.dashboard.mainSkills.noPrevious}</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-primary/25 bg-surface/80 p-6 shadow-xl backdrop-blur space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-on-surface">{t.dashboard.sessionComparison.title}</h2>
          <p className="text-sm text-muted">{t.dashboard.sessionComparison.subtitle}</p>
        </div>
        {latestStat && previousStat ? (
          <div className="grid gap-4 md:grid-cols-3">
            {CATEGORY_KEYS.map((category) => {
              const current = latestStat.categoryIndexes[category];
              const previous = previousStat.categoryIndexes[category];
              const delta =
                current != null && previous != null
                  ? Number((current - previous).toFixed(1))
                  : null;
              const tone = delta != null && delta < 0 ? "text-red-400" : "text-emerald-400";
              return (
                <div
                  key={`session-comparison-${category}`}
                  className="rounded-lg border border-white/10 bg-background/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {mainSkillLabels[category]}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted">{t.dashboard.sessionComparison.previousLabel}</span>
                    <span className="font-semibold text-on-surface">
                      {previous != null
                        ? numberFormatter.format(previous)
                        : t.dashboard.athleteReport.notAvailable}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted">{t.dashboard.sessionComparison.currentLabel}</span>
                    <span className="font-semibold text-on-surface">
                      {current != null
                        ? numberFormatter.format(current)
                        : t.dashboard.athleteReport.notAvailable}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold">
                    {delta != null ? (
                      <span className={tone}>
                        {signedFormatter.format(delta)} {t.dashboard.sessionComparison.deltaLabel}
                      </span>
                    ) : (
                      <span className="text-muted">{t.dashboard.sessionComparison.noDelta}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">{t.dashboard.sessionComparison.noData}</p>
        )}
      </section>

      <section
        className="rounded-xl border border-white/10 bg-surface/80 p-6 shadow-xl backdrop-blur print:bg-white"
        id="athlete-report-card"
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-col items-center gap-3 lg:w-60">
            <div className="relative h-60 w-48 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-primary/15 to-accent/10 shadow-lg">
              {athletePhoto ? (
                <img
                  src={athletePhoto}
                  alt={selectedAthlete ? `${selectedAthlete.first_name} ${selectedAthlete.last_name}` : "Athlete"}
                  className="h-full w-full object-cover"
                />
              ) : selectedAthlete ? (
                <div className="flex h-full w-full items-center justify-center bg-primary/20 text-5xl font-semibold text-primary">
                  {selectedAthlete.first_name.slice(0, 1)}
                  {selectedAthlete.last_name.slice(0, 1)}
                </div>
              ) : null}
            </div>
            {selectedAthlete ? (
              <div className="text-center lg:text-left">
                <h3 className="text-xl font-semibold text-on-surface">
                  {selectedAthlete.first_name} {selectedAthlete.last_name}
                </h3>
                <p className="text-sm text-muted">
                  {selectedAthlete.club_affiliation ?? t.dashboard.athleteReport.notAvailable}
                </p>
                {selectedAthlete.email ? (
                  <p className="text-xs text-muted">{selectedAthlete.email}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metricsSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-on-surface">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-background/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-on-surface">
                    {t.dashboard.athleteReport.chartTitle}
                  </h4>
                  <p className="text-xs text-muted">
                    {selectedTestMeta?.name || t.dashboard.filters.athletePlaceholder}
                  </p>
                </div>
                <div className="print-hidden">
                  <label className="text-xs font-medium text-muted">
                    {t.dashboard.athleteReport.selectTestLabel}
                    <select
                      value={selectedTestId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedTestId(value ? Number(value) : null);
                      }}
                      className="ml-2 rounded-md border border-primary/30 bg-background/80 px-3 py-1 text-sm text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              <div className="h-56">
                {performanceSeries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceSeries} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: axisTickColor }} />
                      <YAxis tick={{ fill: axisTickColor }} />
                      <Tooltip
                        formatter={(
                          _value: number,
                          _name: string,
                          { payload }: { payload?: { value?: number } }
                        ) => {
                          const rawValue =
                            payload && typeof payload.value === "number"
                              ? payload.value
                              : undefined;
                          return [
                            rawValue != null
                              ? `${decimalFormatter.format(rawValue)}${
                                  selectedTestUnit ? ` ${selectedTestUnit}` : ""
                                }`
                              : "--",
                            selectedTestMeta?.name ?? t.dashboard.athleteReport.selectTestLabel,
                          ];
                        }}
                        labelFormatter={(label: string) => label}
                        contentStyle={{
                          backgroundColor: "rgba(5, 12, 24, 0.92)",
                          border: "1px solid rgba(123, 97, 255, 0.3)",
                          borderRadius: "0.75rem",
                          color: "#E2F2FF",
                        }}
                      />
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
                  <p className="mt-1 text-lg font-semibold text-on-surface">
                    {bestValue !== null
                      ? `${decimalFormatter.format(bestValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                      : t.dashboard.athleteReport.notAvailable}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.dashboard.athleteReport.lastValueLabel}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-on-surface">
                    {lastValue !== null
                      ? `${decimalFormatter.format(lastValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                      : t.dashboard.athleteReport.notAvailable}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.dashboard.athleteReport.averageLabel}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-on-surface">
                    {averageValue !== null
                      ? `${decimalFormatter.format(averageValue)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                      : t.dashboard.athleteReport.notAvailable}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-on-surface">
                {t.dashboard.athleteReport.recentSessionsTitle}
              </h4>
              {recentSessions.length ? (
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-white/10 bg-background/60 p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{session.name}</p>
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
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
