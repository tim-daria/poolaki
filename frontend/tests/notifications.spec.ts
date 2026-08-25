// @ts-check
import { test, expect, type Page } from "@playwright/test";
import {
  makeUsers,
  registerUser,
  createSharedWorkspace,
  inviteMember,
  toOrgId,
} from "./helpers.js";

/**
 * Notification bell and invitation rows.
 *
 * A second user (the owner) is registered too: real invitation rows require
 * someone to send them, and the owner's invitations to three workspaces feed
 * the three invitation tests — one accepted, one declined, one cleared.
 */
test.describe.serial("Notifications", () => {
  let page: Page;
  let owner: Page;
  let workspaceUrl: string;

  const [testUser, ownerUser] = makeUsers("notif", "notif_own");
  const acceptedName = `Trip A ${new Date().getTime()}`;
  const declinedName = `Trip B ${new Date().getTime()}`;
  const clearedName = `Trip C ${new Date().getTime()}`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    owner = await browser.newPage();

    workspaceUrl = await registerUser(page, testUser);
    await registerUser(owner, ownerUser);

    // The switcher's accessible name is the *current* workspace, so each
    // creation is named after the workspace it is clicked from.
    const urlA = await createSharedWorkspace(owner, ownerUser.username, acceptedName);
    const urlB = await createSharedWorkspace(owner, acceptedName, declinedName);
    const urlC = await createSharedWorkspace(owner, declinedName, clearedName);

    // The test user must see invitation rows for all three workspaces.
    await inviteMember(owner, toOrgId(urlA), testUser.username);
    await inviteMember(owner, toOrgId(urlB), testUser.username);
    await inviteMember(owner, toOrgId(urlC), testUser.username);
  });

  test.afterAll(async () => {
    await owner.close();
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
    await expect(page.getByRole("dialog")).toBeVisible();

    await expect(page.getByText("All notifications")).toBeVisible();
    await expect(page.getByText("All", { exact: true })).toBeVisible();
    await expect(page.getByText(/Invitations/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Mark all as read/i })).toBeVisible();
  });

  test("clicking outside closes the panel without deleting notifications", async () => {
    await page.goto(workspaceUrl);
    await page.getByRole("button", { name: /notifications/i }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("displays invitation tab with current count", async () => {
    await page.goto(workspaceUrl);
    await page.getByRole("button", { name: /notifications/i }).click();

    await expect(page.getByText("All", { exact: true })).toBeVisible();
    await expect(page.getByText(/Invitations \(\d+\)/)).toBeVisible();
  });

  test("shows a red dot when there's an unread invitation", async () => {
    await page.goto(workspaceUrl);
    await expect(
      page.getByRole("button", { name: /notifications/i }).locator(".MuiBadge-badge"),
    ).toBeVisible();
  });

  test("accepting/declining an invitation removes it from the panel", async () => {
    await page.goto(workspaceUrl);

    // Both pending rows are visible before we touch anything.
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(acceptedName) })
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(declinedName) }),
    ).toBeVisible();

    // Accept one — success closes the panel.
    await page
      .getByRole("listitem")
      .filter({ hasText: new RegExp(acceptedName) })
      .getByRole("button", { name: "Accept" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // It is gone from the list; the other invitation survives.
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(acceptedName) }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(declinedName) }),
    ).toBeVisible();

    // Decline the second one — the backend drops it on the next list.
    await page
      .getByRole("listitem")
      .filter({ hasText: new RegExp(declinedName) })
      .getByRole("button", { name: "Decline" })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(declinedName) }),
    ).not.toBeVisible();
  });

  test("Mark all as read is disabled while only invitations are pending", async () => {
    await page.goto(workspaceUrl);

    // The remaining pending invitation is visible. It stays unread forever: the
    // backend only resolves invitations via accept/decline/cancel, and
    // clear-all excludes them outright (MarkAllNotificationsReadView). So the
    // button has nothing to send and renders disabled, rather than closing the
    // panel on a request that was never made.
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(clearedName) }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Mark all as read" }),
    ).toBeDisabled();
    // A disabled button does nothing at all — the panel is still open.
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Reopening brings the pending invitation back from the backend — the
    // guard against a future "delete" implementation silently dropping it.
    await page.getByRole("button", { name: /notifications/i }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: new RegExp(clearedName) }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
