# Design system

Poolaki's UI is built from one set of design tokens, a small number of
theme-level variants, and a library of reusable components composed on top of
MUI. This page is the inventory: what the tokens are, which components exist,
what each is for, and the rules that keep new UI consistent. How to _use_ the
theme and `sx` day to day is in [mui-and-styles.md](mui-and-styles.md).

Everything here is defined once, in `frontend/src/theme.ts`,
`frontend/src/lib/layout.ts` and `frontend/src/components/`, and consumed by
the pages. MUI is the rendering layer underneath; the tokens, variants,
components and rules are Poolaki's.

---

## Tokens

### Colour

Semantic names, resolved in `theme.ts`. Code refers to the name
(`"primary.main"`, `"text.secondary"`), never the hex, so a colour changes in
one place.

| Token                               | Value                             | Meaning                                                     |
| ----------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| `primary.dark` / `.main` / `.light` | `#494564` / `#5b5477` / `#edecfd` | Brand lavender: shell, selected states, subtle tint         |
| `secondary.main` / `.light`         | `#585a68` / `#b4b5ed`             | Neutral slate and the hover ring                            |
| `accent.main` / `.light`            | `#826ABC` / `#9D84D7`             | Deep and soft lavender for emphasis, transfers, chart ranks |
| `success.main` / `.light`           | `#5b9778` / `#d8f8e8`             | Income                                                      |
| `error.main` / `.light`             | `#ff7070` / `#fae3e3`             | Expense, destructive actions                                |
| `text.primary` / `.secondary`       | `#1c1a20` / `#959698`             | Warm near-black; pure `#000` is avoided on purpose          |
| `background.default` / `.paper`     | `#f5f6fa` / `#ffffff`             | Page ground and card surface                                |
| `divider`                           | `#e0e0e0`                         | Hairlines, outlined controls                                |
| `shadow.main`                       | `rgba(28,26,32,.35)`              | The one soft shadow colour                                  |
| `avatar[]`                          | five palette paths                | Avatar backgrounds by slot, chosen by `lib/avatarColor`     |
| `chart[]`                           | four lavenders, darkest first     | Donut and column series by rank                             |

`cssVariables: true` also exposes every token as `--mui-palette-*` for the
places typed as raw CSS.

### Typography

One family for everything, one for figures:

|         | Stack                                  | Where                                |
| ------- | -------------------------------------- | ------------------------------------ |
| Text    | Plus Jakarta Sans → system-ui → Roboto | every component                      |
| Figures | Geist Mono → ui-monospace → Consolas   | `Money`, amounts, the `mono` variant |

Base size is 18px (16px below 1024px). Variants in use: `h1`–`h3` (600
weight), `body1`/`body2`, `caption`, `subtitle2`, plus two custom ones —
`mono` for standalone figures and `label` (0.72rem, 700, uppercase,
letter-spaced) for table heads and section labels. `button` text is not
uppercased.

### Shape, spacing, elevation

|                       | Value                      | Note                                                                       |
| --------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Base radius           | 8px (`shape.borderRadius`) | `borderRadius: n` in `sx` is `n × 8`                                       |
| Card radius           | 24px                       | `Paper variant="card"`                                                     |
| Dialog / sheet radius | 16px                       | twice the base                                                             |
| Pill                  | `borderRadius: 999`        | every `Button`, chips, segmented controls                                  |
| Spacing unit          | 8px                        | `p: 3` is 24px                                                             |
| Elevation             | 0 everywhere               | the shell is flat; cards use `CARD_SHADOW`, overlays keep MUI's own shadow |

### Breakpoints

Named in `lib/layout.ts`, never written as pixels in a component: `PHONE`
(<600), `TABLET` (≥600), `DESKTOP` (≥1024) for content grids;
`NAV_DESKTOP`/`NAV_MOBILE_QUERY` (860) for header tabs vs bottom bar and side
drawer vs bottom sheet; `PRINT`; `PAGE_PADDING` for the shared page gutter.

### Icons

Material Icons via `@mui/icons-material`, imported per path, one visual
weight throughout; the favicon is `public/favicon.svg`. A sprite of six brand
and social marks (`public/icons.svg`: `github-icon`, `discord-icon`,
`x-icon`, `bluesky-icon`, `documentation-icon`, `social-icon`) exists but is
not referenced anywhere in `src/` — either wire it into the legal notice or
footer it was drawn for, or delete it.

---

## Theme-level variants

Looks that are a _property of a component_, so they live in
`theme.components` and no call site repeats them:

| Variant                         | Gives                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Paper variant="card"`          | 24px radius, responsive padding via `--card-padding`, the soft lift, print-safe border            |
| `Paper variant="clickableCard"` | the card plus pointer, lilac hover ring, keyboard focus outline, darkening `.HomeCard-action` cue |
| `Button` (all)                  | pill, no elevation, 20px horizontal padding                                                       |
| `ToggleButtonGroup` (all)       | the segmented-control track: tinted ground, gapped borderless buttons, primary-filled selection   |
| `Dialog`                        | 16px radius, 8px frame padding; title row is a flex row for the close button                      |
| `Alert`                         | icon aligned to the first text line, so one-line and multi-line alerts both read right            |

---

## Components

Reusable components in `frontend/src/components/`, grouped by role. "Used
by" names who renders the component: the _shell_ is `AppLayout`, the frame
around every signed-in page, mounted once by the route tree; otherwise it is
the number of pages or components that import it, counted at the time of
writing.

### Layout and navigation

| Component                                                     | Purpose                                                                               | Used by                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- |
| `AppLayout`                                                   | The signed-in shell: header, page column, bottom bar, AI drawer, scroll container     | the route tree, once at `/o/:orgId` |
| `Header` + `NavTabs`                                          | Top bar with workspace switcher, notifications, account; page tabs above 860px        | the shell                           |
| `BottomNav`                                                   | The same pages as a bottom bar below 860px                                            | the shell                           |
| `PageHeader` → `PageTitle`, `PageHeading`, `PageActionButton` | Portal slots so every page's title and single primary action render in the same place | 6 pages                             |
| `AuthLayout`                                                  | Centred card shell for the signed-out pages                                           | 4 files                             |
| `ErrorScreen`                                                 | Centred terminal card: route errors, missing or unreachable workspace                 | 4 files                             |

### Surfaces

| Component                                    | Purpose                                                                                                                        | Used by |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `TitledCard` (+ `CardAction`, `CardProblem`) | The titled card used by Overview and Reports; optionally the whole card is a link with a "See all" cue; one-line failure state | 5 files |
| `SettingsCard`, `SettingsRow`, `ComingSoon`  | Settings page building blocks: card, label-and-control row, disabled wrapper                                                   | 2 files |
| `ModalShell`                                 | Frame for every form modal: title, close, close-guard, centred Dialog above 860px and bottom sheet below                       | 7 files |
| `ConfirmDialog`                              | Destructive-action prompt                                                                                                      | 3 files |
| `DiscardChangesDialog` (`CloseGuard`)        | "You have unsaved changes" prompt wired to `useCloseGuard`                                                                     | 6 files |

### Form controls

| Component                      | Purpose                                                                                                  | Used by |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | ------- |
| `TextInput` + `useTextInput`   | Text field with the behaviour in a headless hook                                                         | 2 files |
| `FieldLabel`                   | Label above a control, replacing MUI's floating label                                                    | 6 files |
| `AuthField`                    | Labelled input for the auth pages                                                                        | 2 files |
| `MoneyField` + `useMoneyField` | Locale-aware amount input: typing filter, paste parser, focus/blur formatting (see [money.md](money.md)) | 3 files |
| `IsoDatePicker`                | DatePicker whose value is the ISO string the API stores                                                  | 3 files |
| `Segmented`                    | Exclusive segmented control on the themed `ToggleButtonGroup`; hidden in print                           | 2 files |
| `TransferDirection`            | Two card-like toggles: into a goal or back out                                                           | 1 file  |

### Data display

| Component                                               | Purpose                                                                                                           | Used by   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| `Money`                                                 | Inline figure in the mono face; inherits size and colour                                                          | 14 files  |
| `TransactionList` / `TransactionListItem`               | Compact transaction rows, table-like on wide screens                                                              | 2 files   |
| `GoalProgressBar`                                       | Determinate bar with the real percentage exposed to assistive tech                                                | 2 files   |
| `GoalActivityList`                                      | One goal's contribution history                                                                                   | 1 file    |
| `DonutChart`, `ColumnChart`, `ChartLegend`, `ShareList` | Reports visuals on `@mui/x-charts`, coloured from `palette.chart[]`; lifted shares so a small slice stays visible | 1–2 files |

### Overlays

| Component                        | Purpose                                                                          | Used by    |
| -------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| `AiChatDrawer` + `AiChatMessage` | Assistant conversation; fill-mode sheet on phones (see [drawers.md](drawers.md)) | the shell  |
| `NotificationPanel`              | Notification popover                                                             | the header |
| `GoalInfoCard`                   | A goal's details and activity, fit-mode sheet                                    | 1 file     |

Form modals built on `ModalShell` — `TransactionForm`, `GoalForm`,
`CreateOrgForm`, `RenameOrgForm`, `InvitationForm`, `StartingBalanceForm`,
`ChangePasswordForm` — are features rather than primitives, but each is used
from more than one page.

Supporting hooks in `src/hooks/`: `useSheet`/`useBottomSheet` (overlay shape
per breakpoint), `useRestoreFocus` (focus returns to the opener after the
exit transition), `useElementSize`, `useScrollingDown` (FAB collapses while
reading), `useChartColors`.

---

## Rules

1. **Theme for identity, `sx` for layout.** A look every instance of a
   component should have goes in `theme.components`; where one instance sits
   goes in `sx`. The same `sx` on three instances is a sign it belongs in the
   theme or in a shared `styles.ts`.
2. **Tokens, not values.** Palette paths, typography variants, the spacing
   unit and the named breakpoints. A hex colour or a pixel breakpoint in a
   component is a review comment.
3. **One primary action per page,** rendered through `PageActionButton` so it
   is always in the same place; the Ask-AI button is the shell's.
4. **Overlays take their shape from `useSheet`.** No drawer sets its own
   width, height or radius; the breakpoint decides sheet vs side drawer.
5. **Behaviour in hooks, look in components.** `useMoneyField`,
   `useTextInput`, `useCloseGuard` are headless so the rules cannot fork
   between form stacks.
6. **Accessible by default.** Overlays restore focus on exit; progress bars
   expose real values; clickable cards are real links with `aria-label`;
   segmented controls carry `aria-label` and never deselect to nothing.
7. **Print is a first-class breakpoint.** Cards swap shadow for a hairline
   and avoid page breaks; controls hide under `PRINT`.

---

## Adding a component

Put it in `components/<Area>/` if two or more pages will use it, otherwise
next to the page. Start the file with `/** @file … */`. Compose from MUI
primitives and the tokens above; if you find yourself choosing a colour or a
radius, it is probably already a token. If the new thing is a _look_ for an
existing MUI component rather than a new component, add a theme variant
instead (the `Paper` card variants are the template). Export only components
from `.tsx` files; shared `sx` recipes go in a sibling `styles.ts`.

---

## The custom-made design system requirement

The requirement: _a custom-made design system with reusable components,
including a proper color palette, typography, and icons (minimum: 10
reusable components)_. Point by point:

- **Colour palette** A semantic palette in `theme.ts`: `primary`,
  `secondary`, `success` (income), `error` (expense), `text`, `background`,
  `divider`, plus four custom token groups (`accent`, `shadow`, `avatar[]`,
  `chart[]`). Components reference tokens, not hex values.
- **Typography** Two families (Plus Jakarta Sans for text, Geist Mono
  for figures), a sized heading scale, and two custom variants (`mono`,
  `label`) registered through module augmentation.
- **Icons** One icon set (Material Icons via `@mui/icons-material`)
  used consistently across every component, plus a custom favicon.
- **Reusable components, minimum ten** About thirty components in `src/components/`;
  more than twenty are used from two or more places (`Money` from fourteen,
	`ModalShell` from seven, `FieldLabel` and `DiscardChangesDialog` from six).
	Fifteen of them render with no application state at all.
- **Theme-level variants** Six looks defined once on MUI components
  (`Paper` card variants, pill buttons, the segmented control, Dialog and
  Alert layout), so no call site restyles them.
- **Rules — documented.** Seven conventions above, enforced by review and,
  for breakpoints and tokens, by the fact that the values exist in one file.
- **"Custom-made"** The system is composed on MUI
  rather than written from raw HTML elements. Every token, variant,
  component and rule on this page is defined in this repository and is
  Poolaki's own; MUI supplies the rendering primitives. This is the same
  relationship GitHub's Primer has to React or Linear's UI has to Radix.
