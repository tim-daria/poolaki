# Routing & workspaces

How the frontend decides which organization ("workspace") you are looking at. Why it
was built this way, and what still needs to change:

---

## The problem

A user can belong to several workspaces:

- a **personal** one, created automatically at signup, which can never be shared;
- any number of **shared** ones they created or were added to.

Everything — transactions, goals, categories — belongs to exactly one workspace. So
before the app renders anything it has to answer: **which workspace am I in?**

That answer can live in the browser's memory or in the URL. The choice decides
almost everything else.

---

## The rule: the URL owns the workspace

```
/o/2/transactions
   ↑
   workspace id
```

Same approach as Slack, Linear and GitHub. Switching workspaces is **not** a state
change — it is a **navigation**, like clicking a link.

| | in the URL | in memory only |
|---|---|---|
| Send a link to a teammate | works | they see their own data |
| Back button | previous workspace | stale data |
| Two tabs | one workspace each | they fight each other |
| Refresh | stays put | may jump elsewhere |
| Clearing old data on switch | automatic (new route) | manual, easy to forget |


The payoff is how little the switcher needs. In `OrgSwitcher.tsx`, clicking a
workspace calls `navigate()` and nothing else — no loading flag, no undo-on-failure,
no cache clearing. `OrgLayout` handles all of it once, because it already has to work
for a pasted URL and a refresh. One code path, three entry points.

---

## The route map

```
/login  /register  /terms  /policy      only when logged OUT
/oauth-callback                         social login return

/                                       → redirects to /o/<your personal workspace>
/o/:orgId                               everything below is scoped to this workspace
    /o/:orgId              Overview
    /o/:orgId/transactions Transactions
    /o/:orgId/goals        Goals
    /o/:orgId/categories   Categories
```

```
<App>
├── <GuestRoute>                logged in? yes → /
└── <ProtectedRoute>            logged in? no  → /login
    └── <OrgListProvider>       loads your list of workspaces, once
        ├── <OrgRedirect>       handles "/"
        └── <OrgLayout>         handles "/o/:orgId"
            └── <AppLayout>     header, sidebar, page area
                └── the page
```

`GuestRoute`, `ProtectedRoute` and `OrgListProvider` are **pathless routes**: they add
a component to the tree without adding a URL segment. That is how a guard or a
provider gets scoped to a group of pages.

---

## The pieces

| File | Job |
|---|---|
| `lib/organizations.ts` | All workspace HTTP. Nothing else calls these endpoints. |
| `context/OrgListProvider.tsx` | Loads your list of workspaces once, after login. |
| `context/useOrgList.ts` | Read that list from anywhere. |
| `context/useCurrentOrg.ts` | Read the workspace you are in. Throws outside `OrgLayout`. |
| `components/OrgRedirect.tsx` | Handles `/`: works out where to send you. |
| `components/OrgLayout.tsx` | Turns `:orgId` into a real workspace. The important one. |
| `components/NoAccessScreen.tsx` | Workspace isn't yours, or doesn't exist. |
| `components/NoOrganizationsScreen.tsx` | You have no workspaces at all. |
| `components/Header/OrgSwitcher.tsx` | The dropdown. |
| `components/CreateOrgModal.tsx` | Create a shared workspace. |

### Why the list and the current workspace are separate contexts

The reason is **placement**:

- `OrgRedirect` needs the list at `/`, **before any `:orgId` exists**. So the list has
  to be provided *above* the `/o/:orgId` route.
- Above that route, `useParams()` cannot see `:orgId`. The current workspace can only
  be resolved *at or below* it.

One provider cannot be in both places.

---

## What happens when you switch

1. You click a workspace. `navigate("/o/2")`.
2. The URL changes; React Router re-renders the `/o/:orgId` branch.
3. `OrgLayout` finds id `2` in the loaded list. **No network request** — it is already
   in memory.
4. Header and sidebar stay mounted. They hold nothing workspace-specific.
5. The page area is rebuilt, dropping the old filters, search text and page number.

### Three details that look like accidents

**`String(o.id) === orgId`** — anything from the URL is a **string**, `org.id` is a
**number**. `===` across types is always false, so you would get "workspace
unavailable" for a valid workspace, with no error anywhere.

**`key={orgId}` on `<main>`** — changing a React `key` throws the old component away
and builds a fresh one. That is what clears the previous workspace's page state. It
sits on `<main>`, not on the whole layout, so the header and sidebar survive; higher up
it made the screen flicker on every switch.

**Relative sidebar links** (`to="transactions"`, not `to="/transactions"`) — a relative
link is recalculated on every render against the current address, so the links follow
the new workspace without remounting. They are not fixed when the sidebar is created.

---

## Rules that must not be broken

- **`NoAccessScreen` never redirects.** It links back to `/`. If it redirected,
  `/` → `/o/5` → no access → `/` would loop forever and freeze the tab. Exactly one
  side of that pair moves, and it is `OrgRedirect`.
- **Never build a URL from a workspace that might not exist.** Check `if (!target)`
  *before* writing `` `/o/${target.id}` ``. `target?.id` yields `"/o/undefined"` — a
  real address that leads nowhere.
- **Keep the providers inside `ProtectedRoute`**, so logging out unmounts them and one
  user's list can't survive into the next user's session.

---

## What still needs to be done

### Backend — the finance endpoints

The finance models exist; none of them have views yet. Every new one names its
workspace in the address:

```
GET /api/organizations/2/transactions/
```

The plumbing for this is already in place. `IsOrgMember` (`core/permissions.py`) reads
`view.kwargs["org_id"]` and checks membership *before* the handler runs, and Django
passes the same capture to the handler as a kwarg to filter on. So each scoped route
is: mount it under `organizations/<int:org_id>/`, set
`permission_classes = [IsAuthenticated, IsOrgMember]`, take `org_id`, filter by it.

> **IMPORTANT:** scope from the URL, never from the session. A view that receives
> `org_id` but forgets `IsOrgMember` still runs its queries perfectly — and hands any
> logged-in user any workspace's money. The permission class is the only thing
> standing between the two.

### Frontend

1. **Add a central `fetch` helper.** Attach cookies and CSRF automatically, and throw
   typed 403 errors.
2. **Handle 403s with `errorElement`.** Catch access errors at the `/o/:orgId` route
   level to show `NoAccessScreen`.
3. **Use route `loader`s for page data**, instead of `useEffect`. Loaders read URL
   params directly and integrate properly with `errorElement`, which never catches
   `useEffect` errors.
4. **Connect real data.**

---

## What `OrgLayout` looks like

No effects, no waiting, no network call:

```tsx
export function OrgLayout() {
  const { orgId } = useParams();
  const { organizations, loading } = useOrgList();
  const org = organizations.find((o) => String(o.id) === orgId);

  if (loading) return <div>Loading…</div>;
  if (!org) return <NoAccessScreen orgId={orgId} />;

  return (
    <CurrentOrgContext.Provider value={org}>
      <AppLayout />
    </CurrentOrgContext.Provider>
  );
}
```

Switching is instant — the workspace is found in a list already in memory. Membership
is checked per request, so it can't go stale. Two tabs don't interfere, because nothing
workspace-shaped lives in the session; `tests/organizations.spec.ts` asserts exactly
that.

