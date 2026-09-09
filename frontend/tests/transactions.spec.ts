// @ts-check
import { test, expect, type Locator, type Page } from "@playwright/test";
import { makeUsers, registerUser } from "./helpers";

/**
 * Transactions page: tabs, search, sort, filters and pagination.
 *
 * The page currently renders the seeded rows in mockTransactions.ts
 * (USE_MOCK_TRANSACTIONS), so every count below is fixed by that file: 24 rows,
 * 17 expenses, 4 incomes, 3 transfers, 15 per page. Update both together.
 */
test.describe.serial("Transactions", () => {
  let page: Page;
  let transactionsUrl: string;

  const [user] = makeUsers("tx", "tx_unused");

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const workspace = await registerUser(page, user);
    transactionsUrl = `${workspace}/transactions`;
  });

  test.afterAll(async () => {
    await page.close();
  });

  // Every test starts from a clean address: filters live in the URL, so a
  // stale ?q= or ?page= would leak between tests.
  test.beforeEach(async () => {
    await page.goto(transactionsUrl);
    await expect(
      page.getByRole("heading", { name: "Transactions", level: 1 }),
    ).toBeVisible();
  });

  const rows = (): Locator => page.locator("tbody tr");
  const tab = (name: string) =>
    page.getByRole("tab", { name: new RegExp(name) });
  const showing = (text: string) => page.getByText(`Showing ${text}`);
  const filtersButton = () => page.getByRole("button", { name: /^Filters/ });

  test("lists the first page with per-type counts", async () => {
    await expect(tab("All")).toContainText("24");
    await expect(tab("Expenses")).toContainText("17");
    await expect(tab("Income")).toContainText("4");
    await expect(tab("Transfers")).toContainText("3");

    await expect(rows()).toHaveCount(15);
    await expect(showing("15 of 24")).toBeVisible();

    // Newest first: the top row is the 5 Aug REWE expense.
    await expect(rows().first()).toContainText("5 Aug");
    await expect(rows().first()).toContainText("REWE");
    await expect(rows().first()).toContainText("-€255,00");
  });

  test("colours rows by entry type", async () => {
    // Income carries a plus; a transfer is filed under Savings and unsigned.
    const salary = rows().filter({ hasText: "Salary" }).first();
    await expect(salary).toContainText("+€3.240,00");

    const transfer = rows().filter({ hasText: "To savings" }).first();
    await expect(transfer).toContainText("Savings");
    await expect(transfer).toContainText("€300,00");
    await expect(transfer).not.toContainText("-€300,00");
  });

  test("paginates and keeps the page in the URL", async () => {
    await page.getByRole("button", { name: "Go to page 2" }).click();

    await expect(page).toHaveURL(/[?&]page=2/);
    await expect(rows()).toHaveCount(9);
    await expect(showing("9 of 24")).toBeVisible();
    // Row 16 in newest-first order.
    await expect(rows().first()).toContainText("Birthday gift");
    await expect(rows().filter({ hasText: "Ristorante Baldi" })).toHaveCount(0);

    await page.getByRole("button", { name: "Go to previous page" }).click();
    await expect(page).not.toHaveURL(/page=/);
    await expect(showing("15 of 24")).toBeVisible();
  });

  test("tabs narrow the list to one entry type", async () => {
    await tab("Income").click();

    await expect(page).toHaveURL(/[?&]tab=income/);
    await expect(rows()).toHaveCount(4);
    await expect(showing("4 of 4")).toBeVisible();
    // Everything fits on one page, so the pager is gone.
    await expect(page.getByRole("navigation")).toBeHidden();
    for (const row of await rows().all()) {
      await expect(row).toContainText("+€");
    }

    await tab("All").click();
    await expect(page).not.toHaveURL(/tab=/);
    await expect(showing("15 of 24")).toBeVisible();
  });

  test("search matches name or category and updates the tab counts", async () => {
    const search = page.getByPlaceholder("Search name or category");

    await search.fill("rewe");
    await expect(page).toHaveURL(/[?&]q=rewe/);
    await expect(rows()).toHaveCount(3);
    await expect(tab("All")).toContainText("3");
    await expect(tab("Income")).toContainText("0");

    // Category labels are searchable too.
    await search.fill("eating");
    await expect(rows()).toHaveCount(4);
    for (const row of await rows().all()) {
      await expect(row).toContainText("Eating out");
    }

    await search.fill("nothing matches this");
    await expect(rows()).toHaveCount(0);
    await expect(
      page.getByText("No transactions match these filters."),
    ).toBeVisible();
  });

  test("sort order flips the list", async () => {
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Oldest first" }).click();

    await expect(page).toHaveURL(/[?&]sort=oldest/);
    // Two rows share 1 Jun; the lower id (Salary) comes first ascending.
    await expect(rows().first()).toContainText("1 Jun");
    await expect(rows().first()).toContainText("Salary");
  });

  test("date and category filters show as removable chips", async () => {
    await filtersButton().click();
    const panel = page
      .getByRole("presentation")
      .filter({ hasText: "Categories" });
    await panel.getByLabel("From").fill("2026-07-01");
    await panel.getByLabel("To").fill("2026-08-31");
    await panel.getByText("Groceries", { exact: true }).click();
    await panel.getByText("Eating out", { exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();

    await expect(filtersButton()).toContainText("3");
    await expect(page).toHaveURL(/from=2026-07-01/);
    await expect(page).toHaveURL(/cat=1%2C2/);

    // Chips sit outside the panel, next to "Clear all".
    const chips = page.locator(".MuiChip-deletable");
    await expect(chips).toHaveText([
      "1 Jul – 31 Aug",
      "Groceries",
      "Eating out",
    ]);

    // Jul–Aug rows in those two categories.
    await expect(showing("6 of 6")).toBeVisible();
    await expect(tab("Income")).toContainText("0");

    // Removing one chip keeps the other two.
    await chips
      .filter({ hasText: "Groceries" })
      .getByTestId("CancelIcon")
      .click();
    await expect(chips).toHaveCount(2);
    await expect(filtersButton()).toContainText("2");
    await expect(showing("3 of 3")).toBeVisible();

    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(chips).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${transactionsUrl}$`));
    await expect(showing("15 of 24")).toBeVisible();
  });

  test("a filtered view survives reload", async () => {
    await tab("Expenses").click();
    await page.getByPlaceholder("Search name or category").fill("rent");
    await expect(showing("2 of 2")).toBeVisible();

    await page.reload();

    await expect(tab("Expenses")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByPlaceholder("Search name or category")).toHaveValue(
      "rent",
    );
    await expect(showing("2 of 2")).toBeVisible();
  });
});
