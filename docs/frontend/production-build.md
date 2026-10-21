# Checking the Production Build

The local stack serves the frontend from the Vite dev server, and so does
the deploy today — the multistage build that would serve the bundle is
planned, not shipped (see
[backend-integration.md](backend-integration.md#production-the-multistage-build)).
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
