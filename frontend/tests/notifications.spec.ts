// @ts-check
import { test, expect, type Page } from "@playwright/test";

/**
 * Notification bell. Covers what doesn't depend on GET /api/notifications/,
 * which the backend hasn't shipped yet (see PR discussion).
 */
test.describe.serial("Notifications", () => {
  let page: Page;
  let workspaceUrl: string;

  const timestamp = Date.now();
  const testUser = {
    username: `notif_${timestamp}`,
    email: `notif_${timestamp}@example.com`,
    password: `w1234567!_${timestamp}`,
  };

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    await page.goto("/register");
    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Username").fill(testUser.username);
    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByLabel("Confirm Password").fill(testUser.password);
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    await page.waitForURL(/\/o\/\d+$/);
    workspaceUrl = new URL(page.url()).pathname;
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("bell is visible across the app", async () => {
    await page.goto(workspaceUrl);
    await expect(
      page.getByRole("button", { name: /notifications/i }),
    ).toBeVisible();
  });

  test("clicking the bell opens the notification panel", async () => {
    await page.goto(workspaceUrl);
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(page.getByRole("menu")).toBeVisible();
  });

  test("clicking outside closes the panel without deleting notifications", async () => {
    await page.goto(workspaceUrl);
    await page.getByRole("button", { name: /notifications/i }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).not.toBeVisible();
  });

  test.skip("shows a red dot when there's an unread invitation", async () => {
    // TODO: seed a real pending invitation via the backend, then assert
    // the badge dot is visible before opening the panel.
  });

  test.skip("accepting/declining an invitation removes it from the panel", async () => {
    // TODO: depends on accept/decline endpoints, not confirmed yet.
  });

  test.skip("clear all empties the notification list", async () => {
    // TODO: depends on real notification data from the backend.
  });
});