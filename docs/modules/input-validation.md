# Input validation

Where a value is checked, on which side, and why both sides exist. This page
is the overview; the per-endpoint rules stay in [docs/backend/](backend/) and the
form details in [docs/frontend/](frontend/).

---

## The rule

**The backend is the only authority. The frontend validates for feedback.**

- Every write goes through a DRF serializer in
  `backend/django/core/serializers.py`, and every scoped view carries
  `permission_classes = [IsAuthenticated, IsOrgMember]`. A request that skips
  the UI (curl, a stale tab, a bug) hits exactly the same checks.
- The frontend repeats the cheap checks so the user is told _before_ a round
  trip: empty fields, amount floor and ceiling, name length, "pick a category".
  It never decides anything the backend would not decide the same way.
- When the two disagree, the backend's number wins and the frontend is fixed to
  match. A client-only rule is a UX nicety, not a guarantee (see "Client-only
  rules" below).
- A backend `400`/`403` is shown inline by the form, so a rule that lives only
  on the server still produces a readable message. How that reaches the form is
  the error contract in
  [frontend/backend-integration.md](backend-integration.md#the-error-contract).

---

## Where each layer checks

```
keystroke   →  typing filter (MoneyField): over-long or over-precise amounts are unreachable
submit      →  validateDraft / validateGoalDraft / validateAmount: empty, zero, missing picks
request     →  DRF serializer: types, limits, ownership (org_id), business rules
```

Backend: field types and limits are serializer fields (`max_length`,
`min_value`, `max_digits`); cross-field and ownership rules live in `validate()`
and `validate_<field>()`; a few rules live in `core/services/` and raise
`ValidationError` (invitations). Field errors come back as `{field: [msg]}`,
rule errors as `{errors: [msg]}` or `{detail: msg}`.

Frontend: all HTTP and every validator live in `frontend/src/lib/`, one file per
resource. Forms call the validator on submit and show the returned string; they
never `fetch` directly.

---

## Shared rules, side by side

| Value                   | Frontend (file → check)                                                                               | Backend (serializer → check)                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any amount              | `lib/money.ts` `validateAmount`: 0.01 ≤ n ≤ 999 999 999 999.99, two decimals via typing filter        | `DecimalField(max_digits=14, decimal_places=2, min_value=0.01)` on transactions and goals                                                                                   |
| Opening balance         | `validateOpeningBalance`: floor 0                                                                     | `InitialBalanceSerializer`, `OrganizationCreateSerializer`: `min_value=0`                                                                                                   |
| Workspace name          | `RenameOrgForm`: trimmed, non-empty, ≤ `MAX_ORG_NAME_LENGTH` (100). `CreateOrgForm`: non-empty only   | `OrganizationNameSerializer`: `max_length=100`, `allow_blank=False`, `trim_whitespace=True`                                                                                 |
| Goal name               | `lib/goals.ts` `validateGoalDraft`: non-empty after trim                                              | `GoalCreate/UpdateSerializer`: `max_length=100`, trimmed, unique per workspace                                                                                              |
| Goal target date        | `GoalForm`: `disablePast` on the picker when creating; the field says "Cannot be in the past."        | `validate()`: today or later                                                                                                                                                |
| Transaction description | `lib/transactions.ts` `validateDraft`: required for income/expense; `formatName` collapses whitespace | `CharField(max_length=1024, allow_blank=True)`; a contribution gets the goal name as fallback on the client                                                                 |
| Category                | `validateDraft`: required for income/expense                                                          | `validate()`: required for income/expense, must belong to the org, type must match `entry_type`                                                                             |
| Goal on a transfer      | `validateDraft`: required for contribution/withdraw                                                   | `validate()`: required, must belong to the org, `allowed_entry_types(goal)` by goal status                                                                                  |
| Transaction date        | `validateDraft`: required                                                                             | `DateField()` required                                                                                                                                                      |
| Transactions filters    | query builder in `lib/transactions.ts`                                                                | `TransactionListQuerySerializer`: `date_from ≤ date_to`, `page_size ≤ 100`, `q ≤ 100` chars, IDs must belong to the org                                                     |
| Report year             | none                                                                                                  | `ReportQuerySerializer`: integer 1900..2099                                                                                                                                 |
| Invite username         | `InvitationForm`: non-empty after trim                                                                | `InvitationCreateSerializer`: `max_length=150`; `services/invitation.py`: user exists, not a member, no pending invite, not a personal budget, ≤ 5 members, ≤ 10 workspaces |
| AI question             | `lib/aiChat.ts` `MAX_QUESTION_LENGTH` (1000)                                                          | `AiChatRequestSerializer`: 1..1000 chars, trimmed; `ai_chat` throttle 5/min                                                                                                 |
| Password                | native `required` only                                                                                | Django `AUTH_PASSWORD_VALIDATORS`, see [frontend/password-change.md](../frontend/password-change.md)                                                                           |

The frontend's `MAX_AMOUNT` (12 integer digits + 2 decimals) is the same width
as the backend's `max_digits=14`; keep them in step.

---

## Client-only rules

These are checked in the browser and **not** on the server today. They improve
the message, but a direct request can bypass them. Each is either a known gap
or a deliberate choice; do not assume they protect anything.

- **Withdraw ≤ goal balance.** `validateDraft` refuses a withdrawal larger than
  the goal's current balance ("Only €x is in this goal"). `TransactionCreateSerializer`
  has no such check, so the balance can go negative via the API. Gap.
- **Cancelling an income that would make the workspace balance negative.** The
  backend check in `views/transaction.py` is commented out; the docs still list
  the `400`. Gap.
- **Transaction description required for income/expense.** The serializer
  allows blank. Deliberate: the API accepts unlabelled rows, the form does not.

---

## Server-only rules

Checked only on the server; the form relies on the `400` message:

- uniqueness (goal name per workspace, pending invitation per user);
- ownership (`category_id`, `goal_id`, `created_by` must belong to `org_id`);
- goal status transitions and `allowed_entry_types`;
- the invitation limits (5 members, 10 workspaces);
- password strength.

There is no reason to copy these to the client: they need data the browser does
not have, or they would be two copies of one rule.

---

## Known gaps

- `CreateOrgForm` still uses `parseFloat` and no length check for the name
  (`RenameOrgForm` has both). Tracked in
  [frontend/money.md](../frontend/money.md#still-to-do).
- Category create/update endpoints are commented out in `views/category.py`
  and `serializers.py`. Every workspace gets the fixed list in
  `services/category.py` (`create_default_categories`) when it is created, and
  nothing else creates one, so the name limit (50) exists only on the model.
- The two client-only balance rules above.

---

## Adding a rule

1. Put it in the serializer (or service) first, with a test. Field limit →
   serializer field argument; cross-field or ownership → `validate()`.
2. Document it in the endpoint's page under `docs/backend/`.
3. If the user can hit it with ordinary typing, repeat the cheap version in the
   resource's `lib/<resource>.ts` validator and add a Vitest case.
4. If not, do nothing on the client: the `400` message is shown by the form.
5. Add the row to the table above.
