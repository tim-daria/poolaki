# Reports

All endpoints in this document require authentication.

## Reports endpoint

One read-only endpoint with the yearly finance report for the reporting page:
income/expense totals, monthly distribution, per-category breakdown for one
organization and one year, plus the current balance across active and
completed goals (`goal_balance`).

### Get yearly report

```http
GET /api/v1/organizations/{org_id}/reports/
```

Query parameters:

- `year` (optional, integer, 1900..2099) — the year to report on. Defaults
  to the current year. A year within the range with no data simply returns
  zeros; a non-integer or out-of-range value returns `400`.

Response example:

```json
{
  "year": 2025,
  "totals": {
    "income": "12000.00",
    "expense": "8400.50"
  },
  "goal_balance": "1540.50",
  "monthly": [
    { "month": 1, "income": "1000.00", "expense": "700.00" },
    { "month": 2, "income": "0.00", "expense": "120.50" },
    { "month": 3, "income": "0.00", "expense": "0.00" }
  ],
  "categories": [
    {
      "category_id": 8,
      "name": "Salary",
      "type": "income",
      "total": "12000.00",
      "monthly": ["1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00"]
    },
    {
      "category_id": 1,
      "name": "Food",
      "type": "expense",
      "total": "2100.25",
      "monthly": ["180.50", "170.25", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "1750.00"]
    }
  ]
}
```

(The `monthly` array above is abbreviated for readability — it always has
exactly 12 entries.)

Status:

- `200 OK` on success
- `400 Bad Request` when `year` is not an integer or outside 2000..2100
- `403 Forbidden` when the user is not a member of the organization

## How the report is built

- **Yearly sections are income and expenses only.** Contribution and
  withdraw rows move money between cash and goals, so they never appear in
  `totals`, `monthly` or `categories`. The Home page takes this month's
  income, expenses and the top-spending split from this endpoint, and its
  savings figure from the month's `contribution` and `withdraw` rows via the
  transactions list.
- **`goal_balance` is the savings figure, net of withdrawals.** It is the
  current balance across all active and completed goals (contributions minus
  withdrawals and expenses paid from them). It is a "right now" snapshot: it
  ignores the `year` parameter and does not change when the year is
  switched. Archived goals are excluded — they are settled (zero balance)
  at archival. Goals without a balance simply contribute 0.
- **Opening balance is not income.** `Organization.initial_balance` is the
  money the organization started with, not money earned this year, so it is
  excluded from every metric.
- **One request for the whole page.** Changing the year changes everything on
  the page, so a single endpoint returns all of it — no extra requests for
  the charts or the category table.
- **Aggregates run in the database.** A few `SUM` queries scoped to the
  organization and the year; transactions are not loaded into the app.
- **Raw numbers only, no percentages.** Shares are computed by the frontend
  from the same response: yearly — `categories[].total` against `totals`,
  per month — `categories[].monthly[i]` against `monthly[i]`.
- **`monthly` always has 12 entries** (months 1–12, in order), zero-filled,
  so charts need no gap handling. For the current (incomplete) year the
  not-yet-arrived months are plain zeros.
- **The response shape is the same for any year.** A year without income or
  expense transactions returns zero `totals`, 12 zero `monthly` entries, an
  empty `categories` array and — when the organization has no goals — a
  `goal_balance` of `"0.00"`. Never `null` or missing keys. The frontend
  can use `categories.length === 0` as its "no data" signal, since every
  reported row is categorized.
- **No "uncategorized" bucket.** The API requires a category for income and
  expense and rejects clearing it on update, so every reported row has a
  category: `sum(categories[].total)` equals `totals` per type.
- **Categories are grouped by type** — income first, then expenses — sorted
  by `total` descending inside each group. Every category also carries its
  own 12-slot `monthly` series (index 0 = January), so the per-category
  month chart needs no extra request.
- Amounts are strings with exactly 2 decimal places, same as the rest of the
  API.
