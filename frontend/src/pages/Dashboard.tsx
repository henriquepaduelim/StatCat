import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAthleteReport } from "../hooks/useAthleteReport";
import { useAthletes } from "../hooks/useAthletes";
import { useSessions, type SessionRecord } from "../hooks/useSessions";
import { useTests } from "../hooks/useTests";
import { useTranslation, useLocale } from "../i18n/useTranslation";
import { useThemeStore } from "../theme/useThemeStore";
import type { Athlete, AthleteReport } from "../types/athlete";
import type { TestDefinition } from "../types/test";

const DAY_IN_MS = 86_400_000;

const chartPalette = {
  Physical: "#00C8FF",
  Technical: "#7B61FF",
  Tactical: "#3DD68C",
} as const;

const axisTickColor = "rgba(226, 242, 255, 0.82)";
const gridColor = "rgba(0, 200, 255, 0.12)";

const timeframeDurations = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
} as const;

type TimeframeValue = keyof typeof timeframeDurations | "all";
type CategoryKey = "Physical" | "Technical" | "Tactical";

type FallbackTestConfig = TestDefinition & {
  baselineValue: number;
  sessionDelta: number;
  athleteDelta: number;
};

type FallbackBaseline = {
  restingHeartRate: number;
  sittingHeight: number;
  legLength: number;
};

const CATEGORY_KEYS: CategoryKey[] = ["Physical", "Technical", "Tactical"];

const createIsoDate = (daysAgo: number) => {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const FALLBACK_SESSIONS: SessionRecord[] = [
  {
    id: 7101,
    client_id: 0,
    name: "Pre-season diagnostics",
    location: "Combine innovation lab",
    scheduled_at: createIsoDate(90),
    notes: "Neuromuscular and cognitive baseline capture.",
  },
  {
    id: 7102,
    client_id: 0,
    name: "Acceleration microcycle",
    location: "Performance dome",
    scheduled_at: createIsoDate(60),
    notes: "Speed emphasis with wearable inertial tracking.",
  },
  {
    id: 7103,
    client_id: 0,
    name: "In-season recalibration",
    location: "Hybrid turf arena",
    scheduled_at: createIsoDate(32),
    notes: "Evaluated technical-to-tactical translation drills.",
  },
  {
    id: 7104,
    client_id: 0,
    name: "Play-off readiness",
    location: "Smart pitch",
    scheduled_at: createIsoDate(7),
    notes: "Final validation under match-sim conditions.",
  },
];

const FALLBACK_TEST_CONFIGS: FallbackTestConfig[] = [
  {
    id: 8101,
    client_id: 0,
    name: "Reactive sprint 10m",
    category: "Physical",
    unit: "s",
    description: "Dual-laser 10m reaction sprint from light stimulus.",
    target_direction: "lower",
    baselineValue: 1.88,
    sessionDelta: 0.04,
    athleteDelta: 0.02,
  },
  {
    id: 8102,
    client_id: 0,
    name: "Linear sprint 30m",
    category: "Physical",
    unit: "s",
    description: "Wearable-timed 30m acceleration profile.",
    target_direction: "lower",
    baselineValue: 4.52,
    sessionDelta: 0.05,
    athleteDelta: 0.03,
  },
  {
    id: 8103,
    client_id: 0,
    name: "Countermovement jump",
    category: "Physical",
    unit: "cm",
    description: "Force-plate CMJ peak height.",
    target_direction: "higher",
    baselineValue: 58,
    sessionDelta: 1.6,
    athleteDelta: 1.2,
  },
  {
    id: 8104,
    client_id: 0,
    name: "Force plate peak power",
    category: "Physical",
    unit: "W",
    description: "Isometric mid-thigh pull peak output.",
    target_direction: "higher",
    baselineValue: 4850,
    sessionDelta: 85,
    athleteDelta: 120,
  },
  {
    id: 8105,
    client_id: 0,
    name: "Yo-Yo IR level",
    category: "Physical",
    unit: "level",
    description: "Intermittent recovery (level 1) distance marker.",
    target_direction: "higher",
    baselineValue: 18.2,
    sessionDelta: 0.6,
    athleteDelta: 0.4,
  },
  {
    id: 8201,
    client_id: 0,
    name: "First touch index",
    category: "Technical",
    unit: "pts",
    description: "Vision-based tracking of first-touch quality.",
    target_direction: "higher",
    baselineValue: 78,
    sessionDelta: 2.1,
    athleteDelta: 1.5,
  },
  {
    id: 8202,
    client_id: 0,
    name: "Passing accuracy grid",
    category: "Technical",
    unit: "%",
    description: "Smart wall passing accuracy in dynamic grid.",
    target_direction: "higher",
    baselineValue: 84,
    sessionDelta: 1.8,
    athleteDelta: 1.1,
  },
  {
    id: 8203,
    client_id: 0,
    name: "Dribbling slalom",
    category: "Technical",
    unit: "s",
    description: "Sensorized slalom with ball tracking.",
    target_direction: "lower",
    baselineValue: 13.8,
    sessionDelta: 0.35,
    athleteDelta: 0.2,
  },
  {
    id: 8204,
    client_id: 0,
    name: "Crossing precision",
    category: "Technical",
    unit: "%",
    description: "Aerial crossing into smart targets accuracy.",
    target_direction: "higher",
    baselineValue: 68,
    sessionDelta: 2.2,
    athleteDelta: 1.4,
  },
  {
    id: 8205,
    client_id: 0,
    name: "Finishing consistency",
    category: "Technical",
    unit: "%",
    description: "Expected-goals weighted finishing drill.",
    target_direction: "higher",
    baselineValue: 62,
    sessionDelta: 2.5,
    athleteDelta: 1.7,
  },
  {
    id: 8301,
    client_id: 0,
    name: "Spatial awareness score",
    category: "Tactical",
    unit: "pts",
    description: "VR scenario decision-making awareness index.",
    target_direction: "higher",
    baselineValue: 74,
    sessionDelta: 1.6,
    athleteDelta: 1.2,
  },
  {
    id: 8302,
    client_id: 0,
    name: "Pressing efficiency",
    category: "Tactical",
    unit: "%",
    description: "Team pressing success rate during scrimmage.",
    target_direction: "higher",
    baselineValue: 58,
    sessionDelta: 2.4,
    athleteDelta: 1.3,
  },
  {
    id: 8303,
    client_id: 0,
    name: "Transition response time",
    category: "Tactical",
    unit: "s",
    description: "Reaction time from turnover to defensive shape.",
    target_direction: "lower",
    baselineValue: 3.4,
    sessionDelta: 0.18,
    athleteDelta: 0.12,
  },
  {
    id: 8304,
    client_id: 0,
    name: "Defensive positioning score",
    category: "Tactical",
    unit: "pts",
    description: "AI-evaluated positional heatmap alignment.",
    target_direction: "higher",
    baselineValue: 71,
    sessionDelta: 1.7,
    athleteDelta: 1.2,
  },
  {
    id: 8305,
    client_id: 0,
    name: "Build-up contribution",
    category: "Tactical",
    unit: "pts",
    description: "Progressive involvement score in build-up phases.",
    target_direction: "higher",
    baselineValue: 65,
    sessionDelta: 1.9,
    athleteDelta: 1.4,
  },
];

const FALLBACK_TESTS = FALLBACK_TEST_CONFIGS.map(({ baselineValue, sessionDelta, athleteDelta, ...test }) => test);

const FALLBACK_ATHLETES: Athlete[] = [
  {
    id: 9201,
    client_id: 0,
    first_name: "Lívia",
    last_name: "Ferraz",
    email: "livia.ferraz@combine.demo",
    birth_date: "2001-05-22",
    dominant_foot: "right",
    height_cm: 171,
    weight_kg: 62,
    club_affiliation: "Auriverde Velocity",
    photo_url: "/media/athletes/demo-athlete.png",
  },
  {
    id: 9202,
    client_id: 0,
    first_name: "Camila",
    last_name: "França",
    email: "camila.franca@combine.demo",
    birth_date: "1999-11-03",
    dominant_foot: "left",
    height_cm: 168,
    weight_kg: 60,
    club_affiliation: "Urban Fut Pulse",
    photo_url: "/media/athletes/demo-athlete.png",
  },
  {
    id: 9203,
    client_id: 0,
    first_name: "Renata",
    last_name: "Lima",
    email: "renata.lima@combine.demo",
    birth_date: "2000-02-15",
    dominant_foot: "both",
    height_cm: 174,
    weight_kg: 66,
    club_affiliation: "Combine Select AI",
    photo_url: "/media/athletes/demo-athlete.png",
  },
];

const FALLBACK_BASELINES: Record<number, FallbackBaseline> = {
  9201: { restingHeartRate: 52, sittingHeight: 90, legLength: 97 },
  9202: { restingHeartRate: 55, sittingHeight: 88, legLength: 96 },
  9203: { restingHeartRate: 50, sittingHeight: 91, legLength: 99 },
};

const FALLBACK_REPORTS: Record<number, AthleteReport> = Object.fromEntries(
  FALLBACK_ATHLETES.map((athlete, athleteIndex) => {
    const sessions = FALLBACK_SESSIONS.map((session, sessionIndex) => ({
      session_id: session.id,
      session_name: session.name,
      scheduled_at: session.scheduled_at,
      location: session.location,
      results: FALLBACK_TEST_CONFIGS.map((config) => {
        const athleteBaseline =
          config.target_direction === "lower"
            ? Math.max(0, config.baselineValue - athleteIndex * config.athleteDelta)
            : config.baselineValue + athleteIndex * config.athleteDelta;
        const directionalAdjustment = sessionIndex * config.sessionDelta;
        const rawValue =
          config.target_direction === "lower"
            ? Math.max(0.01, athleteBaseline - directionalAdjustment)
            : athleteBaseline + directionalAdjustment;
        return {
          test_id: config.id,
          test_name: config.name,
          category: config.category ?? null,
          value: Number(rawValue.toFixed(config.unit === "s" ? 3 : 2)),
          unit: config.unit,
          recorded_at: session.scheduled_at,
          notes: null,
        };
      }),
    }));

    return [athlete.id, { athlete, sessions }];
  })
) as Record<number, AthleteReport>;

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

const getDurationDays = (value: TimeframeValue): number | null => {
  if (value === "all") {
    return null;
  }
  return timeframeDurations[value];
};

const normalizeCategory = (value?: string | null): CategoryKey | null => {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (
    ["physical", "físico", "fisico", "velocidade", "potência", "potencia", "resistência", "resistencia"].some(
      (term) => normalized.includes(term)
    )
  ) {
    return "Physical";
  }
  if (["technical", "técnico", "tecnico", "habilidade", "skill", "drible"].some((term) => normalized.includes(term))) {
    return "Technical";
  }
  if (["tactical", "tático", "tatico", "estratégia", "estrategia", "posicionamento"].some((term) => normalized.includes(term))) {
    return "Tactical";
  }
  return null;
};

const formatIndex = (value: number | null) => (value == null ? null : Number(value.toFixed(1)));

const clampIndex = (value: number) => Math.max(40, Math.min(value, 160));

const SummaryCard = ({
  label,
  description,
  value,
  numberFormatter,
  trend,
  comparisonLabel,
  percentFormatter,
}: {
  label: string;
  description: string;
  value: number;
  numberFormatter: Intl.NumberFormat;
  trend: number | null;
  comparisonLabel: string;
  percentFormatter: Intl.NumberFormat;
}) => {
  const trendText = trend === null ? null : percentFormatter.format(trend);
  const trendTone = trend !== null && trend < 0 ? "text-red-400" : "text-emerald-400";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-primary/25 bg-surface/80 p-6 shadow-xl backdrop-blur">
      <span className="pointer-events-none absolute -top-24 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />
      <div className="relative z-10">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-primary/80">{label}</h2>
        <p className="mt-4 text-3xl font-semibold text-on-surface">{numberFormatter.format(value)}</p>
        <p className="mt-2 text-sm text-muted">{description}</p>
        {trendText ? (
          <p className={`mt-3 text-xs font-semibold ${trendTone}`}>
            {trendText}
            <span className="ml-1 font-normal text-muted">{comparisonLabel}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const clientId = useThemeStore((state) => state.theme.clientId);
  const { data: athletes } = useAthletes(clientId);
  const { data: sessions } = useSessions(clientId);
  const { data: tests } = useTests(clientId);
  const [timeframe, setTimeframe] = useState<TimeframeValue>("90d");
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const t = useTranslation();
  const [locale] = useLocale();
  const localeTag = locale === "fr" ? "fr-FR" : "en-US";

  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeTag), [localeTag]);
  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeTag, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }),
    [localeTag]
  );
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(localeTag, {
        signDisplay: "always",
        maximumFractionDigits: 1,
      }),
    [localeTag]
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [localeTag]
  );
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        month: "short",
        year: "numeric",
      }),
    [localeTag]
  );

  const displayAthletes = useMemo(() => {
    if (athletes && athletes.length > 0) {
      return athletes;
    }
    return FALLBACK_ATHLETES;
  }, [athletes]);

  const displaySessions = useMemo(() => {
    if (sessions && sessions.length > 0) {
      return sessions;
    }
    return FALLBACK_SESSIONS;
  }, [sessions]);

  const displayTests = useMemo(() => {
    if (tests && tests.length > 0) {
      return tests;
    }
    return FALLBACK_TESTS;
  }, [tests]);

  const usingFallbackData = !(
    (athletes?.length ?? 0) > 0 && (sessions?.length ?? 0) > 0 && (tests?.length ?? 0) > 0
  );

  useEffect(() => {
    if (!displayAthletes.length) {
      return;
    }
    if (
      selectedAthleteId === null ||
      !displayAthletes.some((athlete) => athlete.id === selectedAthleteId)
    ) {
      setSelectedAthleteId(displayAthletes[0].id);
    }
  }, [displayAthletes, selectedAthleteId]);

  const shouldFetchReport = !usingFallbackData;
  const reportQuery = useAthleteReport(
    shouldFetchReport ? selectedAthleteId ?? undefined : undefined
  );
  const fallbackReport =
    usingFallbackData && selectedAthleteId ? FALLBACK_REPORTS[selectedAthleteId] : undefined;
  const report = shouldFetchReport ? reportQuery.data : fallbackReport;
  const baselineMetrics = useMemo(() => {
    if (!usingFallbackData || !selectedAthleteId) {
      return null;
    }
    return FALLBACK_BASELINES[selectedAthleteId] ?? null;
  }, [selectedAthleteId, usingFallbackData]);

  const timeframeStart = useMemo(() => {
    const days = getDurationDays(timeframe);
    if (days === null) {
      return null;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return new Date(start.getTime() - days * DAY_IN_MS);
  }, [timeframe]);

  const normalizedSessions = useMemo(() => {
    const mapped: Array<SessionRecord & { scheduledDate: Date }> = [];
    displaySessions.forEach((session) => {
      const scheduledDate = safeParseDate(session.scheduled_at);
      if (!scheduledDate) {
        return;
      }
      mapped.push({ ...session, scheduledDate });
    });
    return mapped;
  }, [displaySessions]);

  const filteredSessions = useMemo(() => {
    if (!timeframeStart) {
      return normalizedSessions;
    }
    return normalizedSessions.filter((session) => session.scheduledDate >= timeframeStart);
  }, [normalizedSessions, timeframeStart]);

  const previousPeriodCount = useMemo(() => {
    const days = getDurationDays(timeframe);
    if (!timeframeStart || days === null) {
      return null;
    }
    const previousStart = new Date(timeframeStart.getTime() - days * DAY_IN_MS);
    return normalizedSessions.filter(
      (session) =>
        session.scheduledDate >= previousStart && session.scheduledDate < timeframeStart
    ).length;
  }, [normalizedSessions, timeframeStart, timeframe]);

  const sessionTrend = useMemo(() => {
    if (timeframeStart === null || previousPeriodCount === null) {
      return null;
    }
    if (previousPeriodCount === 0) {
      return filteredSessions.length === 0 ? 0 : null;
    }
    const delta = filteredSessions.length - previousPeriodCount;
    return (delta / previousPeriodCount) * 100;
  }, [filteredSessions, previousPeriodCount, timeframeStart]);

  const filteredSessionIds = useMemo(() => {
    if (!timeframeStart) {
      return null;
    }
    return new Set(filteredSessions.map((session) => session.id));
  }, [filteredSessions, timeframeStart]);

  const displayReportSessions = useMemo(() => {
    if (!report) {
      return [];
    }
    if (!filteredSessionIds || filteredSessionIds.size === 0) {
      return report.sessions;
    }
    const filtered = report.sessions.filter((session) => filteredSessionIds.has(session.session_id));
    return filtered.length ? filtered : report.sessions;
  }, [report, filteredSessionIds]);

  const testMetaMap = useMemo(() => {
    const map = new Map<
      number,
      { definition: TestDefinition; category: CategoryKey | null; targetDirection: "higher" | "lower" }
    >();
    displayTests.forEach((test) => {
      map.set(test.id, {
        definition: test,
        category: normalizeCategory(test.category),
        targetDirection: test.target_direction === "lower" ? "lower" : "higher",
      });
    });
    return map;
  }, [displayTests]);

  const analytics = useMemo(() => {
    if (!displayReportSessions.length) {
      return {
        trendSeries: [],
        radarData: [],
        sessionLoadData: [],
        spotlights: [],
        sessionSummaries: [],
      };
    }

    const testBaselines = new Map<number, number>();
    const trendSeries: Array<{
      sessionId: number;
      label: string;
      shortLabel: string;
      physical: number | null;
      technical: number | null;
      tactical: number | null;
    }> = [];
    const sessionLoadData: Array<{ name: string; physical: number; technical: number; tactical: number }>
      = [];
    const sessionSummaries: Array<{
      id: number;
      name: string;
      date: string | null;
      location?: string | null;
      categoryIndexes: Record<CategoryKey, number | null>;
      categoryCounts: Record<CategoryKey, number>;
      results: AthleteReport["sessions"][number]["results"];
    }> = [];
    const spotlightAccumulator = new Map<
      number,
      {
        name: string;
        category: CategoryKey | null;
        unit?: string | null;
        baseline: number;
        latest: number;
        latestIndex: number;
        targetDirection: "higher" | "lower";
      }
    >();

    displayReportSessions.forEach((session, sessionIndex) => {
      const categorySums: Record<CategoryKey, number> = {
        Physical: 0,
        Technical: 0,
        Tactical: 0,
      };
      const categoryCounts: Record<CategoryKey, number> = {
        Physical: 0,
        Technical: 0,
        Tactical: 0,
      };
      const loadCount: Record<CategoryKey, number> = {
        Physical: 0,
        Technical: 0,
        Tactical: 0,
      };

      session.results.forEach((result) => {
        const meta = testMetaMap.get(result.test_id);
        if (!meta) {
          return;
        }

        if (!testBaselines.has(result.test_id)) {
          testBaselines.set(result.test_id, result.value);
        }

        const baselineValue = testBaselines.get(result.test_id) ?? result.value;
        const categoryKey = meta.category;
        const targetDirection = meta.targetDirection;

        const indexValue = (() => {
          if (baselineValue === 0 || result.value === 0) {
            return 100;
          }
          if (targetDirection === "lower") {
            return clampIndex((baselineValue / result.value) * 100);
          }
          return clampIndex((result.value / baselineValue) * 100);
        })();

        if (categoryKey) {
          categorySums[categoryKey] += indexValue;
          categoryCounts[categoryKey] += 1;
          loadCount[categoryKey] += 1;
        }

        const isLastSession = sessionIndex === displayReportSessions.length - 1;
        if (isLastSession) {
          spotlightAccumulator.set(result.test_id, {
            name: result.test_name,
            category: categoryKey,
            unit: result.unit,
            baseline: baselineValue,
            latest: result.value,
            latestIndex: indexValue,
            targetDirection,
          });
        }
      });

      const scheduledDate = safeParseDate(session.scheduled_at);
      const label = session.session_name;
      const shortLabel = scheduledDate ? monthFormatter.format(scheduledDate) : label;

      trendSeries.push({
        sessionId: session.session_id,
        label,
        shortLabel,
        physical: formatIndex(
          categoryCounts.Physical ? categorySums.Physical / categoryCounts.Physical : null
        ),
        technical: formatIndex(
          categoryCounts.Technical ? categorySums.Technical / categoryCounts.Technical : null
        ),
        tactical: formatIndex(
          categoryCounts.Tactical ? categorySums.Tactical / categoryCounts.Tactical : null
        ),
      });

      sessionLoadData.push({
        name: label,
        physical: loadCount.Physical,
        technical: loadCount.Technical,
        tactical: loadCount.Tactical,
      });

      sessionSummaries.push({
        id: session.session_id,
        name: label,
        date: scheduledDate ? dateFormatter.format(scheduledDate) : null,
        location: session.location,
        categoryIndexes: {
          Physical: formatIndex(
            categoryCounts.Physical ? categorySums.Physical / categoryCounts.Physical : null
          ),
          Technical: formatIndex(
            categoryCounts.Technical ? categorySums.Technical / categoryCounts.Technical : null
          ),
          Tactical: formatIndex(
            categoryCounts.Tactical ? categorySums.Tactical / categoryCounts.Tactical : null
          ),
        },
        categoryCounts: loadCount,
        results: session.results,
      });
    });

    const latestSnapshot = trendSeries[trendSeries.length - 1];
    const comparisonSnapshot =
      trendSeries.length > 1 ? trendSeries[trendSeries.length - 2] : trendSeries[0];

    const radarData = CATEGORY_KEYS.map((category) => ({
      axis: category,
      latest: latestSnapshot?.[category.toLowerCase() as keyof typeof latestSnapshot] ?? 0,
      previous: comparisonSnapshot?.[category.toLowerCase() as keyof typeof latestSnapshot] ?? 0,
    }));

    const spotlights = Array.from(spotlightAccumulator.entries())
      .map(([testId, data]) => {
        const { targetDirection, baseline, latest, latestIndex } = data;
        const improvementValue = targetDirection === "lower" ? baseline - latest : latest - baseline;
        return {
          testId,
          name: data.name,
          category: data.category,
          unit: data.unit,
          latest,
          baseline,
          latestIndex: Number(latestIndex.toFixed(1)),
          improvementValue,
          improvementIndex: Number((latestIndex - 100).toFixed(1)),
          direction: improvementValue >= 0 ? "up" : "down",
        };
      })
      .sort((a, b) => b.improvementIndex - a.improvementIndex);

    return {
      trendSeries,
      radarData,
      sessionLoadData,
      spotlights,
      sessionSummaries: sessionSummaries.sort((a, b) => b.id - a.id),
    };
  }, [displayReportSessions, dateFormatter, monthFormatter, testMetaMap]);

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
    direito: dominantFootOptions.right,
    esquerdo: dominantFootOptions.left,
    ambidestro: dominantFootOptions.both,
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
      label: t.dashboard.athleteReport.restingHeartRateLabel,
      value: baselineMetrics
        ? `${numberFormatter.format(baselineMetrics.restingHeartRate)} ${t.dashboard.athleteReport.restingHeartRateUnit}`
        : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.athleteDetail.metrics.height,
      value:
        selectedAthlete?.height_cm != null
          ? `${decimalFormatter.format(selectedAthlete.height_cm)} cm`
          : t.dashboard.athleteReport.notAvailable,
    },
    {
      label: t.dashboard.athleteReport.sittingHeightLabel,
      value: baselineMetrics
        ? `${decimalFormatter.format(baselineMetrics.sittingHeight)} ${t.dashboard.athleteReport.sittingHeightUnit}`
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
      label: t.dashboard.athleteReport.legLengthLabel,
      value: baselineMetrics
        ? `${decimalFormatter.format(baselineMetrics.legLength)} ${t.dashboard.athleteReport.legLengthUnit}`
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

  const athletePhoto = selectedAthleteId
    ? selectedAthlete?.photo_url ?? (FALLBACK_ATHLETES.find((athlete) => athlete.id === selectedAthleteId)?.photo_url ?? null)
    : null;

  const latestSpotlights = analytics.spotlights.slice(0, 3);
  const recentSessions = analytics.sessionSummaries.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="print-hidden space-y-2">
        <h1 className="text-3xl font-semibold text-on-surface">{t.dashboard.title}</h1>
        <p className="text-sm text-muted">{t.dashboard.description}</p>
      </section>

      {usingFallbackData ? (
        <div className="print-hidden rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-medium text-accent backdrop-blur">
          {t.dashboard.demoNotice}
        </div>
      ) : null}

      <section className="print-hidden grid gap-4 rounded-xl border border-primary/25 bg-surface/80 p-6 shadow-xl backdrop-blur md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-muted">
          {t.dashboard.filters.timeRangeLabel}
          <span className="text-xs font-normal text-muted/80">
            {t.dashboard.filters.timeRangeDescription}
          </span>
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value as TimeframeValue)}
            className="mt-1 rounded-md border border-primary/30 bg-background/80 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-muted md:col-span-2">
          {t.dashboard.filters.athleteLabel}
          <select
            value={selectedAthleteId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedAthleteId(value ? Number(value) : null);
            }}
            className="mt-1 rounded-md border border-primary/30 bg-background/80 px-3 py-2 text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
        {[
          {
            ...t.dashboard.cards[0],
            value: displayAthletes.length,
            trend: null,
          },
          {
            ...t.dashboard.cards[1],
            value: displayTests.length,
            trend: null,
          },
          {
            ...t.dashboard.cards[2],
            value: filteredSessions.length,
            trend: sessionTrend,
          },
        ].map((card) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            description={card.description}
            value={card.value}
            trend={card.trend}
            numberFormatter={numberFormatter}
            percentFormatter={percentFormatter}
            comparisonLabel={t.dashboard.comparisonLabel}
          />
        ))}
      </section>

      <section className="print-hidden grid gap-6 xl:grid-cols-7">
        <div className="xl:col-span-4 rounded-xl border border-white/10 bg-surface/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                {t.dashboard.overview.categoryTrendTitle}
              </h2>
              <p className="text-sm text-muted">{t.dashboard.overview.categoryTrendSubtitle}</p>
            </div>
          </div>
          <div className="mt-6 h-64">
            {analytics.trendSeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trendSeries} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tick={{ fill: axisTickColor }} />
                  <YAxis domain={[60, 140]} tick={{ fill: axisTickColor }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(5, 12, 24, 0.92)",
                      border: "1px solid rgba(0, 200, 255, 0.25)",
                      borderRadius: "0.75rem",
                      color: "#E2F2FF",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#E2F2FF" }} iconType="circle" />
                  {CATEGORY_KEYS.map((category) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category.toLowerCase() as "physical" | "technical" | "tactical"}
                      name={category}
                      stroke={chartPalette[category]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">{t.dashboard.emptyState}</p>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 rounded-xl border border-white/10 bg-surface/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                {t.dashboard.overview.radarTitle}
              </h2>
              <p className="text-sm text-muted">{t.dashboard.overview.radarSubtitle}</p>
            </div>
          </div>
          <div className="mt-6 h-64">
            {analytics.radarData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.radarData} outerRadius={90}>
                  <PolarGrid stroke="rgba(226, 242, 255, 0.15)" />
                  <PolarAngleAxis dataKey="axis" stroke={axisTickColor} />
                  <PolarRadiusAxis stroke={axisTickColor} angle={30} domain={[60, 150]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(5, 12, 24, 0.92)",
                      border: "1px solid rgba(123, 97, 255, 0.25)",
                      borderRadius: "0.75rem",
                      color: "#E2F2FF",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#E2F2FF" }} />
                  <Radar name={t.dashboard.overview.radarLatestLabel} dataKey="latest" stroke="#00C8FF" fill="#00C8FF" fillOpacity={0.45} />
                  <Radar name={t.dashboard.overview.radarPreviousLabel} dataKey="previous" stroke="#7B61FF" fill="#7B61FF" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">{t.dashboard.emptyState}</p>
            )}
          </div>
        </div>
      </section>

      <section className="print-hidden grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 rounded-xl border border-white/10 bg-surface/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                {t.dashboard.overview.sessionLoadTitle}
              </h2>
              <p className="text-sm text-muted">{t.dashboard.overview.sessionLoadSubtitle}</p>
            </div>
          </div>
          <div className="mt-6 h-64">
            {analytics.sessionLoadData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.sessionLoadData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: axisTickColor }} />
                  <YAxis allowDecimals={false} tick={{ fill: axisTickColor }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(5, 12, 24, 0.92)",
                      border: "1px solid rgba(61, 214, 140, 0.3)",
                      borderRadius: "0.75rem",
                      color: "#E2F2FF",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#E2F2FF" }} />
                  <Bar dataKey="physical" name="Physical" stackId="load" fill={chartPalette.Physical} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="technical" name="Technical" stackId="load" fill={chartPalette.Technical} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="tactical" name="Tactical" stackId="load" fill={chartPalette.Tactical} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted">{t.dashboard.emptyState}</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-primary/30 bg-surface/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                {t.dashboard.overview.spotlightTitle}
              </h2>
              <p className="text-sm text-muted">{t.dashboard.overview.spotlightSubtitle}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {latestSpotlights.length ? (
              latestSpotlights.map((metric) => (
                <div
                  key={`${metric.testId}-${metric.name}`}
                  className="rounded-lg border border-white/10 bg-background/60 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-on-surface">{metric.name}</p>
                    {metric.category ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          color: chartPalette[metric.category],
                          backgroundColor: `${chartPalette[metric.category]}26`,
                        }}
                      >
                        {metric.category}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>
                      {t.dashboard.overview.spotlightLatest(
                        decimalFormatter.format(metric.latest),
                        metric.unit ?? ""
                      )}
                    </span>
                    <span
                      className={`font-semibold ${
                        metric.direction === "up" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {metric.direction === "up" ? "▲" : "▼"} {metric.improvementIndex}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">{t.dashboard.emptyState}</p>
            )}
          </div>
        </div>
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

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
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
                <div className="mt-4 h-56">
                  {performanceSeries.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceSeries} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fill: axisTickColor }} />
                        <YAxis tick={{ fill: axisTickColor }} />
                        <Tooltip
                          formatter={(value: number) =>
                            `${decimalFormatter.format(value)}${selectedTestUnit ? ` ${selectedTestUnit}` : ""}`
                          }
                          contentStyle={{
                            backgroundColor: "rgba(5, 12, 24, 0.92)",
                            border: "1px solid rgba(123, 97, 255, 0.3)",
                            borderRadius: "0.75rem",
                            color: "#E2F2FF",
                          }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#7B61FF" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted">{t.dashboard.athleteReport.chartEmpty}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-white/10 bg-background/60 p-4">
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

            <div>
              <h4 className="text-lg font-semibold text-on-surface">
                {t.dashboard.athleteReport.recentSessionsTitle}
              </h4>
              {recentSessions.length ? (
                <div className="mt-4 space-y-4">
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
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: chartPalette[category] }}
                                />
                                {category.slice(0, 3)} {value ?? "-"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {session.results.slice(0, 3).map((metric) => (
                          <div
                            key={`${session.id}-${metric.test_id}-${metric.recorded_at ?? metric.test_name}`}
                            className="rounded-md border border-white/5 bg-background/70 px-3 py-2 text-xs"
                          >
                            <p className="font-semibold text-on-surface">{metric.test_name}</p>
                            <p className="text-muted">
                              {decimalFormatter.format(metric.value)}
                              {metric.unit ? ` ${metric.unit}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">{t.dashboard.emptyState}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
