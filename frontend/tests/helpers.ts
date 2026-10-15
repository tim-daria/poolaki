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

/**
 * Fixed "today" for specs whose expectations depend on the calendar: the
 * transactions date presets, the year-less "5 Aug" formatting and the goal
 * overdue flags. Mid-month, after the last transaction fixture (Aug 2026) and
 * before the earliest active goal deadline (Dec 2026). Only the browser clock
 * is frozen; Node's Date.now() keeps the usernames above unique.
 */
export const FROZEN_TODAY = "2026-09-15";

/**
 * Pins the page's Date at noon on `iso` for every navigation. Call before the
 * first one: lib/date.ts captures TODAY and the current year at module load.
 * Noon keeps toISOString() on the same day in any timezone.
 *
 * Deliberately not page.clock.setFixedTime(): that installs Playwright's fake
 * clock, which also takes over performance.now() and the timer queue, and the
 * dialog fade-out / focus-restore sequence then runs in a different order
 * (the aria-hidden spy in transactions.spec.ts catches it). Only Date is
 * replaced here, so timers, transitions and React's scheduler are untouched.
 */
export async function freezeClock(page: Page, iso = FROZEN_TODAY) {
  await page.addInitScript(
    (fixed: number) => {
      const RealDate = Date;
      class FixedDate extends RealDate {
        constructor(...args: unknown[]) {
          // No-arg `new Date()` is "now"; any explicit argument passes through.
          super(...((args.length === 0 ? [fixed] : args) as [number]));
        }
        static override now() {
          return fixed;
        }
      }
      (window as unknown as { Date: unknown }).Date = FixedDate;
    },
    new Date(`${iso}T12:00:00`).getTime(),
  );
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

/** The CSRF cookie of the page's session, for POST and PATCH through `page.request`. */
async function csrfToken(page: Page): Promise<string> {
  return (
    (await page.context().cookies()).find((c) => c.name === "csrftoken")
      ?.value ?? ""
  );
}

export type GoalInput = {
  name: string;
  /** Money string, "2000.00". */
  target_amount: string;
  /** ISO date, or null for no deadline. The server rejects a past date. */
  target_date: string | null;
};

/**
 * Creates a goal through the API.
 * @returns the new goal's id.
 */
export async function createGoalViaApi(
  page: Page,
  orgId: number,
  goal: GoalInput,
): Promise<number> {
  const res = await page.request.post(`/api/v1/organizations/${orgId}/goals/`, {
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": await csrfToken(page),
    },
    data: goal,
  });
  if (res.status() !== 201) {
    throw new Error(`goal POST failed: ${res.status()} ${await res.text()}`);
  }
  const { id } = (await res.json()) as { id: number };
  return id;
}

/** Patches a goal through the API, e.g. `{ status: "completed" }`. */
export async function patchGoalViaApi(
  page: Page,
  orgId: number,
  goalId: number,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await page.request.patch(
    `/api/v1/organizations/${orgId}/goals/${goalId}/`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": await csrfToken(page),
      },
      data: patch,
    },
  );
  if (res.status() !== 200) {
    throw new Error(`goal PATCH failed: ${res.status()} ${await res.text()}`);
  }
}

export type TransactionInput = {
  entry_type: "expense" | "income" | "contribution" | "withdraw";
  /** Null for contributions and withdrawals. */
  category_id: number | null;
  goal_id: number | null;
  description: string;
  /** Money string, "640.00". */
  amount: string;
  transaction_date: string;
};

/** Creates a transaction through the API; the backend applies its goal rules. */
export async function createTransactionViaApi(
  page: Page,
  orgId: number,
  tx: TransactionInput,
): Promise<void> {
  const res = await page.request.post(
    `/api/v1/organizations/${orgId}/transactions/`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": await csrfToken(page),
      },
      data: { ...tx, is_tax_deductible: false },
    },
  );
  if (res.status() !== 201) {
    throw new Error(
      `transaction POST failed for "${tx.description}": ${res.status()} ${await res.text()}`,
    );
  }
}

/** Name → id of the workspace's categories. */
export async function categoryIdsViaApi(
  page: Page,
  orgId: number,
): Promise<Map<string, number>> {
  const res = await page.request.get(
    `/api/v1/organizations/${orgId}/categories/`,
  );
  if (res.status() !== 200) {
    throw new Error(`category GET failed: ${res.status()} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    categories: { id: number; name: string }[];
  };
  return new Map(data.categories.map((c) => [c.name, c.id]));
}
