import type { AthleteReport } from "../types/athlete";
import type { TestDefinition } from "../types/test";

type Category = "Physical" | "Technical";

export type CategoryKey = Category;

export const CATEGORY_KEYS: CategoryKey[] = ["Physical", "Technical"];

export const ATHLETE_CATEGORY_COLORS: Record<CategoryKey, string> = {
  Physical: "#F11E48",
  Technical: "#7B61FF",
};

export const safeParseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const calculateAge = (birthDate?: string | null): number | null => {
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

export const computeBmi = (heightCm?: number | null, weightKg?: number | null): number | null => {
  if (!heightCm || !weightKg) {
    return null;
  }
  const heightMeters = heightCm / 100;
  if (heightMeters <= 0) {
    return null;
  }
  return weightKg / (heightMeters * heightMeters);
};

export const normalizeCategory = (value?: string | null): CategoryKey | null => {
  if (!value) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("technical")) {
    return "Technical";
  }
  return "Physical";
};

type CategoryIndexes = Record<CategoryKey, number | null>;

export type SessionCategoryStat = {
  sessionId: number;
  sessionName: string;
  scheduledAt: Date | null;
  location?: string | null;
  categoryIndexes: CategoryIndexes;
  categoryCounts: Record<CategoryKey, number>;
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

const clampIndex = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.max(0, Math.min(200, Number(value.toFixed(1))));
};

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

export const calculateSessionCategoryStats = (
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

export const buildTestMetaMap = (tests: TestDefinition[]) => {
  const map = new Map<
    number,
    {
      category: CategoryKey | null;
      targetDirection: "higher" | "lower";
    }
  >();
  tests.forEach((test) => {
    map.set(test.id, {
      category: normalizeCategory(test.category),
      targetDirection: test.target_direction === "lower" ? "lower" : "higher",
    });
  });
  return map;
};
