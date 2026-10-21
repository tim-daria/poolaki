---
document_id: reports_and_analytics
title: Reports and Analytics
domain: product
language: en
version: 1
---

# Reports and Analytics

## Definition

The reports page provides visual and consolidated financial summaries, allowing users to analyze their spending patterns, savings progress, and cash flow across different time periods.

## Key Features and Visualizations

- **Annual Transactions Filter:** Features an annual for entire report, and as a default will use the current year.

- **Summary cards:** Display income, expenses, contributions, and withdrawals
  for the filtered year.

- **Savings Consolidations:** Displays month-by-month consolidated savings for a selected year.

- **Goal progress:** Displays the current balance for each active or completed
  goal and its month-end balance for every month in the selected year. The
  aggregate goal balance is the current balance across those goals.

- **Category table:** Displays income and expense totals per category, with a
  zero-filled monthly series for the selected year. Contribution categories are
  excluded.

## When the report fails

The Home page reads this month's income, expenses and top-spending split
from the report. If that request fails, the rest of Home still renders:
the balance, recent activity and the goal card come from other requests,
and only the month card and the top-spending card show a message in place
of their figures. The Reports page shows the same message instead of its
charts.

The failure itself is logged to the browser console, so the message on the
card never hides the real cause from a developer.

## Related Concepts

- Transaction
- Categories
- Savings and Goals
- Contributions
- Transactions Overview
