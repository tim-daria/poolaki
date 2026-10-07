# Reports

All endpoints in this document require authentication.

## Reports endpoint

One read-only endpoint with the yearly finance report for the reporting page:
income/expense totals, monthly distribution, and per-category breakdown for
one organization and one year.

### Get yearly report

```http
GET /api/v1/organizations/{org_id}/reports/
```

Query parameters:

- `year` (optional, integer, 2000..2100) — the year to report on. Defaults
  to the current year. A year within the range with no data simply returns
  zeros; a non-integer or out-of-range value returns `400`.

Response example:

```json
{
  "year": 2025,
  "totals": {
    "income": "12000.00",
    "expenses": "8400.50"
  },
  "monthly": [
    { "month": 1, "income": "1000.00", "expenses": "700.00" },
    { "month": 2, "income": "0.00", "expenses": "120.50" },
    { "month": 3, "income": "0.00", "expenses": "0.00" }
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

Status:

- `200 OK` on success
- `400 Bad Request` when `year` is not an integer or outside 2000..2100
- `403 Forbidden` when the user is not a member of the organization

## How the report is built

- **Income and expenses only.** Savings (`contribution`) are not part of the
  report. A "total contributions" number alone would be misleading once the
  planned `withdraw` type exists — savings only make sense net of
  withdrawals (contributions minus withdrawals). Savings metrics will be
  designed together with `withdraw` and added to this endpoint or separate endpoint later.
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
- **No "uncategorized" bucket.** The API requires a category for income and
  expense and rejects clearing it on update, so every reported row has a
  category: `sum(categories[].total)` equals `totals` per type.
- **Categories are grouped by type** — income first, then expenses — sorted
  by `total` descending inside each group. Every category also carries its
  own 12-slot `monthly` series (index 0 = January), so the per-category
  month chart needs no extra request.
- Amounts are strings with exactly 2 decimal places, same as the rest of the
  API.
