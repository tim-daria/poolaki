# Goals

All endpoints in this document require authentication.

## Goals overview

Goals are organization-scoped labels for transactions. Each goal has a name, target amount, target date, date of creation and one of three statuses:

- **Active** — money received by the organization.
- **Completed** — money spent by the organization.
- **Archived** — money allocated toward a goal.

Any organization member can view and manage the organization's categories.

## Goals endpoints

Goals belong to an organization and classify transactions as income, expenses, or goal contributions.

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
      "target_amount": "500",
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
- `target_amount` (maximum 100 characters)

By creation type is set to `active` 

Request body:

```json
{
  "name": "Laptop",
  "target_amount": "500",
}
```

Response example:

```json
{
  "id": 1,
  "org": 2,
  "name": "Laptop",
  "target_amount": "500",
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
-->

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
    "target_amount": "500",
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

At least one field is required. All three fields are optional individually.

Request body:

```json
{
  "name": "Car",
  "target_amount": "2000",
  "target_date": "2026-09-1"
}
```

Response example:

```json
{
    "goal": {
    "id": 1,
    "org": 2,
    "name": "Car",
    "target_amount": "2000",
    "target_date": "2026-09-1",
    "status": "active",
    "created_by": "alice",
    "created_at": "2026-08-20T10:40:28.139486+02:00"
  }
}
```

Only organization owner and goal creator can update the goal.

Status:

- `200 OK` on success
- `400 Bad Request` when validation fails, no fields are provided, or the category already exists
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the category does not exist in the organization

TODO

### Get goal balance

```http
GET /api/v1/organizations/{org_id}/goals/{goal_id}/balance/
```

Calculate current balance of the goal based of contribution, withdraw and expense transactions with {goal_id}.
All organization members can get a balance for thr goal. 

### Change status

Change status of the goal.
Only organization owner and goal creator can update the status.

When we change status to archived, we withdraw all the remaining goals balance to the organization balance.
Currently we can't change status for archived goals.

### Make contribution

```http
POST /api/v1/organizations/{org_id}/goals/{goal_id}/contribution/
```

Create a transaction with 'contribution' type and 'goal_id'
We can make expense only for 'active' goals.
All organization members can make contributions. 

### Make withdraw

```http
POST /api/v1/organizations/{org_id}/goals/{goal_id}/withdraw/
```
Create a transaction with 'withdraw' type and 'goal_id'
We can make expense only for 'active' goals.
Only organization owner and goal creator can make withdraw.

### Make expense

```http
POST /api/v1/organizations/{org_id}/goals/{goal_id}/expense/
```

Create a transaction with 'expense' type and 'goal_id'.
We can make expense only for 'completed' goals.
In current implementation we don't check goal balance. 
Only organization owner and goal creator can make expense.

### Get transactions

```http
GET /api/v1/organizations/{org_id}/goals/{goal_id}/transactions/
```

Query parameters:

- `entry_type` (optional, one of `contribution`, `withdraw`, `expense`)

Get a list of transactions with goal={goal_id} and entry_type
All organization members can get a list of transactions for the goal.
