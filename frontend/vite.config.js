import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { pwaTransReport } from "./pwa/plugin.js";
export default defineConfig({
  plugins: [react(), pwaTransReport()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", xfwd: true },
      "/health": { target: "http://127.0.0.1:3001", xfwd: true },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", xfwd: true },
      "/health": { target: "http://127.0.0.1:3001", xfwd: true },
    },
  },
});
