import { test, expect } from "@playwright/test";
import { loginAsAthlete } from "./helpers/auth";
import { requireEventNameOrSkip } from "./helpers/events";

const selectEventCard = (page: Parameters<typeof test>[0]["page"], eventName: string) =>
  page.getByRole("article").filter({ hasText: eventName }).first();

const rsvpButtons = (card: ReturnType<typeof selectEventCard>) => ({
  confirm: card.getByRole("button", { name: /confirm/i }),
  maybe: card.getByRole("button", { name: /maybe/i }),
  decline: card.getByRole("button", { name: /decline/i }),
});

const statusBadge = (card: ReturnType<typeof selectEventCard>) =>
  card.getByText(/confirmed|maybe|declined|awaiting response/i, { exact: false });

test.describe("Athlete RSVP", () => {
  let eventName: string;

  test.beforeEach(({ }, testInfo) => {
    eventName = requireEventNameOrSkip(testInfo.skip.bind(testInfo));
  });

  test("athlete can confirm attendance", async ({ page }) => {
    await loginAsAthlete(page);
    await page.goto("/player-profile/scheduling");

    const card = selectEventCard(page, eventName);
    await expect(card).toBeVisible({ timeout: 20_000 });

    const buttons = rsvpButtons(card);
    await expect(buttons.confirm).toBeVisible();

    await buttons.confirm.click();
    await expect(statusBadge(card)).toContainText(/confirmed/i, { timeout: 10_000 });
  });
});
