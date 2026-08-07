# Transaction ledger functions

This document is intended for the backend team and project documentation. It describes the core finance functions used to update organization balances and manage goal reservations through the ledger model.

## Core principle

All financial write operations are stored as append-only ledger rows in the `TRANSACTION` table.
The organization balance and goal reservation are derived from those rows rather than maintained as mutable counters.

## Cancellation model

A transaction may be canceled by creating a new ledger row that links back to the original transaction.
The original row remains in the ledger for auditability.
The cancellation row is treated as a correction, not as a new business income or expense event.

## Function overview

- `create_transaction_entry(payload)` - creates one low-level ledger row from a structured payload.
- `cancel_transaction(user_id, org_id, transaction_id, description=None)` - creates a linked reversal row for an existing transaction.
- `post_organization_deposit(user_id, org_id, amount, category_id=None, description=None)` - adds funds to the organization balance.
- `post_organization_withdrawal(user_id, org_id, amount, category_id=None, description=None)` - removes funds from the organization balance.
- `reserve_goal_funds(user_id, org_id, goal_id, amount, category_id=None, description=None)` - reserves organization funds for a goal.
- `release_goal_funds(user_id, org_id, goal_id, amount, category_id=None, description=None)` - releases previously reserved goal funds.
- `adjust_goal_reservation(user_id, org_id, goal_id, target_amount, category_id=None, description=None)` - adjusts a goal reservation to a target amount.
- `get_organization_balance(user_id, org_id)` - returns the current organization balance derived from the ledger after membership validation.
- `get_goal_reserved_amount(user_id, goal_id)` - returns the current reserved amount for a goal derived from the ledger after membership validation.

## Suggested Python structure: dataclass

For the low-level write function, it is reasonable to pass a data container instead of a long positional argument list.
A `dataclass` keeps the input explicit and extensible.

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class TransactionEntryPayload:
    organization_id: int
    created_by_id: int
    description: str
    amount: Decimal
    created_at: datetime
    goal_id: Optional[int] = None
    category_id: Optional[int] = None
    reversal_of_id: Optional[int] = None
    is_reversal: bool = False
    reversed_by_id: Optional[int] = None
    reversed_at: Optional[datetime] = None
```

Usage example:

```python
payload = TransactionEntryPayload(
    organization_id=1,
    created_by_id=100,
    description="Organization deposit",
    amount=Decimal("500.00"),
    created_at=datetime.utcnow(),
)

create_transaction_entry(payload)
```

This makes the function signature simpler and easier to evolve when more fields are needed later.

## Tables involved

- `ORGANISATION`
  - Stores the base organization record.
  - Contains `initial_balance`, which is the starting point for balance calculation.

- `MEMBERSHIP`
  - Used to verify that a user belongs to the organization.

- `GOAL`
  - Used for goal-linked reservation and release operations.
  - Must belong to the same organization as the transaction.

- `CATEGORY`
  - Optional reference for transaction classification.

- `TRANSACTION`
  - Main ledger table.
  - Stores every financial event as a row.
  - Serves as both audit history and the source of truth for balance calculation.
  - Required columns for cancellation support:
    - `id`
    - `organization_id`
    - `goal_id` (nullable)
    - `category_id` (nullable)
    - `created_by_id`
    - `description`
    - `amount`
    - `created_at`
    - `reversal_of_id` (nullable, FK to `TRANSACTION.id`)
    - `is_reversal` (boolean, default `false`)
    - `reversed_at` (timestamp, nullable)
    - `reversed_by_id` (nullable, FK to user)

---

## Function reference

### 1. Creates a single ledger row in `TRANSACTION`.

```python
create_transaction_entry(payload: TransactionEntryPayload)
```

Inputs:
- `payload.organization_id`
- `payload.created_by_id`
- `payload.description`
- `payload.amount`
- `payload.created_at`
- `payload.goal_id` (optional)
- `payload.category_id` (optional)
- `payload.reversal_of_id` (optional)
- `payload.is_reversal` (optional)
- `payload.reversed_by_id` (optional)
- `payload.reversed_at` (optional)

Reads from:
- `ORGANISATION` to verify the organization exists
- `GOAL` if `payload.goal_id` is provided
- `CATEGORY` if `payload.category_id` is provided

Writes to:
- Inserts one row into `TRANSACTION`

Notes:
- This is the lowest-level write function.
- Other transaction functions build on top of it.
- Normal operations must use `payload.is_reversal = false` and `payload.reversal_of_id = null`.

---

### 2. Cancels an existing transaction by creating a linked reversal row.

```python
cancel_transaction(user_id, org_id, transaction_id, description=None)
```

Inputs:
- `user_id`
- `org_id`
- `transaction_id`
- `description` (optional)

Reads from:
- `MEMBERSHIP` to verify the user belongs to the organization
- `TRANSACTION` to find the original transaction and validate its organization

Writes to:
- Inserts one new reversal row into `TRANSACTION`

Behavior:
- The new row must set `is_reversal = true`.
- The new row must set `reversal_of_id` to the original transaction id.
- The new row should use the opposite sign of the original amount so that the ledger remains balanced.
- The cancellation row is not treated as a new revenue or expense event in reporting; it is a correction entry.

---

### 3. Adds funds to an organization balance.

```python
post_organization_deposit(user_id, org_id, amount, category_id=None, description=None)
```

Inputs:
- `user_id`
- `org_id`
- `amount`
- `category_id` (optional)
- `description` (optional)

Reads from:
- `MEMBERSHIP` to verify that the user belongs to the organization
- `ORGANISATION` to lock and validate the organization row

Writes to:
- Inserts one positive ledger row into `TRANSACTION`

Behavior:
- Uses a positive `amount` value.
- Increases the organization balance.
- Must write a normal row with `is_reversal = false` and `reversal_of_id = null`.

---

### 4. Removes funds from an organization balance.

```python
post_organization_withdrawal(user_id, org_id, amount, category_id=None, description=None)
```

Inputs:
- `user_id`
- `org_id`
- `amount`
- `category_id` (optional)
- `description` (optional)

Reads from:
- `MEMBERSHIP`
- `ORGANISATION`
- `TRANSACTION` to calculate the current balance

Writes to:
- Inserts one negative ledger row into `TRANSACTION`

Behavior:
- Uses a negative `amount` value in the ledger.
- Checks that the organization has enough available funds before writing.
- Must also write a normal row with `is_reversal = false` and `reversal_of_id = null`.

---

### 5. Reserves funds for a specific goal.

```python
reserve_goal_funds(user_id, org_id, goal_id, amount, category_id=None, description=None)
```

Inputs:
- `user_id`
- `org_id`
- `goal_id`
- `amount`
- `category_id` (optional)
- `description` (optional)

Reads from:
- `MEMBERSHIP`
- `GOAL`
- `ORGANISATION`
- `TRANSACTION` to calculate the current available organization balance

Writes to:
- Inserts one negative ledger row into `TRANSACTION` with `goal_id`

Behavior:
- This does not create a separate reservation table.
- It uses a goal-linked ledger entry to represent the reservation.
- The organization balance decreases by the reserved amount.
- The row must be a normal posting, not a reversal.

---

### 6. Releases previously reserved funds for a goal.

```python
release_goal_funds(user_id, org_id, goal_id, amount, category_id=None, description=None)
```

Inputs:
- `user_id`
- `org_id`
- `goal_id`
- `amount`
- `category_id` (optional)
- `description` (optional)

Reads from:
- `MEMBERSHIP`
- `GOAL`
- `TRANSACTION` to calculate the current reserved amount for the goal

Writes to:
- Inserts one positive ledger row into `TRANSACTION` with `goal_id`

Behavior:
- The reservation amount for the goal decreases.
- The organization balance increases back by the released amount.
- The row must be a normal posting, not a reversal.

---

### 7. Adjusts the reservation for a goal to a target amount.

```python
adjust_goal_reservation(user_id, org_id, goal_id, target_amount, category_id=None, description=None)
```

Inputs:
- `user_id`
- `org_id`
- `goal_id`
- `target_amount`
- `category_id` (optional)
- `description` (optional)

Reads from:
- `MEMBERSHIP`
- `GOAL`
- `TRANSACTION` to calculate the current reservation

Writes to:
- Writes one reserve entry if the target is higher than the current reservation
- Writes one release entry if the target is lower than the current reservation
- Writes nothing if the current reservation already matches the target

Behavior:
- Calculates the difference between the current reserved amount and the desired target.
- Applies the required change in one step.
- All rows created by this function must also be normal postings with `is_reversal = false`.

---

### 8. Returns the current balance of an organization for a specific user.

```python
get_organization_balance(user_id, org_id)
```

Inputs:
- `user_id`
- `org_id`

Reads from:
- `MEMBERSHIP` to verify that the user belongs to the organization
- `ORGANISATION.initial_balance`
- `TRANSACTION.amount` for all rows belonging to the organization

Writes to:
- No writes

Behavior:
- Current balance is derived as:
  - `initial_balance + sum(all effective transaction amounts for the organization)`
- Effective rows are those that are not reversal rows and are not canceled by a linked reversal entry.
- Cancellation rows are not counted as independent income or expense events in the standard balance view.

---

### 9. Returns the current reserved amount for a goal for a specific user.

```python
get_goal_reserved_amount(user_id, goal_id)
```

Inputs:
- `user_id`
- `goal_id`

Reads from:
- `MEMBERSHIP` to verify that the user belongs to the goal's organization
- `TRANSACTION` rows that belong to the goal

Writes to:
- No writes

Behavior:
- Current reservation is derived as:
  - the sum of negative goal-linked transaction amounts from effective rows only
  - cancellation rows are excluded from normal reservation reporting

---

## Recommended transaction behavior

All write functions should run inside a database transaction.

Recommended safeguards:
- Lock the organization row with `SELECT ... FOR UPDATE`
- Lock the goal row if a goal is involved
- Validate membership before writing
- Validate that the goal belongs to the same organization
- Reject operations that would cause insufficient funds
- Ensure that a transaction can have only one active reversal
- Reject a cancellation if the target transaction is already reversed

---

## Summary

The core model is:

- `TRANSACTION` is the source of truth
- balances are derived from effective ledger rows
- reservations are derived from goal-linked ledger rows
- cancellation rows are append-only corrections linked to the original transaction
- write operations remain append-only
