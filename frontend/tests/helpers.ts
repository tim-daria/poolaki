// @ts-check
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Browser, type Page } from "@playwright/test";

/**
 * Shared e2e steps, factored out of the specs that need two users talking to
 * each other (invitations, notifications). Everything runs against the real
 * backend, so usernames are timestamped — same approach as auth.spec.ts.
 */
export type TestUser = {
  username: string;
  email: string;
  password: string;
};

/** Timestamped user pair for specs that need two people. */
export function makeUsers(
  prefixA: string,
  prefixB: string,
): [TestUser, TestUser] {
  const timestamp = Date.now();
  return [
    {
      username: `${prefixA}_${timestamp}`,
      email: `${prefixA}_${timestamp}@example.com`,
      password: `w1234567!_${timestamp}`,
    },
    {
      username: `${prefixB}_${timestamp}`,
      email: `${prefixB}_${timestamp}@example.com`,
      password: `w1234567!_${timestamp}`,
    },
  ];
}

/**
 * Registers a fresh user through the real /register page.
 * @returns the personal workspace URL ("/o/:id") the signup signal lands on.
 */
export async function registerUser(
  page: Page,
  user: TestUser,
): Promise<string> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByLabel("Confirm password").fill(user.password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  // "/" is only a redirect now — the app always settles on /o/:orgId.
  await page.waitForURL(/\/o\/\d+$/);
  return new URL(page.url()).pathname;
}

/**
 * Creates a shared workspace through the OrgSwitcher modal, which navigates
 * to the new workspace on success.
 * @param switcherButtonName the *current* workspace name — the switcher's
 * accessible name is the workspace you are on, so after the first creation
 * it is no longer the username.
 * @returns the new workspace's URL ("/o/:id").
 */
export async function createSharedWorkspace(
  page: Page,
  switcherButtonName: string | RegExp,
  name: string,
  initialBalance = "500",
): Promise<string> {
  const before = new URL(page.url());

  await page.getByRole("button", { name: switcherButtonName }).click();
  await page
    .getByRole("menuitem", { name: /create shared workspace/i })
    .click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel(/initial balance/i).fill(initialBalance);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  // We are already on a /o/:id URL, so waiting for the pattern alone would
  // match instantly and race the redirect.
  await page.waitForURL(
    (url) => url.pathname !== before.pathname && /\/o\/\d+$/.test(url.pathname),
  );
  // The header is not remounted on a switch, so the modal has to close itself.
  await expect(page.getByRole("dialog")).toBeHidden();

  return new URL(page.url()).pathname;
}

/** "/o/42" → 42 (accepts a pathname, as the helpers return). */
export function toOrgId(workspacePathname: string): number {
  return Number(workspacePathname.split("/").pop());
}

/**
 * Invites `username` to `orgId` as the logged-in user of `page`, via the API
 * directly: the frontend has no invite UI yet (OrgMembers renders the avatar
 * group only, with a "TODO: add pending members"). Swap this for a UI flow
 * once that exists.
 */
export async function inviteMember(
  page: Page,
  orgId: number,
  username: string,
) {
  // Session cookie comes from the context; Django needs the CSRF token too,
  // exactly like lib/csrf.ts does in the app.
  const csrftoken =
    (await page.context().cookies()).find((c) => c.name === "csrftoken")
      ?.value ?? "";

  const res = await page.request.post(
    `/api/v1/organizations/${orgId}/invitations/`,
    {
      headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
      data: { username },
    },
  );

  if (res.status() !== 201) {
    throw new Error(
      `invitation POST failed: ${res.status()} ${await res.text()}`,
    );
  }
  return res.json();
}

/* ---------------------------------- */
/*            Shared owner            */
/* ---------------------------------- */

/**
 * allauth limits signups to 20 per minute per IP, and a full parallel run used
 * to register a dozen users within seconds, so back-to-back runs failed in
 * setup. Specs whose user only *creates* things (workspaces, invitations,
 * transactions in a workspace of its own) share one owner registered by
 * shared-owner.setup.ts.
 *
 * Anything that depends on a user's own state still registers its own user:
 * invitees (notification and banner counts), password changes (they end the
 * user's other sessions), and the auth and registration specs themselves.
 */
const AUTH_DIR = fileURLToPath(
  new URL("../playwright/.auth/", import.meta.url),
);
export const OWNER_STATE = `${AUTH_DIR}owner.json`;
export const OWNER_INFO = `${AUTH_DIR}owner-info.json`;

export type SharedOwner = { user: TestUser; personalUrl: string };

/**
 * Opens a page signed in as the shared owner, on their personal workspace.
 * Read at call time, not import time: spec files are loaded before the setup
 * project has run.
 */
export async function openAsSharedOwner(
  browser: Browser,
): Promise<SharedOwner & { page: Page }> {
  const owner: SharedOwner = JSON.parse(readFileSync(OWNER_INFO, "utf8"));
  const page = await browser.newPage({ storageState: OWNER_STATE });
  // Helpers such as createSharedWorkspace start from the current workspace.
  await page.goto(owner.personalUrl);
  return { ...owner, page };
}

/**
 * Creates a shared workspace through the API, without switching to it.
 * @returns the new workspace's URL ("/o/:id").
 */
export async function createWorkspaceViaApi(
  page: Page,
  name: string,
): Promise<string> {
  const csrftoken =
    (await page.context().cookies()).find((c) => c.name === "csrftoken")
      ?.value ?? "";
  const res = await page.request.post("/api/v1/organizations/", {
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
    data: { name, initial_balance: 0 },
  });
  if (res.status() !== 201) {
    throw new Error(
      `workspace POST failed: ${res.status()} ${await res.text()}`,
    );
  }
  const { id } = await res.json();
  return `/o/${id}`;
}
