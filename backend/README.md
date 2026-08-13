# Backend API Documentation

This backend is built with Django and Django REST Framework, and it provides authentication, organization management, invitation flows, health checks, and monitoring endpoints.

## Base URL

The API is mounted under:

```text
/api/
```

The app also exposes the following project-level routes:

- `/_allauth/...` — headless authentication endpoints from django-allauth
- `/health/` — backend health check
- `/metrics` — Prometheus metrics

## Authentication

Authentication is handled via `django-allauth Headless`.

Users can:

- register with email, username, and password
- log in with email and password
- authenticate through 42 OAuth (`intra42`)

The callback configured in the 42 Developer Portal is:

```text
http://poolaki.localhost/accounts/intra42/callback/
```

### CSRF token

```http
GET /api/csrf/
```

Returns a CSRF cookie and a simple JSON response:

```json
{
  "detail": "CSRF cookie set"
}
```

### Auth session

```http
GET /_allauth/browser/v1/auth/session
```

Returns metadata about the authenticated session.

### Sign up

```http
POST /_allauth/browser/v1/auth/signup
```

Request body:

```json
{
  "email": "user@example.com",
  "username": "alice",
  "password": "strong-password"
}
```

### Log in

```http
POST /_allauth/browser/v1/auth/login
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "strong-password"
}
```

### Log out

```http
DELETE /_allauth/browser/v1/auth/session
```

### Social login redirect

```http
POST /_allauth/browser/v1/auth/provider/redirect
```

Form parameters:

```text
provider=intra42
process=login
callback_url=https://poolaki.localhost/oauth/callback
```

---

## Organization endpoints

All organization endpoints require authentication.

### 1. List organizations for the current user

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

### 2. Create a new shared organization

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

### 3. Set the personal organization initial balance

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

---

## Invitation endpoints

These endpoints manage organization invitations and are protected by owner-only permissions.

### 1. List pending invitations for an organization

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

### 2. Invite a user to an organization

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

### 3. Cancel a pending invitation

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

---

## Health and monitoring

### Health check

```http
GET /health/
```

Returns:

```json
{
  "status": "ok"
}
```

This endpoint is used by Docker health checks and CI pipelines.

### Metrics

```http
GET /metrics
```

Used by Prometheus to collect runtime and performance metrics.

---

## Proposed API structure for future modules

The following endpoints are not implemented yet and should be treated as a suggested contract for the next backend iterations. They are meant to guide development for transactions, notifications, goals, and related finance flows.

### Transactions

Transactions are linked to an organization and can represent income, expenses, or goal contributions.

#### List transactions

```http
GET /api/organizations/{org_id}/transactions/
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

#### Create transaction

```http
POST /api/organizations/{org_id}/transactions/
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

#### Get transaction details

```http
GET /api/organizations/{org_id}/transactions/{transaction_id}/
```

### Categories

```http
GET /api/organizations/{org_id}/categories/
POST /api/organizations/{org_id}/categories/
```

Category payload:

```json
{
  "name": "Food",
  "type": "expense"
}
```

### Goals

Goals are organization-level targets with a target amount, deadline, and status.

#### List goals

```http
GET /api/organizations/{org_id}/goals/
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

#### Create goal

```http
POST /api/organizations/{org_id}/goals/
```

Request body:

```json
{
  "name": "Trip to Lisbon",
  "target_amount": "2000.00",
  "target_date": "2026-10-01"
}
```

#### Update or archive goal

```http
PATCH /api/organizations/{org_id}/goals/{goal_id}/
POST /api/organizations/{org_id}/goals/{goal_id}/archive/
```

### Notifications

Notifications should be read by the authenticated user and grouped by read/unread state.

#### List notifications

```http
GET /api/notifications/
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

### Recurring transactions

```http
GET /api/organizations/{org_id}/recurring-transactions/
POST /api/organizations/{org_id}/recurring-transactions/
PATCH /api/organizations/{org_id}/recurring-transactions/{id}/
DELETE /api/organizations/{org_id}/recurring-transactions/{id}/
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

### Suggested response conventions

For future finance features, the API should follow a consistent pattern:

- list endpoints return an object with a top-level collection, for example `transactions`, `goals`, or `notifications`
- permission checks are enforced by organization membership and role
- when relevant, all endpoints should support filtering and pagination

---

## Error handling conventions

The API generally returns:

- `200 OK` for successful retrieval or update operations
- `201 Created` for successful creation
- `400 Bad Request` for invalid input or business-rule violations
- `403 Forbidden` for permission errors
- `500 Internal Server Error` for unexpected backend failures

Typical error object:

```json
{
  "error": "Some descriptive message"
}
```

---

## Notes

### Current implementation status

The following organization switching endpoint exists in the code as a commented-out view and is not active in the current routing configuration:

```http
POST /api/organizations/{org_id}/select/
```

It is intentionally left disabled in `core/urls.py` for now.

### Main modules

- `core/views.py` — API view logic
- `core/models.py` — database models for users, organizations, memberships, invitations, transactions, goals, and notifications
- `core/serializers.py` — input validation for request payloads
- `core/urls.py` — API routing

---

## Monitoring dashboard

The project includes Prometheus monitoring infrastructure, and the service is typically available via:

```text
https://prometheus.localhost
```

and related local monitoring endpoints defined in the stack configuration.


https://grafana.localhost

## Caddy Dashboard
This Grafana dashboard provides real-time observability into HTTP traffic across monitored hosts (`grafana.localhost`, `poolaki.localhost`, and `prometheus.localhost`), using **Prometheus** as the data source over a **Last 6 hours** time range.

### Key Panels

- **HTTP Requests in the Last 24h** — Total request count summary.
- **HTTP Requests** — Time-series breakdown of request volume per host.
- **Non 200 HTTP Requests** — Highlights error/non-success responses.
- **HTTP Requests by Response Code** — Distribution of requests by status code (200, 302, 304, 401, 404, 502).
- **Request Duration** — Latency percentiles (85th, 90th, and 95th quantiles) over time, useful for spotting performance spikes.
- **Mean Response Size** — Average response payload size over time, with min/max/mean stats (Min: 768 B, Max: 4.00 kB, Mean: 3.36 kB).

### Purpose

This dashboard enables quick identification of traffic patterns, error rates, and performance anomalies, supporting proactive monitoring and troubleshooting of web service health.


## PostgreSQL Dashboard
This Grafana dashboard provides detailed insight into a **PostgreSQL** database instance (`postgres_exporter`, database `app_database`), running version **18.4.0**, over a **Last 30 minutes** time range.

### Settings Overview

- **Version** — PostgreSQL 18.4.0
- **Max Connections** — 100
- **Shared Buffers** — 128 MiB
- **Effective Cache Size** — 4.0 GiB
- **Maintenance Work Mem** — 64 MiB
- **Work Mem** — 4 MiB
- **Max WAL Size** — 1.0 GiB
- **Random Page Cost** — 4
- **Seq Page Cost** — 1
- **Max Worker Processes** — 8
- **Max Parallel Workers** — 8

### Connection / Transaction Statistics

- **Connections** — Active connection count over time.
- **Transactions** — Commits and rollbacks tracked over time.
- **Read Stats** — Sequential and index scan activity (e.g., `SELECT (idx scan)`, `SELECT (table scan)`).
- **Change Stats** — Insert and update operation counts.
- **Longest Transaction** — Duration of the longest-running transaction.
- **Cache Hit Rate** — Buffer cache efficiency, trending near 99.9%.

### Misc

- **Buffers (bgwriter)** — Buffer allocation and cleaning stats.
- **Conflicts/Deadlocks** — Tracking of conflicts and deadlocks (currently minimal/none).
- **Lock Tables** — Breakdown of lock types (e.g., `accessexclusivelock`, `exclusivelock`, `rowexclusivelock`, `sharelock`).
- **Temp Files** — Temporary file usage over time.

### Purpose

This dashboard enables database administrators to monitor PostgreSQL configuration, connection health, transaction throughput, caching efficiency, and locking/conflict behavior in real time, supporting performance tuning and troubleshooting.


## Docker monitoring
This Grafana dashboard provides an overview of resource usage across Docker containers, powered by **cAdvisor** metrics scraped via Prometheus (`Job: cadvisor`, `Host: cadvisor`, `Port: 8080`), over a **Last 1 hour** time range.

### Key Panels

- **Running Containers** — Total number of active containers.
- **Total Memory Usage** — Aggregate memory consumption across all containers.
- **Total CPU Usage** — Aggregate CPU utilization across all containers.
- **Container Status** — Quick-glance health indicators for each monitored container.
- **CPU Usage by Container** — Time-series comparison of per-container CPU load, with mean and last values listed.
- **Memory Usage by Container** — Time-series comparison of per-container memory consumption, with mean and last values listed.

### Purpose

This dashboard helps track the resource footprint of individual containers in a Dockerized environment, enabling quick detection of CPU or memory spikes and supporting capacity planning and troubleshooting.
