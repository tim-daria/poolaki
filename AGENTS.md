<details>
<summary><strong>Code Style &amp; Guidelines: Comments</strong></summary>

All code comments must be concise, direct, and technically precise. Avoid verbose explanations, narrative prose, and redundant implementation details.

## Core Rules

1. **File-Level Overview**
   * Every file must start with a concise header (1–3 sentences) defining its primary responsibility and scope.
   * **TypeScript**: Use `/** @file ... */` at the very top.
   * **Python**: Use a top-level module docstring `"""..."""` as the first statement.

2. **Explain the "Why", Not the "How" or "What"**
   * Do not restate what static types, function signatures, or self-explanatory code already show.
   * Document non-obvious constraints, edge cases, and business logic invariants.

3. **No Framework or Database Lore**
   * Do not document framework defaults, database flags, or ORM internal settings unless critical to the caller.
   * Focus strictly on contract guarantees and preconditions.

4. **No Storytelling or UI Scenarios**
   * Do not write hypothetical user flows or narrative bug post-mortems.
   * State the technical rule directly.

5. **Syntax & Formatting**
   * **TypeScript / TSX**:
     * File header: `/** @file ... */`
     * TSDoc: `/** ... */` (1–2 sentences for types/functions). Avoid redundant `@param` if TypeScript types are self-describing.
     * Inline: `// ...` (only for non-obvious calculations or workarounds).
   * **Python**:
     * Module docstring: `"""Single-line or concise summary."""` at line 1.
     * Function docstrings: Follow PEP 257 / Google style (`Args:`, `Returns:` only when behavior is non-obvious).
     * Inline: `# ...`

6. **Section Dividers**
   * Use banner comments only in large files (100+ lines) with distinct logical stages.
   * **TypeScript**:
     ```typescript
     /* ---------------------------------- */
     /*             Section Name           */
     /* ---------------------------------- */
     ```
   * **Python**:
     ```python
     # ------------------------------------ #
     #              Section Name            #
     # ------------------------------------ #
     ```
   * Do not use in short files (< 100 lines) or single-purpose components.

</details>

<details>
<summary><strong>Testing</strong></summary>

### Vitest — unit tests

#### What to test

- **Utilities / helpers** — test all branches, edge cases, and error paths. This is the highest priority for unit tests.
- **Hooks** — test behaviour, not implementation. Use `renderHook` from `@testing-library/react`.
- **React components** — test user-visible behaviour: what renders, what happens on interaction. Do not test internal state or implementation details.
- **API layer / fetchers** — mock `fetch` or the HTTP client; test that the right arguments are passed and responses are handled correctly.

#### Rules

```ts
// ✅ Structure: describe + it, AAA pattern
describe('formatDate', () => {
  it('formats a date in Russian locale', () => {
    // Arrange
    const date = new Date('2024-01-15');
    // Act
    const result = formatDate(date, 'ru');
    // Assert
    expect(result).toBe('15 января 2024');
  });

  it('returns empty string for null input', () => {
    expect(formatDate(null)).toBe('');
  });
});
```

```ts
// ✅ Components: query by role/label/text — never by className or data-testid unless no semantic alternative
render(<LoginForm />);
await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
expect(screen.getByText('Welcome')).toBeInTheDocument();
```

```ts
// ✅ Mocks: always reset after each test
afterEach(() => vi.restoreAllMocks());

const spy = vi.spyOn(apiModule, 'getUser').mockResolvedValue({ id: 1 });
```

```ts
// ✅ Parametric tests with it.each
it.each([
  [[], 0],
  [[1, 2, 3], 6],
  [[-1, 1], 0],
])('sum(%j) = %i', (input, expected) => {
  expect(sum(input)).toBe(expected);
});
```

#### Do not

- `await vi.waitFor(() => {})` or `setTimeout` — if you need to wait, something is wrong with the async handling
- Test private methods or internal state directly
- Put multiple unrelated assertions in one `it` block
- Use magic numbers — extract named constants
- Leave `vi.mock()` without a corresponding `vi.restoreAllMocks()` in `afterEach`

---

### Playwright — E2E tests

#### What to test

Cover **critical user flows** only — not every UI detail. Examples:
- Authentication (login, logout, session expiry)
- Core business flows (checkout, form submission, key CRUD operations)
- Access control (protected routes, role-based UI)

Do not write E2E tests for things already covered by unit tests (formatting, validation logic, etc.).

#### Rules

```ts
// ✅ Use semantic selectors
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByLabel('Email').fill('user@example.com');
await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
```

```ts
// ✅ Avoid UI login — use storageState for auth
// In playwright.config.ts:
use: { storageState: 'e2e/.auth/user.json' }

// In global setup:
await page.context().storageState({ path: 'e2e/.auth/user.json' });
```

```ts
// ✅ Use test.step for long flows
await test.step('Fill in the registration form', async () => { ... });
await test.step('Submit and verify confirmation', async () => { ... });
```

```ts
// ✅ Page Object Model for reused interactions
class CheckoutPage {
  constructor(private page: Page) {}

  async fillShipping(address: Address) { ... }
  async confirmOrder() { ... }
  async expectOrderConfirmed() { ... }
}
```

#### Do not

- `page.waitForTimeout(N)` — use `expect(...).toBeVisible()` or `waitForResponse` instead
- Make tests depend on each other or on shared mutable state
- Test the same logic already covered by a unit test
- Write one giant E2E test that covers the entire app

---

### Naming conventions

| Type | Pattern | Example |
|---|---|---|
| Unit test file | `*.test.ts` / `*.test.tsx` | `useAuth.test.ts` |
| E2E spec file | `*.spec.ts` | `auth.spec.ts` |
| Test suite | `describe('subject', ...)` | `describe('useAuth', ...)` |
| Test case | `it('does X when Y', ...)` | `it('redirects to login when session expires', ...)` |

Test names must read as plain English sentences that describe **behaviour**, not implementation.

</details>

<details>
<summary><strong>Code Review</strong></summary>

Every code review, whether of a PR, a branch or the current diff, follows [REVIEW.md](REVIEW.md).

- Apply its standards and approval bar in full; do not fall back to a lighter review because the diff is small.
- Order findings as REVIEW.md prescribes: structural regressions and missed simplifications first, legibility nits last.
- Verify claims against the codebase (routes, payload shapes, existing helpers) before reporting them, and cite files with line numbers.
- Check the changes against the Comments and Testing rules above as part of the review.

</details>

