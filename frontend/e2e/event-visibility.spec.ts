import { test, expect } from "@playwright/test";
import { loginAsCoach, loginAsAthlete } from "./helpers/auth";
import { requireEventNameOrSkip } from "./helpers/events";

test.describe("Event visibility (no data creation)", () => {
  let eventName: string;

  test.beforeEach(({}, testInfo) => {
    eventName = requireEventNameOrSkip(testInfo.skip.bind(testInfo));
  });

  test("coach sees configured event", async ({ page }) => {
    await loginAsCoach(page);
    await page.goto("/dashboard");
    const summary = page.locator("summary", { hasText: /upcoming events/i }).first();
    await summary.scrollIntoViewIfNeeded();
    const open = await summary.evaluate((el) => el.parentElement?.hasAttribute("open"));
    if (!open) await summary.click();
    const eventRow = summary
      .locator("xpath=ancestor::details[1]")
      .getByRole("button", { name: new RegExp(eventName, "i") })
      .first();
    await expect(eventRow).toBeVisible({ timeout: 20_000 });
  });

  test("athlete sees configured event", async ({ page }) => {
    await loginAsAthlete(page);
    await page.goto("/dashboard");
    const summary = page.locator("summary", { hasText: /upcoming events/i }).first();
    await summary.scrollIntoViewIfNeeded();
    const open = await summary.evaluate((el) => el.parentElement?.hasAttribute("open"));
    if (!open) await summary.click();
    const eventRow = summary
      .locator("xpath=ancestor::details[1]")
      .getByRole("button", { name: new RegExp(eventName, "i") })
      .first();
    await expect(eventRow).toBeVisible({ timeout: 20_000 });
  });
});
