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

All endpoints are available under `/api/` and require an authenticated user.
Endpoints scoped to an organization additionally require the user to be a member
of that organization.

### List transactions

`GET /api/organizations/{org_id}/transactions/`

Returns `200 OK` with the transactions belonging to the organization:

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
  ]
}
```

### Create a transaction

`POST /api/organizations/{org_id}/transactions/`

Required request fields:

- `entry_type`: `income`, `expense`, or `contribution`
- `amount`: decimal value with up to 14 digits and 2 decimal places
- `transaction_date`: ISO date (`YYYY-MM-DD`)

Optional request fields:

- `goal_id`: ID of a goal belonging to the organization
- `category_id`: ID of a category
- `description`: text up to 1024 characters
- `is_tax_deductible`: boolean, defaults to `false`

The transaction is created with the authenticated user as `created_by` and
returns `201 Created` with the transaction representation shown above.

### Get transaction details

`GET /api/organizations/{org_id}/transactions/{transaction_id}/`

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

### Delete a transaction

`DELETE /api/organizations/{org_id}/transactions/{transaction_id}/`

Deletes the matching transaction from the organization and returns `204 No
Content`. The current implementation does not create an activity-log entry or
perform a balance/reversal feasibility check before deletion.

### Goal reservation routes

The URL configuration declares the following member-only routes:

- `POST /api/organizations/{org_id}/goals/{goal_id}/reserve/`
- `POST /api/organizations/{org_id}/goals/{goal_id}/release/`

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
