// @ts-check
import { test, expect, type Page } from "@playwright/test";
import {
  makeUsers,
  registerUser,
  createSharedWorkspace,
  inviteMember,
  openAsSharedOwner,
  toOrgId,
  type TestUser,
} from "./helpers.js";

/**
 * @file The account Settings page and per-workspace settings: reaching them
 * from the account menu, the invitations banner, cancelling a pending invite,
 * changing the password and removing a member end to end.
 */
test.describe.serial("Settings", () => {
  let owner: Page;
  let guest: Page;
  let sharedUrl: string;

  // The guest signs up here: the banner count and the password change are
  // theirs alone. The owner is the shared one.
  const [guestUser] = makeUsers("setgst", "setgst_unused");
  let ownerUser: TestUser;
  const sharedName = `Crew ${Date.now()}`;
  // No timestamp: allauth rejects a password too similar to the username.
  const newPassword = "Lanterns-Orbit-92!";

  async function openSettings(page: Page) {
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await page.waitForURL(/\/o\/\d+\/settings$/);
  }

  test.beforeAll(async ({ browser }) => {
    const shared = await openAsSharedOwner(browser);
    owner = shared.page;
    ownerUser = shared.user;
    guest = await browser.newPage();
    await registerUser(guest, guestUser);
    sharedUrl = await createSharedWorkspace(
      owner,
      ownerUser.username,
      sharedName,
    );
  });

  test.afterAll(async () => {
    await owner.close();
    await guest.close();
  });

  test("the account menu opens Settings with profile and workspaces", async () => {
    await openSettings(owner);

    await expect(
      owner.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    // Scoped to <main>: the account menu shows the email too while it fades.
    await expect(
      owner.getByRole("main").getByText(ownerUser.email),
    ).toBeVisible();
    await expect(owner.getByText("Personal · only you")).toBeVisible();
    await expect(
      owner.getByRole("link", { name: new RegExp(sharedName) }),
    ).toContainText(/you're the owner/);
  });

  test("a personal workspace shows no members section", async () => {
    await owner.getByRole("link", { name: /Personal · only you/ }).click();

    await expect(owner.getByText("Workspace name")).toBeVisible();
    await expect(
      owner.getByRole("heading", { name: "Members", exact: true }),
    ).toBeHidden();
  });

  test("the owner can cancel a pending invitation", async () => {
    await inviteMember(owner, toOrgId(sharedUrl), guestUser.username);

    await owner
      .getByRole("main")
      .getByRole("link", { name: "Settings", exact: true })
      .click();
    await owner.getByRole("link", { name: new RegExp(sharedName) }).click();

    await expect(
      owner.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByRole("main").getByText(guestUser.username),
    ).toBeVisible();

    await owner.getByRole("button", { name: "Cancel", exact: true }).click();
    await owner.getByRole("button", { name: "Cancel invitation" }).click();

    await expect(
      owner.getByRole("main").getByText(guestUser.username),
    ).toBeHidden();
  });

  test("the invitee sees the banner and can accept from it", async () => {
    await inviteMember(owner, toOrgId(sharedUrl), guestUser.username);

    await openSettings(guest);
    await expect(
      guest.getByText("1 pending invitation waiting for you"),
    ).toBeVisible();
    await guest.getByRole("button", { name: "View" }).click();
    await guest.getByRole("button", { name: "Accept" }).click();

    await expect(guest.getByText(`Joined ${sharedName}`)).toBeVisible();
    await expect(
      guest.getByRole("link", { name: new RegExp(sharedName) }),
    ).toBeVisible();
  });

  test("a member sees Quit instead of Delete", async () => {
    await guest.getByRole("link", { name: new RegExp(sharedName) }).click();

    await expect(guest.getByText("Leave workspace")).toBeVisible();
    // Disabled until the backend has a leave route (CAN_LEAVE_ORGANIZATION).
    await expect(guest.getByRole("button", { name: "Quit" })).toBeDisabled();
    await expect(guest.getByText("Delete workspace")).toBeHidden();
    // The route turns the header's Ask AI button off.
    await expect(
      guest.getByRole("button", { name: "AI Assistant" }),
    ).toBeHidden();
  });

  // On the guest: a password change ends the user's other sessions, which
  // would sign the shared owner out of every other spec.
  test("a changed password works on the next login", async () => {
    await openSettings(guest);
    await guest.getByRole("button", { name: "Change", exact: true }).click();
    await guest.getByLabel("Current password").fill(guestUser.password);
    await guest.getByLabel(/^New password/).fill(newPassword);
    await guest.getByLabel("Confirm new password").fill(newPassword);
    await guest.getByRole("button", { name: "Change password" }).click();

    // Dialog first: if the backend rejects the change, the failure snapshot
    // then shows the form's error rather than just a missing toast.
    await expect(guest.getByRole("dialog")).toBeHidden();
    await expect(guest.getByText("Password changed")).toBeVisible();

    await guest.getByRole("button", { name: "Account menu" }).click();
    await guest.getByRole("menuitem", { name: "Logout" }).click();
    await guest.waitForURL("**/login");
    await guest.getByLabel("Username or email").fill(guestUser.username);
    await guest.getByLabel("Password", { exact: true }).fill(newPassword);
    await guest.getByRole("button", { name: "Login", exact: true }).click();
    await guest.waitForURL(/\/o\/\d+$/);
  });

  // Last: the Quit test above needs the guest to still be a member.
  test("the owner can remove a member, who is told about it", async () => {
    // A fresh load: the member list was fetched before the guest accepted.
    await owner.goto(`${sharedUrl}/settings/workspaces/${toOrgId(sharedUrl)}`);
    await expect(
      owner.getByRole("main").getByText(guestUser.username),
    ).toBeVisible();

    await owner
      .getByRole("button", { name: `Manage ${guestUser.username}` })
      .click();
    await owner
      .getByRole("menuitem", { name: "Remove from workspace" })
      .click();
    await owner.getByRole("button", { name: "Remove", exact: true }).click();

    await expect(
      owner.getByText(`${guestUser.username} removed from ${sharedName}`),
    ).toBeVisible();
    await expect(
      owner.getByRole("main").getByText(guestUser.username),
    ).toBeHidden();

    await guest.getByRole("button", { name: "Notifications" }).click();
    await expect(
      guest.getByText(`${ownerUser.username} removed you from ${sharedName}`),
    ).toBeVisible();
  });
});
