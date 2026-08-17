# Organizations and invitations

All endpoints in this document require authentication.

## Organization endpoints

### List organizations for the current user

```http
GET /api/organizations/
```

Response example:

```json
{
  "organizations": [
    {
      "id": 1,
      "name": "Personal budget",
      "is_personal": true,
      "role": "owner"
    },
    {
      "id": 2,
      "name": "Trip",
      "is_personal": false,
      "role": "owner"
    }
  ]
}
```

Notes:

- `role` is returned as the role assigned in the membership (`owner` or `member`)
- `is_personal` identifies the user's personal budget

### Create a new shared organization

```http
POST /api/organizations/
```

Request body:

```json
{
  "name": "Trip",
  "initial_balance": 500
}
```

Response example:

```json
{
  "id": 2,
  "name": "Trip",
  "initial_balance": "500.00",
  "is_personal": false
}
```

Status:

- `201 Created` on success
- `400 Bad Request` when the payload is invalid

### Set the personal organization initial balance

```http
POST /api/organizations/personal/initial-balance/
```

Request body:

```json
{
  "initial_balance": 1000
}
```

Response example:

```json
{
  "initial_balance": "1000.00"
}
```

This endpoint initializes the authenticated user's personal organization balance.

## Invitation endpoints

These endpoints manage organization invitations and are protected by owner-only permissions.

### List pending invitations for an organization

```http
GET /api/organizations/{org_id}/invitations/
```

Example response:

```json
{
  "invitations": [
    {
      "id": 7,
      "invited_user": "alice",
      "invited_by": "bob",
      "status": "pending"
    }
  ]
}
```

### Invite a user to an organization

```http
POST /api/organizations/{org_id}/invitations/
```

Request body:

```json
{
  "username": "alice"
}
```

Response example:

```json
{
  "id": 7,
  "invited_user": "alice",
  "status": "pending"
}
```

Validation rules:

- the requester must be the organization owner
- the target user must exist
- the target user cannot already be a member
- the user cannot already have a pending invitation for the same organization
- the organization must not be a personal budget
- the organization limit of 5 members must not be exceeded

### Cancel a pending invitation

```http
POST /api/organizations/{org_id}/invitations/{invitation_id}/cancel/
```

Response example:

```json
{
  "id": 7,
  "status": "cancelled"
}
```

Possible error responses:

```json
{
  "error": "Invitation is invalid or already resolved"
}
```

Status:

- `200 OK` on successful cancellation
- `400 Bad Request` for invalid or already-processed invitations
- `403 Forbidden` when the user is not the organization owner
