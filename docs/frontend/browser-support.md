# Browser support

What the app is verified on, how that verification is run, and the limitations
that are known. Two kinds of evidence back it: the automated Playwright suite,
which runs the same specs on each browser engine, and a manual pass through the
user-facing flows in real browsers.

## Supported browsers

| Browser               | Engine   | Evidence                                      |
| --------------------- | -------- | --------------------------------------------- |
| Chrome, Brave, Opera  | Chromium | e2e suite on Chromium, manual pass per browser |
| Firefox               | Gecko    | e2e suite on Firefox, manual pass              |
| Safari                | WebKit   | manual pass on `https://poolaki.de` only       |

Edge also runs on Chromium but has not been looked at separately.

## Engine status (automated)

| Engine   | Playwright project | Run by default | Last full run                                  |
| -------- | ------------------ | -------------- | ---------------------------------------------- |
| Chromium | `chromium`         | yes            | green when run on its own                      |
| Firefox  | `firefox`          | yes            | 100 of 101 green on its own, see AI chat below |
| WebKit   | `webkit`           | no, `E2E_WEBKIT=1` | cannot sign in on the local stack, see below |

The two default engines run the full suite: auth, workspaces, invitations,
notifications, transactions, goals, reports, settings, terms and policy pages,
AI chat. The same locators, roles, names and copy are asserted on every
engine, so a passing run means the flows behave the same way and expose the
same accessible structure. Pixel comparison is not part of the suite.

## How to run the matrix

```bash
cd frontend
npx playwright install              # Chromium, Firefox and WebKit binaries, once

npm run test:e2e:chromium           # one engine at a time: this is the reliable way
npm run test:e2e:firefox

npm run test:e2e                    # both engines in one run, see "Load" below
E2E_WEBKIT=1 npm run test:e2e -- --project=webkit   # opt-in, fails at sign-up today
```

Each engine has its own `setup-<engine>` project that registers a shared owner
and saves the session to `frontend/playwright/.auth/owner-<engine>.json`. One
owner per engine keeps each engine's specs under the backend's cap of 10
workspaces per user. See [playwright.md](playwright.md) for the test users.

### Load: why the engines run one at a time locally

The local stack runs Django's development server as a single process behind
Caddy. Sign-up, login and password change each hash a password, which costs
about 0.4 s on this hardware, and the suite does a lot of them. With both
engines in one run and four parallel workers the hashes queue up: login
responses were measured between 2.5 s on average and 5.3 s at the peak, and a
test's 5-second expectation then times out. Every failure seen in three
combined runs traced to this or to the Vault event below, never to a browser.
One engine at a time keeps the backend inside its budget. In CI, `workers` is 1
and both engines run in one go without the problem.

## Manual browser checklist

Run the full list in [manual-checks.md](manual-checks.md) once per browser
and record the result in its table. Safari must be tested on
`https://poolaki.de` through the tunnel: on `http://poolaki.localhost:8080`
Safari drops the Secure cookies and sign-in fails, for the reason given under
WebKit below.

## Known limitations

### WebKit cannot sign in on the local stack

Django sets `sessionid` and `csrftoken` with the `Secure` flag
(`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` in `settings.py`), and the local
stack is served over plain HTTP at `poolaki.localhost:8080` since the tunnel
commit `dd80146e` turned Caddy's automatic HTTPS off. Chromium and Firefox
treat `*.localhost` as a secure context and keep the cookies anyway. WebKit
does not: the CSRF cookie is dropped, the sign-up POST gets a 403, and the
`setup-webkit` project fails before any spec runs. Real Safari behaves the same
way. Two fixes are possible, neither is done yet:

- Serve `poolaki.localhost` over HTTPS again with `tls internal` in
  `backend/caddy/Caddyfile`, publish 443, and add the `https://` origin back to
  `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS`. The tests then run over
  TLS like production (`ignoreHTTPSErrors` is already set).
- Make the two `*_COOKIE_SECURE` settings depend on an environment flag and
  turn them off for the local and CI stacks.

### AI chat: the local stack has no model

`LLM_BASE_URL` in the local `.env` is a placeholder, so the AI service cannot
reach a model and answers 500; Django turns that into a 503 and the drawer
shows "The assistant is unavailable right now". The chat spec asserts
`getByText(/placeholder answer|approach|unavailable/i)` inside the dialog
named "AI Assistant", so the heading never matches and the only text that can
on the local and CI stacks is that error alert: the test confirms the drawer
surfaces the failure, not that a reply renders. A configured model makes the
drawer show a real reply.

### Engine-specific areas worth a manual look

- Native date inputs: each engine renders its own picker; the suite types
  dates, it does not drive the picker UI.
- `dvh` viewport units for the bottom sheets and drawers on phones.
- Print styles of the reports page.

## Issues found and fixed through the matrix

- The toast provider reused one Snackbar and did not restart the auto-hide
  timer when a new message replaced one still showing, so a toast following
  another could disappear almost at once ("Workspace renamed" right after
  "Invitation cancelled"). Fixed in `ToastProvider.tsx` by keying the Snackbar
  per message. Seen on both engines, not engine-specific.
