# API versioning

This document describes how the backend API is versioned and how to introduce
future versions without breaking existing clients.

## Method: URI versioning

The version is part of the URL path:

```text
/api/v1/organizations/
```

## Current versions

| Version | Path              | Status     | Notes                                                                 |
| ------- | ----------------- | ---------- | ---------------------------------------------------------------------- |
| v1      | `/api/v1/...`     | Current    | The version all new clients (including the frontend) must use          |


## Non-versioned routes

Not everything belongs in the versioned namespace. These routes stay where
they are and are intentionally not versioned:

- `/_allauth/...` — authentication endpoints come from django-allauth (its
  headless API is already versioned inside its own path: `browser/v1`)
- `/accounts/intra42/callback/` — the 42 OAuth callback is fixed by the 42
  Developer Portal configuration
- `/health/` — backend health check used by Docker healthchecks and CI
- `/metrics` — Prometheus metrics
- `/admin/` — Django admin

## Compatibility rules for a version

A new endpoint added to the **current** version (v1 today) must not break
existing clients. In practice:

- **Safe to add inside v1** — new endpoints (e.g. the finance endpoints from
  [proposed-api.md](./proposed-api.md)), new optional request fields, and new
  fields in responses
- **Never do inside v1** — removing or renaming an endpoint, changing a
  response shape in a way clients parse, tightening validation of existing
  required fields, changing status codes for existing outcomes

Any change that would break existing v1 clients goes into the next version
(v2) instead, and v1 keeps behaving the same until v2 is stable.

## How to introduce the next breaking change

1. **Mount the new version next to the old one** in `django_project/urls.py`:

   ```python
   path("api/v2/", include("core.urls")),  # or a dedicated urls module if views differ
   path("api/v1/", include("core.urls")),
   ```

   If the breaking change only affects a few views, create e.g.
   `core/v2/urls.py` with the changed paths and include it for `v2`, leaving
   `v1` untouched. Duplicating the whole API only makes sense when most
   views change.

2. **Update the docs** — add the v2 paths to the API reference documents and
   mark the v1 ones as deprecated below.

3. **Announce to clients** — the frontend and the AI
   service contract (when it calls us) are updated to the new path. The
   frontend currently talks to `/api/v1/` only, so a client migration is the
   frontend PR plus any third-party consumers.

4. **Deprecate the old version** — keep serving it (the alias costs one
   include line) and watch the access logs.

5. **Remove the old version** — once its traffic reaches zero, delete the
   include line and the version-specific code, then drop a note in
   `CHANGELOG.md`.

## Version lifecycle at a glance

```text
new version introduced  ──►  clients migrate  ──►  old version removed
      (mounted)                (alias kept)          (include line deleted)
```

A version is never changed after clients depend on it; it is only kept as-is
or removed.

