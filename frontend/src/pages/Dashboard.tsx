import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { fetchDashboardSummary } from "../api/dashboard";
import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthletes } from "../hooks/useAthletes";
import { useTests } from "../hooks/useTests";
import { useScoringLeaderboard } from "../hooks/useScoringLeaderboard";
import { useMetricRanking } from "../hooks/useMetricRanking";
import { useTranslation } from "../i18n/useTranslation";
import { useThemeStore } from "../theme/useThemeStore";
import type { AthleteReport } from "../types/athlete";
import { useAuthStore } from "../stores/useAuthStore";
import AdminDashboard from "./AdminDashboard";

const summaryColors = {
  active: "#34d399",
  inactive: "#F11E48",
} as const;

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

const clampIndex = (value: number) => Math.max(40, Math.min(value, 160));

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

const Dashboard = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: _athletes } = useAthletes(clientId);
  const { data: _tests } = useTests(clientId);

  const displayAthletes = useMemo(() => _athletes ?? [], [_athletes]);
  const displayTests = useMemo(() => _tests ?? [], [_tests]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeValue>("90d");
  const [speedAgeCategory, setSpeedAgeCategory] = useState<string>("U14");
  const [speedGenderFilter, setSpeedGenderFilter] = useState<string>("boys");
  const t = useTranslation();
  const userRole = useAuthStore((state) => state.user?.role ?? "staff");
  const reportQuery = useAthleteReport(selectedAthleteId ?? undefined);
  const report = reportQuery.data;
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 1000 * 60,
  });
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

  const apiGender = speedGenderFilter === "girls" ? "female" : "male";
  const speedRankingQuery = useMetricRanking("top_end_speed", {
    limit: 5,
    age_category: speedAgeCategory,
    gender: apiGender,
    client_id: clientId ?? undefined,
  });

  const scorersLeaderboard = useScoringLeaderboard({
    leaderboard_type: "scorers",
    limit: 5,
    age_category: speedAgeCategory,
    gender: apiGender,
    client_id: clientId ?? undefined,
  });

  const shootoutsLeaderboard = useScoringLeaderboard({
    leaderboard_type: "shootouts",
    limit: 5,
    age_category: speedAgeCategory,
    gender: apiGender,
    client_id: clientId ?? undefined,
  });

  useEffect(() => {
    if (!selectedAthleteId && displayAthletes.length) {
      setSelectedAthleteId(displayAthletes[0].id);
    }
  }, [displayAthletes, selectedAthleteId]);

  const testMetaMap = useMemo(() => {
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
  }, [displayTests]);

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

  return (
    <div className="space-y-8">
      <section className="print-hidden space-y-2">
        <h1 className="text-3xl font-semibold text-container-foreground">{t.dashboard.title}</h1>
        <p className="text-sm text-muted">{t.dashboard.description}</p>
      </section>

      <section className="print-hidden space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-container-foreground">Live leaderboards</h2>
            <p className="text-sm text-muted">
              Track top speed leaders and get ready for scoring leaderboards as match data arrives.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <span>Category</span>
              <select
                value={speedAgeCategory}
                onChange={(event) => setSpeedAgeCategory(event.target.value)}
                className="rounded-md border border-black/10 bg-white/90 px-2 py-1 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="U12">U12</option>
                <option value="U13">U13</option>
                <option value="U14">U14</option>
                <option value="U15">U15</option>
                <option value="U16">U16</option>
                <option value="U19">U19</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Gender</span>
              <select
                value={speedGenderFilter}
                onChange={(event) => setSpeedGenderFilter(event.target.value)}
                className="rounded-md border border-black/10 bg-white/90 px-2 py-1 text-sm shadow-sm focus:border-action-primary focus:outline-none focus:ring-1 focus:ring-action-primary"
              >
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
              </select>
            </label>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">30m Leaders</h3>
            {speedRankingQuery.isLoading ? (
              <p className="mt-4 text-sm text-muted">{t.common.loading}...</p>
            ) : speedRankingQuery.isError ? (
              <p className="mt-4 text-sm text-red-500">Unable to load leaderboard.</p>
            ) : !speedRankingQuery.data?.entries.length ? (
              <p className="mt-4 text-sm text-muted">No athletes with recorded data.</p>
            ) : (
              <ol className="mt-4 flex-1 space-y-3 text-sm text-muted">
                {speedRankingQuery.data.entries.map((entry, index) => (
                  <li key={entry.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-xs font-semibold text-[#039903]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
                        <p className="text-xs text-muted">{entry.team ?? "Club not set"}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#039903]">
                      {entry.value.toFixed(2)} {entry.unit ?? ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Goal Leaders</h3>
            {scorersLeaderboard.isLoading ? (
              <p className="mt-4 text-sm text-muted">{t.common.loading}...</p>
            ) : scorersLeaderboard.isError ? (
              <p className="mt-4 text-sm text-red-500">Unable to load scoring leaderboard.</p>
            ) : !scorersLeaderboard.data?.entries.length ? (
              <p className="mt-4 text-sm text-muted">No match data recorded yet.</p>
            ) : (
              <ol className="mt-4 flex-1 space-y-3 text-sm text-muted">
                {scorersLeaderboard.data.entries.map((entry, index) => (
                  <li key={entry.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-xs font-semibold text-[#039903]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
                        <p className="text-xs text-muted">
                          {[entry.team, entry.position].filter(Boolean).join(" • ") || "No team"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#039903]">{entry.goals}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(51,153,137,0.55)] backdrop-blur">
            <h3 className="text-lg font-semibold text-container-foreground">Clean Sheet Leaders</h3>
            {shootoutsLeaderboard.isLoading ? (
              <p className="mt-4 text-sm text-muted">{t.common.loading}...</p>
            ) : shootoutsLeaderboard.isError ? (
              <p className="mt-4 text-sm text-red-500">Unable to load shootout leaderboard.</p>
            ) : !shootoutsLeaderboard.data?.entries.length ? (
              <p className="mt-4 text-sm text-muted">No shootout data recorded yet.</p>
            ) : (
              <ol className="mt-4 flex-1 space-y-3 text-sm text-muted">
                {shootoutsLeaderboard.data.entries.map((entry, index) => (
                  <li key={entry.athlete_id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-action-primary/10 text-xs font-semibold text-[#039903]">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-container-foreground">{entry.full_name}</p>
                        <p className="text-xs text-muted">
                          {[entry.team, entry.position].filter(Boolean).join(" • ") || "No team"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#039903]">{entry.shootout_goals}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
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
    </div>
  );
};

export default Dashboard;
