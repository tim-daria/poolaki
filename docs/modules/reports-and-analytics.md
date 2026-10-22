

# Reports and Analytics — Module

Justification and technical details for the Minor module (1 point) claimed
in the [root README](../../README.md#modules-of-choice).
The API contract is in [backend/reports.md](../backend/reports.md).

## Why we chose this module

Recording expenses is only half the job — users also need to see where
their money went. This module builds that part: a yearly report over
income, expenses and savings, with charts and a print-ready layout.

## What it does

- One endpoint, `GET /api/v1/organizations/{id}/reports/?year=N`, returns
  the whole year in a single request: totals, a 12-month series and a
  per-category breakdown. The sums are computed in the database, so the
  app never loads the transaction rows.
- The Reports page shows the year as summary tiles, a column chart
  (income vs expenses per month, or savings per month) and a donut of
  category shares.
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
   one shared filter, so the numbers can never disagree. Amounts are
   `Decimal` end to end.
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
We claim Minor, not Major, on purpose: the range is yearly rather than
arbitrary dates, updates happen on user action rather than being pushed,
and export uses the browser print dialog rather than a separate PDF/CSV
generator. Everything claimed here is in the repo and tested.

## Data layer

`backend/django/core/services/report.py` builds the payload for
`GET /api/v1/organizations/{org_id}/reports/?year=N`.

- Sums are computed in the database (`SUM`, `EXTRACT`); transaction rows
  are never loaded into the app.
- All sections (totals, monthly, categories) use the same year filter, so
  they always agree.
- Saving (contributions and withdrawals) never appears in the
  income/expense figures. `goal_balance` is the current balance across
  active and completed goals — a snapshot, not part of the reported year.
  The organization's initial balance is opening money, not income.
- The response shape is the same for any year: 12 zero-filled months, no
  `null`s. A year without data gives zero totals and an empty category
  list. Amounts are `Decimal` with two decimals.
- The category breakdown is shared with the Home page and the AI service,
  so all three surfaces show the same numbers.

## Presentation layer

Page: `frontend/src/pages/Reports/`. Charts: `frontend/src/components/Charts/`.

- **Summary tiles:** the year's income, expense and net saving. Big
  numbers are abbreviated past six digits; the exact amount stays on
  hover and for assistive tech.
- **Column chart:** income vs expense per month, or savings per month.
  Scrolls on narrow screens; a dashed line marks the average over the
  months already passed; future months draw no bar.
- **Donut:** category shares; tiny slices are lifted so they stay
  visible; the tooltip and the ring center show the real figures.
- **Views:** segmented controls switch between Expenses, Income and
  Savings. Date ranges and category filters stay on the transactions
  list.
- **Savings figures:** computed from transfer rows, net of withdrawals
  (`frontend/src/lib/savings.ts`), until the endpoint carries them.
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
- The E2E test drives the page by roles and labels only.

## Testing

- **Backend:** `backend/django/core/tests/test_reports.py` (totals,
  zero-fill, category ordering, goal balance, year validation, 403) and
  `test_ai_analytics.py` (the shared breakdown).
- **Frontend unit:** `savings.test.ts`, `chartScale.test.ts`,
  `reportYears.test.ts`, `reports.test.ts`.
- **E2E:** `frontend/tests/reports.spec.ts` (page shell, empty states,
  view switching, year selector).

## Limits

Deliberate, so the boundaries are explicit: yearly ranges only; updates on
user action, not pushed; export via the browser print dialog.
