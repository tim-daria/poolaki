// @ts-check
import { test, expect, type Page } from "@playwright/test";

test.describe.serial("User authentication", () => {
  let page: Page;

  const timestamp = Date.now();
  const testUser = {
    username: `user_${timestamp}`,
    email: `user_${timestamp}@example.com`,
    password: `w1234567!_${timestamp}`,
  };

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("has login button", async () => {
    await page.goto("/");

    const loginBtn = page.getByRole("button", { name: "Login", exact: true });
    await expect(loginBtn).toBeVisible();
  });

  test("signup link present and works", async () => {
    await page.goto("/");

    const signUpLink = page.getByRole("link", { name: /sign\s*up/i });

    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    await page.waitForURL("/register");
  });

  test("user registration success", async () => {
    await page.goto("/register");

    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Username").fill(testUser.username);
    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByLabel("Confirm Password").fill(testUser.password);

    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    // "/" only redirects now — the app settles on /o/:orgId.
    await page.waitForURL(/\/o\/\d+$/);
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("logout success", async () => {
    await page.goto("/");

    // Logout lives behind the header's avatar menu, not on the bar itself.
    await page.getByRole("button", { name: /account menu/i }).click();
    await page.getByRole("menuitem", { name: /log\s*out/i }).click();
    await page.waitForURL("/login");

    await expect(
      page.getByRole("button", { name: "Login", exact: true }),
    ).toBeVisible();
  });

  // The three below need a logged-out session: /register and /login sit inside
  // GuestRoute, which bounces authenticated users to their workspace. They also
  // have to run after registration, since they reuse that account's details.

  test("registration rejects mismatched passwords", async () => {
    await page.goto("/register");

    await page.getByLabel("Email").fill(`x_${timestamp}@example.com`);
    await page.getByLabel("Username").fill(`x_${timestamp}`);
    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByLabel("Confirm Password").fill("something-else");
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    // Checked client-side, so no request is made and we stay on the form.
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("registration rejects an email that is already taken", async () => {
    await page.goto("/register");

    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Username").fill(`other_${timestamp}`);
    await page.getByLabel("Password", { exact: true }).fill(testUser.password);
    await page.getByLabel("Confirm Password").fill(testUser.password);
    await page.getByRole("button", { name: "Sign Up", exact: true }).click();

    // Rejected by allauth, surfaced through parseAllauthErrors.
    await expect(page).toHaveURL("/register");
    await expect(
      page.getByRole("button", { name: "Sign Up", exact: true }),
    ).toBeVisible();
  });

  test("login rejects a wrong password", async () => {
    await page.goto("/login");

    await page.getByLabel("Username or Email").fill(testUser.username);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(page).toHaveURL("/login");
    await expect(
      page.getByRole("button", { name: "Login", exact: true }),
    ).toBeVisible();
  });

  test("login with username: success", async () => {
    await page.goto("/login");

    await page.getByLabel("Username or Email").fill(testUser.username);
    await page.getByLabel("Password").fill(testUser.password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL(/\/o\/\d+$/);

    // The header's avatar menu is the proof we landed in the app shell.
    await expect(
      page.getByRole("button", { name: /account menu/i }),
    ).toBeVisible();
  });
});
