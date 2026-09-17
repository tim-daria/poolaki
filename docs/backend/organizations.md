# Organizations and invitations

All endpoints in this document require authentication.

## Organization endpoints

### List organizations for the current user

```http
GET /api/v1/organizations/
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
POST /api/v1/organizations/
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
- `400 Bad Request` when the payload is invalid, or the creator already
  belongs to the maximum of 10 organizations

### Set the personal organization initial balance

```http
POST /api/v1/organizations/personal/initial-balance/
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

### List organization members

```http
GET /api/v1/organizations/{org_id}/members/
```

Access is restricted to members of the requested organization.

Response example:

```json
{
  "members": [
    {
      "user_id": 1,
      "username": "bob",
      "role": "owner",
      "joined_at": "2026-08-01T12:00:00Z"
    },
    {
      "user_id": 2,
      "username": "alice",
      "role": "member",
      "joined_at": "2026-08-10T12:00:00Z"
    }
  ]
}
```

Status:

- `200 OK` on success
- `403 Forbidden` when the user is not a member of the organization

### Remove a member

```http
DELETE /api/v1/organizations/{org_id}/members/{user_id}/
```

Only the organization owner can remove members. No request body is required.

Status:

- `204 No Content` on success
- `400 Bad Request` when the user_id is not a member of the organization
  (including unknown users), or when the owner tries to remove themselves
  (use organization deletion to remove yourself)
- `403 Forbidden` when the requester is not the organization owner

Side effects:

- the removed user receives a `removed_from_org` notification
- every remaining member receives a `member_removed` notification
  (see [notifications.md](notifications.md))

### Get current balance

```http
GET /api/v1/organizations/{org_id}/balance/
```

Returns current balance of the organization.

Response example:

```json
{
  "org_id": 1,
  "balance": 342.0
}
```

Status:

- `200 OK` on success
- `403 Forbidden` if the invitation was not sent to the current user

## Invitation endpoints

These endpoints manage organization invitations and are protected by owner-only permissions.

### List pending invitations for an organization

```http
GET /api/v1/organizations/{org_id}/invitations/
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
POST /api/v1/organizations/{org_id}/invitations/
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
- the invited user cannot already belong to the maximum of 10 organizations

### Cancel a pending invitation

```http
POST /api/v1/organizations/{org_id}/invitations/{invitation_id}/cancel/
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

## Endpoints for the invited user

These endpoints are used by the user who received an invitation (not the
organization owner).

### List my pending invitations

```http
GET /api/v1/invitations/my/
```

Returns all pending invitations addressed to the authenticated user, across
all organizations.

Response example:

```json
{
  "invitations": [
    {
      "id": 7,
      "organization_id": 3,
      "organization_name": "Trip",
      "invited_by": "bob",
      "created_at": "2026-08-10T12:00:00Z"
    }
  ]
}
```

### Accept an invitation

```http
POST /api/v1/invitations/{invitation_id}/accept/
```

Adds the authenticated user to the organization as a `member`. No request
body is required.

Response example:

```json
{
  "organization_id": 3,
  "organization_name": "Trip"
}
```

Status:

- `200 OK` on success
- `400 Bad Request` if the invitation is no longer pending, or the organization has since reached its member limit
- `403 Forbidden` if the invitation was not sent to the current user
- `404 Not Found` if the invitation does not exist

### Decline an invitation

```http
POST /api/v1/invitations/{invitation_id}/decline/
```

Marks the invitation as declined. No request body is required.

Response example:

```json
{
  "invitation_id": 7,
  "status": "declined"
}
```

Status:

- `200 OK` on success
- `400 Bad Request` if the invitation is no longer pending
- `403 Forbidden` if the invitation was not sent to the current user
- `404 Not Found` if the invitation does not exist
