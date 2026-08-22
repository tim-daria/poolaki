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
    hmr: process.env.CI
      ? false
      : {
          host: "poolaki.localhost",
          protocol: "ws",
          clientPort: 8080,
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
