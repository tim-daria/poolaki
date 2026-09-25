import { test, expect } from "@playwright/test";

test.describe("Privacy Policy Page", () => {
  test.beforeEach(async ({ page }) => {
    // Open the privacy policy page prior to executing each test case
    await page.goto("/policy");
  });

  test("should load the policy page and test navigation", async ({ page }) => {
    // Ensure headings render and test the back-to-home button route
    await expect(
      page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Back to Homepage/i }).click();
  });
});
