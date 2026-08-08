// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: "0.0.0.0",
//     port: 5173,
//     allowedHosts: ["poolaki.localhost"],
//     hmr: {
//       host: "poolaki.localhost",
//       protocol: "wss",
//       clientPort: 443,
//     },
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["poolaki.localhost", "poolaki.de"],
    hmr: process.env.CI
      ? false
      : {
          host: "poolaki.localhost",
          protocol: "wss",
          clientPort: 443,
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
