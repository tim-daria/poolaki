_This project has been created as part of the 42 curriculum by albetanc, cwick, dtimofee, nefimov, tsemenov._

# poolaki

> Multi-user expense tracker web app — 42 `ft_transcendence` team project.

## Description

**poolaki** is a multi-user web application for tracking personal and shared finances.

Each user gets a personal budget on sign-up and can create shared workspaces
(organizations), invite other users, and manage members with `owner` and `member`
roles. All data is scoped to a workspace.

Features:
- **Accounts.** Email/password registration and login, plus 42 OAuth (`intra42`). Sessions are handled by django-allauth; passwords are hashed and salted.
- **Transactions.** Income, expenses, and goal contributions per workspace, with description, amount, date, and category. Filtering by period and category.
- **Categories.** Workspace-scoped labels typed as income, expense, or contribution.
- **Goals.** Savings targets with a target amount and date. Contributions are transactions linked to a goal; progress and status (`active`, `completed`, `archived`) are tracked per goal.
- **Reports.** Yearly report per workspace: income/expense totals, monthly distribution, per-category breakdown, and current balance.
- **Notifications.** In-app inbox for invitations, transactions added in shared workspaces, and goal milestones. The client polls; no websockets.
- **AI assistant.** Natural-language questions about expenses, income, balance, goals, trends, and shared workspaces, answered by a separate FastAPI service that reads data only through the Django API.
- **Concurrency.** Multiple users can work in the same workspace at once; integrity is enforced by PostgreSQL constraints and transactions.

This repository is the team monorepo: `frontend/` (React SPA), `backend/` (Django API,
Caddy, monitoring, backups), `ai-service/` (FastAPI), and `vault/` (secrets) are
deployed together with a single `make` command via Docker Compose.

## Instructions (❗ ADD PROD )

### Prerequisites

- Docker Engine with the Compose plugin (`docker compose`)
- `make`
- `jq` (used by `make readVault`, `make wafLog`, `make auditLog`)
- Optional, for running tests on the host: Node.js 24 and `npm`, Python 3.12+ and `uv`

### Setup

```bash
git clone git@github.com:tim-daria/poolaki.git
cd poolaki
cp .env.example .env
```

Fill in every variable in `.env`. The file is read by Compose and by the Vault
container, which seeds the secrets store from it on first start. Never commit it.

### Run

```bash
make            # dev stack: caddy, backend, frontend, db, vault, vault_agent, ai-service, cloudflared
make prod       # dev stack + prometheus, grafana, postgres_exporter, cadvisor, db_backup
make re         # rebuild images, then start (use after changing a Dockerfile or dependencies)
make down       # stop and remove all containers (both profiles)
make rmVolumes  # same as down, plus delete volumes (database, Vault state, Grafana data)
```

Vault initialises and unseals itself on first start; the backend waits for it.

### URLs

| Service       | URL                                      | Profile |
| ------------- | ---------------------------------------- | ------- |
| Public app    | <https://poolaki.de>                     | prod    |
| Local app     | <http://poolaki.localhost:8080>          | dev     |
| Django admin  | <http://poolaki.localhost:8080/admin/>   | dev     |
| Vault UI      | <http://localhost:8200/ui>               | dev     |
| Grafana       | <http://grafana.localhost:8080>          | prod    |
| Prometheus    | <http://prometheus.localhost:8080>       | prod    |

Use the public HTTPS address for browser-to-backend traffic in production. The
HTTP addresses are local development endpoints only.

### Useful targets

```bash
make logs        # compose logs for the dev stack
make status      # running containers
make Tdjango     # shell in the backend container (also: Tnode, Tdb, Tvault, Tai, Tcaddy)
make readVault   # print Vault status and stored credentials (debugging only)
make wafLog      # last Coraza WAF audit entry
```

### Tests

```bash
# backend (clean PostgreSQL container, venv, pytest)
./ci-precheck.sh

# frontend unit tests
cd frontend && npm ci && npm run test

# frontend end-to-end tests (requires the running stack)
cd frontend && npm run test:e2e
```

See [docs/frontend/vitest.md](docs/frontend/vitest.md) and
[docs/frontend/playwright.md](docs/frontend/playwright.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Project Documentation

- Backend API documentation: [Backend Readme](docs/backend/README.md) and [other backend documents](docs/backend)
- AI Service documentation: [AI Readme](docs/ai-service/README.md) and [other AI documents](docs/ai)
- Frontend documentation: [Frontend Readme](docs/frontend/README.md), and other [frontend documents](docs/frontend)
- Input validation, both sides: [docs/validation.md](docs/validation.md)

## Additional Sections [... NEEDS TO BE FILLED ...]

<details>
<summary><strong>❗Team Information</strong></summary>

- **`albetanc` — Project Manager (PM) and Developer.** Coordinated planning,
  task distribution, progress tracking, and team communication. Also
  contributed to the AI service, including its architecture, retrieval
  pipeline, integrations, and related documentation.

- **`cwick` — Technical Lead and Developer.** Led infrastructure and
  architecture decisions, including Docker-based deployment, service routing,
  Vault secrets management, Cloudflare Tunnel access, the WAF, monitoring,
  backups, and operational documentation.

- **`dtimofee` — Product Owner (PO) and Backend Developer.** Defined and
  prioritised product requirements, validated completed features, and
  communicated the project direction. Implemented and documented backend
  functionality including authentication, workspaces, permissions,
  invitations, notifications, reports, and API integration.

- **`nefimov` — Backend Developer.** Implemented the financial domain model and
  API behaviour for transactions, categories, savings goals, reports, and
  related business rules. Worked on database integrity, concurrency-safe
  operations, validation, and backend documentation.

- **`tsemenov` — Frontend Developer.** Owned the React application experience:
  product flows, UI design system, responsive layouts, routing, workspace and
  transaction interfaces, frontend tests, CI, and frontend documentation.

</details>

<details>
<summary><strong>❗Project Management</strong></summary>

- **Organisation.** The team met once a week to review progress, decide what to build next and split the work. Tasks were assigned at these meetings and tracked until done.

- **Tools.** Work items were tracked as GitHub Issues, one issue per task or bug, closed by the pull request that resolved it. A GitHub Projects board gave an overview of the issues by status (to do, in progress, done) and by assignee, and was reviewed at each weekly meeting. Miro boards were used for planning: sketching screens, mapping data flows and laying out the module roadmap before anything was coded.

- **Communication.** Day-to-day communication happened in a shared Slack workspace. Slack carried quick questions, pull request links and decisions made between meetings, so that nothing depended on everyone being in the same room.

</details>

<details>
<summary><strong>❗Technical Stack</strong></summary>

**Frontend**

| Technology | Role |
| --- | --- |
| React 19 + TypeScript 6 | UI, compiled with the React Compiler (Babel plugin) |
| Vite 8 | Dev server and production bundler |
| React Router 7 | Client-side routing, lazy route chunks |
| MUI 9 (Material, X Charts, X Date Pickers) + Emotion | Component library; all styling flows from one `createTheme` in `src/theme.ts` |
| dayjs | Date handling |
| react-markdown + remark-gfm | Rendering AI chat replies |
| Vitest, Playwright, ESLint, Prettier | Unit tests, end-to-end tests, lint, format |

**Backend**

| Technology | Role |
| --- | --- |
| Django 6 + Django REST Framework | Business logic, users, organizations, transactions, goals, reports; versioned JSON API under `/api/v1/` |
| django-allauth (headless) | Email/password sessions and 42 OAuth (`intra42`) through the `/_allauth/` API |
| psycopg 3 | PostgreSQL driver |
| django-prometheus | Request and DB metrics for Prometheus |
| pytest, pytest-django, ruff, mypy (strict), uv | Tests, lint, typing, dependency management |

**AI service**

| Technology | Role |
| --- | --- |
| FastAPI + Uvicorn | Separate microservice for conversations over financial data |
| httpx | Calls to an OpenAI-compatible `/chat/completions` endpoint and to the Django API |
| asyncpg + pgvector | Stores document chunks and embeddings for retrieval (RAG) |
| pydantic-settings | Configuration |

**Database**

PostgreSQL 18 (`pgvector/pgvector:pg18` image). Chosen because:
- Relational, transactional storage fits money: foreign keys, constraints, and ACID writes prevent inconsistent balances under concurrent users.
- First-class Django ORM support, including migrations.
- The `vector` extension lets the AI service store and search embeddings in the same database instead of adding a separate vector store.
- Dynamic, short-lived credentials are issued per service by Vault's database secrets engine.

**Infrastructure**

| Technology | Role |
| --- | --- |
| Docker Compose | Single-command deployment of all services; `prod` profile adds monitoring and backups |
| Caddy + Coraza WAF (OWASP Core Rule Set) | Reverse proxy on port 8080, routes `/api`, `/_allauth`, `/admin` to Django and everything else to the frontend |
| HashiCorp Vault + Vault Agent | Secrets storage; AppRole-scoped read access; dynamic PostgreSQL credentials with TTL |
| Cloudflare Tunnel (`cloudflared`) | Publishes the app at `poolaki.de` without opening inbound ports |
| Prometheus, Grafana, postgres_exporter, cAdvisor | Metrics, dashboards, email alerts |
| `db_backup` container | Daily `pg_dump` to `backend/backups` |
| GitHub Actions | CI per changed area: backend ruff/mypy/pytest, frontend format/lint/vitest/build, Playwright e2e against the compose stack |

**Justification of major choices**

- **Django for the core.** Mature auth, ORM, migrations, and admin reduce the amount of security-sensitive code written by hand. Django is the single owner of users and financial data.
- **PostgreSQL for persistence.** Its transactional guarantees, constraints, and foreign keys protect financial data under concurrent updates, while `pgvector` supports embedding storage and similarity search without introducing a separate vector database.
- **Separate FastAPI service for AI.** AI workloads scale and change independently of business rules; the LLM provider can be swapped without touching the backend. The service never reads user data from the database directly, only through the Django API, so tenant isolation is enforced in one place (see [docs/ai/decisions.md](docs/ai/decisions.md)).
- **React + MUI.** Typed components and a central theme keep the UI consistent; no hardcoded colours or spacing outside the theme (see [docs/frontend/mui-and-styles.md](docs/frontend/mui-and-styles.md)).
- **Vite over a heavier framework.** The app is a client-side SPA behind an API; it needs a fast dev server and route-level code splitting, not SSR.
- **Vault instead of plain `.env`.** Secrets are encrypted at rest, each service reads only its own paths, and leaked database credentials expire on their own (see [docs/backend/vault.md](docs/backend/vault.md)).
- **Caddy with Coraza.** One container gives routing, per-host logging, and a WAF in front of both the API and the SPA.
- **Cloudflare Tunnel.** TLS and public exposure handled by Cloudflare; the host needs no open inbound ports.

</details>

<details>
<summary><strong>❗Database Schema</strong></summary>

![Database schema](./docs/database/database_schema.png)

The schema is relational PostgreSQL, managed by Django migrations. Every model
uses a `BigAutoField` primary key (`id`). `ForeignKey` columns are stored as
`BIGINT` values referencing the related `id`.

### Tables and relationships

- **`core_user`** — application users. Django's `AbstractUser` fields include
  username, password, name, email, staff/active flags, and timestamps; the
  project adds MFA fields. A user can belong to many organizations through
  memberships, create goals and transactions, receive invitations and
  notifications, and invite other users.
- **`core_organization`** — personal or shared workspaces. Organizations have
  many memberships, invitations, categories, goals, transactions, and
  notifications.
- **`core_membership`** — the many-to-many join table between users and
  organizations, with a `role` (`owner` or `member`). An `(org, user)` pair is
  unique.
- **`core_invitation`** — an invitation to join an organization. It references
  the organization, the invited user, and optionally the inviting user. At
  most one pending invitation exists for a given `(org, invited_user)` pair.
- **`core_category`** — organization-scoped transaction categories. A category
  is typed as `income`, `expense`, or `contribution`; `(org, name, type)` is
  unique.
- **`core_goal`** — organization-scoped savings goals, optionally created by a
  user. Transactions may reference a goal to record contributions or
  withdrawals.
- **`core_transaction`** — organization-scoped financial entries. Each entry
  may reference a goal and category and optionally the creating user. The
  organization, goal, category, and user relationships are independent, so
  deleting an organization cascades while deleting a goal, category, or user
  preserves the transaction by setting that reference to `NULL`.
- **`core_notification`** — user inbox entries, optionally associated with an
  organization. Notifications contain a typed event and JSON payload; deleting
  the user cascades, while deleting the organization sets its reference to
  `NULL`.

### Key fields and data types

| Table | Key fields |
| --- | --- |
| `core_user` | `id BIGINT`; `email VARCHAR(254) UNIQUE NOT NULL`; `mfa_secret VARCHAR(32) NOT NULL DEFAULT ''`; `is_mfa_active BOOLEAN NOT NULL DEFAULT FALSE`; inherited Django authentication fields |
| `core_organization` | `id BIGINT`; `name VARCHAR(100) NOT NULL`; `initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0`; `is_personal BOOLEAN NOT NULL DEFAULT FALSE`; `created_at TIMESTAMPTZ NOT NULL` |
| `core_membership` | `id BIGINT`; `org_id BIGINT NOT NULL`; `user_id BIGINT NOT NULL`; `role VARCHAR(20) NOT NULL DEFAULT 'member'`; `joined_at TIMESTAMPTZ NOT NULL`; unique `(org_id, user_id)` |
| `core_invitation` | `id BIGINT`; `org_id BIGINT NOT NULL`; `invited_user_id BIGINT NOT NULL`; `invited_by_id BIGINT NULL`; `status VARCHAR(20) NOT NULL DEFAULT 'pending'`; `created_at TIMESTAMPTZ NOT NULL`; `responded_at TIMESTAMPTZ NULL`; unique pending `(org_id, invited_user_id)` |
| `core_category` | `id BIGINT`; `org_id BIGINT NOT NULL`; `name VARCHAR(50) NOT NULL`; `type VARCHAR(20) NOT NULL`; unique `(org_id, name, type)` |
| `core_goal` | `id BIGINT`; `org_id BIGINT NOT NULL`; `name VARCHAR(100) NOT NULL`; `target_amount NUMERIC(14,2) NOT NULL`; `target_date DATE NULL`; `status VARCHAR(20) NOT NULL DEFAULT 'active'`; `created_by_id BIGINT NULL`; `created_at TIMESTAMPTZ NOT NULL`; `completed_at DATE NULL` |
| `core_transaction` | `id BIGINT`; `org_id BIGINT NOT NULL`; `goal_id BIGINT NULL`; `category_id BIGINT NULL`; `entry_type VARCHAR(20) NOT NULL`; `amount NUMERIC(14,2) NOT NULL`; `description VARCHAR(1024) NULL`; `transaction_date DATE NOT NULL`; `is_tax_deductible BOOLEAN NOT NULL DEFAULT FALSE`; `created_by_id BIGINT NULL`; `created_at TIMESTAMPTZ NOT NULL` |
| `core_notification` | `id BIGINT`; `user_id BIGINT NOT NULL`; `type VARCHAR(30) NOT NULL`; `org_id BIGINT NULL`; `payload JSONB NOT NULL DEFAULT '{}'`; `is_read BOOLEAN NOT NULL DEFAULT FALSE`; `created_at TIMESTAMPTZ NOT NULL` |

Status/type choices are stored as strings: invitation status is `pending`,
`accepted`, `declined`, or `cancelled`; goal status is `active`, `completed`,
or `archived`; and transaction entry type is `income`, `expense`,
`contribution`, or `withdraw`. The schema indexes transactions by
`(org_id, transaction_date)` and notifications by
`(user_id, is_read, created_at)`.

</details>

<details>
<summary><strong>Features List</strong></summary>

The following table lists the implemented product features, the team members
who contributed to them, and a brief description of their functionality.
Contributors are identified by the usernames listed at the top of this
README.

| Feature | Team member(s) | Description |
| --- | --- | --- |
| User accounts and authentication | `dtimofee`, `tsemenov` | Email/password registration and login, session management, logout, CSRF protection, protected routes, password changes, and 42 (Intra) OAuth sign-in. |
| Personal budgets and balances | `dtimofee`, `nefimov`, `tsemenov` | Creates a personal workspace for each user, supports an initial balance, and calculates the current balance from income, expenses, and goal transfers. |
| Shared workspaces | `dtimofee`, `mainibet`, `tsemenov` | Users can create workspaces, switch between them, view members, leave a workspace, and manage workspace membership with owner and member roles. |
| Workspace invitations | `dtimofee`, `mainibet`, `tsemenov` | Workspace owners can invite users and cancel invitations; invited users can review, accept, or decline invitations. |
| Transactions | `dtimofee`, `nefimov`, `tsemenov` | Tracks income, expenses, contributions, and withdrawals with amounts, descriptions, dates, categories, goals, and tax-deductible status. Transactions can be listed, filtered, edited, and deleted. |
| Transaction categories | `dtimofee`, `nefimov`, `tsemenov` | Provides workspace-scoped income, expense, and contribution categories, with filtering and duplicate-prevention rules. |
| Savings goals | `dtimofee`, `nefimov`, `tsemenov` | Creates savings targets with optional target dates, tracks contributions and withdrawals, calculates progress and balances, and supports active, completed, and archived statuses. |
| Financial reports | `mainibet`, `dtimofee`, `nefimov`, `tsemenov` | Provides yearly workspace reports with income and expense totals, monthly distributions, category breakdowns, savings information, current balance, charts, year selection, and print-friendly output. |
| Home dashboard | `dtimofee`, `nefimov`, `tsemenov` | Summarizes the selected workspace with balance, monthly activity, recent transactions, top spending, savings goals, and setup guidance. |
| Notifications | `dtimofee`, `mainibet`, `tsemenov` | Provides an in-app inbox for invitations, transaction activity, goal milestones, and workspace membership events. The frontend polls for updates and shows unread counts. |
| AI financial assistant | `dtimofee`, `mainibet`, `tsemenov` | Answers supported natural-language questions about workspace finances through a separate FastAPI service using intent classification, Django API retrieval, vector retrieval, prompt construction, and an external LLM. |
| Responsive web interface | `tsemenov` | React single-page application with lazy routes, responsive desktop and mobile layouts, workspace navigation, drawers, bottom sheets, charts, date controls, money formatting, toast feedback, and Markdown-rendered AI responses. |
| Workspace authorization | `dtimofee`, `tsemenov` | Restricts workspace-scoped API operations to members and limits sensitive actions, such as invitations, member removal, and workspace administration, to owners. |
| Input validation and API protection | `dtimofee`, `nefimov`, `tsemenov` | Validates request payloads, query parameters, identifiers, monetary values, dates, categories, goals, and AI questions before processing them. |
| Session and CSRF security | `dtimofee`, `tsemenov` | Uses django-allauth sessions, protected routes, CSRF tokens, secure logout, and authenticated API requests for browser access. |
| Database integrity and concurrency control | `dtimofee`, `nefimov`, `cwick` | Uses PostgreSQL foreign keys, unique constraints, indexes, decimal fields, atomic transactions, and workspace scoping to keep financial data consistent when multiple users work concurrently. |
| Secrets management | `cwick` | Stores service secrets in HashiCorp Vault, uses AppRole-scoped access, initializes and unseals Vault automatically, and issues short-lived database credentials through Vault’s database secrets engine. |
| Web application firewall | `cwick` | Places Coraza WAF with the OWASP Core Rule Set in front of the frontend and API, records audit information, and blocks malicious HTTP requests before they reach application services. |
| Containerized deployment | `cwick` | Runs the frontend, Django backend, PostgreSQL, AI service, Vault, Vault Agent, Caddy, and Cloudflare Tunnel through Docker Compose with development and production profiles. |
| Reverse proxy and service routing | `cwick` | Uses Caddy as the single application entry point, routing API, authentication, administration, and frontend requests to the appropriate internal service. |
| Public access through Cloudflare Tunnel | `cwick` | Publishes the application through Cloudflare Tunnel without requiring open inbound ports on the host. |
| Service health checks | `cwick` | Exposes health endpoints and Docker health checks so dependent services and CI can wait for the database, backend, Vault, AI service, and tunnel to become ready. |
| Metrics and observability | `cwick` | Collects application and database metrics with Prometheus, PostgreSQL exporter, and cAdvisor; provides Grafana dashboards, traffic visibility, and alerting. |
| Database backup and recovery | `cwick` | Runs scheduled PostgreSQL dumps in a dedicated backup container and keeps backup-related storage separate from the application services. |
| Testing and CI | `dtimofee`, `mainibet`, `tsemenov` | Backend pytest, Ruff, and mypy checks; frontend Vitest, Playwright, ESLint, Prettier, and build checks; plus CI workflows for the relevant project areas. |

</details>

<details>
<summary><strong>❗Modules</strong></summary>

◦ List of all chosen modules (Major and Minor).
◦ Point calculation (Major = 2pts, Minor = 1pt).
◦ Justification for each module choice, especially for custom "Modules of
choice".
◦ How each module was implemented.
◦ Which team member(s) worked on each module.

## Modules of Choice

| Points | Module | Author | Description | Docs |
| --- | --- | --- | --- | --- |
| 2p | **Major: Web.** Use a framework for both the frontend and backend. | dtimofee, tsemenov | Django + React Router | [docs/modules/backend-integration.md](docs/modules/backend-integration.md), [docs/modules/input-validation.md](docs/modules/input-validation.md), [docs/frontend/routing.md](docs/frontend/routing.md), [docs/frontend/password-change.md](docs/frontend/password-change.md) |
| 1p | **Minor: Web.** Use an ORM for the database | dtimofee, nefimov | Django + PostgreSQL | [docs/database/database.md](docs/database/database.md) |
| 1p | **Minor: Web.** A complete notification system for all creation, update, and deletion actions | dtimofee, albetanc | Django | [docs/backend/notifications.md](docs/backend/notifications.md) |
| 1p | **Minor: Web.** Custom-made design system with reusable components, including a proper color palette, typography, and icons (minimum: 10 reusable components). | tsemenov | Custom design system based on MUI | [docs/modules/design-system.md](docs/modules/design-system.md), [docs/frontend/mui-and.styles.md](docs/frontend/mui-and.styles.md]), [docs/frontend/money.md](docs/frontend/money.md), [docs/frontend/drawers.md](docs/frontend/drawers.md) |
| 1p | **Minor: Web.** Implement advanced search functionality with filters, sorting, and pagination. | dtimofee, tsemenov | Transactions page | [docs/backend/transactions.md](docs/backend/transactions.md) |
| 1p | **Minor: Accessibility.** Support for additional browsers. | tsemenov | Cromium, firefox, Webkit | [docs/frontend/browser-support.md](docs/frontend/browser-support.md) |
| 1p | **Minor: User Management.** Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.). | dtimofee | OAuth 2.0 | [docs/backend/authentication.md](docs/backend/authentication.md) |
| 2p | **Major: User Management.** Advanced permissions system. | dtimofee | Django-allauth Headless | [docs/backend/authentication.md](docs/backend/authentication.md) |
| 2p | **Major: User Management.** An organization system. | dtimofee, tsemenov | Django | [docs/backend/organizations.md](docs/backend/organizations.md) |
| 1p | **Minor: User Management.** User activity analytics and insights dashboard. | dtimofee, tsemenov | ❗ | [docs/backend/reports.md](docs/backend/reports.md)  |
| 2p | **Major: Artificial Intelligence.** Implement a complete RAG (Retrieval-Augmented Generation) system. | albetanc | pgvector | [docs/ai/rag-design.md](docs/ai/rag-design.md) |
| 2p | **Major: Artificial Intelligence.** Implement a complete LLM system interface. | albetanc, dtimofee | ❗ | [docs/product/ai_chat_assistant.md](docs/product/ai_chat_assistant.md) |
| 2p | **Major: Cybersecurity.** Implement WAF/ModSecurity (hardened) + HashiCorp Vault for secrets. | cwick | ❗ | [docs/backend/vault.md](docs/backend/vault.md) |
| 2p | **Major: DevOps.** Monitoring system with Prometheus and Grafana. | cwick | Prometheus, Grafana |[docs/backend/monitoring.md](docs/backend/monitoring.md) |
| 2p | **Major: DevOps.** Health check and status page system with automated backups and disaster recovery procedures. | cwick | ❗ | [docs/database/backup.md](docs/database/backup.md) |
| 1p | **Minor: Data & Analytics.** Advanced analytics dashboard with data visualization | dtimofee, albetanc, tsemenov | A yearly report over income, expenses and savings: one aggregation endpoint, custom charts and a print-ready layout. | [docs/modules/reports-and-analytics.md](docs/modules/reports-and-analytics.md), [docs/backend/reports.md](docs/backend/reports.md) |

</details>

<details>
<summary><strong>❗Individual Contributions</strong></summary>

◦ Detailed breakdown of what each team member contributed.
◦ Specific features, modules, or components implemented by each person.
◦ Any challenges faced and how they were overcome.

<details>
<summary><strong>albetanc (🧭) — Project Management and Backend/AI Integration</strong></summary>

**Scope.** Project Manager responsible for planning, task distribution,
progress tracking, and communication. Also contributed to backend features
connecting the product to the AI service.

**Design and user flow**
- Helped define the product scope and prioritise the user flows around shared
  organizations, invitations, notifications, reports, and AI assistance.
- Coordinated the way organization membership, permissions, and user-visible
  notifications work together across the application.

**Implementation**
- Built and maintained the organization and membership workflow: shared
  organizations, permissions, invitations, accepting invitations, leaving an
  organization, member removal, and organization rename/delete operations.
- Implemented the notification system across invitations, organization changes,
  transactions, and savings goals, including the related backend integrations.
- Added API versioning and connected the Django API to the AI chat service,
  including the backend/frontend chat integration.
- Implemented and documented reporting and transaction filtering, and
  contributed to the savings and goal-related backend work.

**Tooling and quality**
- Coordinated work through GitHub Issues, pull requests, the project board,
  weekly meetings, Miro planning, and Slack communication.
- Added API and feature documentation, including the representative work on
  [shared organizations](https://github.com/tim-daria/poolaki/commit/02bea85de223a6b22738e90ec497fe5044aceb68),
  [permissions and invitations](https://github.com/tim-daria/poolaki/commit/14fc9a109a63ba2c34c2118d48fb88c4a22ae8b),
  [notifications](https://github.com/tim-daria/poolaki/commit/1f9842a33a880373612836394d64df4a02bb8405),
  [AI chat integration](https://github.com/tim-daria/poolaki/commit/001aef61b0ad5b173827772e75af1b30422e3c3d),
  and [reporting](https://github.com/tim-daria/poolaki/commit/865896edaddb29fe619779890fc95112f9ef1685).

**Challenges**
- **Keeping shared-workspace access consistent.** Organization membership,
  permissions, invitations, and notifications affect the same users and
  resources, so the implementation had to keep authorization and user-visible
  events aligned across endpoints.
- **Connecting two services without duplicating business rules.** The AI
  service receives a constrained API contract from Django rather than reading
  the database directly, which keeps workspace access checks in the main
  backend.
</details>

<details>
<summary><strong>cwick (🛡️) — Technical Lead and Infrastructure</strong></summary>

**Scope.** Technical Lead responsible for deployment architecture, service
integration, security, and operational reliability for the Docker-based
monorepo.

**Design and user flow**
- Designed the local and production service layout so the application, AI
  service, database, Vault, monitoring, and tunnel can run as one stack.
- Defined the operational flow for starting services, checking readiness,
  accessing the production app, and recovering database data.

**Implementation**
- Built the Docker and Compose infrastructure, Makefile workflows, service
  health checks, and CI pre-check tooling.
- Implemented Cloudflare Tunnel access and the Vault-based secrets workflow,
  including integrations for Grafana, the AI service, and deployment secrets.
- Added the Coraza WAF, hardened its request handling, and documented commands
  for testing and inspecting WAF activity.
- Implemented Prometheus/Grafana monitoring, PostgreSQL and container metrics,
  dashboards, and database test data for operational checks.

**Tooling and quality**
- Added infrastructure documentation covering deployment, Vault, WAF,
  monitoring, and the production setup.
- Established operational checks with [monitoring](https://github.com/tim-daria/poolaki/commit/9a179f4ab2cec89ca0ab29d684721c53528e6839),
  [Cloudflare Tunnel](https://github.com/tim-daria/poolaki/commit/dd80146e152dfdbd51d176e5319d3524290ca6df),
  [Vault](https://github.com/tim-daria/poolaki/commit/8d43273d1cde0188797a9db9132f1fd62baffeea),
  and [WAF](https://github.com/tim-daria/poolaki/commit/c7fbc5cbae0d6276905b9efdf3971c5c93281c73)
  integrations.

**Challenges**
- **Ordering dependent services safely.** Backend, Vault, database, AI service,
  and the tunnel must become ready in the correct order; health checks and
  startup scripts make those dependencies explicit instead of relying on
  timing.
- **Protecting secrets while keeping local development usable.** Vault
  bootstrapping, environment configuration, and CI checks were combined so
  secrets are injected at runtime without committing them to the repository.
</details>

<details>
<summary><strong>dtimofee (🧩) — Product Ownership and Backend/AI Service</strong></summary>

**Scope.** Product Owner responsible for product direction and validation.
Also implemented the AI service, its retrieval pipeline, and cross-cutting
backend features.

**Design and user flow**
- Defined and prioritised product requirements, validated completed work, and
  communicated decisions about the user-facing scope.
- Shaped the AI assistant flow so users can ask natural-language questions
  about their own expenses, goals, trends, and shared workspaces.

**Implementation**
- Set up the FastAPI AI microservice and its Django API contract, then
  implemented prompt handling, context building, LLM integration, and
  retrieval-augmented generation.
- Added embedding ingestion and vector search, documented the embedding
  architecture, and improved no-memory behaviour and AI auditing.
- Implemented AI chat UI integration, markdown responses, legal pages, and
  supporting notification and report integrations.

**Tooling and quality**
- Documented the AI API contract and embedding architecture, and improved
  reliability through fallback handling, audit improvements, and no-memory
  behaviour.
- Delivered the [FastAPI service](https://github.com/tim-daria/poolaki/commit/7f8c865243e0b09e215ea25af672bba350032d7e),
  [RAG prototype](https://github.com/tim-daria/poolaki/commit/52ad4cf7d64cd2ef30a376d70c0d720dff77c7b1),
  [LLM integration](https://github.com/tim-daria/poolaki/commit/15e7bd9b98cb925a48a055e2758115b7b63dde75),
  [vector search](https://github.com/tim-daria/poolaki/commit/7cac462b091bda13ecfcc3747acfde96e93c2422),
  and [AI audit/no-memory improvements](https://github.com/tim-daria/poolaki/commit/fe3a7e23154b153ae12707defcf55cede83f0d9d).

**Challenges**
- **Building useful answers from scoped financial data.** The retrieval and
  context pipeline had to select relevant workspace data while preserving the
  Django API boundary and avoiding direct database access from the AI service.
- **Making the AI service dependable.** Explicit API contracts, fallback
  handling, audit improvements, and no-memory behaviour reduce the impact of
  unavailable model or vector-search functionality.
</details>

<details>
<summary><strong>nefimov (🔧) — Backend Financial Domain</strong></summary>

**Scope.** Backend Developer responsible for the transaction and savings
domain in the Django backend, including validation, business rules, and
reporting data.

**Design and user flow**
- Defined the financial flow from income and expenses through goal
  contributions, withdrawals, progress, completion, and archival.
- Kept personal budgets and shared-workspace transactions subject to the same
  balance and authorization rules.

**Implementation**
- Designed the transaction model and backend API for income, expenses, and
  goal-related transfers, including editing and deletion.
- Implemented savings goals, goal progress and reporting, archived-goal
  behaviour, and restrictions on withdrawals and transactions linked to
  archived goals.
- Added transaction and goal test data used by the application and test
  environment, and contributed to report data used by the frontend.
- Documented the goals and reporting behaviour and fixed edge cases in
  transaction serializers and atomic operations.

**Tooling and quality**
- Added backend tests and test data for transactions and goals, and documented
  the [goals](https://github.com/tim-daria/poolaki/commit/26e656d9e48e266a08a122f0c8f19161396f89a)
  and [reporting](https://github.com/tim-daria/poolaki/commit/7d8b1802b0008e13d51ed19300fe83e983412f9a)
  behaviour.
- Implemented the [transaction backend](https://github.com/tim-daria/poolaki/commit/ce1eea2ea18c3d50d2517c0cbc9432ade1d6528a),
  [transaction editing](https://github.com/tim-daria/poolaki/commit/dbbc4055bc742b3d1aba894545e67456ea47a277),
  and [goal transaction restrictions](https://github.com/tim-daria/poolaki/commit/f7d4b434425ce71b4525d5dd061807ccbe957992).

**Challenges**
- **Preserving financial invariants.** Transaction changes affect balances,
  goals, and reports, so validation and database operations must prevent
  invalid transfers and keep derived totals consistent.
- **Handling lifecycle transitions.** Archived and completed goals need
  different rules from active goals; explicit checks and atomic updates keep
  those transitions safe when several requests occur close together.
</details>

<details>
<summary><strong>Tanya (🎀 tsemenov) — Frontend</strong></summary>

**Scope.** Owner of `frontend/`: product design, UX/UI, architecture, tests, CI job, and `docs/frontend/`.

**Design and user flow**
- Designed the app structure and user flow: sign-up or 42 login, personal budget with an initial balance, workspace switcher, then Home, Transactions, Goals, Reports and Settings. Shared workspaces follow the same flow after an invitation.
- Made mockups for every page and modal before implementation, and iterated on them with the team.
- Built a design system in the MUI theme: colour tokens, two type stacks, spacing, card variants ([docs/frontend/design-system.md](docs/frontend/design-system.md)).
- Made every page responsive: top navigation on desktop, bottom navigation and bottom sheets on phones, print layout for reports.

**Implementation**
- Built the auth flow, routing, app shell, workspaces and invitations, Transactions and Home. Helped with Goals, Reports and the AI chat UI.
- Shared pieces: theme, `Money` formatting, toasts, segmented controls, card header.

**Tooling and quality**
- React Compiler and Vite setup, Vitest unit tests, Playwright e2e suite, frontend CI job, `AGENTS.md` guidelines and frontend docs.

**Challenges**
- **Making the app intuitive.** Goals, shared workspaces and overdrafts are not simple concepts, so the interface had to explain them in plain language. Our rule was to hide or disable actions that aren't allowed, rather than let them fail.
- **Composition and user flow.** Deciding what each page shows first, what stays one tap away, and where the single main action goes.
- **Desktop and mobile.** One design had to work on both screens. Cards, modals, tables and charts were reworked for phones, not just shrunk.
- **Consistency.** Keeping the look uniform across many pages, which is why every style decision lives in the theme.
</details>
</details>

## Resources

- Project subject: 42 `ft_transcendence`
  
- [django-allauth: Headless API ](https://docs.allauth.org/en/latest/headless/index.html)
- [Django Official Documentation](https://docs.djangoproject.com/en/6.1/)
- [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Mozilla Web Docs](https://developer.mozilla.org/en-US/)
- [React Official Documentation](https://react.dev/)
- [React Router Official Documentation](https://reactrouter.com/)
- [Vite Official Documentation](https://vite.dev/guide/)
- [GitHub Secrets How-To](https://docs.github.com/en/actions/concepts/security/secrets)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Laws of UX](https://lawsofux.com/)

[ ❗... ADD MORE... ]

## AI Usage

AI tools were used in this project for the following purposes:

- **Planning:** structuring and prioritising the work.
- **Learning:** finding resources and understanding new concepts.
- **Design:** generating mockups.
- **Code review:** reviewing changes and spotting issues.
- **Code optimisation:** refactoring and simplifying existing code.
- **Migration:** moving pages to MUI correctly and consistently.
- **Testing:** drafting and extending unit and end-to-end tests.
- **Documentation:** drafting and editing project documentation.
- **Commits and pull requests:** writing and polishing commit messages and PR descriptions.

[ ❗... ADD MORE... ]

Security practices for writing workflows and using GitHub Actions features
Using secrets in GitHub Actions

Software Testing Course
