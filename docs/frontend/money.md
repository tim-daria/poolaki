# Money input & formatting

How an amount gets from a keyboard into the database, and back onto the screen.
Why the rules are these ones, and what is still missing:

---

## The problem

An amount field has to serve two people who type nothing alike.

A German user types `1234,56`. A US user types `1234.56`. A third pastes
`€ 1.234,56` out of a bank statement, and a fourth pastes `1,234.56` out of a
spreadsheet. All four mean the same number, and the database wants one spelling:
`1234.56`.

The naive fix — `<input type="number">` — fails all of them. It refuses to hold
grouped text, it hands back `""` for anything it dislikes instead of the
characters that produced it, and it steps the value on a stray scroll wheel.

So amount fields are **text** fields with rules.

---

## The three limits

| Limit           | Value              | Where it comes from                                          |
| --------------- | ------------------ | ------------------------------------------------------------ |
| Largest amount  | 999,999,999,999.99 | `DecimalField(max_digits=14, decimal_places=2)`              |
| Decimals        | exactly 2          | `decimal_places=2`                                           |
| Smallest amount | 0.01               | a cent is the smallest unit; 0 and negatives are not amounts |

`max_digits=14` counts the cents, so **twelve** of those digits are euros, not
fourteen. See `core.models.Transaction.amount`, `Goal.target_amount` and
`Contribution.amount` — all three columns are the same shape.

Zero is rejected rather than stored: an expense of nothing is a mistake, and the
sign of a transaction lives in `entry_type`, never in `amount`.

**One exception: an opening balance may be zero.** A workspace that starts with
an empty account is an ordinary thing to create, so `CreateOrgForm` validates
with `validateOpeningBalance` (floor 0) while transactions, goal targets and
contributions use `validateAmount` (floor 0.01). Two named functions rather than
a `min` option on one, so that allowing a zero is a deliberate choice of rule and
not a parameter someone can pass by accident. Everything else about the two
fields — the filter, the paste parser, the formatting, the ceiling — is
identical. Negatives are refused in both: the filter never lets a minus sign into
the field, and the paste parser rejects any string containing one.

---

## Typing: one separator, and it is the decimal point

Nobody types thousands separators by hand. So a typed amount is allowed **one**
separator, and whichever key it was — `.` or `,` — it means the decimal point.
There is no ambiguity left to resolve, which is what makes the typing rules a
plain character filter and not a parser.

A character that would break a rule is **dropped**, not rejected: the keystroke
simply does nothing, and the field re-renders with what it already had.

| Keystrokes   | Field holds  | Blur shows (DE)    | Blur shows (US)                    |
| ------------ | ------------ | ------------------ | ---------------------------------- |
| `12.50`      | `12.50`      | `12,50`            | `12.50`                            |
| `12,50`      | `12,50`      | `12,50`            | `12.50`                            |
| `1234.56`    | `1234.56`    | `1.234,56`         | `1,234.56`                         |
| `1000000000` | `1000000000` | `1.000.000.000,00` | `1,000,000,000.00`                 |
| `.5`         | `.5`         | `0,50`             | `0.50`                             |
| `12.`        | `12.`        | `12,00`            | `12.00`                            |
| `12.123`     | `12.12`      | `12,12`            | `12.12` (3rd digit rejected)       |
| `1.234,56`   | `1.23`       | `1,23`             | `1.23` (everything after rejected) |

The last row is the filter working exactly as written, one keystroke at a time:
`1.23` fills the two decimals, so the `4` is dropped; the `,` is a second
separator, so it is dropped; `5` and `6` are each dropped as a would-be _third_
decimal — a dropped character never enters the field, so nothing ever reaches a
fourth. Someone who genuinely has `1.234,56` in front of them pastes it.

`12.` and `.5` are legal _while typing_ and are completed on blur. That is why
the field holds text: neither is a number yet.

The integer side is capped at **twelve** digits, not fourteen. Writing
`max_digits` there is the easy mistake: it would allow fourteen euro digits and
push the overflow onto the server, which is exactly what the filter exists to
prevent.

---

## Pasting: the filter does not apply

Pasted text is already-formatted money from somewhere else, so it is parsed
whole instead of one character at a time.

1. Everything that is not a digit or a separator is stripped first — currency
   symbols, spaces, non-breaking spaces.
2. If **every** separator is the same character and **every** one of them is
   followed by exactly three digits, they are all grouping. A number cannot have
   two decimal points, so this needs no locale and is checked first.
3. Otherwise the **last** separator is the decimal one, and any earlier ones are
   grouping.
4. A **single** separator followed by exactly three digits is the one case
   nothing can settle on its own, and only there does the locale decide.
5. More than two decimals are **rounded** to cents, not truncated — a paste is a
   single action, and silently dropping its tail would change the number without
   the user seeing it.

| Pasted       | Parses to            | Rule                                               |
| ------------ | -------------------- | -------------------------------------------------- |
| `1.234,56`   | `1234.56`            | last separator is decimal                          |
| `1,234.56`   | `1234.56`            | same                                               |
| `1.234.567`  | `1234567`            | uniform separators, all groups of 3 → all grouping |
| `1234.123.4` | `1234123.4`          | last group is not 3 digits → last is decimal       |
| `1.234.56`   | `1234.56`            | groups differ in length → last is decimal          |
| `1.234`      | DE `1234`, US `1.23` | one separator + exactly 3 digits → locale decides  |
| `1.23`       | `1.23`               | one separator + 2 digits → decimal                 |
| `€ 1 234,56` | `1234.56`            | symbols and spaces stripped first                  |
| `-5`         | rejected             | negatives are not amounts                          |

Rule 2 exists because rule 3 alone gets `1.234.567` catastrophically wrong: it
would read the last `.` as a decimal point and store 1,234.57 for a number that
means 1234567 — three orders of magnitude out, and plausible enough on screen to
be saved without a second look. `1,234,567` out of a spreadsheet fails the same
way. Both are ordinary pastes, so the ambiguity test has to look at _all_ the
separators, not just the first one.

A paste that cannot be parsed, or that overflows twelve euro digits, is
**ignored** — the field keeps what it had. Half-applying a paste would be worse
than not applying it.

---

## Display: grouped on blur, raw on focus

- **Blurred**, the field shows the locale format with both decimals always
  present: `1.234,56` in German, `1,234.56` in US.
- **Focused**, it shows the bare number with the locale decimal separator and no
  grouping: `1234,56`.

Grouping is dropped while editing because the separators move as the number
grows — a caret placed after `1.2` in `1.234,56` would land somewhere else after
the next keystroke. Editing raw digits keeps the caret where the user put it.

No `€` in the field: the label carries it.

**Formatting is always German, whatever was typed.** Which separator key the
user pressed decides nothing about the output: the `.` in `12.50` is read as a
decimal point and the field still blurs to `12,50`. There is no keyboard, locale
or browser sniffing anywhere in this code. `MoneyLocale` (`"de" | "us"`) is a
parameter threaded through every function and defaulted to `"de"`, and nothing
currently passes anything else — so today every field is German, and switching
one later is a prop rather than a rewrite.

One consequence worth knowing before it is reported as a bug: the same amount
has two possible field texts depending on history. Type `12.50` and the field
holds `12.50` while you are still in it — the raw keystrokes, separator and all.
Blur and click back in and it holds `12,50`, because the focused view is
rendered from the stored value with the locale separator. The number never
changed; only its spelling did.

---

## Where this lives

```
lib/money.ts                    the rules, with no React in them
  filterTypedAmount             one keystroke → what the field may hold
  parseTypedAmount              field text  → canonical "1234.56"
  parsePastedAmount             pasted text → canonical, or null
  formatAmount / toRawAmount    canonical   → blurred / focused display
  validateAmount                canonical   → error message, or null (floor 0.01)
  validateOpeningBalance        the same, floor 0 — opening balances only

components/Form/useMoneyField.ts   the behaviour: filter, paste, focus, blur
components/Form/MoneyField.tsx     the MUI TextField wearing it
```

Wearing it today: `Modals/TransactionForm` (amount) and `Modals/CreateOrgForm`
(initial balance).

The hook is headless so the rules cannot fork between form stacks: a plain
`<input>` spreads the same return value that `MoneyField` hands to MUI.

### The canonical value

Forms hold `"1234.56"` — never the displayed text. A blurred field reads
`1.234,56`, and if that were the stored value then validation, `toPayload` and
the transactions search box would each have to un-format it. The display string
belongs to the input; everything downstream sees a plain decimal string, which
is also exactly what `toMoneyString` sends.

### Filter and validation split

The typing filter makes an over-long or over-precise amount **unreachable by
keystroke**, so `validateAmount` covers what a character filter cannot see: an
empty field, a zero — perfectly typeable, and not a transaction — and any value
that got in some other way. It checks the maximum too, because a value can also
arrive from a paste or from an edit form seeded by the API.

---

## Still to do

- **Goals.** The goal target and contribution amounts still live in the legacy
  `components/Modals/Modal.tsx`, which is being replaced by `ModalShell` forms.
  They pick up `MoneyField` when that form lands — the field is ready, only the
  form is not.
- **Signup's balance field.** The shared-workspace one is done; the personal
  workspace still asks for a starting balance in `pages/Register`, which goes
  through `lib/initialBalance.ts` and its own `parseFloat`. Same rule as
  `CreateOrgForm` — `MoneyField` plus `validateOpeningBalance`.
- **Table display.** `TransactionsTable` prints `t.amount.toFixed(2)`, so large
  amounts show ungrouped. Moving it to `formatAmount` also means the search box
  in `Transactions.tsx`, which matches against that same `toFixed(2)` string,
  has to decide whether typing `1234` should still find `1.234,56`.
