/**
 * @file MUI theme: component overrides, palette and typography, plus the
 * module augmentations that register the custom `mono` variant and palette keys.
 */
import { createTheme } from "@mui/material";
import type { CSSObject } from "@mui/material/styles";
import { PHONE } from "./lib/layout";

// Lavender groups are module constants so `palette.chart` can reuse the same
// swatches as resolved values.
const primary = {
  dark: "#494564", // --tint-deep  (sidebar bg)
  main: "#5b5477", // --tint-middle (hover/active)
  light: "#edecfd", // --tint-light  (subtle tint)
  contrastText: "#fff",
};
const secondary = {
  main: "#585a68", // neutral slate
  light: "#b4b5ed", // lavender tint
};
// Separate key because primary and secondary have no free PaletteColor slots.
const accent = {
  main: "#826ABC", // deep lavender
  light: "#9D84D7", // soft lavender
};

/**
 * Styles for a ToggleButtonGroup's buttons. `.Mui-disabled` is repeated so
 * the rule outranks MUI's three-class disabled rules, which otherwise restore
 * a three-sided border and a -1px overlap on the non-first buttons of a
 * disabled group, and the group's first/middle/last rules that square off the
 * inner corners. Every group look goes through this, so a disabled group
 * looks exactly like an enabled one.
 */
const grouped = (styles: CSSObject): CSSObject => ({
  "& .MuiToggleButtonGroup-grouped, & .MuiToggleButtonGroup-grouped.Mui-disabled":
    styles,
});

declare module "@mui/material/styles" {
  interface TypographyVariants {
    mono: React.CSSProperties;
    label: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
    label: React.CSSProperties;
  }
  interface Palette {
    shadow: { main: string };
    accent: { main: string; light: string };
    avatar: string[];
    chart: string[];
  }
  interface PaletteOptions {
    shadow?: { main: string };
    accent?: { main: string; light: string };
    avatar?: string[];
    chart?: string[];
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
    label: true;
  }
}

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    card: true;
    clickableCard: true;
  }
}

/** The soft lift every card has at rest. */
const CARD_SHADOW = "0 8px 24px -16px var(--mui-palette-shadow-main)";

/**
 * Radius, padding and lift shared by both card variants. The padding goes
 * through a variable: the media query changes only the variable, so
 * `padding` itself is one plain declaration that any `p` in `sx` overrides
 * at every width. A card that lays out its own halves can read
 * `var(--card-padding)` for them.
 */
const cardStyle = {
  "--card-padding": "20px",
  "@media (min-width:600px)": { "--card-padding": "24px" },
  borderRadius: 24,
  padding: "var(--card-padding)",
  boxShadow: CARD_SHADOW,
  // Shadows do not print; a hairline keeps the edge, and a card never splits across pages.
  "@media print": {
    boxShadow: "none",
    border: "1px solid var(--mui-palette-divider)",
    breakInside: "avoid",
  },
};

export const theme = createTheme({
  /* ---------------------------------- */
  /*         Component overrides        */
  /* ---------------------------------- */
  // Base unit: `borderRadius: n` in sx is n times this value.
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          // 18px base, carried over from the original index.css so existing
          // layouts keep their size.
          fontSize: "1.125rem",
          textRendering: "optimizeLegibility",
          fontSynthesis: "none",
          letterSpacing: "0.18px",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          "@media (max-width: 1024px)": { fontSize: 16 },
        },
        // Literal var() rather than a theme callback: MuiCssBaseline's
        // styleOverrides are typed as raw CSS, so a callback's `theme` is any.
        body: {
          // AppLayout's root Box sets the same colour; keep the two in step.
          backgroundColor: "var(--mui-palette-primary-light)",
          // A user-typed name (workspace, goal, username, description) can be
          // one unbroken word up to its length limit, and a word has no break
          // opportunity. Inherited, so this one rule reaches every text node,
          // dialogs and menus in portals included; `noWrap` sites are
          // untouched because nowrap never wraps.
          //
          // break-word, not anywhere: anywhere counts its break points toward
          // min-content width, so any flex or grid item holding text (a
          // button label, a chip, a toggle) could be squeezed to one glyph
          // per line. break-word only applies once the box has a width, so a
          // text-bearing flex child still needs `minWidth: 0` to shrink.
          overflowWrap: "break-word",
        },
      },
    },
    MuiPaper: {
      // The shell is flat. Dialog (24) and Menu/Popover (8) pass their own
      // elevation, so overlays keep their shadows.
      defaultProps: { elevation: 0 },
      // The one card look. Cards say `variant="card"`; a card that is a link
      // or a button says `variant="clickableCard"` and gets the lilac ring on
      // hover, the outline on keyboard focus, and its header cue darkening
      // (the `.HomeCard-action` span). Components add only their content
      // layout.
      variants: [
        { props: { variant: "card" }, style: cardStyle },
        {
          props: { variant: "clickableCard" },
          style: {
            ...cardStyle,
            cursor: "pointer",
            textDecoration: "none",
            color: "inherit",
            "&:hover": {
              // Kept together with the lift: box-shadow replaces, not adds.
              boxShadow: `0 0 5px 2px var(--mui-palette-secondary-light), ${CARD_SHADOW}`,
            },
            "&:focus-visible": {
              outline: "2px solid var(--mui-palette-primary-main)",
            },
            "&:hover .HomeCard-action, &:focus-visible .HomeCard-action": {
              color: "var(--mui-palette-text-primary)",
            },
          },
        },
      ],
    },
    MuiButton: {
      // The app shell is flat (elevation 0); a shadowed contained button would
      // look like a different kind of control next to an outlined one.
      defaultProps: { disableElevation: true },
      // Pill shape for every Button; IconButton is separate and stays round.
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 20,
          paddingRight: 20,
          // A label is one line: squeezed in a flex row (the header's
          // controls, a dialog footer) it would otherwise wrap mid-label.
          whiteSpace: "nowrap",
        },
      },
    },
    MuiToggleButtonGroup: {
      // Two looks, both here so no ToggleButtonGroup repeats them in `sx`.
      // Default: the segmented control, a `background.default` track with
      // borderless, gapped buttons and a primary-filled selected one; callers
      // set only the group's radius (the buttons inherit it) and sizing.
      // `className="cards"`: side-by-side outlined cards with the chosen one
      // outlined in primary, for the transfer direction picker.
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.default,
          padding: 4,
          gap: 4,
          ...grouped({
            border: 0,
            marginLeft: 0,
            borderRadius: "inherit",
            fontWeight: 700,
            color: theme.palette.text.primary,
            "&.Mui-disabled": { color: theme.palette.text.disabled },
            "&.Mui-selected": {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              "&:hover": { backgroundColor: theme.palette.primary.main },
            },
          }),
        }),
      },
      variants: [
        {
          props: { className: "cards" },
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
            backgroundColor: "transparent",
            padding: 0,
            ...grouped({
              border: "2px solid var(--mui-palette-divider)",
              borderRadius: 8,
              margin: 0,
              padding: 12,
              justifyContent: "flex-start",
              textAlign: "left",
              // Title only on a phone (the card hides its icon and note), so it centres.
              [PHONE]: { justifyContent: "center", textAlign: "center" },
              textTransform: "none",
              "&.Mui-selected": {
                borderColor: "var(--mui-palette-primary-main)",
                backgroundColor: "var(--mui-palette-background-default)",
                color: "var(--mui-palette-text-primary)",
                "&:hover": {
                  backgroundColor: "var(--mui-palette-background-default)",
                },
              },
            }),
          },
        },
      ],
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 2 * Number(theme.shape.borderRadius),
          padding: 8,
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: 16,
          // Title left, close button right. Without this the IconButton sits
          // inline right after the text.
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: 16,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: "1rem",
        },
      },
    },
    MuiAlert: {
      // The icon column is laid out against the first line of the message
      // rather than the whole block: `1lh` box with its own padding keeps a
      // one-line alert centred and a wrapping one top-aligned with its text.
      // The column inherits the message font size so `1lh` is the text line,
      // not the icon's own 22px line; the glyph size moves to the svg.
      // Centralised here so no Alert has to repeat it in `sx`.
      styleOverrides: {
        icon: {
          paddingTop: 8,
          paddingBottom: 8,
          height: "1lh",
          boxSizing: "content-box",
          alignItems: "center",
          fontSize: "inherit",
          "& > svg": { fontSize: 22 },
        },
      },
    },
  },
  cssVariables: true,
  /* ---------------------------------- */
  /*               Palette              */
  /* ---------------------------------- */
  palette: {
    primary,
    secondary,
    // Soft drop shadows (the auth card): the text colour at 35%.
    shadow: { main: "rgba(28, 26, 32, 0.35)" },
    success: {
      main: "#5b9778", // --income-color
      light: "#d8f8e8", // --bg-income
    },
    error: {
      main: "#ff7070", // --expense-color
      light: "#fae3e3", // --bg-expense
    },
    background: {
      default: "#f5f6fa", // --bg-color
      paper: "#ffffff", // --bg-card
    },
    text: {
      // Warm near-black from the design mockups; pure #000 is intentionally avoided.
      primary: "#1c1a20", // --text
      secondary: "#959698", // --sub-text
    },
    divider: "#e0e0e0", // --border
    accent,
    // Avatar backgrounds, one per AvatarGroup slot (max 5), chosen by `avatarColor`.
    // Palette paths rather than hex so `sx` resolves them against the theme.
    // All must stay dark enough for a white initial to remain legible.
    avatar: [
      "primary.dark",
      "primary.main",
      "secondary.main",
      "accent.main",
      "accent.light",
    ],
    // Donut segments by rank, one lavender hue from darkest (largest) to
    // lightest; the merged "Other" segment always takes the last. Resolved
    // values rather than palette paths: they go into SVG stroke attributes.
    chart: [primary.dark, accent.main, accent.light, secondary.light],
  },
  /* ---------------------------------- */
  /*             Typography             */
  /* ---------------------------------- */
  typography: {
    fontFamily: [
      '"Plus Jakarta Sans"',
      "system-ui",
      "Roboto",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    mono: {
      fontFamily: '"Geist Mono", ui-monospace, Consolas, monospace',
      fontSize: "1.5rem",
    },
    button: {
      textTransform: "none",
    },
    h1: {
      fontSize: "3rem",
      fontWeight: 600,
    },
    h2: {
      fontSize: "1.75rem",
      fontWeight: 600,
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
    },
    label: {
      fontSize: "0.72rem",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
  },
});
