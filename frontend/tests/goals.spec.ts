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
import { makeUsers, registerUser } from "./helpers.js";

test.describe.serial("Goals", () => {
  let page: Page;
  let goalsUrl: string;

  const [user] = makeUsers("goal", "goal_unused");

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const workspace = await registerUser(page, user);
    goalsUrl = `${workspace}/savings`;
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
    // track). Completed: Emergency fund (exactly 100%), Cat mansion (101%).
    await expect(active.getByText("New laptop")).toBeVisible();
    await expect(active.getByRole("progressbar")).toHaveCount(2);
    // MUI icons carry data-testid="<Name>Icon"; one per card.
    await expect(active.getByTestId("SavingsOutlinedIcon")).toHaveCount(2);
    await expect(active.getByTestId("TaskAltOutlinedIcon")).toHaveCount(0);
    await expect(
      active.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(2);
    await expect(completed.getByRole("progressbar")).toHaveCount(2);
    await expect(completed.getByTestId("TaskAltOutlinedIcon")).toHaveCount(2);
    await expect(
      completed.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(2);

    // Order within each section: oldest first. The seed's created_at runs
    // against id order on purpose, so this proves the sort, not array order.
    const names = (region: typeof active) =>
      region
        .getByRole("group")
        .evaluateAll((cards) => cards.map((c) => c.getAttribute("aria-label")));
    expect(await names(active)).toEqual(["House downpayment", "New laptop"]);
    expect(await names(completed)).toEqual(["Cat mansion", "Emergency fund"]);
    expect(await names(archived)).toEqual([
      "Wedding rings",
      "Student loan",
      "Vacation fund",
      "Snowboarding equipment",
    ]);

    // Overdue: exactly one flag, and only that card's deadline is red.
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
      dialog.getByRole("heading", { name: "Add transaction" }),
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

  test("clicking a card opens Contribute; the keyboard does too; archived cards are inert", async () => {
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

    // Archived starts folded; open it to reach its cards.
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await archived.getByRole("group", { name: "Vacation fund" }).click();
    await expect(dialog).toHaveCount(0);
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
});
