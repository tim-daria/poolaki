# Team Organization and Responsibilities

This document is the detailed source for team structure, roles, feature and module ownership, project management and individual contributions. The root [README](../README.md#team-information) keeps the summary and links here.

-The team organized work around product ownership, shared project coordination, technical leadership and feature ownership. Each service had at least two team members involved to support collaboration, knowledge sharing and code reviews.

## 1. Team Roster

| 42 login   | Member            | Role(s)                                       | Scope                                                                                                    |
| ---------- | ----------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `albetanc` | Alicia Betancourt | Product Owner; AI & Notification Systems Lead | Product scope, AI service and RAG, notification system, product documentation, frontend support          |
| `cwick`    | cwick             | Infrastructure & Security Lead                | Docker, Vault, Caddy/Coraza, Cloudflare Tunnel, monitoring, backups, CI infrastructure                   |
| `dtimofee` | Daria Timofeeva   | Tech Lead; Backend Lead                       | Django/DRF, database, authentication/OAuth, organizations, reports, notification backend, AI integration |
| `nefimov`  | Nikolai Efimov    | Backend Developer                             | Goals, transactions, balances, transaction restrictions, goal report data                                |
| `tsemenov` | Tanya Kletka      | Frontend Lead; QA                             | UX/UI, design system, React application, responsive layouts, frontend tests and CI                       |

Alicia Betancourt (`albetanc`) is the lead of the notification system. Daria Timofeeva (`dtimofee`) implements its backend side; Tanya Kletka (`tsemenov`) reviews the frontend side.

## 2. Roles and Responsibilities

### Product Owner (PO) — Alicia Betancourt (`albetanc`)

The PO defined the product vision, prioritized the backlog, proposed features for each sprint and validated completed work. The PO also owned the product and AI documentation and the notification system.

### Scrum Master / Project Coordination

Project coordination was shared. The PO facilitated sprint priorities; the technical leads coordinated work in their areas and raised blockers in the weekly and technical meetings. The team tracked tasks and progress in GitHub.

### Technical Leads / Architects

Each service area had a technical lead. Leads owned architecture and technical decisions, supported other developers and reviewed relevant changes.

- **Frontend Technical Lead — Tanya Kletka (`tsemenov`).** Frontend architecture, UX and UI consistency, responsive behaviour, frontend integration and troubleshooting.
- **Backend Technical Lead — Daria Timofeeva (`dtimofee`).** Django/DRF architecture, data model, API contracts, authentication and integration with the AI service.
- **AI Technical Lead — Alicia Betancourt (`albetanc`).** AI service boundary, RAG pipeline, prompt/LLM integration and the contract with the backend.
- **Infrastructure and Security Lead — cwick.** Docker Compose, Vault, WAF, tunnel, monitoring, backups and infrastructure reviews.

Infrastructure and security changes received additional review from the Infrastructure and Security Lead. That lead's own changes were reviewed by another team member.

### Developers

Developers implemented features, tested their work, participated in code reviews and maintained documentation. Each service had at least two team members involved.

- **Frontend:** Tanya Kletka (`tsemenov`), with support from Alicia Betancourt (`albetanc`).
- **Backend:** Daria Timofeeva (`dtimofee`) and Nikolai Efimov (`nefimov`).
- **AI:** Alicia Betancourt (`albetanc`), with backend integration from Daria Timofeeva (`dtimofee`).
- **Infrastructure:** cwick, with reviews from the other leads.

## 3. Feature Ownership

Each feature had an owner responsible for coordinating implementation, progress and completion. Ownership did not mean working alone: features could involve several developers and cross-service coordination.

| Feature                                 | Owner / lead                   | Contributing developers                                               | Reviewer(s)            |
| --------------------------------------- | ------------------------------ | --------------------------------------------------------------------- | ---------------------- |
| Notification system                     | `albetanc` (Alicia Betancourt) | Frontend: `albetanc`; backend: `dtimofee`                             | `tsemenov`             |
| WAF and Vault                           | `cwick`                        | `cwick`; infrastructure support from the service leads                | `albetanc`, `dtimofee` |
| Organization system                     | `dtimofee`                     | Frontend: `tsemenov`; backend: `dtimofee`                             | `cwick`, `albetanc`    |
| Goals and transactions                  | `nefimov`                      | Frontend: `tsemenov`, `albetanc`; backend: `nefimov`, `dtimofee`      | `dtimofee`, `tsemenov` |
| RAG system                              | `albetanc`                     | AI: `albetanc`; backend: `dtimofee`; frontend: `tsemenov`, `albetanc` | `dtimofee`, `nefimov`  |
| OAuth 2.0                               | `dtimofee`                     | Frontend: `tsemenov`; backend: `dtimofee`                             | `cwick`                |
| Search, filtering and pagination        | `dtimofee`                     | Frontend: `tsemenov`; backend: `dtimofee`, `nefimov`                  | `nefimov`              |
| Login and email/password authentication | `tsemenov`                     | Frontend: `tsemenov`; backend: `dtimofee`                             | `cwick`                |
| Reports and analytics                   | `dtimofee`                     | Backend: `dtimofee`; frontend: `tsemenov`                             | `nefimov`, `tsemenov`  |
| AI assistant (chat)                     | `albetanc`                     | AI: `albetanc`; backend: `dtimofee`; frontend: `tsemenov`             | `dtimofee`, `tsemenov` |

## 4. Module Ownership

Module points, justifications and implementation details live in the [root README](../README.md#modules-of-choice). This table records ownership only.

| Module                              | Points | Owner(s)                                  |
| ----------------------------------- | ------ | ----------------------------------------- |
| Backend framework                   | 1p     | `dtimofee`, `nefimov`                     |
| Frontend framework                  | 1p     | `tsemenov`                                |
| ORM                                 | 1p     | `dtimofee`                                |
| OAuth 2.0                           | 1p     | `dtimofee`, `tsemenov`                    |
| Search, filter and pagination       | 1p     | `dtimofee`, `nefimov`, `tsemenov`         |
| Notification system                 | 1p     | `albetanc` (lead), `dtimofee`, `tsemenov` |
| Health checks, backups and recovery | 1p     | `cwick`                                   |
| Organization system                 | 2p     | `dtimofee`, `tsemenov`                    |
| RAG system                          | 2p     | `albetanc`, `dtimofee`                    |
| AI microservice                     | 2p     | `albetanc`, `dtimofee`                    |
| Monitoring system                   | 2p     | `cwick`                                   |
| WAF and secrets management          | 2p     | `cwick`                                   |
| Custom: Reports and analytics       | 1p     | `dtimofee`, `tsemenov`                    |
| Custom: Cloudflare Tunnel           | 2p     | `cwick`, `tsemenov`                       |

## 5. Project Management

### Methodology

The team used Agile/Scrum with two-week sprints, sprint reviews and retrospectives. Planning started in June; development ran from 1 July to 23 October. The initial plan covered Sprint 0 to Sprint 7 and was adjusted as the project evolved. The full sprint overview is in [the development process](development-process.md).

### Planning and task distribution

Before each sprint, the PO reviewed progress and proposed features for the next sprint. Work was split by ownership area (frontend, backend, AI, infrastructure) and tracked as GitHub Issues. Cross-service work was paired through pull requests, and each area lead coordinated delivery in that area.

### Tools

| Tool     | Purpose                                                            |
| -------- | ------------------------------------------------------------------ |
| GitHub   | Issues, branches, pull requests, CI and task tracking              |
| Miro     | Sprint reviews, retrospectives, planning and deadline coordination |
| Slack    | Team communication and Huddles                                     |
| Insomnia | Testing backend API endpoints and verifying responses              |
| Notion   | Team knowledge base and process documentation                      |

### Communication and cadence

- Weekly team meetings for coordination.
- Sprint reviews and retrospectives every two weeks, supported by Miro.
- Technical meetings between sprints to resolve questions and blockers.
- Daily meetings during the final week.
- Slack for day-to-day coordination and Slack Huddles for decisions.
- Continuous written communication in pull requests and GitHub Issues.

### Review gate

`main` is protected. Every change goes through a pull request, CI must pass, and two developers must approve before merge. Branch naming and the review workflow are in [CONTRIBUTING.md](../CONTRIBUTING.md) and [the CI workflow](../.github/workflows/ci.yml).

## 6. Cross-Service Collaboration and Code Review

Each feature was assigned an owner and implemented collaboratively across the relevant services. Most features involved a frontend developer and a backend developer; AI features also involved the AI developer and the backend lead, with frontend work when the UI changed.

GitHub Issues tracked tasks; branches and pull requests isolated and reviewed changes. Pull requests were reviewed by the relevant feature owner and at least one other developer. Infrastructure and security changes received an additional review from the Infrastructure and Security Lead, while that lead's own changes were reviewed independently.

Technical decisions involving multiple services were coordinated between the relevant leads to keep API contracts and integration consistent.

## 7. Individual Contributions

### albetanc (Alicia Betancourt)

**Scope.** Owner of `ai-service/`, the AI product documentation, the notification system and a large part of `docs/ai` and `docs/product/`; frontend support for the AI chat and goals pages.

- Designed the AI service boundary: FastAPI microservice, HTTP API contract with Django, no direct access to financial tables, Docker Compose integration and healthcheck.
- Built the RAG pipeline: intent classification, hybrid retrieval from the internal Django API and pgvector, embedding ingestion, context and prompt builders, LLM client with retries/fallback, and token/latency logging.
- **Led the notification system:** defined the event coverage and inbox behaviour (unread count, read/clear rules, polling contract), coordinated the backend fan-out with `dtimofee`, and reviewed the frontend integration with `tsemenov`.
- Wrote the AI architecture, decisions, RAG design, prompt-management and supported-question documents; maintained the privacy policy and development-process documentation.
- Integrated the AI chat into the frontend with `dtimofee` and `tsemenov`, and contributed to the goals and reports UI.
- **Challenges:** keeping answers grounded in authorized data and enforcing tenant isolation; controlling token cost and latency while keeping enough context; defining and documenting out-of-scope questions; keeping the API contract stable while the AI service evolved; keeping notification events consistent across workspaces without leaking data.

### cwick

**Scope.** Owner of the Docker infrastructure, Vault, Caddy/Coraza, Cloudflare Tunnel, monitoring and backup stack.

- Built the Compose stack with dev and `prod` profiles, dedicated networks, healthchecks and volumes; wired dependencies so database, Vault, agent and application start in the correct order.
- Integrated HashiCorp Vault: initialisation/unseal, AppRole, secret templates, Vault Agent rendering and dynamic PostgreSQL credentials.
- Configured Caddy with Coraza/OWASP CRS, routing rules and WAF logging; implemented the Cloudflare Tunnel container and its Vault-rendered token.
- Set up Prometheus, Grafana, postgres_exporter and cAdvisor, dashboards and alerts; added the daily `pg_dump` sidecar and disaster-recovery procedure.
- **Challenges:** Vault bootstrap ordering and token availability; rotating secrets without committing them; tuning WAF rules without blocking valid traffic; making the tunnel and monitoring stack work without exposing inbound ports; verifying that backups can actually be restored.

### dtimofee (Daria Timofeeva)

**Scope.** Owner of the Django/DRF backend, database schema, authentication, organizations, reports, notifications backend and the backend side of AI integration.

- Built the core models and migrations for users, organizations, memberships, invitations, categories, goals, transactions and notifications.
- Implemented email/password authentication, 42 OAuth, sessions/CSRF, organization and invitation flows, permissions and membership rules.
- Implemented transaction and category APIs, the yearly report aggregation, notification fan-out and the internal AI endpoints with organization-scoped authorization.
- Wrote the reports module documentation, backend API documentation, Postman collection, test data and backend tests; maintained the API versioning and AI integration contract.
- **Challenges:** keeping money math consistent across transactions, goals and reports; enforcing invariants under concurrent writes; designing notification fan-out without leaks across workspaces; keeping a stable API while features and the AI contract changed.

### nefimov (Nikolai Efimov)

**Scope.** Goals, goal transfers, balance calculations, transaction restrictions and goal report data.

- Implemented the goals domain: target amount/date, active/completed/archived states, contributions and withdrawals, and goal balance calculations.
- Enforced transaction restrictions for archived goals and goal withdrawals, and made transfer operations atomic to avoid inconsistent balances.
- Added goal data to the yearly report, including goal balance and per-goal breakdown, and fixed balance/calculation edge cases.
- Wrote backend tests and documentation for goals, transactions and reports.
- **Challenges:** preserving invariants when transactions and goals change together; handling concurrent writes without double-counting savings; keeping goal balance rules consistent between the API, reports and the Home page; supporting archived goals without losing history.

### tsemenov (Tanya Kletka)

**Scope.** Owner of `frontend/`: product design, UX/UI, architecture, tests, CI job and `docs/frontend/`.

**Design and user flow**

- Designed the app structure and user flow: sign-up or 42 login, personal budget with an initial balance, workspace switcher, then Home, Transactions, Goals, Reports and Settings. Shared workspaces follow the same flow after an invitation.
- Made mockups for every page and modal before implementation, and iterated on them with the team.
- Built a design system in the MUI theme: colour tokens, two type stacks, spacing, card variants ([design system](modules/design-system.md)).
- Made every page responsive: top navigation on desktop, bottom navigation and bottom sheets on phones, print layout for reports.

**Implementation**

- Built the auth flow, routing, app shell, workspaces and invitations, Transactions and Home. Helped with Goals, Reports and the AI chat UI.
- Shared pieces: theme, `Money` formatting, toasts, segmented controls, card header.

**Tooling and quality**

- React Compiler and Vite setup, Vitest unit tests, Playwright e2e suite, frontend CI job, `AGENTS.md` guidelines and frontend docs.

**Challenges**

- **Making the app intuitive.** Goals, shared workspaces and overdrafts are not simple concepts, so the interface had to explain them in plain language. The rule was to hide or disable actions that are not allowed, rather than let them fail.
- **Composition and user flow.** Deciding what each page shows first, what stays one tap away and where the single main action goes.
- **Desktop and mobile.** One design had to work on both screens. Cards, modals, tables and charts were reworked for phones, not just shrunk.
- **Consistency.** Keeping the look uniform across many pages, which is why every style decision lives in the theme.

## 8. Shared Responsibility

Although roles and feature owners were assigned, planning, communication, testing and delivery were collaborative. Team members supported one another across services to resolve blockers and meet sprint goals.
