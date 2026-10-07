# Transaction ledger functions

This document is intended for the backend team and project documentation. It describes the core finance functions used to update organization balances and manage goal reservations through the ledger model with possibility to delete transactions.

## Core principle

All financial write operations are stored in the `TRANSACTION` table.
The organization balance and goal reservation are derived from those rows rather than maintained as mutable counters.

## Cancellation model

A transaction may be canceled by deleting a row in the `TRANSACTION` table.
Before deletion, the feasibility of a reversal transaction should be verified.
The cancellation event must be recorded in the activity log.

## Endpoint overview

All endpoints are available under `/api/v1/` and require an authenticated user.
Endpoints scoped to an organization additionally require the user to be a member
of that organization.

### List transactions

`GET /api/v1/organizations/{org_id}/transactions/`

Server-side filtered and paginated. Query parameters: `entry_type`
(`all` / `income` / `expense` / `contribution`), `date_from` / `date_to`
(inclusive), `category_id`, `goal_id`, `tax_deductible`, `sort`
(`newest` / `oldest`), `page`, `page_size` (default 15, max 100). The full
contract, including 400 cases, is documented in
[backend/transactions.md](../backend/transactions.md).

Returns `200 OK` with one page of matching rows plus the paging metadata and
the per-type counts:

```json
{
  "transactions": [
    {
      "id": 1,
      "org_id": 10,
      "goal_id": null,
      "category_id": 3,
      "entry_type": "expense",
      "amount": "25.00",
      "description": "Coffee",
      "transaction_date": "2026-08-24",
      "is_tax_deductible": false,
      "created_by": "username",
      "created_at": "2026-08-24T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 15,
  "page_count": 3,
  "counts": { "all": 42, "income": 5, "expense": 30, "contribution": 7 }
}
```

`counts` is the filtered set split by entry type (one number per toggle);
the selected toggle picks its part for the table — `total` is that part's
size, `transactions` one page of it.

### Create a transaction

`POST /api/v1/organizations/{org_id}/transactions/`

Required request fields:

- `entry_type`: `income`, `expense`, or `contribution`
- `amount`: decimal value with up to 14 digits and 2 decimal places
- `transaction_date`: ISO date (`YYYY-MM-DD`)

Optional request fields:

- `goal_id`: ID of a goal belonging to the organization; cannot be set on an
  `income` transaction
- `category_id`: ID of a category belonging to the organization; its type
  must match `entry_type`
- `description`: text up to 1024 characters
- `is_tax_deductible`: boolean, defaults to `false`

The transaction is created with the authenticated user as `created_by` and
returns `201 Created` with the transaction representation shown above.
Violating the goal or category rules returns `400 Bad Request`.

### Get transaction details

`GET /api/v1/organizations/{org_id}/transactions/{transaction_id}/`

Returns `200 OK` with the transaction data:

```json
{
  "transaction": {
      "id": 1,
      "org_id": 10,
      "goal_id": null,
      "category_id": 3,
      "entry_type": "expense",
      "amount": "25.00",
      "description": "Coffee",
      "transaction_date": "2026-08-24",
      "is_tax_deductible": false,
      "created_by": "username",
      "created_at": "2026-08-24T12:00:00Z"
  }

}
```

### Edit a transaction

`PATCH /api/v1/organizations/{org_id}/transactions/{transaction_id}/`

Partially updates a transaction created by the authenticated user and returns
`200 OK` with the updated transaction representation. Only fields included in
the request are changed; omitted fields retain their existing values.

Supported request fields:

- `amount`: decimal value with up to 14 digits and 2 decimal places
- `description`: text up to 1024 characters; an empty string or `null` clears the description
- `transaction_date`: ISO date (`YYYY-MM-DD`)
- `is_tax_deductible`: boolean
- `category_id`: ID of a category belonging to the organization; `null` clears the category

The `entry_type`, `goal_id`, organization, and creator cannot be changed through
this endpoint. A category from another organization is rejected with `400 Bad
Request`. A transaction that does not belong to the authenticated user is not
available for update and returns `404 Not Found`.

Example request:

```json
{
  "amount": "0.00",
  "description": "Updated description",
  "transaction_date": "2026-08-25",
  "is_tax_deductible": false,
  "category_id": 3
}
```

Example response:

```json
{
  "transaction": {
    "id": 1,
    "org_id": 10,
    "goal_id": null,
    "category_id": 3,
    "entry_type": "expense",
    "amount": "0.00",
    "description": "Updated description",
    "transaction_date": "2026-08-25",
    "is_tax_deductible": false,
    "created_by": "username",
    "created_at": "2026-08-24T12:00:00Z"
  }
}
```

### Delete a transaction

`DELETE /api/v1/organizations/{org_id}/transactions/{transaction_id}/`

Deletes the matching transaction from the organization and returns `204 No
Content`. The current implementation does not create an activity-log entry or
perform a balance/reversal feasibility check before deletion.

### Goal reservation routes

The URL configuration declares the following member-only routes:

- `POST /api/v1/organizations/{org_id}/goals/{goal_id}/reserve/`
- `POST /api/v1/organizations/{org_id}/goals/{goal_id}/release/`

Their view classes are referenced by `core/urls.py`, but no corresponding view
implementation is currently present in `core/views/`. Their request and
response contracts therefore cannot yet be documented as implemented behavior.


## Models involved

- `Organization`
  - Stores the base organization record.
  - Contains `initial_balance`, which is the starting point for balance calculation.

- `Membership`
  - Used to verify that a user belongs to the organization.

- `Goal`
  - Used for goal-linked reservation and release operations.
  - Must belong to the same organization as the transaction.

- `Category`
  - Optional reference for transaction classification.

- `Transaction`
  - Main ledger table.
  - Stores every financial event as a row.
  - Serves as the source of truth for balance calculation.
  - Indexed on `(org, transaction_date)` to keep the
    list endpoint's date and goal filters fast as the table grows.

---

## Recommended transaction behavior

Recommended safeguards:
- Lock the goal row if a goal is involved
- Validate membership before writing
- Validate that the goal belongs to the same organization
- Reject operations that would cause insufficient funds

---

## Summary

The core model is:

- `TRANSACTION` is the source of truth
- balances are derived from effective ledger rows
- reservations are derived from goal-linked ledger rows
