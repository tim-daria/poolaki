# Notifications

Notifications let the backend notify a user about things that happened to
them (an invitation, added transaction in shared workspaces, a goal milestone, …). The current API
is a simple "inbox" model: no websockets, no SSE — the client polls.

All endpoints require authentication.

## Notification types

| `type`               | Meaning                                                                  | Currently created by                                    |
|----------------------|--------------------------------------------------------------------------|---------------------------------------------------------|
| `invitation`         | "You have been invited to an organization"                               | `POST /api/organizations/{org_id}/invitations/`         |
| `transaction_added`  | "A new transaction was added"                                            | reserved (will be created when transactions go multi-org) |
| `goal_completed`     | "A spending goal has been achieved"                                      | reserved                                                 |
| `member_left`        | "A member left the organization"                                         | reserved                                                 |

Unknown/absent types are possible as the feature grows — the frontend should
render `type` defensively (default icon/text for unknown values).

`payload` is a JSON object. The only producer today is the invitation flow,
whose payload is:

```json
{
  "invitation_id": 7,
  "org_id": 3,
  "org_name": "Trip",
  "invited_by": "bob"
}
```

Other types may add their own fields later; treat `payload` as type-specific.

## Endpoints

### Get unread notification count

```http
GET /api/notifications/unread-count/
```

Response example:

```json
{
  "unread_count": 3
}
```

Lightweight endpoint for the badge. It counts `Notification` rows with
`is_read = false` for the current user.

### List my notifications

```http
GET /api/notifications/
```

Returns the **50 most recent** notifications (there is no pagination yet),
newest first, plus the unread count.

Response example:

```json
{
  "notifications": [
    {
      "id": 12,
      "type": "invitation",
      "payload": {
        "invitation_id": 7,
        "org_id": 3,
        "org_name": "Trip",
        "invited_by": "bob"
      },
      "is_read": false,
      "created_at": "2026-08-19T10:15:30Z"
    },
    {
      "id": 11,
      "type": "transaction_added",
      "payload": {},
      "is_read": true,
      "created_at": "2026-08-18T21:02:11Z"
    }
  ],
  "unread_count": 1
}
```

#### Side effect: opening the inbox marks non-invitation notifications read

`GET /api/notifications/` has a side effect: it marks **all currently unread
notifications except `invitation`** as read, because the user has just seen
them in the inbox. The returned `unread_count` is recomputed *after* that
update, so with only non-invitation notifications it will be `0`.

**Invitation notifications are special:** they are **not** marked read by
opening the inbox, because viewing the inbox does not count as acting on an
invitation. The intended rule is that an invitation notification should stay
unread until the invitation is resolved — by

- `POST /api/invitations/{invitation_id}/accept/`,
- `POST /api/invitations/{invitation_id}/decline/`,
- or the owner cancelling it via
  `POST /api/organizations/{org_id}/invitations/{invitation_id}/cancel/`.

(See [organizations.md](organizations.md) for those endpoints.)


## Recommended frontend behavior

There is no push channel, so the frontend should poll.

### Badge (bell icon)

- Call `GET /api/notifications/unread-count/` on:
  - app mount (after login),
  - every 60 s while the app is open,
- Show the number on the bell icon; hide it when `unread_count === 0`.

### Inbox dropdown / page

- Open it → `GET /api/notifications/`. This call both renders the list and
  marks the non-invitation rows read (side effect described above).
- Render each row as: icon by `type` (fall back to a generic icon for
  unknown types), short human text, and relative time.
- `is_read === false` → highlight the row (e.g. bold + dot).
- The count in the badge can be refetched right after opening the inbox to
  clear rows that just became read.

### Rendering the different types

| `type`              | Suggested UI                                                                                     |
|---------------------|--------------------------------------------------------------------------------------------------|
| `invitation`        | Text like "bob invited you to **Trip**", buttons **Accept** / **Decline** (see below).            |
| `transaction_added` | Text like "bob added a new €20 transaction to **Family Account**"                                 |
| `goal_completed`    | Info text.                                                                                        |
| `member_left`       | Info text .                                                                                       |

The exact copy and icons are up to the frontend; the table only maps where a
click should go.

### Accept / Decline flow (from a notification)

1. Invited user opens the bell, sees the invitation notification.
2. `payload.invitation_id` is the id to use:
   - Accept → `POST /api/invitations/{invitation_id}/accept/`
   - Decline → `POST /api/invitations/{invitation_id}/decline/`
3. On success (200) refetch:
   - the badge (`GET /api/notifications/unread-count/`), and
   - the organization list (`GET /api/organizations/`) — after accepting,
     the new organization appears there and the user may want to switch to it.
4. On `400 Bad Request` (invitation no longer pending, e.g. the owner
   already cancelled it, or member limit hit) show the `error` field and hide
   the Accept/Decline buttons for that row. A 404 means the invitation was
   deleted.
