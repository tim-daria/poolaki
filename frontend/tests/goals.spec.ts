// @ts-check
/// <reference lib="dom" />
/**
 * @file Goals page e2e: the add-goal modal skeleton. Creation is locked until
 * the goals API lands, so these cover opening, validation and the guard.
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
    goalsUrl = `${workspace}/goals`;
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await page.goto(goalsUrl);
    await expect(
      page.getByRole("heading", { name: "Goals", level: 1 }),
    ).toBeVisible();
  });

  test("Add goal opens a blank, locked form", async () => {
    await page.getByRole("button", { name: "Add goal" }).click();
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Add goal" }),
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
    await page.getByRole("button", { name: "Add goal" }).click();
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
    await page.getByRole("button", { name: "Add goal" }).click();
    await expect(dialog.getByLabel("Name")).toHaveValue("");
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });
});
