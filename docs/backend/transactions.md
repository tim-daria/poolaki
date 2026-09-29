# Transactions

All endpoints in this document require authentication.

## Transactions endpoints

Transactions are linked to an organization and can represent income, expenses, or goal contributions.

### List transactions

```http
GET /api/v1/organizations/{org_id}/transactions/
```

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
  ]
}
```

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not the organization owner

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

Status:

- `201 Created` on success
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