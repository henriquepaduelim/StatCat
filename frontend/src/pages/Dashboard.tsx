import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { fetchDashboardSummary } from "../api/dashboard";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthlete } from "../hooks/useAthlete";
import { useAthletes } from "../hooks/useAthletes";
import { useTests } from "../hooks/useTests";
import { useTranslation } from "../i18n/useTranslation";
import { useThemeStore } from "../theme/useThemeStore";
import type { AthleteReport } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";
import AdminDashboard from "./AdminDashboard";
import AthleteReportCard from "../components/AthleteReportCard";
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
  const signedFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { signDisplay: "always", maximumFractionDigits: 1 }),
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

  const selectedAthlete = useMemo(() => {
    if (selectedAthleteId === null) {
      return null;
    }
    return displayAthletes.find((athlete) => athlete.id === selectedAthleteId) ?? null;
  }, [displayAthletes, selectedAthleteId]);

  const mainSkillLabels: Record<CategoryKey, string> = {
    Physical: t.dashboard.mainSkills.labels.physical,
    Technical: t.dashboard.mainSkills.labels.technical,
  };

  const timeframeOptions = t.dashboard.filters.rangeOptions as Array<{
    value: TimeframeValue;
    label: string;
  }>;

  const showDemoNotice = !report || !report.sessions.length;

  if (userRole === "staff") {
    return <AdminDashboard />;
  }

  

<section className="grid gap-4 md:grid-cols-3">
  <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur">
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-container-foreground">{t.dashboard.summary.title}</h2>
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
            className="flex items-center justify-between rounded-lg border border-black/10 bg-container/60 px-4 py-2 text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-container-foreground">{numberFormatter.format(entry.value)}</span>
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
        className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur"
      >
        <div className="mx-auto h-56 w-full max-w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                innerRadius={70}
                outerRadius={95}
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
          <span className="mt-2 text-3xl font-semibold text-container-foreground">
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
        <h1 className="text-3xl font-semibold text-container-foreground">{t.dashboard.title}</h1>
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
            className="ml-2 rounded-md border border-action-primary/30 bg-container/80 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
            className="ml-2 rounded-md border border-action-primary/30 bg-container/80 px-3 py-2 text-container-foreground shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
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
        <div className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-container-foreground">{t.dashboard.summary.title}</h2>
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
                className="flex items-center justify-between rounded-lg border border-black/10 bg-container/60 px-4 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="font-semibold text-container-foreground">{numberFormatter.format(entry.value)}</span>
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
              className="rounded-xl border border-action-primary/25 bg-container-gradient p-5 shadow-xl backdrop-blur"
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
                <span className="mt-2 text-3xl font-semibold text-container-foreground">
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

      <section className="rounded-xl border border-action-primary/25 bg-container-gradient p-6 shadow-xl backdrop-blur space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-container-foreground">{t.dashboard.sessionComparison.title}</h2>
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
                  className="rounded-lg border border-white/10 bg-container/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {mainSkillLabels[category]}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted">{t.dashboard.sessionComparison.previousLabel}</span>
                    <span className="font-semibold text-container-foreground">
                      {previous != null
                        ? numberFormatter.format(previous)
                        : t.dashboard.athleteReport.notAvailable}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted">{t.dashboard.sessionComparison.currentLabel}</span>
                    <span className="font-semibold text-container-foreground">
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

      <AthleteReportCard
        athlete={selectedAthlete}
        detailedAthlete={detailedAthlete}
        report={report}
        tests={displayTests}
        className="max-w-6xl"
      />
    </div>
  );
};

export default Dashboard;
