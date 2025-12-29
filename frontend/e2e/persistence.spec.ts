import { test, expect } from "@playwright/test";
import { loginAsAthlete } from "./helpers/auth";
import { requireEventNameOrSkip } from "./helpers/events";

const selectEventCard = (page: Parameters<typeof test>[0]["page"], eventName: string) =>
  page.getByRole("article").filter({ hasText: eventName }).first();

const statusBadge = (card: ReturnType<typeof selectEventCard>) =>
  card.getByText(/confirmed|maybe|declined|awaiting response/i, { exact: false });

test.describe("Session persistence", () => {
  let eventName: string;

  test.beforeEach(({ }, testInfo) => {
    eventName = requireEventNameOrSkip(testInfo.skip.bind(testInfo));
  });

  test("athlete session persists after reload", async ({ page }) => {
    await loginAsAthlete(page);
    await page.goto("/player-profile/scheduling");

    const card = selectEventCard(page, eventName);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(statusBadge(card)).toBeVisible();

    await page.reload();
    const cardAfter = selectEventCard(page, eventName);
    await expect(cardAfter).toBeVisible({ timeout: 20_000 });
    await expect(statusBadge(cardAfter)).toBeVisible();
  });
});
