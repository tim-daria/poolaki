# Drawers and bottom sheets

How an overlay panel is shaped on each screen size, and why the three panels
that exist do not all behave alike.

---

## One hook decides

Every drawer takes its anchor and paper styles from `useSheet` in
`frontend/src/hooks/useSheet.ts`. Its sheet half is `useBottomSheet`, which
`useSheet` composes; the form modals (`ModalShell`) use that half directly,
because above the breakpoint they are centred Dialogs, not side drawers. No
component sets a drawer's height, width or corner radius itself. The rule has to live in one place or it stops being a
rule: the first panel to override it becomes the template for the next.

Below the navigation breakpoint (980px, `NAV_MOBILE_QUERY`), where the bottom
bar replaces the header tabs, a drawer is a **bottom sheet**. From there on it
is a **side drawer** sliding in from the right at the width the caller asks
for. Phones and tablets therefore share the sheet; the split is by navigation
layout, not by device.

## Sheets: one cap, two modes

A sheet never grows past **85dvh**. That leaves a strip of the page visible
behind it, which is what tells the user it is a modal sheet and not a new
page; Material and iOS both stop short of the top edge for the same reason.
The cap is `SHEET_HEIGHT` in the hook and is not configurable per caller.

Within the cap, a sheet is one of two things:

- **Fill** (the default): the sheet is always exactly the cap and its content
  scrolls inside. For open-ended content with no natural height. The AI chat
  is the clear case: a conversation grows, the input sits at the bottom, and a
  sheet that fit its content would start tiny and climb with every message.
- **Fit** (`useSheet(width, true)`): the sheet is as tall as its content and
  the cap is only a ceiling, above which the content scrolls. For a panel with
  a known end: a form, or a bounded list. The transaction filters and the goal
  info use it: on a tablet the sheet ends under its last row instead of
  floating empty space; on a phone the content is usually taller than the
  cap, so it looks the same as a fill sheet.

Sheets are **not resizable** by hand. A drag handle would need a gesture that
does not fight the scrolling list, a keyboard equivalent, and a manual test
pass on real devices; a fixed cap gives the same reach for none of that cost.

## Who uses what

| Panel                               | Mode | Why                                                             |
| ----------------------------------- | ---- | --------------------------------------------------------------- |
| AI chat (`AiChatDrawer`)            | fill | Open-ended conversation, input at the bottom.                   |
| Goal info (`GoalInfoCard`)          | fit  | A bounded list: one goal's activity, often a handful of rows.   |
| Transaction filters (`FilterPanel`) | fit  | A form with a known end.                                        |
| Form modals (`ModalShell`)          | fit  | A form with a known end; a centred Dialog above the breakpoint. |

`ModalShell` frames the transaction, goal, starting balance, password, org
create/rename and invitation forms. The short confirmation prompts
(`ConfirmDialog`, `DiscardChangesDialog`) stay centred Dialogs on every screen
size and stack over the sheet: a Dialog sits above a Drawer in the z-order,
and a second sheet (a goal created from inside the transaction form) mounts
later and so paints on top.

The visible consequence: on a phone all three usually reach the cap and look
alike; on a tablet the filters and a short goal history end where their
content ends while the chat fills. That is the intended outcome of the modes,
not a gap.

## Shape

Both forms round the two corners that face the page: a sheet's top corners,
a side drawer's left corners, twice `theme.shape.borderRadius`, the same
radius as the Dialog paper override in the theme. The radius is set in the
hook with the rest of the paper styles.

## Focus

Every drawer disables MUI's own focus restore and calls `useRestoreFocus` from
the transition's `onExited`, so focus returns to the opener only once the
panel has fully left. See `frontend/src/hooks/useRestoreFocus.ts`.
