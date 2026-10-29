# How the frontend talks to Django

Everything the React app knows about the backend fits on one page: one
origin, a session cookie, a CSRF header, and one shape for every API
function. This page explains each, says where it lives, and ends with what
the planned production build will change.

---

## One origin

The browser only ever talks to one host. Caddy (`backend/caddy/Caddyfile`)
listens on `poolaki.localhost:80` (published as `:8080`) and on `poolaki.de`,
and routes by path prefix:

| Path                                                               | Goes to                               |
| ------------------------------------------------------------------ | ------------------------------------- |
| `/api/v1/*`, `/_allauth/*`, `/admin/*`, `/accounts/*`, `/static/*` | `backend:8000` (Django)               |
| everything else                                                    | `frontend:5173` (the Vite dev server) |

From the browser's point of view Django does not exist; `/api/v1/…` is just a
path on the page's own origin. That is why nothing in `src/` names a backend
host — every call is a relative URL like `fetch("/api/v1/organizations/")`.

Same-origin is also what makes cookie-based auth simple. Cookies are scoped to
an origin, so the session cookie rides along on every API request with no
CORS negotiation. (Django's `settings.py` still lists `CORS_ALLOWED_ORIGINS`,
but `corsheaders` is not installed; that block is inert and can go.)

`vite.config.ts` has a `server.proxy` block for `/api` and `/_allauth` with
the same targets. That is the same routing one layer down, for running
`npm run dev` on the host without Caddy, and for CI, where
`docker-compose.ci.yml` publishes `:5173` and `:8000` directly. Caddy stays up
in CI as well, because its Coraza WAF can reject requests the app considers
valid, and that has to be tested.

**Consequence for new endpoints:** a new backend path prefix must be added to
both the Caddyfile and `vite.config.ts`'s proxy, or it will 404 in one of the
two setups.

---

## Authentication: a session cookie

Poolaki uses Django sessions, not JWTs. On login Django sets a `sessionid`
cookie; the browser sends it automatically; `AuthenticationMiddleware` turns it
into `request.user`. The frontend never holds a token and never reads the
cookie — it is `HttpOnly`.

The login, logout and session endpoints are not written by the project. They
come from **django-allauth in headless mode** (`HEADLESS_ONLY = True`, mounted
at `/_allauth/` in `django_project/urls.py`): allauth serves JSON and the React
app owns the screens. The frontend calls:

| Call                                                          | Where in `src/`                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET /_allauth/browser/v1/auth/session` — "am I signed in?"   | `context/AuthContext.tsx`, once on app boot                                   |
| `POST /_allauth/browser/v1/auth/login`                        | `pages/Login/Login.tsx`                                                       |
| `POST /_allauth/browser/v1/auth/signup`                       | `pages/Register/Register.tsx`                                                 |
| `DELETE /_allauth/browser/v1/auth/session` — logout           | `context/useLogout.ts`                                                        |
| `POST /_allauth/browser/v1/account/password/change`           | `lib/account.ts`                                                              |
| `POST /_allauth/browser/v1/auth/provider/redirect` — 42 OAuth | `lib/socialAuth.ts` (a real form submit, so the browser follows the redirect) |

`AuthProvider` holds `{ user, loading }`. While the session check is in
flight, `loading` is true and both route guards render `null`, which is why a
refresh never flashes the login page. `ProtectedRoute` redirects to `/login`
when there is no user; `GuestRoute` redirects to `/` when there is one. The
guards are the whole client-side auth story: everything below `ProtectedRoute`
in `routes.tsx` may assume `user` exists. The server re-checks on every
request regardless (`IsAuthenticated`, `IsOrgMember` in `core/permissions.py`);
the guards are UX, not security. The same gating is why a full reload loads in
series rather than in parallel — see "Why a reload shows Loading…" in
[routing.md](../frontend/routing.md).

`useLogout` sends the `DELETE` _before_ clearing the local user. Order
matters: `setUser(null)` unmounts the protected tree, and the request needs
the session's CSRF token first.

Why sessions rather than JWTs: for a single-origin browser app, sessions are
simpler (the browser does the transport), safer (an `HttpOnly` cookie cannot
be read by injected script; a token in `localStorage` can), and revocable
(logout invalidates server-side immediately). JWTs earn their complexity with
multiple clients or multiple origins; Poolaki has neither.

### Where the session lives

Neither cookie is in localStorage. `sessionid` and `csrftoken` sit in the
browser's cookie store (the "cookie jar"), a per-profile database the browser
keeps on disk and shows in DevTools under Application → Cookies, one panel
away from Local storage. The value of `sessionid` is a random key; the session
itself is a row in Django's `django_session` table that holds the user id. The
browser stores a pointer, the server stores who you are.

localStorage is a different store: a key-value map per origin that a page
writes with `localStorage.setItem()` and reads back with `getItem()`. The two
differ in exactly the ways that matter for a credential:

|              | Cookie store                                 | localStorage                             |
| ------------ | -------------------------------------------- | ---------------------------------------- |
| Who can read | Script never, when the cookie is `HttpOnly`  | Any script running on the origin         |
| Who sends it | The browser, on every request, automatically | Only your own code, copied into a header |
| Lifetime     | The server decides; logout deletes it        | Until cleared, across tabs and restarts  |

The app writes one localStorage key, the setup-banner flag
`home:setup-dismissed:<orgId>` in `pages/Home/Home.tsx`. No credential or
token goes there.

That table is the JWT argument in concrete terms. A token in localStorage is
readable by any injected script and, once copied, works from any machine until
it expires. The session cookie is neither readable nor portable, and the
server can end it at any moment. The one cookie script _can_ read is the CSRF
token, for the reason given in the next section.

---

## CSRF: the double-submit header

Because the session cookie is sent automatically, a request forged from
another site would carry it too. Django's `CsrfViewMiddleware` requires every
mutating request (`POST`, `PATCH`, `DELETE`) to echo the `csrftoken` cookie's
value in an `X-CSRFToken` header. A foreign origin can trigger the cookie but
cannot read it, so it cannot set the header.

| Piece         | Where                                                                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cookie issued | `GET /api/v1/csrf/` (`core/views/utils.py`, `@ensure_csrf_cookie`), called from `Login.tsx` and `Register.tsx` on mount so the cookie exists before the first `POST`. allauth rotates it on login and every later response refreshes it. |
| Cookie read   | `lib/csrf.ts` — `getCsrfToken()`, a regex over `document.cookie`.                                                                                                                                                                        |
| Header sent   | every write in `lib/*.ts`: `headers: { "X-CSRFToken": csrfToken }`.                                                                                                                                                                      |

`CSRF_COOKIE_HTTPONLY = False` in `settings.py` is deliberate and required:
`getCsrfToken()` could not read an `HttpOnly` cookie and every write would 403. It is safe because the CSRF token is not a credential — it proves the
request came from a page that could read the cookie jar, nothing about who
you are. The credential, `sessionid`, stays `HttpOnly`.

Why the check holds: a foreign site can make the browser _send_ our cookies,
but it cannot _read_ them, because cookies are only visible to script on the
origin that set them, and it cannot set a custom header on a cross-site
request, because the browser first asks our server through CORS and is
refused. The only way to read `csrftoken` is to already run script on our
origin, and an attacker in that position can make requests from the page
directly; the token adds nothing they lack. So the two cookies split the job:
`sessionid` says who you are and hides from script, `csrftoken` says the
request came from our page and has to be visible to script for exactly that
reason.

The token is passed into `lib/` functions as a parameter rather than read
inside them, so they are pure and testable in Node (Vitest's environment has
no `document`), and so the signature says which calls need it.

Two adjacent settings worth knowing. `SESSION_COOKIE_SECURE = True` means the
cookie is only sent over HTTPS — it works on `http://poolaki.localhost` only
because browsers treat `*.localhost` as a secure context; on a LAN IP login
will silently fail. `CSRF_COOKIE_SAMESITE = "None"` is looser than a
same-origin app needs and exists for the OAuth round-trip through 42's site.

---

## The `lib/` function: one shape

All HTTP lives in `src/lib/`, one file per resource (`transactions.ts`,
`organizations.ts`, `goals.ts`, `categories.ts`, `balance.ts`,
`notifications.ts`, `reports.ts`, `aiChat.ts`, `account.ts`). Components call
these and never `fetch` directly. Each file has up to five parts:

1. **App types** — the shape the rest of the app uses. A `/** Mirrors … */`
   comment names the Django serializer or view it tracks.
2. **DTO types** — the wire shape, only when it differs from the app shape
   (amounts arrive as `"49.90"` strings; `category_id` becomes `category`).
   Not exported.
3. **`fromDTO` / `toPayload`** — the only code that knows both shapes. When
   wire and app shapes match (`organizations.ts`), these do not exist and
   the function returns `res.json()` directly.
4. **Reads** — take `signal?: AbortSignal`; never a CSRF token (GETs are not
   CSRF-checked).
5. **Writes** — take `csrfToken: string`; set `method`, `Content-Type` and
   `X-CSRFToken`; `JSON.stringify` the body.

The read shape:

```ts
export async function fetchBalance(
  org_id: number,
  signal?: AbortSignal,
): Promise<number> {
  const res = await fetch(`/api/v1/organizations/${org_id}/balance/`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load balance (${res.status})`);
  const data: { balance: string | number } = await res.json();
  return parseMoney(String(data.balance));
}
```

`credentials: "include"` is stated even though same-origin sends cookies
anyway, so the call keeps working if the origin ever splits. `signal` lets the
page cancel the request on unmount or when its inputs change.

The write shape adds three things and a second error branch:

```ts
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
  credentials: "include",
  body: JSON.stringify(toPayload(draft)),
});
if (isRejection(res))
  throw new WorkspaceRequestError(await rejectionMessage(res, "Could not …"));
if (!res.ok) throw new Error(`Failed to … (${res.status})`);
return fromDTO(await res.json());
```

Everything that travels over HTTP is a string: query values are set with
`String(n)`, bodies go through `JSON.stringify`, money is sent as `"49.90"`
because JSON has no decimal type and DRF's `DecimalField` returns strings
(`COERCE_DECIMAL_TO_STRING` is on by default). The backend serializer re-types
on the way in; `fromDTO` re-types on the way back.

### Query parameters

A list endpoint takes its filters as query parameters. The frontend builds
them with `URLSearchParams` and sets only values that differ from the
backend's defaults, so URLs stay short and a backend default change needs no
frontend release. `lib/transactions.ts`'s `fetchTransactionPage` is the
reference: it maps the frontend's filter names (`tab`, `from`, `categories`)
to the serializer's (`entry_type`, `date_from`, `category_id`) in one place,
the same anti-corruption idea as `fromDTO`, applied to the request.

### The error contract

Which rules are checked on which side is in [input-validation.md](input-validation.md).
Two kinds of failure, deliberately kept apart:

- **The user did something fixable** — Django answered `400` or `403` with a
  message meant for the UI ("Name is taken", "You are no longer the owner").
  `lib/apiErrors.ts`'s `isRejection(res)` detects it and `rejectionMessage`
  digs the first string out of whichever body shape DRF sent
  (`{field: [msg]}`, `{detail: msg}`, `{errors: [msg]}`). Each `lib/` file
  throws its own `XRequestError extends Error {}` for this case, so a form can
  `catch` it with `instanceof` and show `e.message` inline.
- **Something is broken** — any other non-OK status, or a network failure.
  A plain `Error` with the status in its message; pages show it in an `Alert`
  or a toast, never as a field error.

`core/exceptions.py` is the backend's single choke point mapping service
exceptions to this contract, which is why one parser handles every endpoint.

---

## The page side

A page or hook consumes a `lib/` function in one `useEffect`:

```ts
useEffect(() => {
  const controller = new AbortController();
  fetchTransactionPage(org.id, filters, controller.signal)
    .then((page) => {
      setData(page);
      setLoadedKey(requestKey);
    })
    .catch((e: unknown) => {
      if (controller.signal.aborted) return; // unmount or input change, not a failure
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    });
  return () => controller.abort();
}, [org.id, filters, requestKey]);
```

Three conventions this encodes. The cleanup aborts the in-flight request when
the inputs change, so a slow response for an old query can never overwrite a
fast one for the current query. After a save or delete the page refetches —
a `version` counter in the dependency array, bumped by the handlers — rather
than patching the local array, because the server owns ordering, paging and
counts. And on refetch the old rows stay on screen (`data` is not reset) with
a `loading` flag derived from "what I have" vs "what I want", so the table
dims instead of flashing empty.

Lists that several pages need (`useCategories`, `useGoals`, `useMembers` in
`src/hooks/`) wrap the same effect once so each page does not repeat it.

There is no data-fetching library. The hand-rolled effect is the same idea
as a TanStack Query key plus `isFetching`; if the app grows past a handful
of pages, that library is the next step, not a second hand-rolled cache.

---

## The AI assistant goes through Django

`lib/aiChat.ts` posts to `/api/v1/organizations/<org_id>/chat/`. Django
validates, checks membership, applies the `ai_chat` throttle (5/min) and
forwards to `ai-service`. The browser never talks to `ai-service` directly:
routing through Django means the session cookie does the authentication and
the frontend needs no second auth scheme. A `503` from the service becomes a
fixed "assistant unavailable" message rather than a field error.

---

## Production: the multistage build (planned, not shipped)

**Today the deploy runs the Vite dev server.** `frontend/Dockerfile` ends in
`entrypoint.sh`, which runs `npm run dev`, and Caddy proxies `poolaki.de` to
`frontend:5173`. It works, but it ships unminified source with HMR attached
and `StrictMode` double-renders, and it is slower than it needs to be.

The planned change is a multistage image: a build stage runs `npm ci` and
`npm run build`, a tiny runtime stage carries only `dist/`, and Caddy serves
those files itself. Sketch:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv/frontend
```

and in the Caddyfile the catch-all block becomes a file server with the SPA
fallback:

```
handle {
    root * /srv/frontend
    try_files {path} /index.html
    file_server
}
```

`try_files … /index.html` is the line that matters. React Router renders
`/o/12/transactions` client-side, but a reload asks Caddy for that path as a
file; without the fallback every deep link 404s.

What does **not** change, and the reason this doc exists: nothing in `src/`.
Every URL is relative, auth is a cookie on the same origin, and the proxy
rules live in Caddy, not in Vite. `vite.config.ts`'s `server` block simply
stops being used in production. The `optimizeDeps` block is a dev-server
setting too; the chunking in the bundle comes from the `lazy:` route imports
in `routes.tsx`.

Until the multistage build lands, [production-build.md](../frontend/production-build.md)
explains how to serve the real bundle locally for performance checks.

---

## Adding an endpoint: the checklist

1. Backend: view under `organizations/<int:org_id>/…`, `permission_classes =
[IsAuthenticated, IsOrgMember]`, a serializer, a test.
2. Caddyfile and `vite.config.ts` already cover `/api/v1/*`; a new top-level
   prefix needs both.
3. `src/lib/<resource>.ts`: app type with its `Mirrors` comment, DTO and
   `fromDTO` only if shapes differ, read with `signal`, write with
   `csrfToken`, `XRequestError` for 400/403.
4. A Vitest file next to it for any pure part (`toPayload`, a query builder).
5. The page: one effect, `AbortController`, three render branches (error,
   first load, data), refetch on mutation.
