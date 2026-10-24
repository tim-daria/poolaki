# Reports and Analytics — Module

Justification and technical details for the Minor module (1 point) claimed
in the [root README](../../README.md#modules-of-choice).
The API contract is in [backend/reports.md](../backend/reports.md); the
product behaviour is in [product/reports.md](../product/reports.md). This
page does not restate them.

## Why we chose this module

Recording expenses is only half the job — users also need to see where
their money went. This module builds that part: a yearly report over
income, expenses and savings, with charts and a print-ready layout.

## What it does

- One endpoint, `GET /api/v1/organizations/{id}/reports/?year=N`, returns
  the whole year in a single request: totals, a 12-month series, a
  per-category breakdown and a per-goal breakdown. The sums are computed
  in the database, so the app never loads the transaction rows.
- The Reports page shows the year as summary tiles, a column chart
  (income vs expenses per month, or savings per month) and a donut of
  category or goal shares.
- The user can pick any year from the workspace's history; picking one
  re-requests the report, so the numbers shown are always up to date.
- The same endpoint also feeds the Home page, so both screens show the
  same numbers.
- A Print button produces a clean annual report: a dedicated layout for
  paper (margins, exact colors, page break), which the browser can also
  save as PDF.

## What makes it technically hard

1. *Correct money math.* Saving moves money between cash and goals, so it
   must not appear in the income/expense totals. All report sections use
   one shared filter, so the numbers can never disagree. The backend sums
   in `Decimal` and serialises two-decimal strings; the frontend parses
   them to numbers only for display and chart scaling, never for
   arithmetic that is sent back.
2. *Charts built by ourselves.* The column chart scrolls on narrow
   screens and shows an average line over the months already passed; the
   donut keeps tiny slices visible; every chart states its numbers for
   screen readers.
3. *One page, three targets.* The same page must look right on a phone, a
   tablet and on paper, which required a dedicated print layout.

## How it adds value

It turns a list of transactions into something a user can act on: the
year's flow, the category split and the savings, for any year, on screen
or on paper. It is well tested: a backend test suite for the report,
frontend unit tests and an E2E test for the page.

## Why it deserves Minor module status

It is a self-contained module (one endpoint, one page, one chart set)
that is not trivial: it defines the financial numbers the rest of the app
reuses, and ships a custom, accessible, print-ready visualization on top.
We claim Minor, not Major, on purpose. The limits are deliberate, so the
boundaries are explicit: the range is yearly rather than arbitrary dates,
updates happen on user action rather than being pushed, and export uses
the browser print dialog rather than a separate PDF/CSV generator.
Everything claimed here is in the repo and tested.

## Data layer

`backend/django/core/services/report.py` builds the payload. The response
shape and the aggregation rules are documented in
[backend/reports.md](../backend/reports.md); the points that matter for
the module claim:

- Sums are computed in the database; transaction rows are never loaded
  into the app, and all sections share the same year filter.
- Saving (contributions and withdrawals) never appears in the
  income/expense figures. It is reported separately: `totals.goals_balance`
  and `monthly[].goals_balance` are the year's net transfers, `goals[]`
  is the per-goal breakdown for the year, and `goal_balance` is the net
  transfers of the current calendar month across active and completed
  goals — a month figure, not a lifetime balance. The Home page reads the
  current month's `goals_balance` entry for the same number.
- The category breakdown is shared with the Home page and the AI service,
  so all three surfaces show the same numbers.

## Presentation layer

Page: `frontend/src/pages/Reports/`. Charts: `frontend/src/components/Charts/`.
The screens are described in [product/reports.md](../product/reports.md);
the implementation points:

- **Column chart:** a segmented control switches between "Income &
  expenses" and "Savings". Scrolls on narrow screens; a dashed line marks
  the average over the months already passed; future months draw no bar.
- **Categories card:** a segmented control switches between Expenses,
  Income and Savings; the donut lifts tiny slices so they stay visible,
  and the tooltip and ring center show the real figures. Date ranges and
  category filters stay on the transactions list.
- **Savings figures:** read straight from the report response
  (`frontend/src/lib/savings.ts` parses `goals_balance` and `goals[]`);
  no second request is made.
- **Always fresh:** every year or workspace switch re-requests the report
  and aborts the previous one, so a slow response can never overwrite the
  current selection.

## Print layout

The Print button calls `window.print()`. Print rules live next to each
component:

- 12mm page margins and exact chart colors (`print-color-adjust`).
- A print-only title, since the app header is hidden on paper.
- A page break before the category list, so cards never split.
- The chart stops scrolling and fits the page width.

The browser's dialog then covers both targets: paper and "Save as PDF".

## Accessibility

- Charts are `role="img"` with an `aria-label` that states the numbers.
- Abbreviated figures keep the exact amount in `title`/`aria-label`.
- The E2E test finds the page's regions, buttons and the year selector by
  role and accessible name, and checks the visible copy by text.

## Testing

- **Backend:** `backend/django/core/tests/test_reports.py` (totals,
  zero-fill, category ordering, goal balance, year validation, 403) and
  `backend/django/core/tests/internal/test_ai_analytics.py` (the shared
  breakdown).
- **Frontend unit:** `frontend/src/lib/savings.test.ts`,
  `chartScale.test.ts`, `reportYears.test.ts`, `reports.test.ts`.
- **E2E:** `frontend/tests/reports.spec.ts` (page shell, the Categories
  empty state, the Categories Expenses → Income switch, year selector).
  The Savings views and the column chart's toggle have no E2E coverage;
  their data helpers are unit tested in `savings.test.ts`.
