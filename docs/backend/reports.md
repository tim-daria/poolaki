# Reports (Reporting page backend)

Backend contract and implementation plan for the reporting page: yearly
finance aggregates for an organization — annual totals, monthly distribution,
and per-category breakdown.

## Scope

- One read-only endpoint returning all yearly aggregates for an organization:
  - yearly totals for income, expenses, contributions;
  - monthly distribution of income, expenses, contributions;
  - category breakdown for the selected year, each category carrying its
    own 12-month series.
- Aggregates are computed from `Transaction` rows only.
- `Organization.initial_balance` is an opening balance, not income; it is
  excluded from all report metrics.
- No derived metrics (e.g. savings/net) in the contract: the frontend
  computes them client-side from the raw series if needed.

## API contract

```http
GET /api/v1/organizations/{org_id}/reports/?year=2025
```

Requires authentication. Access: organization members
(`IsAuthenticated` + `IsOrgMember`, same as transaction reads).

Query parameters:

- `year` (optional, integer, 2000..2100). Defaults to the server's current
  calendar year (`timezone.now().year`). Non-integer value or a year outside
  the plausibility window → `400 Bad Request` (the window guards against
  typos, not against empty data). Years within the window without data simply
  return zeros.

Response `200 OK`:

```json
{
  "year": 2025,
  "totals": {
    "income": "12000.00",
    "expenses": "8400.50",
    "contribution": "1500.00"
  },
  "monthly": [
    { "month": 1, "income": "1000.00", "expenses": "700.00", "contribution": "100.00" },
    { "month": 2, "income": "0.00", "expenses": "120.50", "contribution": "0.00" }
  ],
  "categories": [
    { "category_id": 8, "name": "Salary", "type": "income", "total": "12000.00",
      "monthly": ["1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00", "1000.00"] },
    { "category_id": 1, "name": "Food", "type": "expense", "total": "2100.25",
      "monthly": ["180.50", "170.25", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "1750.00"] },
    { "category_id": 4, "name": "Entertainment", "type": "expense", "total": "1900.25",
      "monthly": ["0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"] },
    { "category_id": null, "name": "Uncategorized", "type": "expense", "total": "100.00",
      "monthly": ["0.00", "0.00", "100.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"] },
    { "category_id": 10, "name": "Contribution", "type": "contribution", "total": "1500.00",
      "monthly": ["125.00", "125.00", "125.00", "125.00", "125.00", "125.00", "125.00", "125.00", "125.00", "125.00", "125.00", "125.00"] }
  ]
}
```

Conventions:

- All three entry types — `income`, `expense`, `contribution` — are first-class
  metrics in `totals` and `monthly`.
- `monthly` always contains exactly 12 entries, `month` 1–12, in order.
  Months without transactions are zero-filled so the chart needs no gap
  handling. For the current (incomplete) year, future months are plain zeros:
  the contract is identical for any year, and rendering the in-progress state
  (muted months, "as of" markers) is a frontend concern — it knows today's
  date, so no extra fields are needed.
- Amounts are strings with exactly 2 decimal places (existing API convention).
- `categories` is a flat list, one entry per category that has transactions in
  the year, plus `Uncategorized` buckets. Grouped by `type` — `income`, then
  `expense`, then `contribution` — and sorted by `total` descending within each
  block, so every block reads as that type's top categories. Each entry carries
  its `type` so the page filter stays a client-side filter on this field.
- `monthly` inside a category entry is a zero-filled 12-slot series
  (index 0 = January) of that category's monthly totals, using the same
  amount-string convention. Its sum equals the entry's `total` — the same
  partition invariant as `categories` vs `totals`, at the monthly level.
- The payload carries raw aggregates only; no derived percentages. Shares are
  client-side derivations from fields in the same response:
  yearly — `categories[].total` / `totals[<type metric>]`,
  per month — `categories[].monthly[i]` / `monthly[i][<type metric>]`.
  Guard a zero denominator (an empty month has no categories of that type).
  Each share renders against its own type total, so bars need not sum to 100.
- Transactions with `category_id = null` are reported as `Uncategorized`
  buckets with `category_id: null`, one per `entry_type` present. `null`
  occurs only for rows orphaned by a category deletion
  (`on_delete=SET_NULL`, by design; the frontend requires a category on
  creation). The bucket guarantees the invariant
  `sum(categories) == totals` at all times; the frontend may render it as a
  muted row or hide it when its total is 0.

Status codes:

- `200 OK` on success
- `400 Bad Request` for a non-integer `year` or a year outside 2000..2100
- `403 Forbidden` when the request is unauthenticated or the user is not a
  member of the organization (a missing organization is indistinguishable and
  also returns 403, matching the other org-scoped endpoints)

## Design decisions

1. **Raw metrics only.** The endpoint returns income / expenses / contribution
   as stored; derived numbers (savings, net) are frontend concerns.
2. **Single endpoint** instead of three (totals / monthly / categories). The
   year filter changes the whole page, so the frontend re-fetches everything
   once per year change. Chart series switching and the category type filter
   are client-side over this payload.
3. **Aggregation in SQL.** Five aggregate queries per request (yearly totals,
   monthly totals, category totals, uncategorized bucket, per-category
   monthly), each scoped to one org and one year. No application-level
   iteration over transactions.
4. **No derived percentages in the payload.** Yearly and monthly shares are
   both derivable from the aggregates above, so the service does not precompute
   any of them; each client computes the shares for the views it renders.

## Implementation plan

All paths relative to `backend/django/`.

### 1. Service — `core/services/report.py`

`get_org_report(org: Organization, year: int) -> dict` with three queries:

- **Totals:** `Transaction.objects.filter(org=org, transaction_date__year=year)`
  with conditional `Sum("amount")` per `entry_type` and `Coalesce(..., 0)`,
  same pattern as `calculate_org_balance` in `core/services/balance.py`.
- **Monthly:** same filter +
  `annotate(month=ExtractMonth("transaction_date")).values("month").annotate(income=..., expenses=..., contribution=...)`,
  then zero-fill into a 12-slot list in Python.
- **Categories:**
  - grouped: `filter(..., category__isnull=False).values("category_id", "category__name", "category__type").annotate(total=Sum("amount"))`,
    sorted into type blocks (income, expense, contribution), total desc within a block.
  - uncategorized: `filter(..., category__isnull=True).values("entry_type").annotate(total=Sum("amount"))`
    → one `Uncategorized` row per entry type, `type` taken from `entry_type`.
  - per-category monthly: `annotate(month=ExtractMonth(...)).values("category_id", "month").annotate(total=Sum("amount"))`
    → zero-filled into a 12-slot `monthly` series on each category entry
    (the null `category_id` group feeds the `Uncategorized` buckets).

Money values are the 2-place Decimals computed by `SUM` over `numeric(14,2)`;
string rendering (exactly 2 decimals) is the serializer's job. The service
performs no rounding.

### 2. Serializer — `core/serializers.py`

`ReportResponseSerializer(serializers.Serializer)` mirroring the response
shape (nested `DictField`/`ListField` or small nested serializers), for
consistency with other views and stable string formatting.

### 3. View — `core/views/report.py`

`ReportView(APIView)`, `permission_classes = [IsAuthenticated, IsOrgMember]`,
GET only:

- parse `year` from query params; raise `ValidationError` (400) when it is
  not an integer; default to `timezone.now().year`
- `org = get_object_or_404(Organization, pk=org_id)`
- return `Response(ReportResponseSerializer(get_org_report(org, year)).data)`

### 4. URL — `core/urls.py`

```python
path(
    "organizations/<int:org_id>/reports/",
    ReportView.as_view(),
    name="organization-report",
),
```

### 5. Migration — index

Add to `Transaction.Meta.indexes` (new migration):

```python
models.Index(fields=["org_id", "transaction_date"])
```

Year-range scans per org are the report hot path.

### 6. Tests — `core/tests/test_reports.py`

Reuse `api_client`, `shared_org`, `owner`, `member`, `personal_user` fixtures.
Helper to create transactions with explicit dates.

- Auth & access: anonymous → 403 (app convention); stranger (non-member) →
  403; unknown org → 403 (permission runs first); non-owner member → 200
  (read access, not owner-only).
- Year handling: no param → current year in response; `year` filter excludes
  other years; `year=abc` → 400; year without data → zeros.
- Totals: correct sums for each of income / expense / contribution;
  `initial_balance` excluded; empty org → all zeros.
- Monthly: exactly 12 entries in order; zero-filled months; per-month sums
  for all three series.
- Categories: grouping per category; `type` field correct; grouped by type,
  total desc within a block; contribution categories included;
  `Uncategorized` bucket per entry type; removed-category rows land in
  `Uncategorized`.
- Isolation: transactions of another org do not leak in.

### 7. Docs

Update this file once implemented (replace *planned* status, adjust examples
if the contract changes).

## Definition of done

- Endpoint implemented per this contract; `uv run pytest` green, including
  the new `test_reports.py`.
- Migration for the `Transaction` index generated and applied.
- No behavior changes to existing endpoints.

