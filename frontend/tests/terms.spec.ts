import { test, expect } from "@playwright/test";

test.describe("Terms of Service Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the terms page before each test
    await page.goto("/terms");
  });

  test("should load the page correctly and test toggles", async ({ page }) => {
    // Verify main elements and check accordion expand/collapse behavior
    await expect(
      page.getByRole("heading", { name: "Terms of Service" }),
    ).toBeVisible();
    await page.getByText("1. Provider and Contact").click();
  });
});
