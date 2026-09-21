# Vitest Unit Tests

Unit tests for the pure modules under `frontend/src`. No DOM, no backend, no
Docker. Playwright covers everything that needs a browser — see
[playwright.md](playwright.md).

---

## Running

```bash
cd frontend

npm run test         # single run
npm run test:watch   # re-run on change
```

Single file or pattern:

```bash
npx vitest run src/lib/money.test.ts
npx vitest run -t "parseTypedAmount"
```

Host `node_modules` may be empty if you only ever run the stack in Docker. Run
`npm ci` first, or run inside the container:

```bash
docker exec nodejs sh -lc 'cd /home/node/app && npx vitest run'
```

---

## Configuration

In the `test` block of [vite.config.ts](../../frontend/vite.config.ts):

| Setting | Value | Reason |
| --- | --- | --- |
| `environment` | `node` | Nothing renders, so no DOM library is installed. |
| `include` | `src/**/*.test.ts` | Keeps the runner out of `tests/`, which is Playwright's. |

The `/// <reference types="vitest/config" />` line at the top of the config is
what types the `test` key.

---

## Conventions

- **Co-located.** `foo.test.ts` sits next to `foo.ts`, imported as `./foo`.
- **`.ts`, never `.tsx`.** A `.tsx` test would need a DOM environment and would
  fall outside `include`.
- **Explicit imports.** `import { describe, expect, it } from "vitest"` — globals
  are off.
- **One `describe` per exported function**, named after it.
- **`@file` docstring** on line 1, as everywhere else in the codebase.

```ts
/** @file Name and username normalisation. */

import { describe, expect, it } from "vitest";
import { formatName } from "./text";

describe("formatName", () => {
  it("collapses internal whitespace and trims", () => {
    expect(formatName("  Weekly   shop \n")).toBe("Weekly shop");
  });
});
```

---

## What belongs here

Pure functions: parsing, formatting, validation, filtering, sorting, error
mapping. Current coverage:

| Module | Under test |
| --- | --- |
| `lib/money` | typed and pasted amount parsing, display, validation |
| `lib/transactionFilters` | `matchesFilters`, `countByTab`, `sortTransactions`, `applyFilters` |
| `lib/transactions` | `toDraft`, `changeType`, `validateDraft`, `describeProblem`, wire format |
| `lib/goals` | `goalById`, `validateGoalDraft` |
| `lib/authErrors` | `authErrorMessage`, `redirectErrorMessage` |
| `lib/categories`, `lib/date`, `lib/initials`, `lib/text`, `lib/avatarColor` | lookup and formatting helpers |
| `pages/Transactions/transactionFilterParams` | `parseFilters`, `serializeFilters` |

Components, hooks, and routing do not. They need a browser; use Playwright.

**If the logic is pure but trapped behind a hook, extract it.** `parseFilters`
and `serializeFilters` were inlined in `useTransactionFilters`, which needs a
router. Moving them to
[transactionFilterParams.ts](../../frontend/src/pages/Transactions/transactionFilterParams.ts)
made them testable and left the hook a thin binding.

Exporting a helper solely for a test is acceptable. Say so in its docstring, as
`describeProblem` does in
[lib/transactions.ts](../../frontend/src/lib/transactions.ts).

---

## CI

Runs in the `frontend` job of [ci.yml](../../.github/workflows/ci.yml), after
ESLint and before the build. No services, no database.

[ci-precheck.sh](../../ci-precheck.sh) runs the same step locally, after the
linter.
