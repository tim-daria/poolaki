# Backend

Backend service code lives here.

## Authentification
Authentication is implemented using **django-allauth Headless**.

Users can:

- register with email, username and password
- log in with email and password
- register and sign in using social authentification via intra42 (42 OAuth)

The callback configured in the 42 Developer Portal should be:

```

http://poolaki.localhost/accounts/intra42/callback/

```


## APIs
### Get CSRF token

```

GET /api/csrf/

```

---

### Get current session

```

GET /\_allauth/browser/v1/auth/session

```

---

### Sign in

```

POST /\_allauth/browser/v1/auth/signup

```

### Login

```

POST /\_allauth/browser/v1/auth/login

```

---

### Logout

```

DELETE /\_allauth/browser/v1/auth/session

```

---

### Social login

```

POST /\_allauth/browser/v1/auth/provider/redirect

```

Parameters:

```

provider
process
callback_url

```

Example:

```

provider=intra42
process=login
callback_url=https://poolaki.localhost/oauth/callback

```

---


### Initial balance

Check whether initial balance is required:

```

GET /api/organizations/personal/initial-balance/

```
Response:

```json
{
  "needs_initial_balance": true
}
```

Set initial balance:

```

POST /api/organizations/personal/initial-balance/

```

Body:

```json
{
  "initial_balance": 1000
}
```

---

### Organizations

Get all organizations available for the authenticated user:

```

GET /api/organizations/

```

Response:

```json
{
  "current_organization_id": 1,
  "organizations": [
    {
      "id": 1,
      "name": "Personal budget",
      "is_personal": true,
      "role": "OWNER"
    },
    {
      "id": 2,
      "name": "Trip",
      "is_personal": false,
      "role": "OWNER"
    }
  ]
}
```

The response contains:

"organizations" — all organizations where the current user is a member.
"current_organization_id" — the organization currently selected in the user's session.

Create a new shared organization:

```

POST /api/organizations/

```

Body:
```json
{
  "name": "Trip",
  "initial_balance": 500
}
```

Response:
```json
{
  "id": 2,
  "name": "Trip",
  "initial_balance": "500.00",
  "is_personal": false
}
```

After creation, the new organization becomes the current organization in the user's session.

Switch the current organization:

```

POST /api/organizations/{org_id}/select/

```

Response:
```json
{
  "current_organization_id": 2
}
```

The selected organization is stored in the user's session and will be used as the default organization after page reloads.

The user must be a member of the organization. Otherwise, the API returns:

```json
{
  "error": "You are not a member of this organization"
}
```
with status 403 Forbidden.

---

### Health

```

GET /health
```

Used by:

- Docker healthcheck and CI to recieve the current health status

---

### Metrics

```

GET /metrics
```

Used by:

- Prometheus to collect performance and runtime metrics for monitoring and alerting


# Monitoring

## Apps
https://prometheus.localhost

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
