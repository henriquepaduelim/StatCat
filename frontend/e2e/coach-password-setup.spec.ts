import { test } from "@playwright/test";

test.describe("Coach password setup", () => {
  test("coach can set password from setup link", async ({ page }) => {
    const setupUrl = process.env.E2E_COACH_SETUP_URL;
    const newPassword = process.env.E2E_COACH_NEW_PASSWORD;
    if (!setupUrl || !newPassword) {
      test.skip(true, "Set E2E_COACH_SETUP_URL and E2E_COACH_NEW_PASSWORD to run this test");
    }

    await page.goto(setupUrl as string);
    const pwdField = page.locator("input[type='password']").first();
    await pwdField.fill(newPassword as string);
    const confirmField = page.locator("input[type='password']").nth(1);
    await confirmField.fill(newPassword as string);
    const submit = page.getByRole("button", { name: /save|set password|continue/i });
    await submit.click();

    // If the UI redirects to login after setup, this should succeed
    await page.waitForURL(/dashboard|login/, { timeout: 15000 });
  });
});
