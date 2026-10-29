# Checking the Bundle

The local stack serves the frontend from the Vite dev server, and so does
the deploy today — the multistage build that would serve the bundle is
planned, not shipped (see
[backend-integration.md](../modules/backend-integration.md#production-the-multistage-build-planned-not-shipped)).
This page is about the bundle that `npm run build` produces, which is what
the deploy _will_ serve and what performance should be judged against. The two behave differently
enough that performance and console output should be judged against the
bundle, not the dev server. This page says how to serve the bundle locally
and what to expect.

---

## Dev server versus bundle

|         | Dev server (`npm run dev`)                                                                               | Bundle (`npm run build`)                                                 |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Where   | Every compose profile today, the deploy included. [entrypoint.sh](../../frontend/entrypoint.sh) runs it. | The planned deploy. CI runs the build as a gate only and serves nothing. |
| Modules | Served unbundled and transformed on demand.                                                              | Minified, code-split per route.                                          |
| React   | `StrictMode` renders every component twice.                                                              | Single render.                                                           |
| Extras  | HMR client, source maps, dev-only warnings.                                                              | None.                                                                    |

Anything measured with the Performance panel on the dev server is roughly
double the real cost, and some warnings exist only there.

---

## Serving the bundle locally

Caddy, not Vite, routes `/api` and `/_allauth` to the backend. So the bundle
can take the dev server's place on port 5173 with no proxy configuration:

```bash
cd <repo root>
docker compose stop frontend
docker compose run --rm --use-aliases --entrypoint sh frontend \
  -c 'npm run build && npx vite preview --host 0.0.0.0 --port 5173'
```

Then open <http://poolaki.localhost:8080> as usual.

| Flag              | Reason                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `--use-aliases`   | Keeps the `frontend` name on the network, so Caddy finds the preview container. Without it Caddy answers 502. |
| `--entrypoint sh` | Replaces the dev-server entrypoint for this one container.                                                    |
| `--host 0.0.0.0`  | The preview must listen on the container's network interface, not only on loopback.                           |

The build takes about a minute. Until the preview listens, Caddy answers
502; reload once the terminal shows the `Local:` and `Network:` lines.
`http://localhost:5173` is refused and stays refused: the base compose file
only exposes the port inside the Docker network.

To go back to the dev server, press Ctrl-C in that terminal, then:

```bash
docker compose start frontend
```

---

## What to check

- Open the DevTools console and repeat the interaction that raised a
  question. A warning that disappears here was a dev-server effect.
- For timing, record the interaction in the Performance panel. React
  Profiler is unavailable in the bundle; the flame chart still names the
  component.
- Fix a cost that remains at its root in the component. Do not keep dialogs
  mounted, defer work, or wrap calls to move a cost out of view.

---

## Known: Print on Reports

Chrome logs `[Violation] 'click' handler took ~2000ms` on the Print button
in the bundle too. The handler calls `window.print()`, which is synchronous
by specification: the browser lays the page out for print media, rasterises
the two SVG charts and the web fonts, and builds the preview before the call
returns. That time is the browser's, the handler cannot return sooner, and
deferring the call would only move the message while the wait stayed the
same. The warning is expected and stays.

Measured 2026-10-20: Add transaction and Add goal, which raise the same
warning on the dev server, stay under the 50ms threshold in the bundle.

---

## Known: forced reflow during an interaction

Chrome logs `[Violation] Forced reflow while executing JavaScript took 41ms`
(seen 2026-10-27, dev server). A forced reflow is a layout read, such as
`getBoundingClientRect` or `offsetWidth`, made after the DOM was written and
before the browser got to lay the page out on its own, so the read has to run
layout synchronously. MUI's positioned surfaces do this by design when they
open: `Menu` and `Popover` measure the anchor and the paper, `Snackbar` and
`Dialog` measure for their transitions. The interaction that raised this one
has not been pinned down yet.

To trace it:

1. Reproduce in the bundle preview first (steps above). Development
   builds double React's work and can push an otherwise short layout over the
   50 ms threshold.
2. Record the interaction in the Performance panel. The long "Layout" block
   carries a warning triangle; its summary names the script that forced it
   and the call stack leads to the component.
3. If the stack ends in our code, fix the read at its root: batch the reads
   before the writes, or take the measurement from a resize observer instead
   of on every render. If it ends in MUI's positioning code the cost is the
   library's and the message stays; note the interaction and the time here.

Do not wrap the call in `requestAnimationFrame` or `setTimeout` to make the
message go away. That moves the layout to the next frame; the user waits the
same amount.

---

## Known: Safari and `window.styleMedia`

Safari logs `window.styleMedia is a deprecated draft version of
window.matchMedia API` (seen 2026-10-27). Safari prints it the first time a
script reads `window.styleMedia`, an old WebKit-only object that predates
`matchMedia`. Nothing in `frontend/src` reads it: the four media queries in
the app (`AppLayout`, `useSheet`, which the sheets and drawers share,
`NetBalanceCard` and `Transactions`) go through MUI's `useMediaQuery`, which
calls `window.matchMedia`.
Nothing in the shipped dependencies reads it either; the only occurrences
under `node_modules` are a globals list for ESLint and the React Compiler's
own bundle, neither of which ships to the browser.

The read therefore comes from outside the bundle: a browser extension or
Safari's own developer tooling are the usual sources. Confirm by opening the
bundle preview in a private window with extensions disabled; if the line
is gone there, it is not ours. If it survives, set a breakpoint on
`window.styleMedia` (Sources, "Event Listener Breakpoints" does not cover
it, so use `Object.defineProperty` in the console with a getter that calls
`debugger`) and read the stack. No action in the app until a stack points at
our code or a dependency we ship.
