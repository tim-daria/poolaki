_This project has been created as part of the 42 curriculum by albetanc, cwick, dtimofee, nefimov, tsemenov._

# poolaki

> Multi-user expense tracker web app — 42 `ft_transcendence` team project.

## Index

1. [Description](#description)
2. [Instructions](#instructions)
3. [Resources](#resources)
4. [Team Information](#team-information)
5. [Project Management](#project-management)
6. [Technical Stack](#technical-stack)
7. [Database Schema](#database-schema)
8. [Features List](#features-list)
9. [Modules](#modules)
10. [Individual Contributions](#individual-contributions)
11. [Contributing](#contributing)

## Description
<sub>[↑ Index](#index)</sub>

**poolaki** is a multi-user web application for tracking personal and shared finances. The goal is to keep day-to-day money management and shared household or team budgets in one place, with a clear audit trail and workspace-level access control.

Each user gets a personal budget space on sign-up and can create shared workspaces (organizations), invite other users, and manage members with `owner` and `member` roles. All financial data is scoped to a workspace.

### Key features:

**Accounts.** Email/password registration and login, plus 42 OAuth (`intra42`). Sessions are handled by django-allauth; passwords are hashed and salted.

- **Transactions.** Income, expenses, goal contributions and withdrawals per workspace, with description, amount, date, category and tax flag. Server-side filtering, search, sorting and pagination.

- **Categories.** Workspace-scoped labels typed as income, expense or contribution.
- **Goals.** Savings targets with a target amount and date. Contributions and withdrawals are transactions linked to a goal; progress and status (`active`, `completed`, `archived`) are tracked per goal.
- **Reports.** Yearly report per workspace: income/expense totals, monthly distribution, per-category breakdown and goal balance. Charts and a print-ready layout.
- **Notifications.** In-app inbox for invitations, shared-workspace activity and goal milestones. The client polls; there are no websockets.
- **AI assistant.** Natural-language questions about expenses, income, balance, goals and platform features.
- **Concurrency.** Multiple users can work in the same workspace at once; integrity is enforced by PostgreSQL constraints and transactions.

This repository is the team monorepo: `frontend/` (React SPA), `backend/` (Django API, Caddy, monitoring, backups), `ai-service/` (FastAPI) and `vault/` (secrets) are deployed together with a single `make` command via Docker Compose. The complete feature breakdown with owners is in [Features List](#features-list).

## Instructions
<sub>[↑ Index](#index)</sub>

### Prerequisites

- Docker Engine with the Compose plugin (`docker compose`). The stack is tested with Docker 27.5.1.
- `make`, `git` and `jq` (`jq` is used by `make readVault`, `make wafLog` and `make auditLog`).
- Optional, for running tests on the host: Node.js 24 with `npm`, Python 3.12+ with `uv`.
- External accounts for the full feature set: a 42 OAuth application, an OpenAI-compatible LLM provider, and (for the public deployment) a Cloudflare account with a domain and tunnel.

### Environment setup

1. Clone the repository and enter it.

2. Create the local environment file.

   ```bash
   cp .env.example .env
   ```

3. Fill every key in `.env`. The file is read by Compose and by the Vault container, which seeds the secrets store on first start. Never commit it.

   | Group            | Keys                                                                                      | Used by                   |
   | ---------------- | ----------------------------------------------------------------------------------------- | ------------------------- |
   | PostgreSQL       | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_HOST`, `DB_PORT`, `DATABASE_URL` | database, Django, backups |
   | Django           | `DJANGO_SUPERUSER_*`, `INTRA42_CLIENT_ID`, `INTRA42_CLIENT_SECRET`                        | admin account, 42 OAuth   |
   | Grafana / alerts | `GF_ADMIN_*`, `SMTP_*`, `ALERT_RECIPIENT_EMAIL`                                           | `prod` profile            |
   | Cloudflare       | `TUNNEL_TOKEN`                                                                            | `cloudflared`             |
   | Vault            | `VAULT_ADDR`                                                                              | backend, Vault Agent      |
   | AI / LLM         | `LLM_MODEL`, `LLM_API_KEY`, `LLM_BASE_URL`, `DJANGO_BASE_URL`, `LOG_LEVEL`                | `ai-service`              |
   | Embeddings / RAG | `EMBEDDING_MODEL` (required), `EMBEDDING_BASE_URL`, `EMBEDDING_API_KEY` (optional)        | `ai-service`              |

   `EMBEDDING_MODEL` is required. `EMBEDDING_BASE_URL` and `EMBEDDING_API_KEY` are optional; when unset, the AI service uses the LLM provider. The same embedding model is used for document ingestion and query retrieval, so changing it requires re-ingesting the knowledge chunks. See [AI decisions](docs/ai/decisions.md) and [ai-service/README.md](ai-service/README.md).

   Vault seeds its store only on first initialisation. Changing a secret in `.env` after that does not update Vault; update the secret directly or recreate the Vault volume. See [Vault documentation](docs/backend/vault.md).

### Run the development stack

1. Start the stack.

   ```bash
   make
   ```

2. Wait until the containers report healthy.

   ```bash
   make status
   ```

3. Open the app at <http://poolaki.localhost:8080>. Vault initialises and unseals itself on first start; the backend waits for it.

4. Stop the stack.

   ```bash
   make down
   ```

`make` starts the dev stack: `caddy`, `backend`, `frontend`, `db`, `vault`, `vault_agent`, `ai-service` and `cloudflared`. Source directories are bind-mounted, so code changes do not require a rebuild. Use `make re` only after changing a Dockerfile or a dependency manifest.

### Run the production profile

```bash
make prod
```

This adds `prometheus`, `grafana`, `postgres_exporter`, `cadvisor` and `db_backup` to the dev stack. It requires the Grafana/SMTP keys and a valid Cloudflare tunnel. Monitoring and backup details are in [docs/backend/monitoring.md](docs/backend/monitoring.md) and [disaster recovery](backend/backups/disaster-recovery.md).

### URLs

| Service           | URL                                    | Profile                         |
| ----------------- | -------------------------------------- | ------------------------------- |
| App               | <http://poolaki.localhost:8080>        | dev                             |
| Django admin      | <http://poolaki.localhost:8080/admin/> | dev                             |
| Vault UI          | <http://localhost:8200/ui>             | dev                             |
| Grafana           | <http://grafana.localhost:8080>        | prod                            |
| Prometheus        | <http://prometheus.localhost:8080>     | prod                            |
| Public deployment | <https://poolaki.de>                   | prod, through Cloudflare Tunnel |

### Useful Make targets

```bash
make logs        # compose logs for the dev stack
make status      # running containers
make Tdjango     # shell in the backend container (also: Tnode, Tdb, Tvault, Tai, Tcaddy)
make readVault   # print Vault status and stored credentials (debugging only)
make wafLog      # last Coraza WAF audit entry
make rmVolumes   # stop everything and delete volumes (database, Vault state, Grafana data)
```

`make rmVolumes` is destructive. It removes the database and Vault state.

### Tests

```bash
# backend: clean PostgreSQL container, virtualenv, pytest
./ci-precheck.sh

# frontend unit tests
cd frontend && npm ci && npm run test

# frontend end-to-end tests (requires the running stack)
cd frontend && npm run test:e2e
```

See [docs/frontend/vitest.md](docs/frontend/vitest.md) and [docs/frontend/playwright.md](docs/frontend/playwright.md) for details.

## Resources
<sub>[↑ Index](#index)</sub>

### References

- Project subject: 42 `ft_transcendence`
- [Django documentation](https://docs.djangoproject.com/)
- [Django REST framework](https://www.django-rest-framework.org/)
- [django-allauth: Headless API](https://allauth.org/docs/draft-api/)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [pgvector](https://github.com/pgvector/pgvector)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [HashiCorp Vault documentation](https://developer.hashicorp.com/vault/docs)
- [Caddy documentation](https://caddyserver.com/docs/) and [Coraza WAF](https://coraza.io/)
- [Cloudflare Tunnel documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Prometheus documentation](https://prometheus.io/docs/) and [Grafana documentation](https://grafana.com/docs/)
- [React documentation](https://react.dev/), [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) and [MDN Web Docs](https://developer.mozilla.org/en-US/)
- [React Router](https://reactrouter.com/), [Vite](https://vite.dev/guide/) and [MUI](https://mui.com/)
- [Vitest](https://vitest.dev/) and [Playwright](https://playwright.dev/)
- [GitHub Actions: using secrets](https://docs.github.com/en/actions/concepts/security/secrets)
- [Laws of UX](https://lawsofux.com/)

### Project documentation

- Backend API and decisions: [backend/README.md](backend/README.md) and [docs/backend](docs/backend)
- Frontend architecture and components: [frontend/README.md](frontend/README.md) and [docs/frontend](docs/frontend)
- AI service: [ai-service/README.md](ai-service/README.md), [docs/ai](docs/ai) and the [API contract](docs/ai/api/api-contract.md)
- Product behaviour: [docs/product](docs/product)
- Input validation on both sides: [docs/modules/input-validation.md](docs/modules/input-validation.md)
- Development workflow: [CONTRIBUTING.md](CONTRIBUTING.md)

### AI usage

AI tools were used during development, not as a hidden runtime dependency. The main uses were:

- **Learning:** finding resources and understanding new concepts.
- **Planning and backlog:** structuring work, splitting features and prioritising tasks.
- **Design:** generating mockups.
- **Code review:** reviewing changes and spotting issues.
- **Code optimisation:** refactoring and simplifying existing code.
- **Migration:** moving pages to MUI correctly and consistently.
- **Testing:** drafting and extending unit and end-to-end tests.
- **Documentation:** drafting and editing project documentation.
- **Commits and pull requests:** writing and polishing commit messages and PR descriptions.

## Team Information
<sub>[↑ Index](#index)</sub>

The first line lists the 42 logins. The names below are those used in the repository.

| 42 login   | Member            | Role(s)                                | Responsibilities                                                                                                                               |
| ---------- | ----------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `albetanc` | Alicia Betancourt | Product Owner & AI Lead                | Product scope and documentation, AI service and RAG, notification system lead, privacy policy, frontend support                                |
| `cwick`    | Christian Wick    | Infrastructure & Security Lead         | Docker Compose, Vault, Caddy/Coraza WAF, Cloudflare Tunnel, monitoring, backups, CI infrastructure                                             |
| `dtimofee` | Daria Timofeeva   | Tech Lead, Backend Lead & Scrum Master | Django/DRF architecture, database schema, authentication and OAuth, organizations, transactions, reports, notification backend, AI integration |
| `nefimov`  | Nikolai Efimov    | Backend Developer                      | Goals and goal transfers, transaction restrictions, balance calculations, goal report data, backend tests and documentation                    |
| `tsemenov` | Tanya Semenova      | Frontend Lead & QA                     | UX/UI and design system, React application, responsive and accessible layouts, frontend tests, frontend CI and documentation                   |

Full role descriptions, feature ownership and review responsibilities are in [team organization → Roles and responsibilities](docs/team-organization.md#2-roles-and-responsibilities).

## Project Management
<sub>[↑ Index](#index)</sub>

**Organisation.** Agile/Scrum in two-week sprints; June preparation, development from 1 July to 23 October; the PO reviewed the backlog before each sprint and area leads coordinated delivery.

**Tools and communication.** GitHub Issues, pull requests, CI and the project board; Miro for reviews and retrospectives; Slack and Huddles for daily coordination; Insomnia for API checks; Notion as the knowledge base.

**Review gate.** `main` is protected, CI must pass and two developers must approve each pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).

Detailed sprint plan, meeting cadence and tool responsibilities: [team organization → Project management](docs/team-organization.md#5-project-management) and [development process](docs/development-process.md).

## Technical Stack
<sub>[↑ Index](#index)</sub>

### Frontend

| Technology                                           | Role                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| React 19 + TypeScript 6                              | UI, compiled with the React Compiler (Babel plugin)                           |
| Vite 8                                               | Dev server and production bundler                                             |
| React Router 7                                       | Client-side routing, lazy route chunks                                        |
| MUI 9 (Material, X Charts, X Date Pickers) + Emotion | Component library; all styling flows from one `createTheme` in `src/theme.ts` |
| dayjs                                                | Date handling                                                                 |
| react-markdown + remark-gfm                          | Rendering AI chat replies                                                     |
| Vitest, Playwright, ESLint, Prettier                 | Unit tests, end-to-end tests, lint, format                                    |

See [frontend/README.md](frontend/README.md) for the app map and [docs/frontend](docs/frontend) for the design system, routing, money handling and browser support.

### Backend

| Technology                                     | Role                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Django 6 + Django REST Framework               | Business logic, users, organizations, transactions, goals, reports; versioned JSON API under `/api/v1/` |
| django-allauth (headless)                      | Email/password sessions and 42 OAuth (`intra42`) through the `/_allauth/` API                           |
| psycopg 3                                      | PostgreSQL driver                                                                                       |
| django-prometheus                              | Request and DB metrics for Prometheus                                                                   |
| pytest, pytest-django, ruff, mypy (strict), uv | Tests, lint, typing, dependency management                                                              |

The API is documented in [backend/README.md](backend/README.md) and [docs/backend](docs/backend). The AI service calls internal endpoints under `/api/internal/v1/`; those endpoints are not exposed through Caddy and validate the user and organization before returning data.

### AI service

| Technology         | Role                                                                             |
| ------------------ | -------------------------------------------------------------------------------- |
| FastAPI + Uvicorn  | Independent microservice for conversations over financial data                   |
| httpx              | Calls to an OpenAI-compatible `/chat/completions` endpoint and to the Django API |
| asyncpg + pgvector | Stores document chunks and embeddings for retrieval (RAG)                        |
| pydantic-settings  | Configuration                                                                    |

The service implements the full RAG flow: intent classification, hybrid retrieval (authorized Django data plus pgvector semantic context), context building, prompt building and LLM generation. The LLM client retries transient errors and falls back to a secondary model; every request logs intent, retrieval, LLM and token/latency data. The AI service never reads application financial tables directly. See [ai-service/README.md](ai-service/README.md), [docs/ai/architecture.md](docs/ai/architecture.md), [docs/ai/rag-design.md](docs/ai/rag-design.md), [docs/ai/prompt-management.md](docs/ai/prompt-management.md) and [docs/ai/decisions.md](docs/ai/decisions.md).

### Database

PostgreSQL 18 (`pgvector/pgvector:pg18` image). Chosen because:

- Relational, transactional storage fits money: foreign keys, constraints and ACID writes prevent inconsistent balances under concurrent users.
- First-class Django ORM support, including migrations.
- The `vector` extension lets the AI service store and search embeddings in the same database instead of adding a separate vector store.
- Dynamic, short-lived credentials are issued per service by Vault's database secrets engine.

### Infrastructure

| Technology                                       | Role                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Docker Compose                                   | Single-command deployment of all services; `prod` profile adds monitoring and backups                                      |
| Caddy + Coraza WAF (OWASP Core Rule Set)         | Reverse proxy on port 8080, routes `/api`, `/_allauth`, `/admin` to Django and everything else to the frontend             |
| HashiCorp Vault + Vault Agent                    | Secrets storage; AppRole-scoped read access; dynamic PostgreSQL credentials with TTL                                       |
| Cloudflare Tunnel (`cloudflared`)                | Publishes the app at `poolaki.de` without opening inbound ports                                                            |
| Prometheus, Grafana, postgres_exporter, cAdvisor | Metrics, dashboards, email alerts                                                                                          |
| `db_backup` container                            | Daily `pg_dump` to `backend/backups`                                                                                       |
| GitHub Actions                                   | CI per changed area: backend ruff/mypy/pytest, frontend format/lint/vitest/build, Playwright e2e against the compose stack |

### Justification of major choices

- **Django for the core.** Mature auth, ORM, migrations and admin reduce the amount of security-sensitive code written by hand. Django is the single owner of users and financial data.
- **Separate FastAPI service for AI.** AI workloads scale and change independently of business rules; the LLM provider can be swapped without touching the backend. The service never reads user data from the database directly, only through the Django API, so tenant isolation is enforced in one place (see [docs/ai/decisions.md](docs/ai/decisions.md)).
- **React + MUI.** Typed components and a central theme keep the UI consistent; no hardcoded colours or spacing outside the theme (see [docs/frontend/mui-and-styles.md](docs/frontend/mui-and-styles.md)).
- **Vite over a heavier framework.** The app is a client-side SPA behind an API; it needs a fast dev server and route-level code splitting, not SSR.
- **Vault instead of plain `.env`.** Secrets are encrypted at rest, each service reads only its own paths, and leaked database credentials expire on their own (see [docs/backend/vault.md](docs/backend/vault.md)).
- **Caddy with Coraza.** One container gives routing, per-host logging and a WAF in front of both the API and the SPA.
- **Cloudflare Tunnel.** TLS and public exposure are handled by Cloudflare; the host needs no open inbound ports.

## Database Schema
<sub>[↑ Index](#index)</sub>

![Database schema](./docs/database/database_schema.png)

The schema is relational PostgreSQL, managed by Django migrations. Every model
uses a `BigAutoField` primary key (`id`). `ForeignKey` columns are stored as
`BIGINT` values referencing the related `id`.

Detailed description of tables and their relationships, key fields and data types are in [database.md](docs/database/database.md).

## Features List
<sub>[↑ Index](#index)</sub>

| Feature                      | What it does                                                                                                                                   | Owner(s)                            | Documentation                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Accounts and sessions        | Email/password sign-up and login, 42 OAuth, session/CSRF handling, password change                                                             | dtimofee, tsemenov                  | [authentication](docs/backend/authentication.md), [password change](docs/frontend/password-change.md) |
| Workspaces and membership    | Personal budget on sign-up; shared organizations; `owner`/`member` roles; invitations; remove/leave; ownership transfer; rename                | dtimofee, tsemenov                  | [organizations](docs/backend/organizations.md)                                                        |
| Transactions                 | Income, expense, contribution and withdrawal records; create/edit/delete; category, goal, member and date filters; search, sort and pagination | dtimofee, nefimov, tsemenov         | [transactions](docs/backend/transactions.md)                                                          |
| Categories                   | Workspace-scoped income/expense/contribution labels, seeded defaults and filtering                                                             | dtimofee, nefimov                   | [categories](docs/backend/categories.md)                                                              |
| Goals and savings            | Target amount/date, contributions and withdrawals, progress, completion and archiving; goal transfers excluded from income/expense totals      | nefimov, tsemenov                   | [goals](docs/backend/goals.md), [savings](docs/product/savings.md)                                    |
| Reports and analytics        | One yearly aggregation endpoint; totals, monthly series, category and goal breakdowns; charts; print/PDF layout                                | dtimofee, tsemenov                  | [reports](docs/backend/reports.md), [module](docs/modules/reports-and-analytics.md)                   |
| Notifications                | Inbox, unread count, mark/clear, invitation/transaction/goal/ownership events; polling client                                                  | albetanc (lead), dtimofee, tsemenov | [notifications](docs/backend/notifications.md)                                                        |
| AI assistant                 | Intent classification, hybrid retrieval, context/prompt building, LLM answer, retries/fallback and token/latency logs                          | albetanc, dtimofee, tsemenov        | [AI docs](docs/ai/architecture.md), [supported questions](docs/ai/supported-questions.md)             |
| Authentication and access control | Email/password hashing, 42 OAuth, session/CSRF, owner/member roles and workspace-scoped authorization | dtimofee, tsemenov | [authentication](docs/backend/authentication.md), [organizations](docs/backend/organizations.md) |
| Web application firewall | Coraza/OWASP Core Rule Set in Caddy, request filtering, WAF audit logs and blocked-request header | cwick | [infrastructure](docs/backend/infrastructure.md), [Caddyfile](backend/caddy/Caddyfile) |
| Secrets and credential management | Vault AppRole, templated secrets, dynamic PostgreSQL credentials with TTL; no secrets committed | cwick | [vault](docs/backend/vault.md) |
| Secure public edge | Cloudflare Tunnel, TLS at the edge, outbound-only connector and no inbound ports | cwick | [infrastructure](docs/backend/infrastructure.md) |
| Monitoring and recovery      | Prometheus metrics, Grafana dashboards and alerts, cAdvisor, postgres_exporter, daily backups and restore procedure                            | cwick                               | [monitoring](docs/backend/monitoring.md), [disaster recovery](backend/backups/disaster-recovery.md)   |
| Responsive and accessible UI | Desktop and mobile layouts, bottom navigation/sheets, one MUI theme, accessible cards and charts                                               | tsemenov                            | [design system](docs/modules/design-system.md), [browser support](docs/frontend/browser-support.md)  |
| Legal pages                  | Terms of Service and Privacy Policy                                                                                                            | albetanc, tsemenov                  | [Privacy Policy](docs/product/privacy_policy.md), [Terms](frontend/src/pages/LegalPages/Terms.tsx)    |

## Modules
<sub>[↑ Index](#index)</sub>

### Modules of Choice

The team claims the following 42 modules. Major modules are worth 2 points and minor modules 1 point.

| Points | Module                              | Type  | Owner(s)           | How it is implemented                                                                                              | Documentation                                                                                      |
| ------ | ----------------------------------- | ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 1p     | Backend framework                   | Minor | dtimofee, nefimov  | Django 6 + Django REST Framework; versioned `/api/v1/` API; service layer separated from views                     | [backend/README.md](backend/README.md)                                                             |
| 1p     | Frontend framework                  | Minor | tsemenov           | React 19 + TypeScript 6 + Vite 8; React Router; MUI theme                                                          | [frontend/README.md](frontend/README.md)                                                           |
| 1p     | ORM                                 | Minor | dtimofee           | Django ORM models and migrations; query aggregation for reports; PostgreSQL constraints                            | [models.py](backend/django/core/models.py)                                                         |
| 1p     | OAuth 2.0                           | Minor | dtimofee, tsemenov | 42 OAuth through django-allauth headless; callback flow in the SPA                                                 | [authentication](docs/backend/authentication.md)                                                   |
| 1p     | Search, filter and pagination       | Minor | dtimofee           | Server-side transaction search, multi-filter query parameters, sorting and page/page_size                          | [transactions](docs/backend/transactions.md)                                                       |
| 1p     | Notification system                 | Minor | albetanc           | Notification inbox, unread count, clear-all and event fan-out; client polling                                      | [notifications](docs/backend/notifications.md)                                                     |
| 1p     | Support for additional browsers     | Minor | tsemenov           | Same e2e specs on Chromium and Firefox; Safari by hand via the tunnel; sheets, pickers and print checked by hand   | [browser support](docs/frontend/browser-support.md), [checklist](docs/frontend/manual-checks.md)   |
| 1p     | Custom-made design system           | Minor | tsemenov           | Colour, type and spacing tokens in one MUI theme; card, money, segmented, sheet and form components on every page  | [design system](docs/modules/design-system.md), [MUI and styles](docs/frontend/mui-and-styles.md)  |
| 1p     | Health checks, backups and recovery | Minor | cwick              | Per-container healthchecks, `/health/` endpoints, daily `pg_dump` sidecar and tested restore procedure             | [infrastructure](docs/backend/infrastructure.md), [recovery](backend/backups/disaster-recovery.md) |
| 2p     | Organization system                 | Major | dtimofee, tsemenov | Personal and shared workspaces, memberships, invitations, roles, leave/remove and ownership transfer               | [organizations](docs/backend/organizations.md)                                                     |
| 2p     | RAG system                          | Major | albetanc           | Intent classification, hybrid retrieval from Django and pgvector, context/prompt building and grounded LLM answers | [RAG design](docs/ai/rag-design.md)                                                                |
| 2p     | AI microservice                     | Major | albetanc, dtimofee | Independent FastAPI service with its own API contract, RAG pipeline, LLM resilience and observability              | [module](docs/modules/microservice-ai.md), [architecture](docs/ai/architecture.md), [AI README](ai-service/README.md) |
| 2p     | Monitoring system                   | Major | cwick              | Prometheus, Grafana dashboards and alerts, postgres_exporter and cAdvisor                                          | [monitoring](docs/backend/monitoring.md)                                                           |
| 2p     | WAF and secrets management          | Major | cwick              | Coraza/OWASP CRS in Caddy; Vault AppRole, secret templates and dynamic PostgreSQL credentials                      | [vault](docs/backend/vault.md), [infrastructure](docs/backend/infrastructure.md)                   |
| 1p     | Custom: Reports and analytics       | Minor | dtimofee, tsemenov | Yearly report endpoint, database aggregation, custom charts, print layout and accessibility                        | [module report](docs/modules/reports-and-analytics.md)                                             |
| 1p     | Custom: Cloudflare Tunnel           | Minor | cwick    | Outbound-only `cloudflared` container, Vault-rendered token, no inbound ports, tunnel health and metrics           | [infrastructure](docs/backend/infrastructure.md)                                                   |

**Why these modules.** The standard modules cover the stack and the production concerns the subject requires: framework, ORM, OAuth, search/filter/pagination, notifications, health checks, organizations, AI microservice, RAG, monitoring and WAF/secrets. Each is exercised end to end, not a stub.

- **AI microservice (core module, not custom).** AI workflows change independently of financial business rules, and the LLM provider must be replaceable. A separate service with an explicit API contract keeps Django as the only owner of financial data and makes the trust boundary testable. See [the module note](docs/modules/microservice-ai.md) and [AI decisions](docs/ai/decisions.md).
- **Reports and analytics (custom).** Users need to see where their money went, not only record transactions. The module is deliberately scoped as a minor: one aggregation endpoint, one page and a print layout, with no arbitrary date ranges or pushed updates. The full justification is in [the module report](docs/modules/reports-and-analytics.md).
- **Cloudflare Tunnel (custom).** The public deployment must not open inbound ports. `cloudflared` dials out, Vault renders the token, and Cloudflare terminates TLS at the edge. See [infrastructure](docs/backend/infrastructure.md).

**Total: 21 points** — 5 Major modules × 2 points + 11 Minor modules × 1 point.

## Individual Contributions
<sub>[↑ Index](#index)</sub>

### Summary

Detailed responsibilities, feature ownership and challenges are in [team organization → Individual contributions](docs/team-organization.md#7-individual-contributions).

| Member                         | Main contribution areas                                                                | Details                                                         |
| ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `albetanc` (Alicia Betancourt) | AI service and RAG, notification system, product documentation, frontend support       | [details](docs/team-organization.md#albetanc-alicia-betancourt) |
| `cwick` (Christian Wick)       | Docker, Vault, WAF, Cloudflare Tunnel, monitoring, backups                             | [details](docs/team-organization.md#cwick)                      |
| `dtimofee` (Daria Timofeeva)   | Django/DRF backend, database, auth/OAuth, organizations, reports, notification backend | [details](docs/team-organization.md#dtimofee-daria-timofeeva)   |
| `nefimov` (Nikolai Efimov)     | Goals, transactions, balances, goal reports                                            | [details](docs/team-organization.md#nefimov-nikolai-efimov)     |
| `tsemenov` (Tanya Semenova)    | Frontend, UX/UI, design system, tests, CI                                              | [details](docs/team-organization.md#tsemenov-tanya-semenova)    |

## Contributing
<sub>[↑ Index](#index)</sub>

`main` is protected: no direct pushes, CI must pass, and two developers must approve a pull request before merge. Branch naming and the review workflow are in [CONTRIBUTING.md](CONTRIBUTING.md).
