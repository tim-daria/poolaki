// @ts-check
import { test, expect, type Page } from "@playwright/test";

/**
 * Workspace routing and the session bridge.
 *
 * Runs against the real backend, so the user is registered once per run with a
 * timestamped name — same approach as auth.spec.ts.
 */
test.describe.serial("Workspaces", () => {
  let page: Page;
  let personalUrl: string;

  const timestamp = Date.now();
  const testUser = {
    username: `org_${timestamp}`,
    email: `org_${timestamp}@example.com`,
    password: `w1234567!_${timestamp}`,
  };
  const sharedName = `Trip ${timestamp}`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("registration lands on a workspace URL, not /", async () => {
    await page.goto("/register");

    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Username").fill(testUser.username);
    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByLabel("Confirm Password").fill(testUser.password);
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    // "/" is only a redirect now — the app always settles on /o/:orgId.
    await page.waitForURL(/\/o\/\d+$/);
    personalUrl = new URL(page.url()).pathname;

    // The personal workspace is named "<username>'s budget" by the signup signal.
    await expect(
      page.getByRole("heading", { name: new RegExp(testUser.username) }),
    ).toBeVisible();
  });

  test("reloading keeps the same workspace", async () => {
    await page.goto(personalUrl);
    await page.reload();

    await expect(page).toHaveURL(personalUrl);
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("entering a workspace pushes it into the session (the bridge)", async () => {
    const orgId = personalUrl.split("/").pop();

    const selectCall = page.waitForRequest(
      (req) =>
        req.method() === "POST" &&
        req.url().includes(`/api/organizations/${orgId}/select/`),
    );

    await page.goto(personalUrl);
    await selectCall;
  });

  test("the shell stays visible while the bridge is in flight", async () => {
    // Hold every select/ response open so the in-between state is observable.
    // StrictMode fires the request twice, so limiting this to the first one
    // would let the second resolve immediately and end the wait early.
    await page.route("**/api/organizations/*/select/", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto(personalUrl);

    // The page area waits, but the header must not disappear with it — that
    // was the flicker this design fixed.
    await expect(page.getByText("Loading…")).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();

    await expect(page.getByText("Loading…")).toBeHidden({ timeout: 10000 });

    // ignoreErrors: handlers may still be sleeping, and removing them resolves
    // the pending route before their own route.continue() runs.
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("creating a shared workspace switches to it and closes the modal", async () => {
    await page.goto(personalUrl);

    await page
      .getByRole("button", { name: new RegExp(testUser.username) })
      .click();
    await page
      .getByRole("menuitem", { name: /create shared workspace/i })
      .click();

    await page.getByLabel("Name").fill(sharedName);
    await page.getByLabel(/initial balance/i).fill("500");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    // Must be a *different* workspace: we are already on a /o/:id URL, so
    // waiting for the pattern alone would match instantly and race the redirect.
    await page.waitForURL(
      (url) => /\/o\/\d+$/.test(url.pathname) && url.pathname !== personalUrl,
    );

    // The header is not remounted on a switch, so the modal has to close itself.
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: new RegExp(sharedName) }),
    ).toBeVisible();
  });

  test("switching workspaces changes the URL and the page", async () => {
    const sharedUrl = new URL(page.url()).pathname;

    await page.getByRole("button", { name: new RegExp(sharedName) }).click();
    await page
      .getByRole("menuitem", { name: new RegExp(testUser.username) })
      .click();

    await expect(page).toHaveURL(personalUrl);
    await expect(
      page.getByRole("heading", { name: new RegExp(testUser.username) }),
    ).toBeVisible();

    // Back is meaningful now that the workspace lives in the URL.
    await page.goBack();
    await expect(page).toHaveURL(sharedUrl);
    await expect(
      page.getByRole("heading", { name: new RegExp(sharedName) }),
    ).toBeVisible();
  });

  test("an unknown workspace shows NoAccessScreen and does not redirect", async () => {
    await page.goto("/o/999999");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByText(/don't have access|doesn't exist/i),
    ).toBeVisible();

    // It must stay put: if this screen redirected, "/" → /o/X → "/" would loop.
    await page.waitForTimeout(500);
    await expect(page).toHaveURL("/o/999999");
  });

  test("a non-numeric workspace id shows NoAccessScreen", async () => {
    // The lookup is String(o.id) === orgId, so "abc" simply matches nothing.
    await page.goto("/o/abc");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/o/abc");
  });

  test("a failing workspace list shows an error, not a hang", async () => {
    // No `times` limit: StrictMode runs effects twice in dev, so every fetch
    // goes out two times. Intercepting only the first lets the second succeed
    // and the app quietly recovers.
    await page.route("**/api/organizations/", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 500 })
        : route.continue(),
    );

    await page.goto("/");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /no workspaces/i }),
    ).toBeVisible();

    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("a 403 from select/ shows NoAccessScreen", async () => {
    // Simulates losing membership between loading the list and opening it.
    await page.route("**/api/organizations/*/select/", (route) =>
      route.fulfill({
        status: 403,
        json: { error: "You are not a member of this organization" },
      }),
    );

    await page.goto(personalUrl);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/don't have access|doesn't exist/i)).toBeVisible();

    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("whitespace-only workspace name is rejected", async () => {
    await page.goto(personalUrl);

    await page
      .getByRole("button", { name: new RegExp(testUser.username) })
      .click();
    await page
      .getByRole("menuitem", { name: /create shared workspace/i })
      .click();

    // The input is `required`, so "" never reaches our code — "   " does.
    await page.getByLabel("Name").fill("   ");
    await page.getByLabel(/initial balance/i).fill("100");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(personalUrl);
  });

  test("a failed creation keeps the modal open", async () => {
    // Only the creation POST — the same URL serves the workspace list on GET.
    await page.route("**/api/organizations/", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 500 })
        : route.continue(),
    );

    await page.getByLabel("Name").fill(`Broken ${timestamp}`);
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(page.getByText(/failed to create/i)).toBeVisible();
    // The user must keep what they typed and be able to retry.
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create", exact: true })).toBeEnabled();

    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("a 500 from select/ surfaces an error and can be retried", async () => {
    await page.route("**/api/organizations/*/select/", (route) =>
      route.fulfill({ status: 500 }),
    );

    await page.goto(personalUrl);

    // Not a permanent "Loading…", and not the wrong message either: nothing is
    // wrong with the workspace, so this is not NoAccessScreen.
    await expect(page.getByText("Loading…")).toBeHidden();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    // Let the retry reach the real endpoint so it actually recovers.
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("logging out clears the workspaces", async () => {
    await page.goto(personalUrl);
    // Logout lives behind the header's avatar menu, not on the bar itself.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /log\s*out/i }).click();
    await page.waitForURL("/login");

    // The workspace URL must not be reachable once logged out.
    await page.goto(personalUrl);
    await page.waitForURL("/login");
  });

  /**
   * Two tabs in different workspaces must not share data.
   *
   * This cannot pass while the bridge exists: the backend keeps one
   * current_organization_id per session, so whichever tab loaded last wins.
   * It won't run for now.
   * Enable this once endpoints take the workspace from the URL — it is the test
   * that proves the design actually works.
   */
  test.fixme("two tabs keep separate workspaces", async ({ browser }) => {
    const context = await browser.newContext();
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await tabA.goto(personalUrl);
    await tabB.goto("/o/2");

    await tabA.reload();
    await expect(tabA).toHaveURL(personalUrl);

    await context.close();
  });
});
