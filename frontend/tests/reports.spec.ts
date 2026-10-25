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
    await page.getByRole("link", { name: "Reports", exact: true }).click();
  });

  test("shows the summary tiles and both chart sections", async () => {
    await expect(page.getByRole("heading", { name: /Reports/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Income" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Expenses" })).toBeVisible();
    await expect(page.getByRole("region", { name: "By month" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Categories" }),
    ).toBeVisible();
  });

  test("shows an empty state when there are no categories", async () => {
    await expect(page.getByText(/Total expenses in/)).toBeVisible();
    await expect(
      page.getByText("No data available for this view."),
    ).toBeVisible();
  });

  test("switches the Categories card between Expenses and Income", async () => {
    const card = page.getByRole("region", { name: "Categories" });
    await card.getByRole("button", { name: "Income", exact: true }).click();
    await expect(page.getByText(/Total income in/)).toBeVisible();
  });

  test("offers the current year in the year selector", async () => {
    const select = page.getByRole("combobox", { name: "Year" });
    await expect(select).toHaveText(String(new Date().getFullYear()));
  });
});
