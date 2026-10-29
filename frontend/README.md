# Poolaki frontend

The browser side of Poolaki: a React single-page app that talks to the Django
API over the same origin. This page is the map; the docs under
[`docs/frontend/`](../docs/frontend/) go deeper on single topics.

| Topic                                                                         | Read                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| How the app talks to Django: proxying, sessions, CSRF, the `lib/` fetch shape | [backend-integration.md](../docs/modules/backend-integration.md) |
| MUI: where a style belongs, the theme, `sx`                                   | [mui-and-styles.md](../docs/frontend/mui-and-styles.md)          |
| Routes, workspaces, the `/o/:orgId` rule                                      | [routing.md](../docs/frontend/routing.md)                        |
| The design system: tokens, variants, the component inventory                  | [design-system.md](../docs/modules/design-system.md)             |
| Drawers and bottom sheets                                                     | [drawers.md](../docs/frontend/drawers.md)                        |
| Money input and formatting                                                    | [money.md](../docs/frontend/money.md)                            |
| Password change: what the browser checks, what Django checks                  | [password-change.md](../docs/frontend/password-change.md)        |
| Unit tests (Vitest)                                                           | [vitest.md](../docs/frontend/vitest.md)                          |
| End-to-end tests (Playwright)                                                 | [playwright.md](../docs/frontend/playwright.md)                  |
| Browser support: engine matrix, manual checklist, known limitations           | [browser-support.md](../docs/frontend/browser-support.md)        |
| Judging performance against the real bundle                                   | [production-build.md](../docs/frontend/production-build.md)      |

---

## Stack

|                                                       |                        | Why                                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 19 + TypeScript                                 | UI                     | With the React Compiler on (`vite.config.ts`), so components and hooks are memoised automatically; `useMemo`/`useCallback` are only written where referential identity is load-bearing. |
| Vite 8                                                | Dev server and bundler | Fast HMR in development; `vite build` produces the static bundle for deploy.                                                                                                            |
| React Router 7                                        | Routing                | Nested layout routes, pathless guards and providers, lazy route chunks. The URL owns the current workspace.                                                                             |
| MUI 9 (`@mui/material`, `x-date-pickers`, `x-charts`) | Components             | One theme in `theme.ts`; no CSS modules, no `styled()`.                                                                                                                                 |
| Vitest + Playwright                                   | Tests                  | Vitest for pure modules, Playwright for anything that needs a browser.                                                                                                                  |
| ESLint + Prettier                                     | Lint and format        | Both run in CI; `npm run lint` and `npm run format:check` locally.                                                                                                                      |

Node 24 (`.nvmrc`). `.npmrc` sets `ignore-scripts=true` as supply-chain
hardening, so a dependency that needs a postinstall step has to be allowed
explicitly.

---

## Running

The frontend normally runs inside the compose stack (see the root
[README](../README.md)); `docker compose up` starts the Vite dev server in the
`frontend` container and Caddy serves everything at
<http://poolaki.localhost:8080>. Host `node_modules` may be empty if you only
ever run the stack in Docker — run `npm ci` once before using the scripts
below on the host.

```bash
cd frontend
npm run dev            # Vite on :5173, proxying /api and /_allauth to the backend
npm run build          # tsc -b && vite build → dist/
npm run preview        # serve dist/ locally
npm run lint           # ESLint
npm run format         # Prettier, in place
npm run format:check   # Prettier, CI mode
npm run test           # Vitest, single run
npm run test:watch     # Vitest, watch
npm run test:e2e       # Playwright
```

`npm run dev` on the host without Caddy needs `BACKEND_URL` pointing at a
reachable Django (default `http://backend:8000` is the Docker network name).

---

## Where things live

```
src/
├── main.tsx            provider stack: Theme → CssBaseline → Localization → Toast → Auth → Router
├── routes.tsx          the route tree; every page is a lazy chunk exporting `Component`
├── routeMeta.ts        reads route `handle` (title, subtitle, assistant, width)
├── theme.ts            the MUI theme: palette, typography, component overrides
├── index.css           what MUI can't express: font @import, #root geometry, bare-element defaults
├── context/            app-wide state: Auth, OrgList, CurrentOrg, Notifications, Toast
├── hooks/              reusable hooks: data loaders (useCategories, useGoals…), layout (useSheet…)
├── lib/                pure TypeScript: API calls, DTO↔model mapping, money/date/text rules. No React.
├── components/         UI shared across pages: AppLayout, Header, BottomNav, PageHeader, Modals/, Form/, Card/…
└── pages/              one folder per route; page-scoped subcomponents sit next to the page
```

The layering rule, in one line each:

- `lib/` knows HTTP and Django's wire format and nothing about React. If it
  needs `useState`, it is in the wrong folder.
- `context/` and `hooks/` know React state and nothing about MUI.
- `components/` and `pages/` render. A component used by two pages goes in
  `components/`; one used by one page stays in that page's folder.

---

## Conventions you will meet in every file

**Every file starts with a `/** @file … */` header** and comments explain
_why_, not what. The full rule set is in the root [AGENTS.md](../AGENTS.md).

**Pages are lazy and export `Component`.**

```ts
function Reports() {
  /* … */
}
export { Reports as Component };
```

React Router's `lazy: () => import("./pages/Reports/Reports")` looks for that
export. Without it the route matches and renders nothing — no error.

**Page title and primary action come from the shell, not the page.** A page
calls `<PageTitle />` and `<PageActionButton onClick={…}>` from
`components/PageHeader`; the title text comes from the route's `handle`. The
Ask-AI button is the shell's too; a route hides it with
`handle: { assistant: false }`.

**Data is fetched in a `useEffect` with an `AbortController`,** through a
`lib/` function, never with a bare `fetch` in a component. The shape, with
the reasons, is in
[backend-integration.md](../docs/modules/backend-integration.md#the-page-side).

**The current workspace comes from `useCurrentOrg()`.** It throws outside
`/o/:orgId`, on purpose. Never pass an org id down as a prop from the URL
yourself.

**Styles: theme for identity, `sx` for layout.** Details and the `sx`
vocabulary in [mui-and-styles.md](../docs/frontend/mui-and-styles.md).

**Icons are imported per path:** `import SearchIcon from
"@mui/icons-material/Search"`, never from the package barrel.

**Breakpoints are named constants in `lib/layout.ts`** (`TABLET`, `DESKTOP`,
`PHONE`, `NAV_MOBILE_QUERY`, `PRINT`), not literal pixel values in `sx`.

---

## Testing and CI

CI's `frontend` job (`.github/workflows/ci.yml`) runs, in order: Prettier,
ESLint, Vitest, `npm run build`. The build step is what catches a missing
dependency that stale local `node_modules` would hide. Playwright runs in the
separate `e2e` job against the compose stack. `ci-precheck.sh` at the repo
root runs the same checks locally.

---

## Production

Today the `frontend` container runs `npm run dev` in every environment,
including the deploy behind the Cloudflare tunnel. A multistage Docker build
(`vite build`, then Caddy serving `dist/` with an SPA fallback) is planned;
what changes and what doesn't is written up in
[backend-integration.md](../docs/modules/backend-integration.md#production-the-multistage-build).
Until then, [production-build.md](../docs/frontend/production-build.md) says
how to serve the real bundle locally to judge performance.
