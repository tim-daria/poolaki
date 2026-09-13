// @ts-check
import { test, expect, type Page } from "@playwright/test";

/**
 * @file E2E coverage for the signed-out pages: /login, /register, and
 * /oauth-callback. Runs against the real backend; only the allauth endpoints
 * that need a specific server state (409, failed OAuth session) are mocked.
 */

const SESSION_URL = "**/_allauth/browser/v1/auth/session";
const LOGIN_URL = "**/_allauth/browser/v1/auth/login";

test.describe.serial("User authentication", () => {
  let page: Page;

  const timestamp = Date.now();
  const testUser = {
    username: `user_${timestamp}`,
    email: `user_${timestamp}@example.com`,
    password: `w1234567!_${timestamp}`,
  };

  const loginButton = () =>
    page.getByRole("button", { name: "Login", exact: true });
  const signUpButton = () =>
    page.getByRole("button", { name: "Sign up", exact: true });

  async function fillRegister(user: {
    email: string;
    username: string;
    password: string;
    password2?: string;
  }) {
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Username").fill(user.username);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page
      .getByLabel("Confirm password")
      .fill(user.password2 ?? user.password);
  }

  async function fillLogin(identifier: string, password: string) {
    await page.getByLabel("Username or email").fill(identifier);
    await page.getByLabel("Password", { exact: true }).fill(password);
  }

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  /* ---------------------------------- */
  /*            Signed-out shell        */
  /* ---------------------------------- */

  test("a signed-out visit to / lands on the login form", async () => {
    await page.goto("/");

    await page.waitForURL("/login");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await expect(loginButton()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Login with 42" }),
    ).toBeVisible();
  });

  test("login and sign-up pages link to each other", async () => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign\s*up/i }).click();
    await page.waitForURL("/register");
    await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();

    await page.getByRole("link", { name: "Login", exact: true }).click();
    await page.waitForURL("/login");
  });

  test("legal notice links to the terms and policy routes", async () => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/policy");
  });

  /* ---------------------------------- */
  /*              Registration          */
  /* ---------------------------------- */

  test("user registration success", async () => {
    await page.goto("/register");
    await fillRegister(testUser);
    await signUpButton().click();

    // "/" only redirects — the app settles on the personal workspace.
    await page.waitForURL(/\/o\/\d+$/);
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("logout success", async () => {
    await page.goto("/");

    // Logout lives behind the header's avatar menu.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /log\s*out/i }).click();
    await page.waitForURL("/login");

    await expect(loginButton()).toBeVisible();
  });

  // Everything below needs a signed-out session: /login and /register sit
  // inside GuestRoute, which bounces authenticated users to their workspace.

  test("registration rejects mismatched passwords", async () => {
    await page.goto("/register");
    await fillRegister({
      email: `x_${timestamp}@example.com`,
      username: `x_${timestamp}`,
      password: testUser.password,
      password2: "something-else",
    });
    await signUpButton().click();

    // Client-side check; no request goes out.
    await expect(page.getByRole("alert")).toContainText(
      /passwords do not match/i,
    );
    await expect(page).toHaveURL("/register");
  });

  test("registration rejects an email that is already taken", async () => {
    await page.goto("/register");
    await fillRegister({
      email: testUser.email,
      username: `other_${timestamp}`,
      password: testUser.password,
    });
    await signUpButton().click();

    // Rejected by allauth and surfaced through parseAllauthErrors.
    await expect(page.getByRole("alert")).toContainText(
      /already (in use|registered)/i,
    );
    await expect(page).toHaveURL("/register");
  });

  /* ---------------------------------- */
  /*                 Login              */
  /* ---------------------------------- */

  test("login rejects a wrong password", async () => {
    await page.goto("/login");
    await fillLogin(testUser.username, "definitely-not-the-password");
    await loginButton().click();

    await expect(page.getByRole("alert")).toContainText(/incorrect|failed/i);
    await expect(page).toHaveURL("/login");
  });

  test("login shows guidance, not an error, when a session already exists", async () => {
    // allauth answers 409 without an `errors` array when a session exists.
    await page.route(LOGIN_URL, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ status: 409 }),
          })
        : route.continue(),
    );

    try {
      await page.goto("/login");
      await fillLogin(testUser.username, testUser.password);
      await loginButton().click();

      const alert = page.getByRole("alert");
      await expect(alert).toContainText(/already signed in/i);
      await expect(
        alert.getByRole("link", { name: /continue to the app/i }),
      ).toHaveAttribute("href", "/");
      await expect(page).toHaveURL("/login");
    } finally {
      await page.unroute(LOGIN_URL);
    }
  });

  /* ---------------------------------- */
  /*            OAuth error paths       */
  /* ---------------------------------- */

  test("login maps a known ?error= code and keeps it across a form submit", async () => {
    await page.goto("/login?error=account_not_found");

    const oauthAlert = page.getByRole("alert").filter({
      hasText: /no 42 account is linked/i,
    });
    await expect(oauthAlert).toBeVisible();

    // The OAuth alert lives beside the 42 button and must survive a failed
    // form submit; the form error renders separately.
    await fillLogin(testUser.username, "definitely-not-the-password");
    await loginButton().click();

    await expect(oauthAlert).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: /incorrect|failed/i }),
    ).toBeVisible();
  });

  test("login falls back to a generic message for an unknown ?error= code", async () => {
    await page.goto("/login?error=some_code_nobody_mapped");

    await expect(page.getByRole("alert")).toContainText(
      /signing in with 42 failed/i,
    );
  });

  test("register maps a known ?error= code", async () => {
    await page.goto("/register?error=access_denied");

    await expect(page.getByRole("alert")).toContainText(
      /authorization was cancelled/i,
    );
  });

  test("a failed OAuth callback returns to the page the flow started from", async () => {
    // No session after the provider redirect: allauth reports 401.
    await page.route(SESSION_URL, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ status: 401, meta: { is_authenticated: false } }),
      }),
    );

    try {
      await page.goto("/oauth-callback?flow=signup&error=access_denied");
      await page.waitForURL("/register?error=access_denied");
      await expect(page.getByRole("alert")).toContainText(
        /authorization was cancelled/i,
      );

      // Without a provider code the callback supplies its own.
      await page.goto("/oauth-callback?flow=login");
      await page.waitForURL("/login?error=oauth-failed");
      await expect(page.getByRole("alert")).toContainText(/did not complete/i);
    } finally {
      await page.unroute(SESSION_URL);
    }
  });

  /* ---------------------------------- */
  /*            Successful login        */
  /* ---------------------------------- */

  test("login with username: success", async () => {
    await page.goto("/login");
    await fillLogin(testUser.username, testUser.password);
    await loginButton().click();
    await page.waitForURL(/\/o\/\d+$/);

    // The header's avatar menu is the proof we landed in the app shell.
    await expect(
      page.getByRole("button", { name: /account menu/i }),
    ).toBeVisible();
  });

  test("login with email: success", async () => {
    // Sign out first; the previous test left a session behind.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /log\s*out/i }).click();
    await page.waitForURL("/login");

    await fillLogin(testUser.email, testUser.password);
    await loginButton().click();
    await page.waitForURL(/\/o\/\d+$/);

    await expect(
      page.getByRole("button", { name: /account menu/i }),
    ).toBeVisible();
  });
});
