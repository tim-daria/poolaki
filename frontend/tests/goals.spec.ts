// @ts-check
/// <reference lib="dom" />
/**
 * @file Goals page e2e: the add-goal modal skeleton and the active/archived
 * split. Creation is locked until the goals API lands, so the modal tests
 * cover opening, validation and the guard. The list is the frontend seed
 * (lib/goals.seed.ts); names are asserted as literals on purpose, so the spec
 * never pulls app source into the node tsconfig project.
 */
import { test, expect, type Page } from "@playwright/test";
import { freezeClock, openAsSharedOwner } from "./helpers.js";

test.describe.serial("Goals", () => {
  let page: Page;
  let goalsUrl: string;

  test.beforeAll(async ({ browser }) => {
    // Nothing here is saved, so the shared owner's workspace is safe to use.
    const owner = await openAsSharedOwner(browser);
    page = owner.page;
    // Overdue is derived from the seed deadlines against today, so pin today.
    await freezeClock(page);
    goalsUrl = `${owner.personalUrl}/savings`;
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.goto(goalsUrl);
    await expect(
      page.getByRole("heading", { name: "Savings", level: 1 }),
    ).toBeVisible();
  });

  test("Add saving opens a blank, locked form", async () => {
    await page.getByRole("button", { name: "Add saving" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Add saving" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Name")).toHaveValue("");
    await expect(dialog.getByLabel("Target amount")).toHaveValue("");
    // Seeded with today, in the app-wide DD-MM-YYYY format.
    await expect(dialog.getByRole("group", { name: "Target date" })).toHaveText(
      /\d{2}-\d{2}-\d{4}/,
    );

    await expect(dialog.getByText("Goals cannot be saved yet")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Create" })).toBeDisabled();

    // Untouched, so Cancel closes without asking.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("unsaved input is guarded and the name is normalised on blur", async () => {
    await page.getByRole("button", { name: "Add saving" }).click();
    const dialog = page.getByRole("dialog");
    const name = dialog.getByLabel("Name");

    await name.fill("  winter   tyres ");
    await name.press("Tab");
    await expect(name).toHaveValue("winter tyres");

    await page.keyboard.press("Escape");
    await expect(page.getByText("Discard changes?")).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(name).toHaveValue("winter tyres");

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(dialog).toBeHidden();

    // Reopening starts blank again.
    await page.getByRole("button", { name: "Add saving" }).click();
    await expect(dialog.getByLabel("Name")).toHaveValue("");
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  // Scoped by region on purpose: getByText is a case-insensitive substring
  // match, so page-wide "Archived" would also hit the section heading.
  test("renders every goal as a card: on-track, completed, overdue, archived", async () => {
    const active = page.getByRole("region", { name: "Active goals" });
    const completed = page.getByRole("region", { name: "Completed goals" });
    const archived = page.getByRole("region", { name: "Archived goals" });
    const red = "rgb(255, 112, 112)"; // theme error.main

    // Sections fold; Active and Completed start open, Archived closed. A
    // folded region is hidden, so it must be opened before its cards are read.
    const fold = (title: string) =>
      page.getByRole("button", { name: title, exact: true });
    await expect(fold("Active")).toHaveAttribute("aria-expanded", "true");
    await expect(fold("Completed")).toHaveAttribute("aria-expanded", "true");
    await expect(fold("Archived")).toHaveAttribute("aria-expanded", "false");
    await expect(archived).toBeHidden();
    await fold("Archived").click();
    await expect(archived).toBeVisible();

    // Active: New laptop (past deadline → overdue), House downpayment (on
    // track). Completed: Emergency fund (exactly 100%), Cat mansion (101%),
    // Trip to Barcelona (100%, overspent).
    await expect(active.getByText("New laptop")).toBeVisible();
    // The "start a new saving" prompt only appears when Active is empty.
    await expect(
      page.getByRole("button", { name: "Start a new saving" }),
    ).toHaveCount(0);
    await expect(active.getByRole("progressbar")).toHaveCount(2);
    // MUI icons carry data-testid="<Name>Icon"; one per card.
    await expect(active.getByTestId("SavingsOutlinedIcon")).toHaveCount(2);
    await expect(active.getByTestId("TaskAltOutlinedIcon")).toHaveCount(0);
    await expect(
      active.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(2);
    await expect(completed.getByRole("progressbar")).toHaveCount(3);
    await expect(completed.getByTestId("TaskAltOutlinedIcon")).toHaveCount(3);
    await expect(
      completed.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(3);

    // Order within each section: oldest first. The seed's created_at runs
    // against id order on purpose, so this proves the sort, not array order.
    const names = (region: typeof active) =>
      region
        .getByRole("group")
        .evaluateAll((cards) => cards.map((c) => c.getAttribute("aria-label")));
    expect(await names(active)).toEqual(["House downpayment", "New laptop"]);
    expect(await names(completed)).toEqual([
      "Cat mansion",
      "Emergency fund",
      "Trip to Barcelona",
    ]);
    expect(await names(archived)).toEqual([
      "Wedding rings",
      "Student loan",
      "Vacation fund",
      "Snowboarding equipment",
    ]);

    // Overdue: exactly one flag, and only that card's deadline is red. With
    // the clock frozen at Sep 2026, New laptop (Dec 2025) is past its deadline
    // and House downpayment (Dec 2026) is not.
    await expect(active.getByText("Overdue", { exact: true })).toHaveCount(1);
    await expect(active.getByText("By Dec 2025")).toHaveCSS("color", red);
    // Scoped to a card: Cat mansion shares the Dec 2026 deadline.
    await expect(
      active
        .getByRole("group", { name: "House downpayment" })
        .getByText("By Dec 2026"),
    ).not.toHaveCSS("color", red);
    await expect(active.getByText("Vacation fund")).toHaveCount(0);

    // Overdue chip: error.light tint (#fae3e3); grey once archived. The text
    // sits in an inner span, so the tinted element is its parent (the chip root).
    const tint = "rgb(250, 227, 227)";
    await expect(
      active.getByText("Overdue", { exact: true }).locator(".."),
    ).toHaveCSS("background-color", tint);
    await expect(
      archived.getByText("Overdue", { exact: true }).first().locator(".."),
    ).not.toHaveCSS("background-color", tint);

    // Exactly on target: Emergency fund reads 100% and its bar is full.
    const emergency = completed.getByRole("group", { name: "Emergency fund" });
    await expect(emergency.getByText("100% Completed")).toBeVisible();
    await expect(emergency.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    // Overshoot: Cat mansion saved 1.515.000 of 1.500.000. The drawn bar
    // restarts at 1%; the figure stays honest.
    const catMansion = completed.getByRole("group", { name: "Cat mansion" });
    await expect(catMansion.getByText("101% Completed")).toBeVisible();
    await expect(catMansion.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "101",
    );

    // Archived: same card, dimmed, no actions, deadline shown but never red.
    await expect(archived.getByText("Vacation fund")).toBeVisible();
    await expect(archived.getByRole("progressbar")).toHaveCount(4);
    await expect(archived.getByTestId("ArchiveOutlinedIcon")).toHaveCount(4);
    await expect(
      archived.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(0);
    // Student loan and Snowboarding equipment were archived short of their
    // targets, past their deadlines — the flag persists, grey, deadline not red.
    await expect(archived.getByText("Overdue", { exact: true })).toHaveCount(2);
    await expect(archived.getByText("By Jan 2024")).toBeVisible();
    await expect(archived.getByText("By Jan 2024")).not.toHaveCSS("color", red);
    await expect(archived.getByText("By Aug 2023")).not.toHaveCSS("color", red);
    await expect(archived.getByText("New laptop")).toHaveCount(0);
  });

  test("Contribute opens the transaction form on Saving with the goal chosen", async () => {
    const active = page.getByRole("region", { name: "Active goals" });
    await active
      .getByRole("button", { name: "Actions for New laptop" })
      .click();
    await page.getByRole("menuitem", { name: "Contribute" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Contribute to saving" }),
    ).toBeVisible();
    // The tab is a ToggleButton, so it exposes aria-pressed.
    await expect(
      dialog.getByRole("button", { name: "Saving", pressed: true }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Goal")).toContainText("New laptop");
    // Format-agnostic on purpose: the currency plan moves the symbol.
    await expect(dialog.getByText(/1\.790,00.*2\.000,00.*saved/)).toBeVisible();

    // Untouched, so Cancel closes without asking.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("clicking a card opens Contribute; the keyboard does too; an archived card opens its info card", async () => {
    const active = page.getByRole("region", { name: "Active goals" });
    const completed = page.getByRole("region", { name: "Completed goals" });
    const archived = page.getByRole("region", { name: "Archived goals" });
    const dialog = page.getByRole("dialog");

    await active.getByRole("group", { name: "New laptop" }).click();
    await expect(
      dialog.getByRole("button", { name: "Saving", pressed: true }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Goal")).toContainText("New laptop");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Same idiom as "rows open from the keyboard" in transactions.spec.ts.
    await completed.getByRole("group", { name: "Emergency fund" }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog.getByLabel("Goal")).toContainText("Emergency fund");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Archived starts folded; open it to reach its cards. An archived card
    // has no Contribute, so it opens the read-only info view instead.
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await archived.getByRole("group", { name: "Vacation fund" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Vacation fund" }),
    ).toBeVisible();
    await expect(dialog.getByText("Archived", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Contributions will show up here."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("Show Info opens an overdrawn goal: what is left, the split per expense", async () => {
    const completed = page.getByRole("region", { name: "Completed goals" });
    const dialog = page.getByRole("dialog");

    await test.step("status line and figure", async () => {
      await completed
        .getByRole("button", { name: "Actions for Trip to Barcelona" })
        .click();
      await page.getByRole("menuitem", { name: "Show Info" }).click();
      await expect(
        dialog.getByRole("heading", { name: "Trip to Barcelona" }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Overdrawn · paid from your balance"),
      ).toBeVisible();
      // Whole euros on screen, the exact amount as the accessible name.
      await expect(dialog.getByLabel("-€340,00")).toHaveText("-€340");
      await expect(dialog.getByText("left in goal")).toBeVisible();
      await expect(dialog.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
      await expect(
        dialog.getByText("€2.000 saved · €2.340 spent"),
      ).toBeVisible();
    });

    await test.step("activity by month, newest first", async () => {
      // Month headings carry no year inside the frozen clock's year.
      const july = dialog.getByRole("region", { name: "July" });
      await expect(july.getByRole("listitem")).toHaveCount(4);
      // A list item takes no name from its text, so filter on it.
      const tickets = july
        .getByRole("listitem")
        .filter({ hasText: "Sagrada Família tickets" });
      await expect(tickets).toContainText("€220 from balance");
      await expect(tickets).toContainText("-€380,00");
      await expect(
        july.getByRole("listitem").filter({ hasText: "Tapas dinner" }),
      ).toContainText("from balance");
      await expect(
        july.getByRole("listitem").filter({ hasText: "Hotel" }),
      ).not.toContainText("from balance");

      const june = dialog.getByRole("region", { name: "June" });
      await expect(june.getByRole("listitem")).toContainText(
        "12 Jun · target reached",
      );
      await expect(june.getByRole("listitem")).toContainText("+€500,00");

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  });

  test("Show Info on a saving goal leads with the amount saved and what is to go", async () => {
    const active = page.getByRole("region", { name: "Active goals" });
    const dialog = page.getByRole("dialog");

    await active
      .getByRole("button", { name: "Actions for New laptop" })
      .click();
    await page.getByRole("menuitem", { name: "Show Info" }).click();
    await expect(
      dialog.getByRole("heading", { name: "New laptop" }),
    ).toBeVisible();
    await expect(dialog.getByText("Saving")).toBeVisible();
    await expect(dialog.getByText("overdue since Dec 2025")).toHaveCSS(
      "color",
      "rgb(255, 112, 112)",
    );
    await expect(dialog.getByLabel("€1.790,00")).toHaveText("€1.790");
    await expect(dialog.getByText("of €2.000")).toBeVisible();
    await expect(dialog.getByText("90%", { exact: true })).toBeVisible();
    await expect(dialog.getByText("€210 to go")).toBeVisible();
    // The seed stands in: the shared owner's workspace has no goal rows.
    const september = dialog.getByRole("region", { name: "September" });
    await expect(
      september.getByRole("listitem").filter({ hasText: "Withdrawn" }),
    ).toContainText("-€110,00");
    await dialog.getByRole("button", { name: "close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("the actions menu does not trigger the card", async () => {
    const active = page.getByRole("region", { name: "Active goals" });
    await active
      .getByRole("button", { name: "Actions for New laptop" })
      .click();
    await expect(
      page.getByRole("menuitem", { name: "Contribute" }),
    ).toBeVisible();
    // Escape closes the menu without opening the form.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  // `?empty` is a dev-only switch in the seed path (lib/goals.seed.ts); it
  // goes away with the seed once the API lands.
  test("with no goals, Active offers to start one", async () => {
    await page.goto(`${goalsUrl}?empty`);
    const active = page.getByRole("region", { name: "Active goals" });
    await expect(active.getByRole("group")).toHaveCount(0);

    const prompt = page.getByRole("button", { name: "Start a new saving" });
    await expect(prompt).toBeVisible();
    await prompt.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Add saving" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
