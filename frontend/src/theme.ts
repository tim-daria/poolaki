/**
 * @file MUI theme: component overrides, palette and typography, plus the
 * module augmentations that register the custom `mono` variant and palette keys.
 */
import { createTheme } from "@mui/material";

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
  }
  interface PaletteOptions {
    shadow?: { main: string };
    accent?: { main: string; light: string };
    avatar?: string[];
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
    label: true;
  }
}

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
      },
    },
    MuiButton: {
      // The app shell is flat (elevation 0); a shadowed contained button would
      // look like a different kind of control next to an outlined one.
      defaultProps: { disableElevation: true },
      // Pill shape for every Button; IconButton is separate and stays round.
      styleOverrides: {
        root: { borderRadius: 999, paddingLeft: 20, paddingRight: 20 },
      },
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
  },
  cssVariables: true,
  /* ---------------------------------- */
  /*               Palette              */
  /* ---------------------------------- */
  palette: {
    primary: {
      dark: "#494564", // --tint-deep  (sidebar bg)
      main: "#5b5477", // --tint-middle (hover/active)
      light: "#edecfd", // --tint-light  (subtle tint)
      contrastText: "#fff",
    },
    secondary: {
      main: "#585a68", // neutral slate
      light: "#b4b5ed", // lavender tint
      contrastText: "#fff",
    },
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
    // Separate key because primary and secondary have no free PaletteColor slots.
    accent: {
      main: "#826ABC", // deep lavender
      light: "#9D84D7", // soft lavender
    },
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
