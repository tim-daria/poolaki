# Proposed API structure for future modules

The endpoints in this document (categories, goals, recurring transactions) are
not implemented yet and should be treated as a suggested contract for the next
backend iterations. Already-implemented modules are documented in their own
files, e.g. [notifications.md](notifications.md) and
[organizations.md](organizations.md).

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

New finance features must follow the patterns the existing API already uses:

- list endpoints return an object with a top-level collection, for example
  `transactions`, `goals`, or `notifications`
- permission checks are enforced by organization membership and role
- when relevant, all endpoints should support filtering and pagination
- validation and permission errors use one contract for `400 Bad Request`
  and `403 Forbidden`:

  ```json
  {
    "errors": ["Human-readable message"]
  }
  ```
