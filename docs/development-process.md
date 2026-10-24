# Development Process

## 1. Methodology

The team followed an **Agile** approach based on **Scrum**, organized into **two-week sprints**, with regular reviews, retrospectives and continuous collaboration.

The project followed an iterative and incremental development approach, with features delivered progressively and refined based on feedback and technical decisions. **Document-Driven Development (DDD)** was also adopted, most of the features were documented before implementation, and documentation was updated as the project evolved.

## 2. Preparation Phase

During **June**, the team held weekly meetings focused on project ideation, defining the scope, exploring technical options and selecting the technology stack. This preparation phase established the foundation for implementation.

## 3. Sprint Planning and Delivery

Development ran from **July 1 to October 23**, following an initial plan of two-week sprints. The sprint plan was adjusted as the project evolved.

Before each sprint, the Product Owner (PO) reviewed progress and proposed features for the next sprint. Tasks and progress were tracked in GitHub.

Each sprint concluded with a **Sprint Review and Retrospective**, supported by Miro. Miro was also used to track holidays and coordinate deadlines when needed.

The initial sprint plan is included in the _Initial Sprint Overview_ section.

## 4. Meetings and Communication

- **Weekly meetings:** Regular coordination throughout the project.

- **Sprint Reviews and Retrospectives:** Every two weeks, using Miro.

- **Technical meetings:** Held during the week between sprints to resolve technical questions and blockers.

- **Daily meetings:** Held during the final week to coordinate remaining work and prepare the final submission.

- **Additional discussions:** Slack Huddles were used to make decisions and resolve questions.

- **Continuous communication:** Slack was used for day-to-day coordination.

## 5. Development Workflow

GitHub was used for project management and collaborative development:

- **Issues:** Track tasks, bugs and feature work.

- **Branches:** Isolate changes during development.

- **Pull Requests (PRs):** Propose and review changes before merging.

- **Continuous Integration (CI):** Automate checks during development to help detect issues early.

## 6. Tools

| Tool     | Purpose                                                            |
| -------- | ------------------------------------------------------------------ |
| GitHub   | Issues, branches, pull requests, CI and task tracking              |
| Miro     | Sprint reviews, retrospectives, planning and deadline coordination |
| Slack    | Team communication and Huddles                                     |
| Insomnia | Testing backend API endpoints and verifying responses              |
| Notion   | Team knowledge base and process documentation                      |

## 7. Continuous Improvement

The team adapted its plans, documentation and implementation throughout the project. Regular reviews, technical discussions and continuous communication helped clarify requirements, resolve blockers and coordinate work.

## 8. Initial Sprint Overview

The project was initially planned across eight stages, from Sprint 0 to Sprint 7. Each sprint was planned for two weeks. The plan was adjusted as development progressed, based on technical decisions, dependencies and changing priorities.

| Sprint       | Backend                                                       | Frontend                                          | AI                                                                                  | Expected Outcome                                                 |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Sprint 0** | Database schema, entities, Docker setup and project structure | Wireframes, navigation and UI design              | Define supported questions, RAG architecture, data sources and API contracts        | Architecture and data model approved; technology stack finalized |
| **Sprint 1** | Users, organizations, memberships, JWT authentication         | Login, registration, profile, home and onboarding | Prompt design, context builder design and first retrieval prototype using mock data | End-to-end authentication working                                |
| **Sprint 2** | Accounts, categories and transaction CRUD                     | Create, edit, delete and list transactions        | Context builder implementation and LLM integration                                  | Financial data can be created and viewed                         |
| **Sprint 3** | Goals and recurring transactions                              | Goals and recurring transaction UI                | Retrieval, context and LLM pipeline                                                 | Goals and recurring transactions working with real data          |
| **Sprint 4** | Analytics endpoints and SQL aggregations                      | Dashboard, charts and filters                     | Security validation, prompt optimization, demo dataset and testing                  | Analytics dashboard available; AI answers basic questions        |
| **Sprint 5** | Chat endpoint and AI service integration                      | Chat page and UI                                  | Improve chat UX, prompts and answer quality                                         | AI chat answers financial questions                              |
| **Sprint 6** | Permissions, roles and activity logs                          | Activity log page and UX improvements             | —                                                                                   | Secure multi-user system                                         |
| **Sprint 7** | Bug fixing, deployment and documentation                      | Bug fixing and responsive improvements            | —                                                                                   | Project ready for evaluation                                     |

This overview represents the **initial plan**, not an exact record of completed work in each sprint. The team adapted priorities and task allocation throughout the project. GitHub was used to track tasks and progress, while Miro supported sprint reviews, retrospectives and planning.
