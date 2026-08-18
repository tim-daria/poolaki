# Monitoring

The project includes Prometheus monitoring infrastructure, and the service is typically available via:

- Prometheus: `https://prometheus.localhost`
- Grafana: `https://grafana.localhost`

along with related local monitoring endpoints defined in the stack configuration.

## Caddy dashboard

This Grafana dashboard provides real-time observability into HTTP traffic across monitored hosts (`grafana.localhost`, `poolaki.localhost`, and `prometheus.localhost`), using **Prometheus** as the data source over a **Last 6 hours** time range.

### Key panels

- **HTTP Requests in the Last 24h** — Total request count summary.
- **HTTP Requests** — Time-series breakdown of request volume per host.
- **Non 200 HTTP Requests** — Highlights error/non-success responses.
- **HTTP Requests by Response Code** — Distribution of requests by status code (200, 302, 304, 401, 404, 502).
- **Request Duration** — Latency percentiles (85th, 90th, and 95th quantiles) over time, useful for spotting performance spikes.
- **Mean Response Size** — Average response payload size over time, with min/max/mean stats (Min: 768 B, Max: 4.00 kB, Mean: 3.36 kB).

### Purpose

This dashboard enables quick identification of traffic patterns, error rates, and performance anomalies, supporting proactive monitoring and troubleshooting of web service health.

## PostgreSQL dashboard

This Grafana dashboard provides detailed insight into a **PostgreSQL** database instance (`postgres_exporter`, database `app_database`), running version **18.4.0**, over a **Last 30 minutes** time range.

### Settings overview

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

### Connection / transaction statistics

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

## Docker monitoring dashboard

This Grafana dashboard provides an overview of resource usage across Docker containers, powered by **cAdvisor** metrics scraped via Prometheus (`Job: cadvisor`, `Host: cadvisor`, `Port: 8080`), over a **Last 1 hour** time range.

### Key panels

- **Running Containers** — Total number of active containers.
- **Total Memory Usage** — Aggregate memory consumption across all containers.
- **Total CPU Usage** — Aggregate CPU utilization across all containers.
- **Container Status** — Quick-glance health indicators for each monitored container.
- **CPU Usage by Container** — Time-series comparison of per-container CPU load, with mean and last values listed.
- **Memory Usage by Container** — Time-series comparison of per-container memory consumption, with mean and last values listed.

### Purpose

This dashboard helps track the resource footprint of individual containers in a Dockerized environment, enabling quick detection of CPU or memory spikes and supporting capacity planning and troubleshooting.
