# Proposed API structure for future modules

The endpoints in this document are not implemented yet and should be treated as a
suggested contract for the next backend iterations. They are meant to guide
development for transactions, notifications, goals, and related finance flows.

## Transactions

Transactions are linked to an organization and can represent income, expenses, or goal contributions.

### List transactions

```http
GET /api/v1/organizations/{org_id}/transactions/
```

Query parameters:

- `category_id` (optional)
- `type` (optional: `income`, `expense`, `contribution`)
- `from` / `to` (optional date range)
- `page` / `limit` (optional pagination)

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
      "created_at": "2026-08-12T12:03:00Z"
    }
  ]
}
```

### Create transaction

```http
POST /api/v1/organizations/{org_id}/transactions/
```

Request body:

```json
{
  "category_id": 4,
  "entry_type": "expense",
  "amount": "125.50",
  "description": "Groceries",
  "transaction_date": "2026-08-12",
  "is_tax_deductible": false,
  "goal_id": null
}
```

### Get transaction details

```http
GET /api/v1/organizations/{org_id}/transactions/{transaction_id}/
```

## Categories

```http
GET /api/v1/organizations/{org_id}/categories/
POST /api/v1/organizations/{org_id}/categories/
```

Category payload:

```json
{
  "name": "Food",
  "type": "expense"
}
```

## Goals

Goals are organization-level targets with a target amount, deadline, and status.

### List goals

```http
GET /api/v1/organizations/{org_id}/goals/
```

Response example:

```json
{
  "goals": [
    {
      "id": 1,
      "name": "Trip to Lisbon",
      "target_amount": "2000.00",
      "target_date": "2026-10-01",
      "status": "active",
      "created_by": "alice"
    }
  ]
}
```

### Create goal

```http
POST /api/v1/organizations/{org_id}/goals/
```

Request body:

```json
{
  "name": "Trip to Lisbon",
  "target_amount": "2000.00",
  "target_date": "2026-10-01"
}
```

### Update or archive goal

```http
PATCH /api/v1/organizations/{org_id}/goals/{goal_id}/
POST /api/v1/organizations/{org_id}/goals/{goal_id}/archive/
```

## Notifications

Notifications should be read by the authenticated user and grouped by read/unread state.

### List notifications

```http
GET /api/v1/notifications/
```

Response example:

```json
{
  "notifications": [
    {
      "id": 12,
      "type": "invitation",
      "org_id": 2,
      "org_name": "Trip",
      "payload": {
        "invitation_id": 7,
        "invited_by": "bob"
      },
      "is_read": false,
      "created_at": "2026-08-12T13:05:00Z"
    }
  ]
}
```

## Recurring transactions

```http
GET /api/v1/organizations/{org_id}/recurring-transactions/
POST /api/v1/organizations/{org_id}/recurring-transactions/
PATCH /api/v1/organizations/{org_id}/recurring-transactions/{id}/
DELETE /api/v1/organizations/{org_id}/recurring-transactions/{id}/
```

Suggested payload:

```json
{
  "category_id": 4,
  "amount": "100.00",
  "frequency": "monthly",
  "description": "Rent",
  "next_execution": "2026-09-01",
  "is_active": true,
  "is_tax_deductible": false
}
```

## Response conventions

For future finance features, the API should follow a consistent pattern:

- list endpoints return an object with a top-level collection, for example `transactions`, `goals`, or `notifications`
- permission checks are enforced by organization membership and role
- when relevant, all endpoints should support filtering and pagination
