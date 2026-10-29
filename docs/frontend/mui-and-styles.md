# MUI and styling

MUI is a set of React components that read their look from a theme object.
Everything about styling in Poolaki follows from where a given decision is
allowed to live. There are three places, and the skill is choosing the right
one.

---

## How it is wired

`src/main.tsx` wraps the app in `<ThemeProvider theme={theme}>` and
`<CssBaseline />`. ThemeProvider puts the theme in React context so every MUI
component below can read it. CssBaseline is MUI's reset: it removes browser
margins, sets `box-sizing`, and paints the theme's font and background onto
`<body>`.

`src/theme.ts` is one `createTheme({...})` call with four regions:

| Region       | Holds                                | Examples here                                                                                                                           |
| ------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `palette`    | named colours                        | `primary`, `secondary`, `success` (income), `error` (expense), `text`, `divider`, plus custom `accent`, `shadow`, `avatar[]`, `chart[]` |
| `typography` | font stacks and text variants        | `h1`–`h3`, `button` (`textTransform: none`), custom `mono` and `label`                                                                  |
| `shape`      | the base radius                      | `borderRadius: 8`                                                                                                                       |
| `components` | per-component defaults and overrides | `MuiPaper` card variants, pill `MuiButton`, segmented `MuiToggleButtonGroup`, Dialog padding, Alert icon alignment                      |

The `declare module` blocks at the top are TypeScript _module augmentation_:
they teach TS that `palette.accent`, `variant="mono"` and `Paper
variant="card"` exist, so custom keys get autocomplete and type errors like
the built-in ones. Add one block per custom key, once.

`cssVariables: true` makes MUI also emit the palette as CSS custom properties
(`--mui-palette-primary-main` and so on) on `:root`. Theme code that is typed
as raw CSS — `MuiCssBaseline` overrides, the card variants — reads those
variables instead of a theme callback.

`src/index.css` is for the three things MUI cannot express: the Google Fonts
`@import`, the `#root` flex column that `AppLayout` fills, and bare-element
defaults for raw `<h1>`/`<p>` markup. It also still defines the legacy
`--text`/`--tint-*` aliases from the CSS-modules era. No `*.module.css` files
remain, so those aliases and the `h1`/`h2` rules are candidates for deletion
once nothing greps for them.

---

## The three places a style can live

**1. The theme — for what a component _is_.** "Buttons are pills." "Paper
with `variant="card"` has a 24px radius and this shadow." "Alert icons align
to the first text line." These go in `theme.components.MuiX` as
`styleOverrides` (change the look), `defaultProps` (change a default prop —
`elevation: 0` on every Paper) or `variants` (a named look selected by a
prop — `variant="card"` / `"clickableCard"`). Change it once, every instance
follows. **If the same `sx` appears on three instances, it belongs here.**
The `MuiToggleButtonGroup` override is the worked example: the segmented
control look used to be repeated per call site and now exists once.

**2. `sx` — for where _this instance_ sits.** Margin, padding, flex
direction, width, a one-off colour on one cell. `sx` is a prop every MUI
component accepts; it is CSS with theme awareness. Nearly 700 `sx` props in
`src/` is normal — most are two or three layout keys.

**3. A shared `sx` object in a `styles.ts` — for a recipe used by a few
siblings.** `pages/Transactions/styles.ts` exports `tintedWhenActive(active)`;
`components/Settings/styles.ts` exports `settingsColumnSx`. These are plain
objects, spread or passed as `sx`, kept in a separate file so component files
export only components. There is no `styled()` in the codebase, and with a
well-filled theme it has not been needed; reach for it only if a _named_
custom component with baked-in styles becomes necessary.

The rule of thumb, which is general MUI practice: **theme for identity, `sx`
for layout.** If a style would be wrong on a different instance of the same
component, it is `sx`. If it would be wrong _not_ to apply it, it is theme.

---

## Reading `sx`

Most confusion with MUI code is vocabulary. The shorthand keys:

| Key                                            | CSS               | Unit                                                                    |
| ---------------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `m`, `mt`, `mb`, `ml`, `mr`, `mx`, `my`        | margin            | × 8px (`theme.spacing`)                                                 |
| `p`, `pt`, `pb`, `pl`, `pr`, `px`, `py`        | padding           | × 8px                                                                   |
| `bgcolor`                                      | background-color  | palette path                                                            |
| `color`                                        | color             | palette path                                                            |
| `borderRadius: n`                              | border-radius     | × `shape.borderRadius` (8) — `borderRadius: 3` is 24px, `999` is a pill |
| `typography: "label"`                          | the whole variant | a typography variant name                                               |
| `display`, `gap`, `flex…`, `width`, `minWidth` | as written        | plain CSS                                                               |

Values are resolved against the theme:

- A dotted string — `"primary.main"`, `"text.secondary"`,
  `"background.paper"`, `"action.hover"` — is a palette path. Prefer these to
  hex; the hex lives once in `theme.ts`.
- A number on a spacing key is multiplied by 8; on `borderRadius` by the base
  radius.
- An object keyed by breakpoint is responsive: `{ xs: "none", md: "block" }`.
  Poolaki mostly uses the named media-query constants instead (below).
- A function receives the theme: `(t) => t.typography.mono.fontFamily`. The
  `Money` component uses this to force the mono font.
- An array merges several objects: `sx={[frameSx, ...userSx]}`. Components
  that accept an `sx` prop normalise it with `Array.isArray(sx) ? sx : [sx]`.

---

## Breakpoints

Breakpoints are named constants in `src/lib/layout.ts`, not literal pixels in
`sx`:

| Constant                                      | Means                                                  | Use                               |
| --------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| `TABLET` (`≥600px`) / `DESKTOP` (`≥1024px`)   | overview grid columns                                  | `sx={{ [TABLET]: { px: 3 } }}`    |
| `PHONE` (`<600px`)                            | one-column layouts                                     | same                              |
| `NAV_DESKTOP` (`≥980px`) / `NAV_MOBILE_QUERY` | header tabs vs bottom bar; side drawer vs bottom sheet | `useMediaQuery(NAV_MOBILE_QUERY)` |
| `PRINT`                                       | `@media print`                                         | hide controls, fix heights        |
| `PAGE_PADDING`                                | the side padding every page and the header share       | spread into a page's root `sx`    |

The navigation breakpoint is separate from the grid breakpoints on purpose:
the header needs room for four tabs and the switcher, the overview grid needs
room for its columns. See [drawers.md](drawers.md) for how overlays change
shape at `NAV_MOBILE_QUERY`.

---

## The pieces you build with

| Component                                  | Role                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `Box`                                      | a `div` with `sx`                                                                          |
| `Stack`                                    | flex container with a `spacing` prop; use it instead of hand-written flexbox               |
| `Paper variant="card"` / `"clickableCard"` | the one card look; `components/Card/TitledCard` frames it with a title row                 |
| `Typography variant=…`                     | text; custom `mono` (figures) and `label` (uppercase table heads, section labels)          |
| `Button`                                   | pill, no elevation (theme); `variant="contained"` for the page's one primary action        |
| `IconButton`                               | round, unaffected by the Button pill override                                              |
| `Chip`                                     | category labels, active filters; the archive's "Overdraft" chip is the one outlined chip   |
| `ToggleButtonGroup`                        | segmented control by default; `className="cards"` for the outlined direction cards (theme) |
| `Drawer` / `Dialog`                        | overlays; shape and anchor come from `hooks/useSheet` — never set width/height per drawer  |
| `Alert`, toasts via `useToast`             | errors that are not field errors                                                           |

Nearly every page is `Paper > Stack > (Typography | Button | TextField | Table)`.

Charts (`@mui/x-charts`) take resolved colour values, not palette paths,
because they go into SVG attributes; `palette.chart[]` and
`hooks/useChartColors` exist for that.

---

## Icons

Always per path:

```ts
import SearchIcon from "@mui/icons-material/Search";
```

Never `import { Search } from "@mui/icons-material"`. The barrel is ~2000
icons and 6 MB; importing it makes the dev server re-optimise and slows
first paint. `vite.config.ts` pre-bundles `@mui/material` for the same
reason — lazy route chunks would otherwise trigger a re-optimise the first
time they load.

---

## Print

Reports can be printed. Three rules keep that working: the card variants
swap their shadow for a hairline border and set `break-inside: avoid`;
elements that fix a height or must disappear on paper carry their own rule
under the `PRINT` key; and `index.css` drops `#root`'s `min-height` for
print. `window.print()` is synchronous, so the ~2s "click handler took" warning
on the Print button is the browser's own layout time, not app code (see
[production-build.md](production-build.md)).

---

## Adding a style: decision tree

1. Does it describe what every instance of a component should look like?
   → `theme.components.MuiX` (`styleOverrides` / `defaultProps` / `variants`).
   Add a comment saying why it is centralised.
2. Is it a look that several sibling components share but that is not a
   component identity? → a `styles.ts` next to them, exporting a plain `sx`
   object or a function returning one.
3. Is it this instance's position, size or spacing? → `sx` on the instance,
   using palette paths and the named breakpoint constants.
4. Is it something MUI cannot express (fonts, `#root`, print of raw markup)?
   → `index.css`.

If you are about to paste the same `sx` a second time, stop at step 1.
