# Goals

All endpoints in this document require authentication.

## Goals overview

Goals are organization-level savings targets. Each goal has a name, target amount, target date, creation metadata, and one of three statuses:

- **Active** — the goal is still in progress.
- **Completed** — the goal is reached or the target has been fulfilled.
- **Archived** — the goal has been closed and its remaining balance is no longer active.

A goal belongs to an organization and tracks transactions that contribute to, withdraw from, or spend against that target. Any organization member can view goal data, while only the owner and the goal creator can modify restricted fields such as status or withdrawals.

## Goals endpoints

Goals belong to an organization and track progress toward a savings or spending target.

### List goals

```http
GET /api/v1/organizations/{org_id}/goals/
```

Query parameters:

- `status` (optional, one of `active`, `completed`, `archived`)

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
      "target_date": "2026-08-12",
      "status": "active",
      "created_by": "alice",
      "created_at": "2026-08-20T10:40:28.139486+02:00"
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
  "target_date": "2026-08-12"
}
```

Response example:

```json
{
  "id": 1,
  "org": 2,
  "name": "Laptop",
  "target_amount": "500.00",
  "target_date": "2026-08-12",
  "status": "active",
  "created_by": "alice",
  "created_at": "2026-08-20T10:40:28.139486+02:00"
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
    "target_date": "2026-08-12",
    "status": "active",
    "created_by": "alice",
    "created_at": "2026-08-20T10:40:28.139486+02:00"
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
    "created_at": "2026-08-20T10:40:28.139486+02:00"
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

Changing the status updates the lifecycle of the goal. The goal can move from `active` to `completed`, and from `active` or `completed` to `archived`. Archived goals cannot be changed back to an active state.

When a goal is archived, any remaining goal balance is transferred back to the organization balance.

Only the organization owner and the goal creator can change the goal status.

Status:

- `200 OK` on success
- `400 Bad Request` when the status transition is not allowed
- `403 Forbidden` when the user is not allowed to change the status
- `404 Not Found` when the goal does not exist in the organization

### Make contribution

```http
POST /api/v1/organizations/{org_id}/goals/{goal_id}/contribution/
```

Creates a transaction with `entry_type` set to `contribution` and links it to the current goal. Contributions are allowed only for `active` goals.

Request body:

```json
{
  "amount": "250.00",
  "description": "Monthly savings",
  "transaction_date": "2026-08-18"
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
POST /api/v1/organizations/{org_id}/goals/{goal_id}/withdraw/
```

Creates a transaction with `entry_type` set to `withdraw` and links it to the goal. Withdrawals are allowed only for `active` goals.

Request body:

```json
{
  "amount": "100.00",
  "description": "Emergency withdrawal",
  "transaction_date": "2026-08-19"
}
```

Only the organization owner and the goal creator can make a withdrawal.

Status:

- `201 Created` on success
- `400 Bad Request` when the goal is not active or validation fails
- `403 Forbidden` when the user is not allowed to withdraw from the goal
- `404 Not Found` when the goal does not exist in the organization

### Make expense

```http
POST /api/v1/organizations/{org_id}/goals/{goal_id}/expense/
```

Creates a transaction with `entry_type` set to `expense` and links it to the goal. Expenses are allowed only for `completed` goals.

Request body:

```json
{
  "amount": "200.00",
  "description": "Purchase for the goal",
  "transaction_date": "2026-08-21"
}
```

Only the organization owner and the goal creator can make an expense against a goal.

Status:

- `201 Created` on success
- `400 Bad Request` when the goal is not completed or validation fails
- `403 Forbidden` when the user is not allowed to spend from the goal
- `404 Not Found` when the goal does not exist in the organization

### Get goal transactions

```http
GET /api/v1/organizations/{org_id}/goals/{goal_id}/transactions/
```

Query parameters:

- `entry_type` (optional, one of `contribution`, `withdraw`, `expense`)

Returns the list of transactions that belong to the current goal and optionally match the requested entry type.

Response example:

```json
{
  "transactions": [
    {
      "id": 12,
      "goal": 1,
      "entry_type": "contribution",
      "amount": "250.00",
      "description": "Monthly savings",
      "transaction_date": "2026-08-18",
      "created_by": "alice"
    }
  ]
}
```

All organization members can list goal transactions.

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the goal does not exist in the organization
