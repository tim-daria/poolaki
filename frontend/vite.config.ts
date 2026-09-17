import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  // React Compiler auto-memoizes components and hooks, so manual useMemo /
  // useCallback are only needed where referential identity is load-bearing.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],

  optimizeDeps: {
    // Pre-bundle MUI and its Emotion runtime on server start rather than on
    // first import, so lazily loaded routes don't trigger a re-optimize and a
    // full page reload the first time they're opened. Icons stay per-path
    // (`@mui/icons-material/Name`): the barrel is ~2000 icons and 6 MB.
    include: [
      "@mui/material",
      "@mui/x-date-pickers",
      "@mui/x-date-pickers/AdapterDayjs",
      "@emotion/react",
      "@emotion/styled",
      "dayjs",
    ],
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["poolaki.localhost", "poolaki.de"],
    // Left unconfigured so the client derives host, port and ws/wss from the
    // page origin: http://poolaki.localhost:8080 locally, https://poolaki.de
    // through the tunnel. Caddy and cloudflared both forward the upgrade.
    hmr: process.env.CI ? false : undefined,
    proxy: {
      "/api": {
        target: process.env.BACKEND_URL ?? "http://backend:8000",
        changeOrigin: true,
      },
      "/_allauth": {
        target: process.env.BACKEND_URL ?? "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
