// @ts-check
import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers.js";

test.describe.serial("AI assistant chat", () => {
  let page: import("@playwright/test").Page;

  const timestamp = Date.now();
  const testUser = {
    username: `aichat_${timestamp}`,
    email: `aichat_${timestamp}@example.com`,
    password: `w1234567!_${timestamp}`,
  };

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await registerUser(page, testUser);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("opens from the header, sends a question, shows a reply", async () => {
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByText("Ask AI")).toBeVisible();

    await page.getByPlaceholder("Ask a question…").fill("How much did I save this month?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("How much did I save this month?")).toBeVisible();
    await expect(page.getByText(/placeholder answer|assistant|approach/i)).toBeVisible();
  });

  test("closing and reopening starts a fresh conversation", async () => {
    await page.getByRole("button", { name: "Close assistant" }).click();
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByText("How much did I save this month?")).not.toBeVisible();
  });

  test("behaves the same on another page", async () => {
    await page.getByRole("link", { name: "Goals" }).click();
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByText("Ask AI")).toBeVisible();

    await page.getByPlaceholder("Ask a question…").fill("Which goal is overdue?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Which goal is overdue?")).toBeVisible();
  });
});