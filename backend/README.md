# Backend API

The backend is built with Django and Django REST Framework. It provides
authentication (django-allauth Headless + 42 OAuth), organization management,
invitations, health checks, and monitoring.

## Base URL

The API is mounted under:

```text
/api/
```

The app also exposes the following project-level routes:

- `/_allauth/...` — headless authentication endpoints from django-allauth
- `/health/` — backend health check
- `/metrics` — Prometheus metrics

## API reference

| Area | Endpoints | Documentation |
| --- | --- | --- |
| Authentication | signup / login / logout / session / CSRF / 42 OAuth | [docs/backend/authentication.md](../docs/backend/authentication.md) |
| Organizations | list / create / personal initial balance | [docs/backend/organizations.md](../docs/backend/organizations.md) |
| Invitations | list / invite / cancel (owner-only) | [docs/backend/organizations.md](../docs/backend/organizations.md) |
| Health | `GET /health/` returns `{"status": "ok"}` (used by Docker healthchecks and CI) | — |
| Metrics | `GET /metrics` for Prometheus | [docs/backend/monitoring.md](../docs/backend/monitoring.md) |

Proposed (not yet implemented) endpoints for transactions, categories, goals,
notifications, and recurring transactions are documented as a suggested
contract in [docs/backend/proposed-api.md](../docs/backend/proposed-api.md).

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

## Notes

### Current implementation status

The following organization-switching endpoint is currently kept as a bridge and could be removed once the frontend fully switches to the new implementation:

```http
POST /api/organizations/{org_id}/select/
```


### Main modules

- `core/views.py` — API view logic
- `core/models.py` — database models for users, organizations, memberships, invitations, transactions, goals, and notifications
- `core/serializers.py` — input validation for request payloads
- `core/urls.py` — API routing

## Monitoring

Prometheus and Grafana dashboards (Caddy traffic, PostgreSQL, Docker
containers) are available locally; see
[docs/backend/monitoring.md](../docs/backend/monitoring.md) for details.
