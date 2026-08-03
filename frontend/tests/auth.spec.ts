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
    await page.waitForURL("/");
    // expect(page.locator("#header")).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("logout success", async () => {
    await page.goto("/");

    const logoutBtn = page.getByRole("button", { name: /log\s*out/i });
    await logoutBtn.click();
    await page.waitForURL("/");

    expect(page.getByRole("button", { name: "Login", exact: true }));
  });

  test("login with username: success", async () => {
    // await page.goto("/");

    await page.getByLabel("Username or Email").fill(testUser.username);
    await page.getByLabel("Password").fill(testUser.password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.waitForURL("/");

    expect(page.getByRole("button", { name: /log\s*out/i })).toBeVisible();
  });
});
