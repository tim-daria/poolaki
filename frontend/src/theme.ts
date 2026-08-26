import { createTheme } from "@mui/material";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    mono: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
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
  }
}

export const theme = createTheme({
  /* ==============================
   Components' styles override
   ============================== */
  // base unit; use `borderRadius: 1` in sx for 1x, 2 for 2x, etc.
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          // 18px base, inherited from index.css's old `:root { font: 18px/145% }`.
          // That rule out-specified this one (`:root` beats `html`), so it was
          // the value actually in force; keeping it here avoids shrinking the
          // whole app on the way to a single source of truth.
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
      // The shell is flat — the AppBar and the notification rows both render
      // at elevation 0. MUI's `contained` variant is the only thing left
      // casting a shadow, which makes a contained button and the outlined one
      // beside it read as two different kinds of control.
      defaultProps: { disableElevation: true },
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
  /* ==============================
   Colors
   ============================== */
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
      // Near-black with a warm cast, from the design mockups. Pure #000 reads
      // harsher than the rest of the palette and is not what the designs use.
      primary: "#1c1a20", // --text
      secondary: "#959698", // --sub-text
    },
    divider: "#e0e0e0", // --border
    // Its own key rather than more primary/secondary slots: MUI's PaletteColor
    // is limited to dark/main/light/contrastText, and both are already full.
    accent: {
      main: "#826ABC", // deep lavender
      light: "#9D84D7", // soft lavender
    },
    // Avatar backgrounds, picked per user by `avatarColor`. One per slot in the
    // AvatarGroup (max 5).
    //
    // These are palette *paths*, not hex — `sx` resolves them against the theme,
    // so the colors stay defined once above and follow any future theme change.
    // All five are dark enough that the white initial on top stays legible.
    avatar: [
      "primary.dark",
      "primary.main",
      "secondary.main",
      "accent.main",
      "accent.light",
    ],
  },
  /* ==============================
   Fonts
   ============================== */
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
  },
});
