# Transactions

All endpoints in this document require authentication.

## Transactions endpoints

Transactions are linked to an organization and can represent income, expenses, or goal contributions.

### List transactions

```http
GET /api/v1/organizations/{org_id}/transactions/
```

Returns one page of the organization's transactions, filtered and sorted
server-side.

Query parameters (all optional):

- `entry_type`: `all` (default), `income`, `expense`, or `contribution` —
  the selected tab/column; every other parameter keeps working with it
- `date_from` / `date_to`: inclusive ISO date bounds on `transaction_date`
- `category_id`: ID of a category belonging to the organization
- `goal_id`: ID of a goal belonging to the organization; matches both its
  contributions and its expenses
- `tax_deductible`: `true` keeps only tax-deductible rows
- `sort`: `newest` (default) or `oldest`; ties within a day are broken by `id`
- `page`: 1-based page number, default `1`
- `page_size`: rows per page, default `15`, maximum `100`

Response example:

```json
{
  "transactions": [
    {
      "id": 1,
      "org_id": 2,
      "goal_id": null,
      "category_id": 4,
      "entry_type": "expense",
      "amount": "125.50",
      "description": "Groceries",
      "transaction_date": "2026-08-12",
      "is_tax_deductible": false,
      "created_by": "alice",
      "created_at": "2026-08-20T10:40:28.139486+02:00"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 15,
  "page_count": 3,
  "counts": { "all": 42, "income": 5, "expense": 30, "contribution": 7 }
}
```

`counts` is the filtered set (date / category / goal / tax filters) split by
entry type — one number per toggle. The selected toggle (`entry_type`) picks
its part for the table: `total` is that part's size, `transactions` one page
of it (`page` / `page_size` / `page_count`). Switching the toggle only
changes the table; a page past `page_count` is an empty list, not an error.

Status:

- `200 OK` on success
- `400 Bad Request` for malformed parameters, `date_to` earlier than
  `date_from`, or a `goal_id` / `category_id` from another organization
- `403 Forbidden` when the user is not a member of the organization

### Create transaction

```http
POST /api/v1/organizations/{org_id}/transactions/
```

Mandatory parameters:

- `entry_type` (`income`, `expense`, `contribution`)
- `amount`
- `transaction_date` (YYYY-MM-DD)

Request body:

```json
{
  "entry_type": "expense",
  "amount": "125.50",
  "transaction_date": "2026-08-12",
  "description": "Groceries",
  "category_id": 4,
  "is_tax_deductible": false,
  "goal_id": null
}
```

Response example:

```json
{
  "id": 1,
  "org_id": 2,
  "goal_id": null,
  "category_id": 4,
  "entry_type": "expense",
  "amount": "125.50",
  "description": "Groceries",
  "transaction_date": "2026-08-12",
  "is_tax_deductible": false,
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00"
}
```

Rules:

- `goal_id` must belong to the organization and cannot be set on an
  `income` transaction (allowed on `expense` and `contribution`)
- `category_id` must belong to the organization and its type must match
  `entry_type`

Status:

- `201 Created` on success
- `400 Bad Request` when a rule above is violated
- `403 Forbidden` when the user is not the organization owner

Side effect (see [notifications.md](notifications.md)): every other member of
the organization receives a `transaction_added` notification; the creator is
not notified.

### Get transaction details

```http
GET /api/v1/organizations/{org_id}/transactions/{transaction_id}/
```

Response example:

```json
{
  "transaction": {
    "id": 1,
    "org_id": 1,
    "goal_id": null,
    "category_id": null,
    "entry_type": "income",
    "amount": "42.00",
    "description": null,
    "transaction_date": "2026-08-20",
    "is_tax_deductible": false,
    "created_by": "alice",
    "created_at": "2026-08-20T10:40:28.139486+02:00"
  }
}
```

Status:

- `200 OK` on success
- `404 Not Found` for invalid transaction_id
- `403 Forbidden` when the user is not the organization owner

### Delete transaction

```http
DELETE /api/v1/organizations/{org_id}/transactions/{transaction_id}/
```

Status:
- `204 No Content` on successful deletion
- `400 Bad Request` if the balance is insufficient to cancel income transaction
- `403 Forbidden` when the user is not the organization owner
- `404 Not Found` for invalid transaction_id

## Frontend integration notes

The list endpoint is the only one whose contract changed; the frontend
consumes it through `fetchTransactions` (`frontend/src/lib/transactions.ts`)
and, while it filters, counts, and pages client-side, with a stopgap:

- planned migration: send the active filters (`entry_type`, `date_from`,
  `date_to`, `category_id`, `goal_id`, `tax_deductible`, `sort`) and
  `page` / `page_size` as query parameters, render the pager from
  `total` / `page_count`, and take the tab badges from `counts`
