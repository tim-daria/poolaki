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

- **Transactions overview:** Answer questions about consolidated annual data and monthly totals for a specified year, including expenses, income, and savings (contributions), as well as consolidated annual spending per category.

- **Transactions details:** Identify the largest expense category for the year, the top five expenses, the most recent expense, and the largest transactions within a time period of up to the last six months.

- **Semantic Product Understanding:** Explain category meanings, suggest categories for transactions, explain application concepts (such as the difference between goals and transactions), and clarify categorization reasons.

- **Current organization:** All retrieved data comes from the organization to which the user currently belongs.

## What the AI Chat Cannot Do (Out of Scope)

- It cannot perform write actions, create transactions, edit goals, or modify user data directly.

- It cannot handle general conversational tasks, external web searches, or domains outside the MVP specifications.

- It cannot provide personalized financial planning, investment advice, or tax auditing services beyond calculating requested data points.

- Connect with the conversation history and context from previous chats.

- It cannot provide information from organizations different than the one in which the user is during the chat.

## How to Access the AI Chat

The chat assistant is accessible from every page in the application via a persistent button that opens the chat interface.

## Security and Privacy

- The AI assistant uses secure backend data retrieval and semantic context.

- User information is handled securely and accessed only to answer authorized user queries within their account scope using user and organization identifiers.

- The AI assistant doesn't have access to personal data.

## Related Concepts

- Expenses
- Income
- Contributions
- Savings and Goals
- Transaction
- Categories
- Reports
- Analytics
