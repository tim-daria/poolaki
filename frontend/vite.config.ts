import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  // React Compiler auto-memoizes components and hooks, so manual useMemo /
  // useCallback are only needed where referential identity is load-bearing.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],

  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["poolaki.localhost", "poolaki.de"],
    // The browser reaches Vite through Caddy, not directly, so the HMR client
    // has to be told where to dial back — it cannot infer the proxy's address.
    // These must match how you actually open the app: Caddy publishes 8080:80
    // with `auto_https off`, so that is ws://poolaki.localhost:8080. Pointing
    // at wss://…:443 leaves the socket dead and updates never reach the page,
    // even though the server logs them as sent.
    hmr: process.env.CI
      ? false
      : {
          host: process.env.HMR_HOST ?? "poolaki.localhost",
          protocol: process.env.HMR_PROTOCOL ?? "ws",
          clientPort: Number(process.env.HMR_PORT ?? 8080),
        },
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
