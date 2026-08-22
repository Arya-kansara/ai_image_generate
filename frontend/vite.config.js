import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the local-only AI Image Chat frontend.
// Dev server runs on :5173 and talks to the Flask backend on :5000
// (see src/api/api.js for the base URL).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
