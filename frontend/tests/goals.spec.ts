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
    const archived = page.getByRole("region", { name: "Archived goals" });
    const red = "rgb(255, 112, 112)"; // theme error.main

    // Three non-archived seeds: New laptop (past deadline → overdue), Emergency
    // fund (100% → completed, derived from the amounts), House downpayment
    // (on track).
    await expect(active.getByText("New laptop")).toBeVisible();
    await expect(active.getByRole("progressbar")).toHaveCount(3);
    // MUI icons carry data-testid="<Name>Icon"; one per card.
    await expect(active.getByTestId("SavingsOutlinedIcon")).toHaveCount(2);
    await expect(active.getByTestId("TaskAltOutlinedIcon")).toHaveCount(1);
    await expect(
      active.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(3);

    // Overdue: exactly one flag, and only that card's deadline is red.
    await expect(active.getByText("Overdue", { exact: true })).toHaveCount(1);
    await expect(active.getByText("By Dec 2025")).toHaveCSS("color", red);
    await expect(active.getByText("By Dec 2026")).not.toHaveCSS("color", red);
    await expect(active.getByText("Vacation fund")).toHaveCount(0);

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
});
