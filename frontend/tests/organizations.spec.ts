// @ts-check
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Workspace routing: the URL owns the workspace.
 *
 * Runs against the real backend, so the user is registered once per run with a
 * timestamped name — same approach as auth.spec.ts.
 */
test.describe.serial("Workspaces", () => {
  // An explicit context, not browser.newPage(): the two-tab test needs to open
  // a second page sharing this one's session cookie.
  let context: BrowserContext;
  let page: Page;
  let personalUrl: string;
  let sharedUrl: string;

  const timestamp = Date.now();
  const testUser = {
    username: `org_${timestamp}`,
    email: `org_${timestamp}@example.com`,
    password: `w1234567!_${timestamp}`,
  };
  const sharedName = `Trip ${timestamp}`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
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
    sharedUrl = new URL(page.url()).pathname;

    // Switching is a lookup in the already-loaded list, not a request. This is
    // what the design buys: no round trip, so no loading state to design for.
    const orgCalls: string[] = [];
    const record = (req: { url: () => string }) => {
      if (req.url().includes("/api/organizations/")) orgCalls.push(req.url());
    };
    page.on("request", record);

    await page.getByRole("button", { name: new RegExp(sharedName) }).click();
    await page
      .getByRole("menuitem", { name: new RegExp(testUser.username) })
      .click();

    await expect(page).toHaveURL(personalUrl);
    expect(orgCalls).toEqual([]);
    page.off("request", record);

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

  /**
   * Two tabs in different workspaces must not interfere. This is the test that
   * proves the design: with the workspace in the URL and nothing workspace-
   * shaped in the session, neither tab can move the other.
   *
   * Runs before the logout test — it borrows the suite's authenticated context,
   * which logging out empties.
   */
  test("two tabs keep separate workspaces", async () => {
    const tabA = await context.newPage();
    const tabB = await context.newPage();

    await tabA.goto(personalUrl);
    await tabB.goto(sharedUrl);

    // Load order is the trap: whichever loaded last used to win for both.
    await tabA.reload();
    await tabB.reload();

    await expect(tabA).toHaveURL(personalUrl);
    await expect(
      tabA.getByRole("heading", { name: new RegExp(testUser.username) }),
    ).toBeVisible();

    await expect(tabB).toHaveURL(sharedUrl);
    await expect(
      tabB.getByRole("heading", { name: new RegExp(sharedName) }),
    ).toBeVisible();

    await tabA.close();
    await tabB.close();
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

});
