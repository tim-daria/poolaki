// @ts-check
import { test, expect, type Page } from "@playwright/test";
import { makeUsers, registerUser } from "./helpers.js";

/**
 * Reports page smoke test.
 *
 * A fresh user has no transactions, so this covers the page shell, the tabs
 * and the empty states rather than specific amounts.
 */
test.describe.serial("Reports", () => {
  let page: Page;
  let workspaceUrl: string;

  const [testUser] = makeUsers("reports", "reports_unused");

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    workspaceUrl = await registerUser(page, testUser);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.goto(workspaceUrl);
    // Same path a user takes: through the sidebar link
    await page.getByRole("link", { name: "Reports" }).click();
  });

  test("shows the summary cards and both chart sections", async () => {
    await expect(page.getByRole("heading", { name: /Reports/ })).toBeVisible();
    await expect(page.getByText("By month", { exact: true })).toBeVisible();
    await expect(page.getByText("Categories", { exact: true })).toBeVisible();
    await expect(page.getByText("Set aside", { exact: true })).toBeVisible();
  });

  test("shows an empty state when there are no categories", async () => {
    await expect(page.getByText(/Share of all expenses/)).toBeVisible();
    await expect(page.getByText("No data available for this view.")).toBeVisible();
  });

  test("switches the Categories tab between Expenses, Income and Savings", async () => {
    // Scope to the Categories card: "Savings" also exists as a tab in "By month"
    const card = page
      .getByText("Categories", { exact: true })
      .locator("xpath=ancestor::*[contains(@class,'MuiCard-root')][1]");

    // exact: true, otherwise "Income" also matches "Income & expenses"
    await card.getByRole("button", { name: "Income", exact: true }).click();
    await expect(page.getByText(/Share of all income/)).toBeVisible();

    await card.getByRole("button", { name: "Savings", exact: true }).click();
    await expect(page.getByText(/Savings by goal/)).toBeVisible();
  });

  test("switches the By month tab to Savings", async () => {
    await page.getByRole("button", { name: "Savings", exact: true }).first().click();
    await expect(page.getByText("Saved per month")).toBeVisible();
  });
});