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

Query params:

- `is_read` (optional): `"true"` or `"false"` — filter by read status.
  If omitted, both read and unread are returned.

#### Getting only unread notifications

```http
GET /api/notifications/?is_read=false
```

Handy for a "quick actions" widget that only surfaces things the user has
not seen yet, without re-rendering the whole inbox.

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

Note: `unread_count` is always the count of **all** unread notifications of
the current user, regardless of the `is_read` filter on the list itself.

#### Read state: no automatic marking on list fetch

`GET /api/notifications/` is a pure read endpoint — **viewing the inbox
does NOT mark anything as read**. Deciding what the user has "seen" is the
frontend's job: send the ids of the rows you actually rendered to
`POST /api/notifications/clear-all/` (below). This avoids marking a
notification as read if it arrived after the list was fetched but before
the user clicked "Clear all":

```http
POST /api/notifications/clear-all/
```

Request body:

```json
{
  "notification_ids": [11, 13, 15]
}
```

Response:

```json
{
  "marked_read": 3
}
```

Status:

- `200 OK` on success (`marked_read` = number of rows actually updated;
  may be lower than the number of ids if some of them are already read,
  belong to another user, or are invitation notifications)
- `400 Bad Request` when `notification_ids` is missing, empty, or not a
  list of numbers: `{"notification_ids": ["This list may not be empty."]}`

Semantics:

- only the current user's own notifications are affected — ids belonging
to other users are silently ignored;
- **invitation notifications are always skipped**, even if listed in the
  request — they can only be resolved by accepting or declining (and, on the
  owner side, by canceling);
- already-read ids are counted as `0` in `marked_read` (the `update`
is idempotent: it only flips `is_read` from `false` to `true`).

#### Invitation notifications: special read logic

Invitation notifications are **not** marked read by
`POST /api/notifications/clear-all/`. They become read only when the
invitation is resolved — when the invited user accepts or declines it, or
when the owner cancels it:

- `POST /api/invitations/{invitation_id}/accept/`,
- `POST /api/invitations/{invitation_id}/decline/`,
- `POST /api/organizations/{org_id}/invitations/{invitation_id}/cancel/`.

(See [organizations.md](organizations.md) for those endpoints.) Each of
those requests marks the matching `Notification` row `is_read = true`, so
after any resolution the badge count drops accordingly.


## Recommended frontend behavior

There is no push channel, so the frontend should poll.

### Badge (bell icon)

- Call `GET /api/notifications/unread-count/` on:
  - app mount (after login),
  - every 60 s while the app is open,
- Show the number on the bell icon; hide it when `unread_count === 0`.

### Inbox dropdown / page

- Open it → `GET /api/notifications/` — pure read, renders the list. The
  response also contains `unread_count` for the badge.
- Render each row as: icon by `type` (fall back to a generic icon for
  unknown types), short human text, and relative time.
- `is_read === false` → highlight the row (e.g. bold + dot).
- When the user closes the inbox or clicks a "Mark all as read" /"Clear all"
  button, send the ids of the rows you actually rendered to
  `POST /api/notifications/clear-all/`, then refetch
  `GET /api/notifications/unread-count/` to update the badge.
- To show only things the user has not seen yet (e.g. a small "recently"
  widget), use `GET /api/notifications/?is_read=false`.

> Frontend contract: it is the **client** that decides which notifications
> count as "seen" — the backend does not infer it from a list fetch.
> If you forget the `POST /api/notifications/clear-all/` call, the badge
> will stay non-zero and the same rows will remain highlighted in the
> inbox forever.

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

### Polling cadence

- `unread-count`: every 60 s is a good default; 30 s is acceptable. Gate the
  interval on `document.visibilityState` and stop polling when the tab is
  hidden or the user logs out.
- The full list only on user interaction (opening the inbox) — the
  `unread-count` endpoint is cheaper.
- Do one immediate `unread-count` poll after any action that changes
  read state: `clear-all`, `accept`, `decline`.
