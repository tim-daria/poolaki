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
  }
  interface PaletteOptions {
    shadow?: { main: string };
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
          fontSize: "1rem",
          textRendering: "optimizeLegibility",
          fontSynthesis: "none",
          "@media (max-width: 1024px)": { fontSize: 16 },
        },
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
      dark: "#494564", // --accent-deep  (sidebar bg)
      main: "#5b5477", // --accent-middle (hover/active)
      light: "#edecfd", // --accent-light  (subtle tint)
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
      primary: "#000", // --text
      secondary: "#959698", // --sub-text
    },
    divider: "#e0e0e0", // --border
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
