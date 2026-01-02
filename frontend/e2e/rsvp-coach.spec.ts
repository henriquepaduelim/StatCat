import { test, expect } from "@playwright/test";
import { loginAsCoach } from "./helpers/auth";
import { requireEventNameOrSkip } from "./helpers/events";

test.describe("Coach RSVP", () => {
  let eventName: string;

  test.beforeEach(({}, testInfo) => {
    eventName = requireEventNameOrSkip(testInfo.skip.bind(testInfo));
  });

  test("coach can update availability", async ({ page }) => {
    await loginAsCoach(page);
    await page.goto("/dashboard");

    // Expand Upcoming Events accordion (summary element)
    const upcoming = page.locator("summary", { hasText: /upcoming events/i }).first();
    await expect(upcoming).toBeVisible({ timeout: 15_000 });
    await upcoming.scrollIntoViewIfNeeded();
    const isOpen = await upcoming.evaluate((el) => el.parentElement?.hasAttribute("open"));
    if (!isOpen) {
      await upcoming.click();
    }

    // Select the event by name inside the Upcoming Events list
    const upcomingSection = upcoming.locator("xpath=ancestor::details[1]");
    const eventRow = upcomingSection.getByRole("button", { name: new RegExp(eventName, "i") }).first();
    await expect(eventRow).toBeVisible({ timeout: 20_000 });
    await eventRow.click();

    // Coach RSVP controls live inside the Team Availability panel
    const availabilitySection = page
      .getByRole("heading", { name: /team availability/i })
      .locator("xpath=ancestor::section[1]");
    await availabilitySection.scrollIntoViewIfNeeded();
    const maybeButton = availabilitySection.getByRole("button", { name: /maybe/i }).last();
    await expect(maybeButton).toBeVisible({ timeout: 10_000 });
    await maybeButton.click();
    await expect(availabilitySection.getByText(/maybe/i)).toBeVisible({ timeout: 10_000 });
  });
});
