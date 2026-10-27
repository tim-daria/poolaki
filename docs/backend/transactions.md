# Transactions

All endpoints in this document require authentication.

Organization-scoped endpoints also require membership in the organization.

## Ledger model

The `Transaction` table is the source of truth for financial write
operations. The organization's general balance and each goal's balance are
derived from the effective transaction rows rather than stored as mutable
counters. Goal reservations are therefore represented by goal-linked ledger
rows. The organization `initial_balance` is the starting value for the general
balance calculation.

Transactions may reference an organization, goal, category, and creating user.
The organization and goal/category references must remain consistent. The
`(organization, transaction_date)` index supports date-based listing and
reporting as the ledger grows.

The related models are:

- `Organization`: owns the budget and provides `initial_balance`.
- `Membership`: verifies that a user may access the organization's ledger.
- `Goal`: receives contributions and withdrawals and may be the target of an
  expense.
- `Category`: optionally classifies a transaction and must belong to the same
  organization.
- `Transaction`: records each financial event and its creator.

## Transactions endpoints

Transactions are linked to an organization and can represent income, expenses,
or transfers to and from goals.

### List transactions

```http
GET /api/v1/organizations/{org_id}/transactions/
```

Implements advanced server-side search with composable filters, deterministic
sorting, and pagination. All filters are applied within the organization
before the selected entry-type tab and page are evaluated.

Query parameters (all optional):

- `entry_type`: `all` (default), `income`, `expense`, `contribution` or `withdraw` —
  the selected tab/column; every other parameter keeps working with it
- `q`: case-insensitive substring search in the description, category name, or
  username of the member who added the row (maximum 100 characters)
- `date_from` / `date_to`: inclusive ISO date bounds on `transaction_date`
- `category_id`: one category ID or a comma-separated list of them (e.g.
  `3,7`); rows in any listed category are returned, rows without a category
  are excluded
- `goal_id`: ID of a goal belonging to the organization; matches every
  transaction linked to that goal
- `tax_deductible`: `true` keeps only tax-deductible rows
- `created_by`: one user ID or a comma-separated list of them; rows created
  by any listed member are returned. Every ID must be a member of the
  organization
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
  "counts": {
    "all": 42,
    "income": 5,
    "expense": 30,
    "contribution": 7,
    "withdraw": 0
  }
}
```

`counts` is the result after the search and all non-tab filters (date,
category, goal, tax, and member filters), split by entry type — one number per
toggle. The selected toggle (`entry_type`) picks its part for the table:
`total` is that part's size, and `transactions` contains one page of it
(`page` / `page_size` / `page_count`). Sorting is newest first by default;
transactions on the same date are ordered by `id` to keep pages stable.
Switching the toggle only changes the table; a page past `page_count` is an
empty list, not an error.

Status:

- `200 OK` on success
- `400 Bad Request` for malformed parameters, `date_to` earlier than
  `date_from`, a `goal_id` / `category_id` from another organization, or a
  `created_by` that is not a member of it
- `403 Forbidden` when the user is not a member of the organization

### Create transaction

```http
POST /api/v1/organizations/{org_id}/transactions/
```

Mandatory parameters:

- `entry_type` (`income`, `expense`, `contribution`, `withdraw`)
- `amount`
- `transaction_date` (YYYY-MM-DD)
- `category_id` — required for `income` and `expense`; optional for
  `contribution` and not applicable to `withdraw`
- `goal_id` — required for `contribution` and `withdraw`

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

- `goal_id` and `category_id`, when supplied, must belong to the organization.
- `category_id` must have the same type as `entry_type`; contribution
  transactions may therefore use a contribution category, while withdrawals
  cannot have a category.
- An `income` transaction cannot be linked to a goal.
- A `contribution` or `withdraw` transaction must be linked to an active goal.
- An `expense` can be linked to a completed goal or to an active goal without
  a target date. It cannot be linked to an archived goal or to an active goal
  with a target date.
- A `withdraw` transaction cannot exceed the goal's current balance.

Status:

- `201 Created` on success
- `400 Bad Request` when a rule above is violated, including when a withdrawal
  exceeds the goal's current balance
- `403 Forbidden` when the user is not a member of the organization

Side effect (see [notifications.md](notifications.md)): every other member of
the organization receives a `transaction_added` notification; the creator is
not notified.

The notification is not created for a personal budget.

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
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` for an invalid transaction_id, or one created by another member: rows are scoped to their creator, so nobody else can change them, the organization owner included

### Update transaction

```http
PATCH /api/v1/organizations/{org_id}/transactions/{transaction_id}/
```

The transaction creator can partially update these fields:

- `amount`
- `description`
- `transaction_date`
- `is_tax_deductible`
- `category_id`

`entry_type` and `goal_id` cannot be changed after creation. A category, when
set, must belong to the organization and match the transaction's entry type.
Income and expense transactions cannot have their category cleared. Category
clearing is allowed for contribution and withdraw transactions.

Changing `amount` on a goal transaction must preserve the goal balance
invariant. A withdrawal cannot exceed the resulting balance; an archived goal
must retain a resulting balance of zero.

Response example:

```json
{
  "transaction": {
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
}
```

Status:

- `200 OK` on success
- `400 Bad Request` for invalid fields, a category from another organization,
  a category with the wrong type, or a change that violates the goal balance
  invariant
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the transaction does not belong to the requesting user
  or organization

### Delete transaction

```http
DELETE /api/v1/organizations/{org_id}/transactions/{transaction_id}/
```

Status:
- `204 No Content` on successful deletion
- `400 Bad Request` if deleting a contribution or withdraw would violate the
  goal balance invariant, or if the transaction belongs to an archived goal
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the transaction does not belong to the requesting user
  or organization

Only the transaction creator can delete a transaction. Deleting a contribution
or withdraw must leave the goal balance valid. Transactions associated with
archived goals cannot be deleted. Deleting an income transaction is not
restricted by the organization's balance.

## Consistency safeguards

Transaction writes should:

- validate organization membership before changing the ledger;
- lock a referenced goal while checking and applying a goal-linked change;
- verify that a referenced goal belongs to the same organization; and
- reject changes that would leave insufficient funds or violate the goal
  balance invariant.

## Frontend integration notes

The Transactions page consumes the list endpoint through
`fetchTransactionPage` (`frontend/src/lib/transactions.ts`): it sends the
active filters (`entry_type`, `q`, `date_from`, `date_to`, `category_id`,
`goal_id`, `tax_deductible`, `sort`) and `page` / `page_size` as query parameters,
renders the pager from `total` / `page_count`, and takes the tab badges from
`counts`. Only parameters that differ from the backend defaults are sent.

The Home page still loads a workspace's history unfiltered through
`fetchTransactions` in the same module.
