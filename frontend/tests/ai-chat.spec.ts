import { test, expect, type Page } from "@playwright/test";
import { openAsSharedOwner } from "./helpers.js";

test.describe.serial("AI assistant chat", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = (await openAsSharedOwner(browser)).page;
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
    await openAssistant();
    await ask("How much did I save this month?");
    await expect(
      page.getByText(/placeholder answer|assistant|approach/i),
    ).toBeVisible();
    await closeAssistant();
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
