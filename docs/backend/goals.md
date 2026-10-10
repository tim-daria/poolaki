# Goals

All endpoints in this document require authentication.

## Goals overview

Goals are organization-level savings targets. Each goal has a name, target amount, target date, creation metadata, and one of three statuses:

- **Active** — the goal is still in progress. 
- **Completed** — the target has manually marked as finished by the user.
- **Archived** — the goal has been closed and its remaining balance moved to the organization balance.

Goals without a `target_date` parameter are called permanent. User can make expense transactions for permanent goals with `active` status.

A goal belongs to an organization and tracks transactions that contribute to, withdraw from, or spend against that target. Any organization member can view goal data and make expenses for complete or permanent goals, while only the organization owner and the goal creator can modify restricted fields such as status or withdrawals.

If a user wants to make an expense that exceeds goal balance, we can offer to deduct the remaining amount from the organization's main balance if that's possible.

## Available operations

For all organization members:

- **List goals** — View the organization's goals, optionally filtered by status.
- **Create a goal** — Define a new active goal with a target amount and date.
- **Get goal details** — View the metadata and current status of a specific goal.
- **Get goal balance** — View the balance accumulated toward a goal's target.
- **Get goal transactions** — View a goal's transactions, optionally filtered by type.
- **Make contribution** — Add a contribution transaction to an active goal.
- **Make expense** — Record spending against a completed or permanent goal.

Only for the organization owner and the goal creator:

- **Update goal** — Change a goal's name, target amount, or target date.
- **Change goal status** — Complete or archive a goal according to its lifecycle. Any organization member can make a withdrawal.

Operations available for **All** goals:

- **Get goal details**
- **Get goal balance**
- **Get goal transactions**

Operations available for **Active** goals:

- **Update goal**
- **Change goal status** (to `completed` or `archived`)
- **Make contribution**
- **Make withdrawal**
- **Make expense** (only for permanent goals)

Operations available for **Completed** goals:

- **Change goal status** (to `active` or `archived`)
- **Make expense**

Operations available for **Archived** goals:
- only common GET operations

## Information about the goal returned in response to a GET request

```json
{
  "id": 1,
  "org": 2,
  "name": "Laptop",
  "target_amount": "500.00",
  "target_date": "2026-08-25",
  "status": "active",
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00",
  "completed_at": "null",
  "balance": "250.00",
  "progress": "0.50",
  "overdue": "false",
  "spendable": "false"
}
```
`balance` - shows current balance for the goal.
`progress` - shows the percentage of the goal achieved.
`overdue` - indicates whether the goal is overdue.
`spendable` - indicates whether expense transactions can be made under this goal.

## Backend models update

To implement goal withdraw functionality we need to add `WITHDRAW` entry type for the Transaction model. This change and the introduction of the expense for goals will result in a change to the rules for calculating the balance for organizations.
To find out whether a goal was completed and exactly when, add a date field to the Goal model that allows a null value: `completed_at = models.DateField(null=True, default=null)`.

## Features for analytics

TODO
Information about endpoints, filters, and query parameters required to generate the analytics page and the AI assistant.

## Goals endpoints

Goals belong to an organization and track progress toward a savings or spending target.

### List goals

```http
GET /api/v1/organizations/{org_id}/goals/
```

Query parameters:

- `status` (optional, one of `active`, `completed`, `archived`)
- `spendable` (optional, one of `true`, `false`)

The filter is exact: only goals with the matching status are returned. An unsupported value or a wrong enum value returns an empty list.

Response example:

```json
{
  "goals": [
    {
      "id": 1,
      "org": 2,
      "name": "Laptop",
      "target_amount": "500.00",
      "target_date": "2026-08-25",
      "status": "active",
      "created_by": "alice",
      "created_at": "2026-08-20T10:40:28.139486+02:00",
      "completed_at": "null",
      "balance": "250.00"  ,
      "progress": "0.50",
      "overdue": "false",
      "spendable": "false"
    }
  ]
}
```

Only goals belonging to `{org_id}` are returned.

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization

### Create a goal

```http
POST /api/v1/organizations/{org_id}/goals/
```

Mandatory parameters:

- `name` (maximum 100 characters)
- `target_amount` (must be a positive amount in the organization's currency)
- `target_date` (ISO date in the future or on the current date)

The initial status is set to `active`.

Request body:

```json
{
  "name": "Laptop",
  "target_amount": "500.00",
  "target_date": "2026-08-25"
}
```

Response example:

```json
{
  "id": 1,
  "org": 2,
  "name": "Laptop",
  "target_amount": "500.00",
  "target_date": "2026-08-25",
  "status": "active",
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00",
  "completed_at": "null",
  "balance": "0.00",
  "progress": "0.00",
  "overdue": "false",
  "spendable": "false"
}
```

All organization members can create a goal.

Status:

- `201 Created` on success
- `400 Bad Request` when validation fails or the goal already exists
- `403 Forbidden` when the user is not a member of the organization

### Get goal details

```http
GET /api/v1/organizations/{org_id}/goals/{goal_id}/
```

Response example:

```json
{
  "goal": {
    "id": 1,
    "org": 2,
    "name": "Laptop",
    "target_amount": "500.00",
    "target_date": "2026-08-25",
    "status": "active",
    "created_by": "alice",
    "created_at": "2026-08-20T10:40:28.139486+02:00",
    "completed_at": "null",
    "balance": "250.00",
    "progress": "0.50",
    "overdue": "false",
    "spendable": "false"
  }
}
```

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the goal does not exist in the organization

### Update goal

```http
PATCH /api/v1/organizations/{org_id}/goals/{goal_id}/
```

At least one field is required. `name`, `target_amount`, and `target_date` are each optional individually.

Request body:

```json
{
  "name": "Car",
  "target_amount": "2000.00",
  "target_date": "2026-09-01"
}
```

Response example:

```json
{
  "goal": {
    "id": 1,
    "org": 2,
    "name": "Car",
    "target_amount": "2000.00",
    "target_date": "2026-09-01",
    "status": "active",
    "created_by": "alice",
    "created_at": "2026-08-20T10:40:28.139486+02:00",
    "completed_at": "null",
    "balance": "250.00",
    "progress": "0.125",
    "overdue": "false",
    "spendable": "false"
  }
}
```

Only the organization owner and the goal creator can update the goal.

Status:

- `200 OK` on success
- `400 Bad Request` when validation fails, no fields are provided, or the goal already exists
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the goal does not exist in the organization

## Goal lifecycle and transactions

### Get goal balance

```http
GET /api/v1/organizations/{org_id}/goals/{goal_id}/balance/
```

Returns the current balance for the goal based on the transactions linked to it. The balance represents the total contributions assigned to the goal and is used to track progress toward the target amount.

Response example:

```json
{
  "goal_id": 1,
  "balance": "1250.00"
}
```

All organization members can view the goal balance.

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the goal does not exist in the organization

### Change goal status

```http
PATCH /api/v1/organizations/{org_id}/goals/{goal_id}/
```

Request body:

```json
{
  "status": "completed"
}
```

Changing the status updates the lifecycle of the goal. The goal can move from `active` to `completed`, from `completed` to `active`, and from `active` or `completed` to `archived`. Archived goals cannot be changed back to an active state.

When a goal is archived, any remaining goal balance is transferred back to the organization balance.

Only the organization owner and the goal creator can change the goal status.

Status:

- `200 OK` on success
- `400 Bad Request` when the status transition is not allowed
- `403 Forbidden` when the user is not allowed to change the status
- `404 Not Found` when the goal does not exist in the organization

### Make contribution

```http
POST /api/v1/organizations/{org_id}/transactions/
```

Mandatory parameters:

- `goal_id`
- `entry_type` (`contribution`)
- `amount`
- `transaction_date` (YYYY-MM-DD current system date)

Generated parameters:

- `description` ("Contribution to the goal <goal_name>")
- 'transaction_date' (YYYY-MM-DD current system date)

Request body:

```json
{
  "goal_id": 1,
  "entry_type": "contribution",
  "amount": "250.00",
  "description": "Contribution to the goal savings",
  "transaction_date": "2026-08-12",
}
```

Response example:

```json
{
  "id": 1,
  "org_id": 2,
  "goal_id": 1,
  "category_id": null,
  "entry_type": "contribution",
  "amount": "250.00",
  "description": "Contribution to the goal savings",
  "transaction_date": "2026-08-12",
  "is_tax_deductible": false,
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00"
}
```

All organization members can make contributions.

Status:

- `201 Created` on success
- `400 Bad Request` when the goal is not active or validation fails
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the goal does not exist in the organization

### Make withdrawal

```http
POST /api/v1/organizations/{org_id}/transactions/
```

Mandatory parameters:

- `goal_id`
- `entry_type` (`withdraw`)
- `amount`
- `transaction_date` (YYYY-MM-DD) (current system time)

Generated parameters:

- `description` ("Withdrawal from the goal <goal_name>")
- 'transaction_date' (current system time)

Request body:

```json
{
  "goal_id": 1,
  "entry_type": "withdraw",
  "amount": "250.00",
  "description": "Withdrawal from the goal savings",
  "transaction_date": "2026-08-20"
}
```

Response example:

```json
{
  "id": 2,
  "org_id": 2,
  "goal_id": 1,
  "category_id": null,
  "entry_type": "withdraw",
  "amount": "250.00",
  "description": "Withdrawal from the goal savings",
  "transaction_date": "2026-08-20",
  "is_tax_deductible": false,
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00"
}
```
All organization members can make a withdrawal.

Status:

- `201 Created` on success
- `400 Bad Request` when the goal is not active or validation fails
- `403 Forbidden` when the user is not allowed to withdraw from the goal
- `404 Not Found` when the goal does not exist in the organization

### Make expense

```http
POST /api/v1/organizations/{org_id}/transactions/
```

Creates a transaction with `entry_type` set to `expense` and links it to the goal. Expenses are allowed only for `completed` or permanent goals.

Mandatory parameters:

- `goal_id`
- `entry_type` (`expense`)
- `amount`
- `transaction_date` (YYYY-MM-DD)

Request body:

```json
{
  "goal_id": 1,
  "category_id": 2,
  "entry_type": "expense",
  "amount": "250.00",
  "description": "New bike",
  "transaction_date": "2026-08-20",
}
```

Response example:

```json
{
  "id": 3,
  "org_id": 2,
  "goal_id": 1,
  "category_id": 2,
  "entry_type": "expense",
  "amount": "250.00",
  "description": "New bike",
  "transaction_date": "2026-08-15",
  "is_tax_deductible": false,
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00"
}
```

All organization members can make an expense against a goal.

Status:

- `201 Created` on success
- `400 Bad Request` when the goal is not completed or validation fails
- `403 Forbidden` when the user is not allowed to spend from the goal
- `404 Not Found` when the goal does not exist in the organization

### Get goal transactions

Use `List transactions` endpoint with `goal_id` query parameter

```http
GET /api/v1/organizations/{org_id}/transactions/?goal_id={goal_id}
```

Query parameters:

- `goal_id` (`contribution`, `withdraw`, `expense`)

Returns the list of transactions that belong to the current goal.

Response example:

```json
{
  "transactions": [
    {
      "id": 1,
      "org_id": 2,
      "goal_id": 1,
      "category_id": null,
      "entry_type": "contribution",
      "amount": "250.00",
      "description": "Contribution to the goal savings",
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

All organization members can list goal transactions.

Status:

- `200 OK` on success
- `400 Bad Request` for malformed parameters
- `403 Forbidden` when the user is not a member of the organization