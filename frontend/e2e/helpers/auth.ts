import { Page, expect } from "@playwright/test";
import { getEnv } from "./env";

const loginSelectors = {
  email: "input[type='email']",
  password: "input[type='password']",
  submit: "button[type='submit']",
};

const performLogin = async (page: Page, email: string, password: string) => {
  await page.goto("/login");
  await page.fill(loginSelectors.email, email);
  await page.fill(loginSelectors.password, password);
  await page.click(loginSelectors.submit);
};

export const loginAsAdmin = async (page: Page) => {
  const env = getEnv();
  await performLogin(page, env.adminEmail, env.adminPassword);
  await expect(page).toHaveURL(/dashboard|team-dashboard/i, { timeout: 15_000 });
};

export const loginAsAthlete = async (page: Page) => {
  const env = getEnv();
  await performLogin(page, env.athleteEmail, env.athletePassword);
  await expect(page).toHaveURL(/player-profile/, { timeout: 15_000 });
};

export const loginAsCoach = async (page: Page) => {
  const env = getEnv();
  await performLogin(page, env.coachEmail, env.coachPassword);
  await expect(page).toHaveURL(/dashboard|team-dashboard/i, { timeout: 15_000 });
};
