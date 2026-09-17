// @ts-check
import { test, expect, type Page } from "@playwright/test";
import {
  makeUsers,
  registerUser,
  createSharedWorkspace,
  openAsSharedOwner,
} from "./helpers.js";

/**
 * The member row and the invite dialog.
 *
 * Deliberately drives the UI rather than helpers.inviteMember(): that helper
 * posts straight to the API because it predates the invite form, and the point
 * here is the form itself. Notifications are only used where an invitation has
 * to actually be accepted.
 *
 * Two real users are registered, so "invite someone who exists" and "invite
 * someone who doesn't" are both reachable against the real backend.
 */
test.describe.serial("Workspace members", () => {
  let owner: Page;
  let guest: Page;
  let ownerPersonalUrl: string;
  let sharedUrl: string;

  // Different first letters: initials() takes the first character, and the
  // tests tell the owner's avatar from the guest's by exactly that.
  // The owner is the shared one (initial "O"); only the guest signs up here.
  const [guestUser] = makeUsers("gst", "gst_unused");
  const sharedName = `Crew ${Date.now()}`;
  const unknownUsername = `nobody_${Date.now()}`;

  /**
   * The member row's avatars. Scoped rather than a bare getByText: the header
   * renders the signed-in user's initial too, so "O" matches twice otherwise.
   */
  function memberAvatar(page: Page, initial: string) {
    return page
      .locator(".MuiAvatarGroup-root")
      .getByText(initial, { exact: true });
  }

  /** Opens the invite dialog from the member row. */
  async function openInviteDialog(page: Page) {
    await page.getByRole("button", { name: /invite a member/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  }

  test.beforeAll(async ({ browser }) => {
    const shared = await openAsSharedOwner(browser);
    owner = shared.page;
    ownerPersonalUrl = shared.personalUrl;
    guest = await browser.newPage();
    await registerUser(guest, guestUser);

    sharedUrl = await createSharedWorkspace(
      owner,
      shared.user.username,
      sharedName,
    );
  });

  test.afterAll(async () => {
    await owner.close();
    await guest.close();
  });

  test("a personal workspace has no member row", async () => {
    await owner.goto(ownerPersonalUrl);

    // Home swaps the whole heading for a greeting, so nothing member-shaped
    // should be on the page — including the invite button, which the component
    // would otherwise offer, since you own your personal workspace.
    await expect(
      owner.getByRole("heading", { name: "Members", exact: true }),
    ).toBeHidden();
    await expect(
      owner.getByRole("button", { name: /invite a member/i }),
    ).toBeHidden();
  });

  test("the owner sees their own avatar and the invite button", async () => {
    await owner.goto(sharedUrl);

    await expect(
      owner.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(memberAvatar(owner, "O")).toBeVisible();
    await expect(
      owner.getByRole("button", { name: /invite a member/i }),
    ).toBeVisible();
  });

  test("a blank username is rejected before any request", async () => {
    await openInviteDialog(owner);

    // The field is `required`, so "" never reaches our code — "   " does.
    await owner.getByLabel("Username").fill("   ");
    await owner.getByRole("button", { name: /send invitation/i }).click();

    await expect(owner.getByRole("alert")).toContainText(/enter a username/i);
    await expect(owner.getByRole("dialog")).toBeVisible();
  });

  test("an unknown username shows the backend's own message", async () => {
    // Same dialog as the previous test, still open with "   " in it.
    await owner.getByLabel("Username").fill(unknownUsername);
    await owner.getByRole("button", { name: /send invitation/i }).click();

    // A 400 is the user's input, not a failure: the message is the backend's
    // and the dialog stays open so the name can be corrected in place.
    await expect(owner.getByRole("alert")).toContainText(/no user found/i);
    await expect(owner.getByRole("dialog")).toBeVisible();
    await expect(
      owner.getByRole("button", { name: /send invitation/i }),
    ).toBeEnabled();
  });

  test("a sent invitation closes the dialog and appears as a pending avatar", async () => {
    await owner.getByLabel("Username").fill(guestUser.username);
    await owner.getByRole("button", { name: /send invitation/i }).click();

    await expect(owner.getByRole("dialog")).toBeHidden();
    await expect(
      owner.getByText(`Invitation sent to ${guestUser.username}`),
    ).toBeVisible();

    // onSent refetches before the close, so the row already has the invitee.
    // The tooltip is what separates "invited" from "member" for a sighted user.
    await expect(memberAvatar(owner, "G")).toBeVisible();
    await memberAvatar(owner, "G").hover();
    await expect(owner.getByRole("tooltip")).toContainText(
      `${guestUser.username} (invited)`,
    );
  });

  test("reopening the dialog after a send starts blank", async () => {
    await openInviteDialog(owner);

    // The form stays mounted so the dialog can fade out, and clears itself on
    // the way. Without that reset this still holds the name just invited.
    await expect(owner.getByLabel("Username")).toHaveValue("");

    await owner.getByRole("button", { name: "Cancel" }).click();
    await expect(owner.getByRole("dialog")).toBeHidden();
  });

  test("inviting the same user twice is rejected", async () => {
    await openInviteDialog(owner);
    await owner.getByLabel("Username").fill(guestUser.username);
    await owner.getByRole("button", { name: /send invitation/i }).click();

    await expect(owner.getByRole("alert")).toContainText(/pending invitation/i);
    await expect(owner.getByRole("dialog")).toBeVisible();
  });

  test("closing with a half-typed name asks before discarding", async () => {
    // Carries on from the rejected dialog above, which still holds a username.
    // Focus first: submitting disabled the Send button under the cursor, which
    // drops focus to <body>, and Escape then never reaches MUI's modal root.
    await owner.getByLabel("Username").click();
    await owner.keyboard.press("Escape");

    const confirmation = owner.getByRole("dialog").filter({
      hasText: /discard changes/i,
    });
    await expect(confirmation).toBeVisible();

    // Keep editing is the safe default: the form and its text survive.
    await confirmation.getByRole("button", { name: /keep editing/i }).click();
    await expect(confirmation).toBeHidden();
    await expect(owner.getByLabel("Username")).toHaveValue(guestUser.username);

    // Discard closes both the confirmation and the form.
    await owner.getByLabel("Username").click();
    await owner.keyboard.press("Escape");
    await confirmation.getByRole("button", { name: /discard/i }).click();
    await expect(owner.getByRole("dialog")).toHaveCount(0);
  });

  test("an untouched dialog closes without asking", async () => {
    await openInviteDialog(owner);
    // autoFocus already put the caret in the field, so Escape lands on the
    // dialog — and with nothing typed it closes straight away.
    await owner.keyboard.press("Escape");

    await expect(owner.getByRole("dialog")).toHaveCount(0);
  });

  test("a member who accepts appears as an avatar but gets no invite button", async () => {
    // Accept through the bell — the only route into a workspace as a member.
    await guest.goto("/");
    await guest.getByRole("button", { name: /notifications/i }).click();
    await guest
      .getByRole("listitem")
      .filter({ hasText: new RegExp(sharedName) })
      .getByRole("button", { name: "Accept" })
      .click();

    await guest.goto(sharedUrl);

    await expect(
      guest.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(memberAvatar(guest, "O")).toBeVisible();
    await expect(memberAvatar(guest, "G")).toBeVisible();

    // Only the owner may invite. A member reaching the form would get a 403
    // whose message is about permissions rather than anything they can fix.
    await expect(
      guest.getByRole("button", { name: /invite a member/i }),
    ).toBeHidden();

    // The owner now sees a solid avatar rather than the dashed pending one.
    await owner.goto(sharedUrl);
    await memberAvatar(owner, "G").hover();
    await expect(owner.getByRole("tooltip")).toHaveText(guestUser.username);
  });

  test("a full workspace hides the invite button", async () => {
    // Five members is the cap, and registering five real users to prove it
    // costs more than it is worth — the rule under test is arithmetic.
    await owner.route(`**/api/v1/organizations/*/members/`, (route) =>
      route.fulfill({
        json: {
          members: Array.from({ length: 5 }, (_, i) => ({
            user_id: 1000 + i,
            username: `filler_${i}`,
            role: i === 0 ? "owner" : "member",
            joined_at: "2026-01-01T00:00:00Z",
          })),
        },
      }),
    );

    await owner.goto(sharedUrl);

    await expect(
      owner.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByRole("button", { name: /invite a member/i }),
    ).toBeHidden();

    await owner.unrouteAll({ behavior: "ignoreErrors" });
  });
});
