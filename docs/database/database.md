# Poolaki database

Poolaki stores application data in **PostgreSQL**. The database schema is
defined through Django models and migrations in
`backend/django/core/models.py`. Django's ORM is the interface used by the
backend to query and update the database; API serializers and views should not
access PostgreSQL directly.

## Why PostgreSQL

PostgreSQL is a good fit for Poolaki because the application stores related,
structured financial data where correctness and consistency are more important
than a schemaless write model:

- **Strong data integrity:** foreign keys, unique constraints, conditional
  unique constraints, and transactions protect memberships, invitations,
  categories, goals, and financial records from inconsistent states.
- **Reliable financial values:** `numeric` columns map well to Django's
  `DecimalField`, avoiding the rounding problems associated with floating-point
  storage for balances and transaction amounts.
- **Rich querying and reporting:** joins, aggregations, date functions, indexes,
  and query planning support organization balances, transaction history, and
  financial reports without moving all data into application memory.
- **Flexible data where needed:** PostgreSQL's JSON support works well for
  notification payloads while the core domain remains explicitly typed and
  relational.
- **Django compatibility:** PostgreSQL is a first-class Django backend, so
  migrations, constraints, transactions, and ORM queries align with the
  project's existing models and development workflow.
- **Room to grow:** PostgreSQL can support increasing data volume and
  concurrent users while retaining a familiar relational model and established
  operational tooling.

## Database schema

![Poolaki database schema](database_schema.png)

The diagram shows the main tables, fields, keys, indexes, and relationships
across authentication, organizations, finance, and notifications.

## Model groups

### Authentication

- **User** extends Django's `AbstractUser`.
- `email` is unique and is used as the user's email identifier.
- MFA state is stored in `mfa_secret` and `is_mfa_active`.

### Organizations

- **Organization** is the tenant boundary for shared and personal budgets.
- **Membership** joins users to organizations and stores each user's role.
  `(org, user)` is unique, so a user can belong to an organization only once.
- **Invitation** connects an organization to an invited user and optionally
  records the user who sent the invitation.
- Only one pending invitation may exist for a given `(org, invited_user)`
  pair. Accepted, declined, or cancelled invitations do not prevent a later
  invitation.

### Finance

- **Category** belongs to an organization and classifies financial entries.
  `(org, name, type)` is unique.
- **Goal** belongs to an organization and may optionally record its creator.
- **Transaction** belongs to an organization and may optionally reference a
  goal, category, and creating user.
- Transactions are indexed by `(org, transaction_date)` for organization
  reports and date-based queries.

### Notifications

- **Notification** belongs to a user and optionally references an organization.
- `payload` stores event-specific JSON data.
- Notifications are indexed by `(user, is_read, created_at)` for unread and
  chronological queries.

## Relationships and deletion behavior

The relationships shown in the schema are implemented with Django
`ForeignKey` fields:

| Relationship | Cardinality | Delete behavior |
| --- | --- | --- |
| User → Membership | One user to many memberships | Delete memberships with the user |
| Organization → Membership | One organization to many memberships | Delete memberships with the organization |
| Organization → Invitation | One organization to many invitations | Delete invitations with the organization |
| User → Invitation (recipient) | One user to many received invitations | Delete invitations with the user |
| User → Invitation (sender) | Optional user to many invitations | Keep invitations and set the sender to `NULL` |
| Organization → Category | One organization to many categories | Delete categories with the organization |
| Organization → Goal | One organization to many goals | Delete goals with the organization |
| Organization → Transaction | One organization to many transactions | Delete transactions with the organization |
| Goal → Transaction | Optional goal to many transactions | Keep transactions and set the goal to `NULL` |
| Category → Transaction | Optional category to many transactions | Keep transactions and set the category to `NULL` |
| User → Goal / Transaction | Optional creator to many records | Keep records and set the creator to `NULL` |
| User → Notification | One user to many notifications | Delete notifications with the user |
| Organization → Notification | Optional organization to many notifications | Keep notifications and set the organization to `NULL` |

## Django and database workflow

1. Define or update a model in
   [`backend/django/core/models.py`](../../backend/django/core/models.py).
2. Create a migration from the Django project:

   ```bash
   uv run python manage.py makemigrations
   ```

3. Apply migrations to the configured PostgreSQL database:

   ```bash
   uv run python manage.py migrate
   ```

4. Use Django's ORM and existing services for application queries. Keep
   organization scoping in queries so users cannot access another
   organization's financial data.

The active database connection is configured in
`backend/django/django_project/settings.py` using PostgreSQL environment
variables. Database credentials and connection details must remain outside
the repository.
