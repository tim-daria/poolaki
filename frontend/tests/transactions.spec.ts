// @ts-check
/// <reference lib="dom" />
/**
 * @file Transactions page e2e: tabs, search, sort, filters, pagination and the
 * add/edit modal, against rows posted through the real API.
 */
import { test, expect, type Locator, type Page } from "@playwright/test";
import { makeUsers, registerUser, toOrgId } from "./helpers.js";

type OrganizationCategory = {
  id: number;
  org: number;
  name: string;
  type: "expense" | "income" | "contribution";
};

async function getOrganizationCategories(
  page: Page,
  orgId: number,
): Promise<Map<string, number>> {
  const res = await page.request.get(
    `/api/v1/organizations/${orgId}/categories/`,
  );

  if (res.status() !== 200) {
    throw new Error(`category GET failed: ${res.status()} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    categories: OrganizationCategory[];
  };

  const categories = data.categories.filter(
    (category) => category.org === orgId,
  );

  return new Map(categories.map((category) => [category.name, category.id]));
}

/**
 * Every count below is fixed by FIXTURES: 24 rows, 17 expenses, 4 incomes,
 * 3 transfers, 3 tax refundable, 15 per page. Category names match the
 * defaults created for the registered organization.
 */
type Fixture = [
  date: string,
  type: "expense" | "income" | "contribution",
  category: string | null,
  name: string,
  amount: number,
  tax?: boolean,
];

// Posted in this order, so ids ascend down the list; same-date rows sort by
// id, which the pagination test relies on.
const FIXTURES: Fixture[] = [
  ["2026-08-05", "expense", "Food", "REWE", 255],
  ["2026-08-03", "expense", "Food", "Ristorante Baldi", 52],
  ["2026-08-01", "income", "Salary", "Salary", 3240],
  ["2026-08-01", "contribution", "Contribution", "To savings", 300],
  ["2026-07-29", "expense", "Food", "Edeka", 61.2],
  ["2026-07-24", "expense", "Food", "Pizzeria Nona", 27.9],
  ["2026-07-19", "expense", "Shopping", "Clothes", 78],
  ["2026-07-18", "expense", "Food", "REWE", 48.3],
  ["2026-07-17", "contribution", null, "To savings", 300],
  ["2026-07-12", "expense", "Transport", "BVG monthly ticket", 49, true],
  ["2026-07-08", "expense", "Health", "Pharmacy", 18.75, true],
  ["2026-07-05", "expense", "Food", "Café Central", 9.4],
  ["2026-07-01", "income", "Salary", "Salary", 3240],
  ["2026-07-01", "expense", "Housing", "Rent", 1150],
  ["2026-06-27", "expense", "Food", "Lidl", 33.15],
  ["2026-06-22", "income", "Gift", "Birthday gift", 100],
  ["2026-06-20", "expense", "Shopping", "Bookshop", 24.99, true],
  ["2026-06-17", "contribution", null, "To savings", 300],
  ["2026-06-14", "expense", "Food", "Sushi Yama", 41.5],
  ["2026-06-10", "expense", "Transport", "Taxi", 22],
  ["2026-06-06", "expense", "Utilities", "Haircut", 35],
  ["2026-06-03", "expense", "Food", "REWE", 57.8],
  ["2026-06-01", "income", "Salary", "Salary", 3240],
  ["2026-06-01", "expense", "Housing", "Rent", 1150],
];

/** POSTs one fixture row as the logged-in user, the way lib/transactions.ts does. */
async function postTransaction(
  page: Page,
  orgId: number,
  categories: Map<string, number>,
  row: Fixture,
) {
  const [transaction_date, entry_type, category, description, amount, tax] =
    row;
  const csrftoken =
    (await page.context().cookies()).find((c) => c.name === "csrftoken")
      ?.value ?? "";

  const category_id =
    category === null ? null : (categories.get(category) ?? null);

  if (category !== null && category_id === null) {
    throw new Error(
      `Category "${category}" does not belong to organization ${orgId}`,
    );
  }

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

/**
 * Records every moment focus and `aria-hidden` overlap — the state Chrome
 * reports as "Blocked aria-hidden on an element because its descendant
 * retained focus". Chrome files it as a DevTools issue, not a console message,
 * so Playwright's console capture never sees it.
 *
 * Both orders are violations: MUI writing `aria-hidden` onto an ancestor of
 * the focused element, and focus landing inside a subtree that is already
 * hidden (the date picker refocuses its button after the panel closed).
 * Patching setAttribute is the only way to see the first: the write and
 * React's focus move happen in one synchronous commit.
 */
async function installAriaHiddenSpy(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __hidden: string[]; __spied?: boolean };
    w.__hidden = [];
    if (w.__spied) return;
    w.__spied = true;
    // `className` is an object on SVG, and MUI icons carry aria-hidden.
    const label = (el: Element) =>
      typeof el.className === "string" && el.className
        ? el.className.split(" ")[0]
        : el.tagName;
    const original = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (
        name === "aria-hidden" &&
        value === "true" &&
        this.contains(document.activeElement)
      ) {
        const active = document.activeElement as HTMLElement;
        w.__hidden.push(`${label(this)} <- ${active.tagName}`);
      }
      return original.call(this, name, value);
    };
    // Checked once the event has finished dispatching, as Chrome does when it
    // next updates the accessibility tree: a focus that is blurred again by a
    // later listener in the same dispatch never reaches it.
    document.addEventListener(
      "focusin",
      () => {
        queueMicrotask(() => {
          const active = document.activeElement;
          const hidden = active?.closest('[aria-hidden="true"]');
          if (active && hidden) {
            w.__hidden.push(`${label(hidden)} <- focus ${label(active)}`);
          }
        });
      },
      true,
    );
  });
}

function ariaHiddenHits(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __hidden: string[] }).__hidden,
  );
}

test.describe.serial("Transactions", () => {
  let page: Page;
  let transactionsUrl: string;

  const [user] = makeUsers("tx", "tx_unused");

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const workspace = await registerUser(page, user);
    const orgId = toOrgId(workspace);
    const categories = await getOrganizationCategories(page, orgId);
    transactionsUrl = `${workspace}/transactions`;
    // Sequential on purpose: ids must ascend in list order.
    for (const row of FIXTURES) {
      await postTransaction(page, orgId, categories, row);
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
    await expect(page.getByText("Transaction added")).toBeVisible();

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
    await expect(page.getByText("Transaction deleted")).toBeVisible();

    await expect(rows().filter({ hasText: "Tram ticket" })).toHaveCount(0);
    await expect(tab("All")).toContainText("24");
  });

  test("date presets set and clear a range, with a live match count", async () => {
    await filtersButton().click();
    const panel = page
      .getByRole("presentation")
      .filter({ hasText: "Categories" });

    // Today is in September 2026; the fixtures end in August.
    await panel.getByRole("button", { name: "Last month" }).click();
    await expect(page).toHaveURL(/from=2026-08-01/);
    await expect(page).toHaveURL(/to=2026-08-31/);
    await expect(
      panel.getByRole("button", { name: "Last month" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(panel.getByText("4 transactions match")).toBeVisible();

    await panel.getByRole("button", { name: "This month" }).click();
    await expect(panel.getByText("0 transactions match")).toBeVisible();

    // Pressing the active preset again clears the range.
    await panel.getByRole("button", { name: "This month" }).click();
    await expect(page).not.toHaveURL(/from=/);
    await expect(panel.getByText("24 transactions match")).toBeVisible();

    // To before From is flagged on the field, not silently accepted.
    await panel
      .getByRole("group", { name: "From" })
      .getByRole("spinbutton")
      .first()
      .click();
    await page.keyboard.type("31082026");
    await panel
      .getByRole("group", { name: "To" })
      .getByRole("spinbutton")
      .first()
      .click();
    await page.keyboard.type("01072026");
    await expect(panel.getByRole("group", { name: "To" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await page.keyboard.press("Escape");
  });

  test("the panel's Clear buttons scope to categories or to everything", async () => {
    await filtersButton().click();
    const panel = page
      .getByRole("presentation")
      .filter({ hasText: "Categories" });
    const clearCategories = panel.getByRole("button", {
      name: "Clear",
      exact: true,
    });
    const clearAll = panel.getByRole("button", { name: "Clear all" });
    await expect(clearCategories).toBeDisabled();
    await expect(clearAll).toBeDisabled();

    await panel.getByRole("button", { name: "This year" }).click();
    // click, not check: the popover re-anchors when the Filters badge grows,
    // and check() would treat that movement as a failed toggle and retry.
    for (const name of ["Groceries", "Salary"]) {
      const box = panel.getByRole("checkbox", { name });
      await box.click();
      await expect(box).toBeChecked();
    }
    await expect(panel.getByText("8 transactions match")).toBeVisible();
    await expect(page).toHaveURL(/cat=1%2C8/);

    // Categories only: the date range survives.
    await clearCategories.click();
    await expect(page).not.toHaveURL(/cat=/);
    await expect(page).toHaveURL(/from=2026-01-01/);
    await expect(clearCategories).toBeDisabled();
    await expect(panel.getByText("24 transactions match")).toBeVisible();

    await clearAll.click();
    await expect(page).toHaveURL(new RegExp(`${transactionsUrl}$`));
    await expect(clearAll).toBeDisabled();
  });

  test("the form validates beyond the browser's required check", async () => {
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Category").click();
    await page.getByRole("option", { name: "Groceries" }).click();
    await dialog.getByLabel("Description").fill("Zero");
    await dialog.getByLabel("Amount").fill("0");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();

    await expect(dialog.getByRole("alert")).toContainText(
      "Amount must be at least 0,01",
    );
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
  });

  test("description is normalised on blur", async () => {
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");
    const description = dialog.getByLabel("Description");
    await description.fill("  grocery   run  ");
    await description.press("Tab");
    await expect(description).toHaveValue("grocery run");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
  });

  test("the type switch changes the field set", async () => {
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");
    const tax = dialog.getByRole("checkbox", { name: "Tax refundable" });
    await expect(tax).toBeVisible();

    await dialog.getByRole("button", { name: "Income" }).click();
    await expect(tax).toHaveCount(0);
    await dialog.getByLabel("Category").click();
    await expect(page.getByRole("option", { name: "Salary" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Groceries" })).toHaveCount(
      0,
    );
    await page.keyboard.press("Escape");

    await dialog.getByRole("button", { name: "Saving" }).click();
    await expect(dialog.getByLabel("Category")).toHaveCount(0);
    await expect(dialog.getByText("(optional)")).toBeVisible();
    await dialog.getByLabel("Goal").click();
    await page.getByRole("option", { name: /New laptop/ }).click();
    await expect(
      dialog.getByText("€1.790,00 of €2.000,00 saved"),
    ).toBeVisible();

    // Seeded goals belong to another workspace, so the backend refuses the
    // transfer and the form shows the reason instead of closing.
    await dialog.getByLabel("Amount").fill("10");
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Goal");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
  });

  test("a tax-refundable expense from the form is found by the filter", async () => {
    await page.getByRole("button", { name: "Add transaction" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Category").click();
    await page.getByRole("option", { name: "Health" }).click();
    await dialog.getByLabel("Amount").fill("5");
    await dialog.getByLabel("Description").fill("Plasters");
    await dialog.getByRole("checkbox", { name: "Tax refundable" }).check();
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.goto(`${transactionsUrl}?tax=1`);
    await expect(rows()).toHaveCount(4);
    await expect(rows().first()).toContainText("Plasters");

    // Backing out of the delete confirmation keeps the row.
    await rows().first().click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("dialog", {
      name: "Delete this transaction?",
    });
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    await expect(dialog.getByLabel("Description")).toHaveValue("Plasters");

    await dialog.getByRole("button", { name: "Delete" }).click();
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(dialog).toBeHidden();
    await expect(rows()).toHaveCount(3);
  });

  test("the filter panel and its calendar never hide the focused element", async () => {
    await installAriaHiddenSpy(page);

    const filters = filtersButton();
    await filters.click();
    const panel = page
      .getByRole("presentation")
      .filter({ hasText: "Categories" });

    // Opening the calendar and closing it again leaves focus on the button
    // that opened it, inside the popover. Closing the popover then removes a
    // subtree that still holds focus unless the panel blurs first.
    await panel
      .getByRole("button", { name: /choose date/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      panel.getByRole("button", { name: /choose date/i }).first(),
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();

    expect(await ariaHiddenHits(page)).toEqual([]);
    // Restored after the fade-out, to the button that opened the panel.
    await expect(filters).toBeFocused();

    // Clicking away closes the calendar and the panel together, which is the
    // same removal with no keyboard event to move focus first.
    await filters.click();
    await panel
      .getByRole("button", { name: /choose date/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.mouse.click(0, 0);
    await expect(panel).toBeHidden();

    expect(await ariaHiddenHits(page)).toEqual([]);
  });

  test("dialogs never hide the focused element and hand focus back", async () => {
    await installAriaHiddenSpy(page);

    const opener = page.getByRole("button", { name: "Add transaction" });
    await opener.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Description").fill("x");
    await dialog.getByRole("button", { name: "close" }).click();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(dialog).toBeHidden();

    expect(await ariaHiddenHits(page)).toEqual([]);
    // Restored after the fade-out, to the button that opened the dialog.
    await expect(opener).toBeFocused();
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
