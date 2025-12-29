import fs from "node:fs";
import path from "node:path";

const REQUIRED_KEYS = [
  "E2E_BASE_URL",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_ATHLETE_EMAIL",
  "E2E_ATHLETE_PASSWORD",
  "E2E_COACH_EMAIL",
  "E2E_COACH_PASSWORD",
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

let envLoaded = false;

const loadEnvFile = (): void => {
  if (envLoaded) return;
  envLoaded = true;

  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    const value = rest.join("=");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

export type E2EEnv = {
  baseUrl: string;
  adminEmail: string;
  adminPassword: string;
  athleteEmail: string;
  athletePassword: string;
  coachEmail: string;
  coachPassword: string;
};

export const getOptionalEventName = (): string | null => {
  loadEnvFile();
  const name = process.env.E2E_EVENT_NAME;
  return name && name.trim().length ? name.trim() : null;
};

export const getEnv = (): E2EEnv => {
  loadEnvFile();

  const missing: RequiredKey[] = REQUIRED_KEYS.filter(
    (key) => !process.env[key] || process.env[key]?.trim() === ""
  );

  if (missing.length) {
    throw new Error(
      `Missing required E2E env vars: ${missing.join(", ")}. Populate frontend/e2e/.env.local.`
    );
  }

  return {
    baseUrl: process.env.E2E_BASE_URL!,
    adminEmail: process.env.E2E_ADMIN_EMAIL!,
    adminPassword: process.env.E2E_ADMIN_PASSWORD!,
    athleteEmail: process.env.E2E_ATHLETE_EMAIL!,
    athletePassword: process.env.E2E_ATHLETE_PASSWORD!,
    coachEmail: process.env.E2E_COACH_EMAIL!,
    coachPassword: process.env.E2E_COACH_PASSWORD!,
  };
};
