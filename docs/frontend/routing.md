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

|                             | in the URL            | in memory only          |
| --------------------------- | --------------------- | ----------------------- |
| Send a link to a teammate   | works                 | they see their own data |
| Back button                 | previous workspace    | stale data              |
| Two tabs                    | one workspace each    | they fight each other   |
| Refresh                     | stays put             | may jump elsewhere      |
| Clearing old data on switch | automatic (new route) | manual, easy to forget  |

The payoff is how little the switcher needs. In `OrgSwitcher.tsx`, clicking a
workspace calls `navigate()` and nothing else — no loading flag, no undo-on-failure,
no cache clearing. `OrgLayout` handles all of it once, because it already has to work
for a pasted URL and a refresh. One code path, three entry points.

---

## The route map

```
/login  /register                       only when logged OUT
/terms  /policy                         any state — the sidebar links here while logged in
/oauth-callback                         social login return

/                                       → redirects to /o/<your personal workspace>
/o/:orgId                               everything below is scoped to this workspace
    /o/:orgId                               Overview
    /o/:orgId/transactions                  Transactions
    /o/:orgId/savings                       Goals
    /o/:orgId/reports                       Reports
    /o/:orgId/settings                      Account and workspace list
    /o/:orgId/settings/workspaces/:id       One workspace's settings
```

```
<App>                           sets document.title from the route `handle`
├── <GuestRoute>                logged in? yes → /
└── <ProtectedRoute>            logged in? no  → /login
    └── <OrgListProvider>       loads your list of workspaces, once
        └── <NotificationProvider>
            ├── <OrgRedirect>   handles "/"
            └── <OrgLayout>     handles "/o/:orgId"
                └── <AppLayout> header (tabs above 860px, bottom bar below), page area, AI drawer
                    └── the page
```

`GuestRoute`, `ProtectedRoute`, `OrgListProvider` and `NotificationProvider` are
**pathless routes**: they add a component to the tree without adding a URL
segment. That is how a guard or a provider gets scoped to a group of pages.
Each route's `handle` carries its title, subtitle and two layout flags
(`assistant`, `width`), read back by `routeMeta.ts` — see
[../../frontend/README.md](../../frontend/README.md).

---

## The pieces

| File                                   | Job                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/organizations.ts`                 | All workspace HTTP. Nothing else calls these endpoints.                      |
| `context/OrgListProvider.tsx`          | Loads your list of workspaces once, after login.                             |
| `context/useOrgList.ts`                | Read that list from anywhere.                                                |
| `context/CurrentOrgContext.ts`         | The resolved workspace. No setter: it is derived from the URL, never stored. |
| `context/useCurrentOrg.ts`             | Read the workspace you are in. Throws outside `OrgLayout`.                   |
| `components/OrgRedirect.tsx`           | Handles `/`: works out where to send you.                                    |
| `components/OrgLayout.tsx`             | Turns `:orgId` into a real workspace. The important one.                     |
| `components/NoAccessScreen.tsx`        | Workspace isn't yours, or doesn't exist.                                     |
| `components/NoOrganizationsScreen.tsx` | You have no workspaces at all.                                               |
| `components/Header/OrgSwitcher.tsx`    | The dropdown.                                                                |
| `components/Modals/CreateOrgForm.tsx`  | Create a shared workspace.                                                   |

### Why the list and the current workspace are separate contexts

The reason is **placement**:

- `OrgRedirect` needs the list at `/`, **before any `:orgId` exists**. So the list has
  to be provided _above_ the `/o/:orgId` route.
- Above that route, `useParams()` cannot see `:orgId`. The current workspace can only
  be resolved _at or below_ it.

One provider cannot be in both places.

---

## What happens when you switch

1. You click a workspace. `navigate("/o/2")`.
2. The URL changes; React Router re-renders the `/o/:orgId` branch.
3. `OrgLayout` finds id `2` in the loaded list. **No network request** — it is already
   in memory.
4. The header (with the page tabs, or the phone bottom bar) stays mounted. It holds nothing workspace-specific. The AI chat drawer is keyed by `orgId` too, so a conversation never outlives its workspace.
5. The page area is rebuilt, dropping the old filters, search text and page number.

### Three details that look like accidents

**`String(o.id) === orgId`** — anything from the URL is a **string**, `org.id` is a
**number**. `===` across types is always false, so you would get "workspace
unavailable" for a valid workspace, with no error anywhere.

**`key={orgId}` on `<main>`** — changing a React `key` throws the old component away
and builds a fresh one. That is what clears the previous workspace's page state. It
sits on `<main>`, not on the whole layout, so the header survives; higher up
it made the screen flicker on every switch.

**Relative navigation links** (`to="transactions"`, not `to="/transactions"`) — a relative
link is recalculated on every render against the current address, so the links follow
the new workspace without remounting. They are not fixed when the tabs are created.

---

## Why a reload shows "Loading…"

A full page load (refresh, pasted link) passes through four gates, and each one
starts only when the previous answer has arrived:

1. **Router init.** The matched page is a `lazy:` chunk, so React Router renders
   `hydrateFallbackElement` ("Loading…", `routes.tsx`) until it downloads. The
   session request starts in parallel: `AuthProvider` sits above the router in
   `main.tsx`.
2. **Session.** `ProtectedRoute` renders `null` until `/auth/session` answers.
   Blank page.
3. **Workspace list.** `OrgListProvider` mounts only now and fetches the list.
   `OrgLayout` shows "Loading…" meanwhile.
4. **Page data.** The page mounts only now and fetches. Spinner inside the shell.

Three serial round trips plus a chunk download before anything shows. In-app
navigation skips 1–3 because those providers stay mounted, which is why a tab
switch only shows the in-page spinner.

**The order is not what protects access.** The guards decide what to _render_,
not what to _request_. Every scoped endpoint re-checks `IsAuthenticated` and
`IsOrgMember` on its own; the guards are UX, not security (see
[backend-integration.md](../modules/backend-integration.md)). Sending the workspace or page
requests earlier would only earn a 401/403 in a logged-out browser, and
`ProtectedRoute` would still redirect. Starting them in parallel is safe; it is
just not done yet (see "Open ideas").

Dev only: a reload that happens _by itself_ the first time a page opens is Vite
re-optimizing a dependency missing from `optimizeDeps.include` (`@mui/x-charts`,
per-path icons) — see the comment in
[../../frontend/vite.config.ts](../../frontend/vite.config.ts). The production
build never does this.

---

## Rules that must not be broken

- **`NoAccessScreen` never redirects.** It links back to `/`. If it redirected,
  `/` → `/o/5` → no access → `/` would loop forever and freeze the tab. Exactly one
  side of that pair moves, and it is `OrgRedirect`.
- **Never build a URL from a workspace that might not exist.** Check `if (!target)`
  _before_ writing `` `/o/${target.id}` ``. `target?.id` yields `"/o/undefined"` — a
  real address that leads nowhere.
- **Keep the providers inside `ProtectedRoute`**, so logging out unmounts them and one
  user's list can't survive into the next user's session.
- **Order the list refresh around navigation by which side would lose the workspace.**
  After _creating_ one, refresh the org list, then navigate (`CreateOrgForm`): `OrgLayout`
  resolves the org out of the list, so navigating first shows `NoAccessScreen` for the
  workspace just made. After _leaving or deleting_ one, navigate first, then refresh
  (`OrgSettings.tsx`): refreshing first drops the org from the list and the page still
  showing it, or the whole `/o/:orgId` branch when it is the current workspace, falls
  into `NoAccessScreen` before the navigation lands.

---

## Open ideas

The finance endpoints all exist now and follow the scoped shape:
`organizations/<int:org_id>/…` with `permission_classes = [IsAuthenticated,
IsOrgMember]`. How the frontend calls them is in
[backend-integration.md](../modules/backend-integration.md).

> **IMPORTANT:** scope from the URL, never from the session. A view that receives
> `org_id` but forgets `IsOrgMember` still runs its queries perfectly — and hands any
> logged-in user any workspace's money. The permission class is the only thing
> standing between the two.

Two things considered and not done, kept here so they are not re-proposed
without the trade-off:

- **Start the workspace-list request alongside the session check.** Small:
  `AuthContext`, `OrgListProvider`, perhaps a shared bootstrap helper. Removes
  one of the three serial round trips on reload (see "Why a reload shows
  Loading…") with the render gates untouched. Not done for the MVP: the list
  request has to fail silently before login, and the provider must still
  unmount on logout ("Keep the providers inside `ProtectedRoute`"), so the fetch
  and the provider would have to be split. Revisit when reload time is a
  measured complaint rather than a known one.
- **Route `loader`s instead of `useEffect`**, for session, workspace list and
  page data alike. Loaders read URL params directly, integrate with
  `errorElement`, and React Router would run all three in parallel during init
  and render once with data — the full fix for the serial reload. Not adopted:
  it touches every page's fetch code and both providers (tens of files), there
  is no time for that in an MVP, and every page already shares one effect shape
  with abort and refetch-on-mutation; loaders would move the loading state out
  of the page where the "keep old rows while refetching" behaviour lives.
- **A 403 `errorElement` on `/o/:orgId`.** Today a 403 from a scoped endpoint
  surfaces as the page's own error state; `NoAccessScreen` only covers an org
  missing from the list. Worth doing if membership revocation mid-session
  becomes a real case.

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
