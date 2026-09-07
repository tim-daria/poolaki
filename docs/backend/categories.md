# Categories

All endpoints in this document require authentication.

## Categories endpoints

Categories belong to an organization and classify transactions as income, expenses, or goal contributions. Any member of the organization can manage its categories.

### List categories

```http
GET /api/v1/organizations/{org_id}/categories/
```

Optional query parameter:

- `type` (`income`, `expense`, `contribution`)

The filter is exact. An unsupported value returns an empty list.

Response example:

```json
{
  "categories": [
    {
      "id": 1,
      "org": 2,
      "name": "Food",
      "type": "expense"
    }
  ]
}
```

Only categories belonging to `{org_id}` are returned.

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization

### Create category

```http
POST /api/v1/organizations/{org_id}/categories/
```

Mandatory parameters:

- `name` (maximum 50 characters)
- `type` (`income`, `expense`, `contribution`)

Request body:

```json
{
  "name": "Food",
  "type": "expense"
}
```

Response example:

```json
{
  "id": 1,
  "org": 2,
  "name": "Food",
  "type": "expense"
}
```

A category name and type combination must be unique within the organization.

Status:

- `201 Created` on success
- `400 Bad Request` when validation fails or the category already exists
- `403 Forbidden` when the user is not a member of the organization

### Get category details

```http
GET /api/v1/organizations/{org_id}/categories/{category_id}/
```

Response example:

```json
{
  "category": {
    "id": 1,
    "org": 2,
    "name": "Food",
    "type": "expense"
  }
}
```

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the category does not exist in the organization

### Update category

```http
PATCH /api/v1/organizations/{org_id}/categories/{category_id}/
```

At least one field is required. Both fields are optional individually.

Request body:

```json
{
  "name": "Groceries",
  "type": "expense"
}
```

Response example:

```json
{
  "category": {
    "id": 1,
    "org": 2,
    "name": "Groceries",
    "type": "expense"
  }
}
```

The same validation rules as category creation apply. A category name and type combination must remain unique within the organization.

Status:

- `200 OK` on success
- `400 Bad Request` when validation fails, no fields are provided, or the category already exists
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the category does not exist in the organization

### Delete category

```http
DELETE /api/v1/organizations/{org_id}/categories/{category_id}/
```

The request has no body. Deleting a category preserves linked transactions and clears their category reference.

Status:

- `204 No Content` on successful deletion
- `403 Forbidden` when the user is not a member of the organization
- `404 Not Found` when the category does not exist in the organization
