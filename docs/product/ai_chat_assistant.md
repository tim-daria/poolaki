---
document_id: ai_chat_assistant
title: AI Chat Assistant
domain: product
language: en
version: 1
---

# AI Chat Assistant

## Definition and Purpose

Poolaki AI Assistant is an interactive chat tool that allows users to query their financial data using natural language, receive insights, and understand application features and concepts. Basically, it helps the user to talk with their data.

## What the AI Chat Can Do (In Scope)

The AI assistant's scope for the MVP is strictly limited to answering the predefined supported questions and querying the specific backend endpoints:

- **Transactions overview:** Answer questions about consolidated annual data and monthly totals for the current year, including expenses and income, as well as consolidated annual spending per category.

- **Transactions details:** Identify the largest expense category for the current year, the top five expenses and the most recent expense in the last three calendar months, and the largest transactions within that window.

- **Semantic Product Understanding:** Explain category meanings, explain application concepts (such as the difference between goals and transactions), and explain how categories are assigned in general.

- **Savings and goals:** Explain the concept and answer questions using the savings data provided in context.

- **Current organization:** All retrieved data comes from the organization to which the user currently belongs.

Goals are targets; savings are the money set aside to reach them. Contributions and withdrawals are excluded from income/expense totals; the assistant can explain the relationship and answer with the savings data available in context. It does not invent goal balances or progress.

## What the AI Chat Cannot Do (Out of Scope)

- It cannot perform write actions, create transactions, edit goals, or modify user data directly.

- It cannot handle general conversational tasks, external web searches, or domains outside the MVP specifications.

- It cannot provide personalized financial planning, investment advice, or tax auditing services beyond calculating requested data points.

- It cannot calculate goal progress, remaining amounts, or completion estimates when the savings data is not available.

- It cannot break data down by week or by day; financial data is monthly.

- It cannot explain why one specific transaction received a category.

- It cannot connect with the conversation history and context from previous chats.

- It cannot provide information from organizations different than the one in which the user is during the chat.

- It answers in English only.

## How to Access the AI Chat

The chat assistant is accessible from every page in the application via a persistent button that opens the chat interface.

It is available to authenticated members of the current workspace and is read-only: it cannot edit, delete, or change the status of any data, and it sends no notifications.

## Security and Privacy

- The AI assistant uses secure backend data retrieval and semantic context.

- User information is handled securely and accessed only to answer authorized user queries within their account scope using user and organization identifiers.

- The AI assistant doesn't have access to personal data.

## Related Concepts

- Expenses
- Income
- Transaction
- Categories
- Savings and Goals
- Reports
- Analytics
