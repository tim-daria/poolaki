// @ts-check
/// <reference lib="dom" />
/**
 * @file Goals page e2e against the real goals API: the cards per state, the
 * add/edit/archive form, Contribute and the info card. Every run creates its
 * own workspace, so names never collide and nothing leaks between runs.
 * Overdue is not covered here: the server rejects a past target date, so an
 * overdue goal cannot be created, and goalFlags is unit-tested.
 */
import { test, expect, type Page } from "@playwright/test";
import {
  categoryIdsViaApi,
  createGoalViaApi,
  createTransactionViaApi,
  createWorkspaceViaApi,
  openAsSharedOwner,
  patchGoalViaApi,
  toOrgId,
} from "./helpers.js";

test.describe.serial("Goals", () => {
  let page: Page;
  let workspaceUrl: string;
  let goalsUrl: string;

  /**
   * Fixtures. New laptop: 800 + 500 − 110 + 600 = 1.790 of 2.000 (90%).
   * Emergency fund: 3.000 of 3.000, active and undated, so spendable with the
   * "mark it completed" hint. Trip to Barcelona: 2.000 saved, completed, then
   * four expenses that overdraw it to −340 (the third takes 160 from the goal
   * and 220 from the balance). Vacation fund: 200 saved, then archived, which
   * refunds the 200 as a withdrawal.
   */
  test.beforeAll(async ({ browser }) => {
    const owner = await openAsSharedOwner(browser);
    page = owner.page;
    workspaceUrl = await createWorkspaceViaApi(page, `Goals e2e ${Date.now()}`);
    goalsUrl = `${workspaceUrl}/savings`;
    const orgId = toOrgId(workspaceUrl);
    const food = categoryIdsViaApi(page, orgId).then((m) => m.get("Food")!);

    const contribute = (goal_id: number, amount: string, date: string) =>
      createTransactionViaApi(page, orgId, {
        entry_type: "contribution",
        category_id: null,
        goal_id,
        description: "",
        amount,
        transaction_date: date,
      });

    const laptop = await createGoalViaApi(page, orgId, {
      name: "New laptop",
      target_amount: "2000.00",
      target_date: "2027-12-31",
    });
    await contribute(laptop, "800.00", "2026-08-01");
    await contribute(laptop, "500.00", "2026-08-20");
    await createTransactionViaApi(page, orgId, {
      entry_type: "withdraw",
      category_id: null,
      goal_id: laptop,
      description: "",
      amount: "110.00",
      transaction_date: "2026-09-05",
    });
    await contribute(laptop, "600.00", "2026-09-10");

    const emergency = await createGoalViaApi(page, orgId, {
      name: "Emergency fund",
      target_amount: "3000.00",
      target_date: null,
    });
    await contribute(emergency, "3000.00", "2026-06-01");

    const barcelona = await createGoalViaApi(page, orgId, {
      name: "Trip to Barcelona",
      target_amount: "2000.00",
      target_date: "2027-07-31",
    });
    await contribute(barcelona, "800.00", "2026-05-10");
    await contribute(barcelona, "700.00", "2026-05-25");
    await contribute(barcelona, "500.00", "2026-06-12");
    await patchGoalViaApi(page, orgId, barcelona, { status: "completed" });
    const spend = async (description: string, amount: string, date: string) =>
      createTransactionViaApi(page, orgId, {
        entry_type: "expense",
        category_id: await food,
        goal_id: barcelona,
        description,
        amount,
        transaction_date: date,
      });
    await spend("Flights", "640.00", "2026-07-03");
    await spend("Hotel", "1200.00", "2026-07-10");
    await spend("Sagrada Família tickets", "380.00", "2026-07-15");
    await spend("Tapas dinner", "120.00", "2026-07-16");

    const vacation = await createGoalViaApi(page, orgId, {
      name: "Vacation fund",
      target_amount: "500.00",
      target_date: "2027-01-31",
    });
    await contribute(vacation, "200.00", "2026-09-01");
    await patchGoalViaApi(page, orgId, vacation, { status: "archived" });
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

  const active = () => page.getByRole("region", { name: "Active goals" });
  const completed = () => page.getByRole("region", { name: "Completed goals" });
  const archived = () => page.getByRole("region", { name: "Archived goals" });
  const openMenu = async (goalName: string) => {
    await page.getByRole("button", { name: `Actions for ${goalName}` }).click();
  };

  test("Add saving opens blank, with no deadline preset, and creates a goal", async () => {
    await page.getByRole("button", { name: "Add saving" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Add saving" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Name")).toHaveValue("");
    await expect(dialog.getByLabel("Target amount")).toHaveValue("");
    // No digits: the date is optional and starts empty, not at today.
    await expect(
      dialog.getByRole("group", { name: "Target date" }),
    ).not.toHaveText(/\d/);

    await dialog.getByLabel("Name").fill("Winter tyres");
    await dialog.getByLabel("Target amount").fill("480");
    await dialog.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Goal added")).toBeVisible();
    await expect(dialog).toBeHidden();
    const card = active().getByRole("group", { name: "Winter tyres" });
    await expect(card).toBeVisible();
    await expect(card.getByText("0% Completed")).toBeVisible();
    await expect(card.getByText(/^By /)).toHaveCount(0);
  });

  test("unsaved input is guarded and the name is normalised on blur", async () => {
    await page.getByRole("button", { name: "Add saving" }).click();
    const dialog = page.getByRole("dialog");
    const name = dialog.getByLabel("Name");

    await name.fill("  summer   tyres ");
    await name.press("Tab");
    await expect(name).toHaveValue("summer tyres");

    await page.keyboard.press("Escape");
    await expect(page.getByText("Discard changes?")).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(name).toHaveValue("summer tyres");

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
  test("renders every goal as a card in its section, oldest first", async () => {
    const fold = (title: string) =>
      page.getByRole("button", { name: title, exact: true });
    await expect(fold("Active")).toHaveAttribute("aria-expanded", "true");
    await expect(fold("Completed")).toHaveAttribute("aria-expanded", "true");
    await expect(fold("Archived")).toHaveAttribute("aria-expanded", "false");
    await expect(archived()).toBeHidden();
    await fold("Archived").click();
    await expect(archived()).toBeVisible();

    // Order within each section follows created_at.
    const names = (region: ReturnType<typeof active>) =>
      region
        .getByRole("group")
        .evaluateAll((cards) => cards.map((c) => c.getAttribute("aria-label")));
    expect(await names(active())).toEqual([
      "New laptop",
      "Emergency fund",
      "Winter tyres",
    ]);
    expect(await names(completed())).toEqual(["Trip to Barcelona"]);
    expect(await names(archived())).toEqual(["Vacation fund"]);
    await expect(
      page.getByRole("button", { name: "Start a new saving" }),
    ).toHaveCount(0);

    // Active: progress from the API balance, the deadline from the goal.
    const laptop = active().getByRole("group", { name: "New laptop" });
    await expect(laptop.getByText("90% Completed")).toBeVisible();
    await expect(laptop.getByText("By Dec 2027")).toBeVisible();
    await expect(laptop.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "90",
    );
    // Full but still active: the hint says what to do next.
    const emergency = active().getByRole("group", { name: "Emergency fund" });
    await expect(emergency.getByText("100% Completed")).toBeVisible();
    // The cue is a chip; MUI's Tooltip makes its title the chip's accessible name.
    const cue = emergency.getByRole("button", {
      name: "Target reached. Mark it as completed to spend from it.",
    });
    await expect(cue).toHaveText("Target reached");
    await cue.click();
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Edit saving" }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel" })
      .click();
    await expect(active().getByTestId("SavingsOutlinedIcon")).toHaveCount(3);
    await expect(
      active().getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(3);

    await expect(completed().getByTestId("TaskAltOutlinedIcon")).toHaveCount(1);

    // Archived: dimmed, no actions; the refund left it at zero.
    const vacation = archived().getByRole("group", { name: "Vacation fund" });
    await expect(vacation.getByText("0% Completed")).toBeVisible();
    await expect(archived().getByTestId("ArchiveOutlinedIcon")).toHaveCount(1);
    await expect(
      archived().getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(0);
  });

  test("Contribute opens the transaction form on Saving with the goal chosen", async () => {
    await openMenu("New laptop");
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

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });

  test("clicking a card opens Contribute; the keyboard does too; an archived card opens its info card", async () => {
    const dialog = page.getByRole("dialog");

    await active().getByRole("group", { name: "New laptop" }).click();
    await expect(
      dialog.getByRole("button", { name: "Saving", pressed: true }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Goal")).toContainText("New laptop");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    await active().getByRole("group", { name: "Emergency fund" }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog.getByLabel("Goal")).toContainText("Emergency fund");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    // Archived starts folded; open it to reach its cards. An archived card
    // has no Contribute, so it opens the read-only info view, where the
    // archive refund shows as a withdrawal.
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await archived().getByRole("group", { name: "Vacation fund" }).click();
    await expect(
      dialog.getByRole("heading", { name: "Vacation fund" }),
    ).toBeVisible();
    await expect(dialog.getByText("Archived", { exact: true })).toBeVisible();
    const refund = dialog
      .getByRole("listitem")
      .filter({ hasText: "Archived Vacation fund" });
    await expect(refund).toContainText("-€200,00");
    await dialog.getByRole("button", { name: "close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("Show Info opens an overdrawn goal: what is left, the split per expense", async () => {
    const dialog = page.getByRole("dialog");

    await test.step("status line and figure", async () => {
      await openMenu("Trip to Barcelona");
      await page.getByRole("menuitem", { name: "Show Info" }).click();
      await expect(
        dialog.getByRole("heading", { name: "Trip to Barcelona" }),
      ).toBeVisible();
      await expect(
        dialog.getByText("Off limits · paid from your balance"),
      ).toBeVisible();
      // Whole euros on screen, the exact amount as the accessible name.
      await expect(dialog.getByLabel("-€340,00")).toHaveText("-€340");
      await expect(dialog.getByText("left in goal")).toBeVisible();
      await expect(dialog.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
      // Spent counts only what the goal covered; the balance paid the rest.
      await expect(
        dialog.getByText("€2.000 saved · €2.000 spent"),
      ).toBeVisible();
    });

    await test.step("activity by month, newest first", async () => {
      // Month headings carry no year inside the current year.
      const july = dialog.getByRole("region", { name: "July" });
      await expect(july.getByRole("listitem")).toHaveCount(4);
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
    const dialog = page.getByRole("dialog");

    await openMenu("New laptop");
    await page.getByRole("menuitem", { name: "Show Info" }).click();
    await expect(
      dialog.getByRole("heading", { name: "New laptop" }),
    ).toBeVisible();
    await expect(dialog.getByText("Saving · by Dec 2027")).toBeVisible();
    await expect(dialog.getByLabel("€1.790,00")).toHaveText("€1.790");
    await expect(dialog.getByText("of €2.000")).toBeVisible();
    await expect(dialog.getByText("90%", { exact: true })).toBeVisible();
    await expect(dialog.getByText("€210 to go")).toBeVisible();
    const september = dialog.getByRole("region", { name: "September" });
    await expect(
      september.getByRole("listitem").filter({ hasText: "Withdrawn" }),
    ).toContainText("-€110,00");
    await dialog.getByRole("button", { name: "close" }).click();
    await expect(dialog).toBeHidden();
  });

  test("Edit renames, refuses a duplicate name, and marks the goal completed", async () => {
    const dialog = page.getByRole("dialog");

    await test.step("prefilled, Save disabled until something changes", async () => {
      await openMenu("Winter tyres");
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await expect(
        dialog.getByRole("heading", { name: "Edit saving" }),
      ).toBeVisible();
      await expect(dialog.getByLabel("Name")).toHaveValue("Winter tyres");
      await expect(dialog.getByLabel("Target amount")).toHaveValue("480,00");
      await expect(
        dialog.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();
    });

    await test.step("a duplicate name shows the server's message inline", async () => {
      await dialog.getByLabel("Name").fill("New laptop");
      await dialog.getByRole("button", { name: "Save changes" }).click();
      await expect(
        dialog.getByText(
          "A goal with this name already exists in this organization.",
        ),
      ).toBeVisible();
    });

    await test.step("rename and complete in one save", async () => {
      await dialog.getByLabel("Name").fill("Summer tyres");
      await dialog.getByLabel("Mark as completed").check();
      await dialog.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("Goal updated")).toBeVisible();
      await expect(dialog).toBeHidden();
      await expect(
        completed().getByRole("group", { name: "Summer tyres" }),
      ).toBeVisible();
      await expect(active().getByText("Winter tyres")).toHaveCount(0);
    });
  });

  test("Archive explains the refund, asks for confirmation, and moves the card", async () => {
    const dialog = page.getByRole("dialog");

    await openMenu("Emergency fund");
    await page.getByRole("menuitem", { name: "Edit" }).click();
    // The note is the ⓘ next to Archive; its accessible name is the text.
    await expect(dialog.getByRole("note")).toHaveAccessibleName(
      /returns €3\.000,00 left in this goal to your balance/,
    );

    await dialog.getByRole("button", { name: "Archive" }).click();
    const confirm = page.getByRole("dialog", { name: "Archive this saving?" });
    await expect(confirm).toContainText("returns €3.000,00");
    await confirm.getByRole("button", { name: "Archive" }).click();

    await expect(page.getByText("Goal archived")).toBeVisible();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Archived", exact: true }).click();
    const card = archived().getByRole("group", { name: "Emergency fund" });
    await expect(card).toBeVisible();
    await expect(card.getByText("0% Completed")).toBeVisible();
    await expect(active().getByText("Emergency fund")).toHaveCount(0);

    // The refund is a withdrawal in the goal's activity.
    await card.click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("listitem")
        .filter({ hasText: "Archived Emergency fund" }),
    ).toContainText("-€3.000,00");
  });

  test("the actions menu does not trigger the card", async () => {
    await openMenu("New laptop");
    await expect(
      page.getByRole("menuitem", { name: "Contribute" }),
    ).toBeVisible();
    // Escape closes the menu without opening the form.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("with no goals, Active offers to start one", async () => {
    const empty = await createWorkspaceViaApi(
      page,
      `Goals empty ${Date.now()}`,
    );
    await page.goto(`${empty}/savings`);
    await expect(active().getByRole("group")).toHaveCount(0);

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
