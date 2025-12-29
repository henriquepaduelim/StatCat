import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsAthlete } from "./helpers/auth";

// Quick sanity checks for login flows

test("admin can reach dashboard", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.locator("body")).toContainText(/dashboard|team hub|insights/i);
});

test("athlete can reach player profile", async ({ page }) => {
  await loginAsAthlete(page);
  await expect(page).toHaveURL(/player-profile/);
});
