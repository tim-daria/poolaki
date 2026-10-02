# Reports (Reporting page backend)

Backend contract and implementation plan for the reporting page: yearly
finance aggregates for an organization — annual totals, monthly distribution,
and per-category breakdown.

Status: **planned — not implemented**.

## Scope

- One read-only endpoint returning all yearly aggregates for an organization:
  - yearly totals for income, expenses, contributions;
  - monthly distribution of income, expenses, contributions;
  - category breakdown for the selected year.
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

- `year` (optional, integer). Defaults to the server's current calendar year
  (`timezone.now().year`). Non-integer value → `400 Bad Request`.
  No range restriction; years without data simply return zeros.

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
    { "category_id": 8, "name": "Salary", "type": "income", "total": "12000.00", "share_percent": 100.0 },
    { "category_id": 1, "name": "Food", "type": "expense", "total": "2100.25", "share_percent": 24.41 },
    { "category_id": 4, "name": "Entertainment", "type": "expense", "total": "1900.25", "share_percent": 22.62 },
    { "category_id": 10, "name": "Contribution", "type": "contribution", "total": "1500.00", "share_percent": 100.0 },
    { "category_id": null, "name": "Uncategorized", "type": "expense", "total": "100.00", "share_percent": 1.19 }
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
  the year, plus `Uncategorized` buckets. Sorted by `total` descending.
  Each entry carries its `type` (`income` / `expense` / `contribution`) so the
  page filter is a client-side filter on this field.
- `share_percent` is the category's share of its own type total for the year
  (income categories vs total income, etc.), rounded to 2 decimals. `0.0` when
  the type total is 0. Percentages may not sum to exactly 100 due to rounding;
  this is expected — each bar renders against its own type total, so nothing
  is visually missing (unlike a pie chart).
- Transactions with `category_id = null` are reported as `Uncategorized`
  buckets with `category_id: null`, one per `entry_type` present. `null`
  occurs only for rows orphaned by a category deletion
  (`on_delete=SET_NULL`, by design; the frontend requires a category on
  creation). The bucket guarantees the invariant
  `sum(categories) == totals` at all times; the frontend may render it as a
  muted row or hide it when its total is 0.

Status codes:

- `200 OK` on success
- `400 Bad Request` for a non-integer `year`
- `401 Unauthorized` when not authenticated
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the organization does not exist

## Design decisions

1. **Raw metrics only.** The endpoint returns income / expenses / contribution
   as stored; derived numbers (savings, net) are frontend concerns.
2. **Single endpoint** instead of three (totals / monthly / categories). The
   year filter changes the whole page, so the frontend re-fetches everything
   once per year change. Chart series switching and the category type filter
   are client-side over this payload.
3. **Aggregation in SQL.** At most three aggregate queries per request
   (monthly, category totals, uncategorized bucket), each scoped to one org
   and one year. No application-level iteration over transactions.
4. **`share_percent` computed server-side** so the progress bars bind
   directly to the value.

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
    sort desc, compute `share_percent` per type.
  - uncategorized: `filter(..., category__isnull=True).values("entry_type").annotate(total=Sum("amount"))`
    → one `Uncategorized` row per entry type, `type` taken from `entry_type`.

All `Decimal` values quantized to 2 places before leaving the service.

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

- Auth & access: anonymous → 401; stranger (non-member) → 403; non-owner
  member → 200 (read access, not owner-only).
- Year handling: no param → current year in response; `year` filter excludes
  other years; `year=abc` → 400; year without data → zeros.
- Totals: correct sums for each of income / expense / contribution;
  `initial_balance` excluded; empty org → all zeros.
- Monthly: exactly 12 entries in order; zero-filled months; per-month sums
  for all three series.
- Categories: grouping per category; `type` field correct; sorted desc;
  contribution categories included; `share_percent` values and rounding;
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

