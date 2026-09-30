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
    await page?.close();
  });

  const openAssistant = async () => {
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByText("Ask AI")).toBeVisible();
  };

  const closeAssistant = async () => {
    await page.getByRole("button", { name: "Close assistant" }).click();
    await expect(page.getByText("Ask AI")).toBeHidden();
  };

  const ask = async (question: string) => {
    await page.getByPlaceholder("Ask a question…").fill(question);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(question)).toBeVisible();
  };

  test("opens from the header, sends a question, shows a reply", async () => {
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await expect(page.getByText("Ask AI")).toBeVisible();

    await page
      .getByPlaceholder("Ask a question…")
      .fill("How much did I save this month?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByText("How much did I save this month?"),
    ).toBeVisible();
    await expect(
      page.getByText(/placeholder answer|assistant|approach/i),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close assistant" }).click();
  });

  test("closing and reopening starts a fresh conversation", async () => {
    await openAssistant();
    await ask("Fresh conversation check");
    await closeAssistant();
    await openAssistant();
    await expect(page.getByText("Fresh conversation check")).toBeHidden();
    await expect(
      page.getByText("Ask about your transactions, goals or budget."),
    ).toBeVisible();
    await closeAssistant();
  });

  test("behaves the same on another page", async () => {
    await page.getByRole("link", { name: "Savings" }).click();
    await openAssistant();
    await ask("Which goal is overdue?");
    await closeAssistant();
  });
});
