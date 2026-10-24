# Team Organization and Responsibilities

## 1. Team Structure

The team organized work around product ownership, shared project coordination, technical leadership and feature ownership. Each service had at least two team members involved to support collaboration, knowledge sharing and code reviews.

## 2. Roles and Responsibilities

### Product Owner (PO)

The PO was responsible for defining the product vision, prioritizing the backlog, proposing features for each sprint and validating completed work.

### Scrum Master / Project Coordination

One team member primarily facilitated the Scrum process, helping coordinate meetings, track progress and resolve blockers when needed. Project coordination and team collaboration remained shared responsibilities.

### Technical Leads / Architects

Dedicated technical leads oversaw the architecture and implementation of the Frontend, Backend and AI services. They coordinated technical decisions, supported other developers and reviewed relevant code changes.

The Frontend Technical Lead was responsible for frontend architecture, UX design and UI consistency, including design decisions, responsive optimization for different devices, frontend integration and refinement, and troubleshooting frontend issues. They ensured a consistent user experience across pages and components.

Infrastructure and Security had a designated lead responsible for related technical decisions and implementations. This lead reviewed infrastructure-related pull requests from other services. Their own infrastructure and security pull requests were also reviewed by another team member.

### Developers

Developers implemented features, tested their work, participated in code reviews and maintained relevant documentation. Each service had at least two team members involved.

- **Frontend:** Two developers, including the technical lead.
- **Backend:** Two developers, including the technical lead.
- **AI:** The technical lead implemented the service and coordinated technical decisions, testing and integration with the Backend lead.

The Backend lead reviewed AI-related pull requests, with additional reviews from another Backend developer when appropriate.

## 3. Feature Ownership

Each feature had an assigned owner responsible for coordinating its implementation, tracking progress and ensuring that the work was completed. Ownership did not mean working alone: features could involve multiple developers and required collaboration across services when necessary.

The team assigned ownership for the following features:

- Notification System
- WAF and Vault
- Organization System
- Goals and Transactions
- RAG System
- OAuth 2.0
- Search, Filtering and Pagination
- Login and Email/Password Authentication

The individual owner for each feature should be recorded in the project backlog or the feature ownership table.

| Feature                        | Owner      | Contributing Developers                                   | PR Reviewer(s)                       |
| ------------------------------ | ---------- | --------------------------------------------------------- | ------------------------------------ |
| Notification System            | `albetanc` | Frontend: `albetanc`; Backend: `dtimofee`                 | `tsemenov`                           |
| WAF & Vault                    | `cwick`    | al leads from relevant service                            | Infrastructure Lead / `albetanc`     |
| Organization System            | `dtimofee` | Frontend: `tsemenov`; Backend: `dtimofee`                 | `cwick`/`albetanc`                   |
| Goals & Transactions           | `nefimov`  | Frontend: `albetanc`; Backend: `nefimov`                  | `dtimofee` / `albetanc` / `tsemenov` |
| RAG System                     | `albetanc` | AI: `albetanc`; Backend: `dtimofee`; Frontend: `albetanc` | Backend Lead / `nefimov`             |
| OAuth 2.0                      | `dtimofee` | Frontend: `tsemenov`; Backend: `dtimofee`                 | `cwick`                              |
| Search, Filtering & Pagination | `dtimofee` | Frontend: `tsemenov`; Backend: `dtimofee`                 | `nefimov`                            |
| Login & Email/Password         | `tsemenov` | Frontend: `tsemenov`; Backend: `dtimofee`                 | `cwick`                              |

## 4. Cross-Service Feature Collaboration

Each feature was assigned an owner and implemented collaboratively across the relevant services. Typically, each feature involved a Frontend developer and a Backend developer.

AI features involved collaboration between the AI and Backend developers, with a Frontend developer contributing when user interface changes were required, such as for the AI chat.

This approach encouraged coordination between services, consistent API integration and shared responsibility for delivering complete features.

## 5. Collaboration and Code Review

GitHub Issues were used to track tasks, while branches and pull requests supported collaborative development. Pull requests were reviewed by relevant team members before merging. Infrastructure and security changes received additional review from the designated Infrastructure and Security lead, with independent review of that lead's own changes.

Technical decisions involving multiple services were coordinated between the relevant technical leads to ensure consistent integration and API contracts.

## 6. Shared Responsibility

Although specific roles and feature owners were assigned, planning, communication, testing and delivery were collaborative responsibilities. Team members supported one another across services to resolve blockers and meet sprint goals.
