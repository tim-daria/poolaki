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

The two-tabs row describes **the finished design**. Until the bridge is gone, tabs still
share one server-side workspace — see [The bridge](#the-bridge-temporary).

The payoff is how little the switcher needs. In `OrgSwitcher.tsx`, clicking a
workspace calls `navigate()` and nothing else — no loading flag, no undo-on-failure,
no cache clearing. `OrgLayout` handles all of it once, because it already has to work
for a pasted URL and a refresh. One code path, three entry points.

---

## The route map

```
/login  /register  /terms  /policy      only when logged OUT
/oauth-callback                         social login return

/                                       → redirects to /o/<your last workspace>
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
6. *(Temporary)* the page area waits one request while the backend catches up.

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

## The bridge (temporary)

The one knowingly unfinished part.

**The backend doesn't know about the URL yet.** It keeps the current workspace in the
Django *session* — one value per logged-in user:

```
POST /api/organizations/2/select/    → session["current_organization_id"] = 2
```

So the frontend *pushes* the URL's answer into the session after every switch. That
push is the bridge; waiting for it is the `Loading…` in the page area.

### Why it becomes a problem

One session value per user, many tabs. Given an endpoint that reads it:

```python
org_id = request.session["current_organization_id"]   # ← the dangerous line
```

1. Tab A is at `/o/1`. Session says `1`.
2. Tab B opens at `/o/2`. Session now says `2` — B overwrote it.
3. Tab A still shows workspace 1 everywhere: URL, header, dropdown. Nothing tells it.
4. You add a transaction in tab A. The request doesn't name a workspace, so the backend
   reads the session, finds `2`, and **saves it into workspace 2.**

Money in the wrong workspace, no error anywhere.

### Why it's safe today

**No endpoint reads that value** — it is written and never read:

- the initial-balance endpoint finds the personal workspace from the **user**;
- create and select only **write** it.

> **IMPORTANT:** don't use `current_organization_id` to pick which data to return or
> save — take the workspace from the URL instead. The PR that adds the first such
> endpoint should delete the bridge too.
---

## Rules that must not be broken

- **`NoAccessScreen` never redirects.** It links back to `/`. If it redirected,
  `/` → `/o/5` → no access → `/` would loop forever and freeze the tab. Exactly one
  side of that pair moves, and it is `OrgRedirect`.
- **Never build a URL from a workspace that might not exist.** Check `if (!target)`
  *before* writing `` `/o/${target.id}` ``. `target?.id` yields `"/o/undefined"` — a
  real address that leads nowhere.
- **Check the remembered workspace against the list.** The session outlives membership,
  so it can still name a workspace you were removed from. `OrgRedirect` looks it up
  first and falls back to the personal one.
- **Keep the providers inside `ProtectedRoute`**, so logging out unmounts them and one
  user's list can't survive into the next user's session.

---

## What still needs to be done

### Backend — small, mostly new code

Take the workspace from the address instead of the session:

```
GET /api/organizations/2/transactions/
```

Before a view runs, check the user is a member of the workspace named in the URL.
That is one permission class, one mixin every scoped view inherits, and one line per
route. No existing endpoint changes.

### Frontend — once the backend is ready

1. **Remove the bridge.** Delete the sync `useEffect`, the flags (`syncedOrgId`,
   `deniedOrgId`) and the `syncing` prop — about 15 lines. The `Loading…` on switch
   goes with them.
2. **Make `select/` background-only.** Fire it on switch without waiting for it; it
   only saves the default workspace for the next login.
3. **Add a central `fetch` helper.** Attach cookies and CSRF automatically, and throw
   typed 403 errors.
4. **Handle 403s with `errorElement`.** Catch access errors at the `/o/:orgId` route
   level to show `NoAccessScreen`.
5. **Use route `loader`s for page data**, instead of `useEffect`. Loaders read URL
   params directly and integrate properly with `errorElement`, which never catches
   `useEffect` errors.
6. **Connect real data.**

---

## What the finished version looks like

`OrgLayout` — no effects, no waiting, no network call:

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

Switching becomes instant — the workspace is found in a list already in memory.
Membership is checked per request, so it can't go stale. Two tabs stop interfering,
because every request names its workspace.

Nothing else changes: routes, providers, dropdown, redirect and `key`-based clearing
all stay. That is the reason for putting the workspace in the URL now rather than later.
