// @ts-check
/**
 * @file Transactions page e2e: tabs, search, sort, filters, pagination and the
 * add/edit modal, against rows posted through the real API.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";
import { makeUsers, registerUser, toOrgId } from "./helpers";

/**
 * Every count below is fixed by FIXTURES: 24 rows, 17 expenses, 4 incomes,
 * 3 transfers, 3 tax refundable, 15 per page. Category IDs follow
 * SEED_CATEGORIES in lib/categories.ts and must exist in the database:
 * `manage.py seed_transaction_fixtures <org_id>` once.
 */
type Fixture = [
  date: string,
  type: "expense" | "income" | "contribution",
  category: number | null,
  name: string,
  amount: number,
  tax?: boolean,
];

// Posted in this order, so ids ascend down the list; same-date rows sort by
// id, which the pagination test relies on.
const FIXTURES: Fixture[] = [
  ["2026-08-05", "expense", 1, "REWE", 255],
  ["2026-08-03", "expense", 2, "Ristorante Baldi", 52],
  ["2026-08-01", "income", 8, "Salary", 3240],
  ["2026-08-01", "contribution", null, "To savings", 300],
  ["2026-07-29", "expense", 1, "Edeka", 61.2],
  ["2026-07-24", "expense", 2, "Pizzeria Nona", 27.9],
  ["2026-07-19", "expense", 3, "Clothes", 78],
  ["2026-07-18", "expense", 1, "REWE", 48.3],
  ["2026-07-17", "contribution", null, "To savings", 300],
  ["2026-07-12", "expense", 4, "BVG monthly ticket", 49, true],
  ["2026-07-08", "expense", 6, "Pharmacy", 18.75, true],
  ["2026-07-05", "expense", 2, "Café Central", 9.4],
  ["2026-07-01", "income", 8, "Salary", 3240],
  ["2026-07-01", "expense", 5, "Rent", 1150],
  ["2026-06-27", "expense", 1, "Lidl", 33.15],
  ["2026-06-22", "income", 9, "Birthday gift", 100],
  ["2026-06-20", "expense", 3, "Bookshop", 24.99, true],
  ["2026-06-17", "contribution", null, "To savings", 300],
  ["2026-06-14", "expense", 2, "Sushi Yama", 41.5],
  ["2026-06-10", "expense", 4, "Taxi", 22],
  ["2026-06-06", "expense", 7, "Haircut", 35],
  ["2026-06-03", "expense", 1, "REWE", 57.8],
  ["2026-06-01", "income", 8, "Salary", 3240],
  ["2026-06-01", "expense", 5, "Rent", 1150],
];

/** POSTs one fixture row as the logged-in user, the way lib/transactions.ts does. */
async function postTransaction(page: Page, orgId: number, row: Fixture) {
  const [transaction_date, entry_type, category_id, description, amount, tax] =
    row;
  const csrftoken =
    (await page.context().cookies()).find((c) => c.name === "csrftoken")
      ?.value ?? "";
  const res = await page.request.post(
    `/api/v1/organizations/${orgId}/transactions/`,
    {
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
      data: {
        entry_type,
        category_id,
        goal_id: null,
        description,
        amount: amount.toFixed(2),
        transaction_date,
        is_tax_deductible: tax ?? false,
      },
    },
  );
  if (res.status() !== 201) {
    throw new Error(
      `transaction POST failed: ${res.status()} ${await res.text()} — ` +
        "if it names category_id, seed the categories first (see the file header).",
    );
  }
}

test.describe.serial("Transactions", () => {
  let page: Page;
  let transactionsUrl: string;

  const [user] = makeUsers("tx", "tx_unused");

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const workspace = await registerUser(page, user);
    transactionsUrl = `${workspace}/transactions`;
    // Sequential on purpose: ids must ascend in list order.
    for (const row of FIXTURES) {
      await postTransaction(page, toOrgId(workspace), row);
    }
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
    // MUI's date field is a group of spinbutton sections: focus the first
    // section, then type the digits and they flow through DD-MM-YYYY.
    const typeDate = async (label: string, digits: string) => {
      await panel
        .getByRole("group", { name: label })
        .getByRole("spinbutton")
        .first()
        .click();
      await page.keyboard.type(digits);
    };
    await typeDate("From", "01072026");
    await typeDate("To", "31082026");
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

  test("tax refundable is a checkbox filter with its own chip", async () => {
    await filtersButton().click();
    const checkbox = page.getByRole("checkbox", { name: "Tax refundable" });
    // click, not check: the popover re-anchors once the Filters badge appears,
    // and check() would treat that movement as a failed toggle and retry.
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await page.keyboard.press("Escape");

    await expect(page).toHaveURL(/[?&]tax=1/);
    await expect(filtersButton()).toContainText("1");
    await expect(rows()).toHaveCount(3);
    await expect(showing("3 of 3")).toBeVisible();
    await expect(tab("Expenses")).toContainText("3");
    await expect(tab("Income")).toContainText("0");

    const chip = page.locator(".MuiChip-deletable", {
      hasText: "Tax refundable",
    });
    await chip.getByTestId("CancelIcon").click();
    await expect(chip).toHaveCount(0);
    await expect(page).not.toHaveURL(/tax=/);
    await expect(showing("15 of 24")).toBeVisible();
  });

  test("Add transaction opens a blank form and guards unsaved input", async () => {
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Add transaction" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Expense" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByLabel("Description")).toHaveValue("");
    await expect(dialog.getByRole("button", { name: "Delete" })).toHaveCount(0);

    // Closing with unsaved input asks first; keeping edits leaves the form up.
    await dialog.getByLabel("Description").fill("Half typed");
    await page.keyboard.press("Escape");
    await expect(page.getByText("Discard changes?")).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog.getByLabel("Description")).toHaveValue("Half typed");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(dialog).toBeHidden();
  });

  test("clicking a row opens it read-only, prefilled, with Delete", async () => {
    await rows().filter({ hasText: "Ristorante Baldi" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Edit transaction" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Description")).toHaveValue(
      "Ristorante Baldi",
    );
    await expect(dialog.getByLabel("Amount")).toHaveValue("52,00");
    await expect(dialog.getByLabel("Category")).toHaveText("Eating out");
    await expect(dialog.getByRole("button", { name: "Delete" })).toBeVisible();

    // No PATCH route yet: fields are locked and Save stays off.
    await expect(
      dialog.getByText("Editing is not available yet"),
    ).toBeVisible();
    await expect(dialog.getByLabel("Description")).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();

    // Untouched, so Cancel closes without asking.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("rows open from the keyboard", async () => {
    await rows().first().focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Description")).toHaveValue("REWE");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the modal creates and deletes a transaction for real", async () => {
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");

    await dialog.getByLabel("Category").click();
    await page.getByRole("option", { name: "Transport" }).click();
    await dialog.getByLabel("Amount").fill("12,50");
    await dialog.getByLabel("Description").fill("Tram ticket");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog).toBeHidden();

    // Dated today, so it sorts above every fixture row.
    await expect(rows().first()).toContainText("Tram ticket");
    await expect(rows().first()).toContainText("Transport");
    await expect(rows().first()).toContainText("-€12,50");
    await expect(tab("All")).toContainText("25");

    await rows().first().click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await page
      .getByRole("dialog", { name: "Delete this transaction?" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(dialog).toBeHidden();

    await expect(rows().filter({ hasText: "Tram ticket" })).toHaveCount(0);
    await expect(tab("All")).toContainText("24");
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
