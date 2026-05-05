import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/admin": "http://localhost:8000",
      "/ui": "http://localhost:8000",
      "/nurse": "http://localhost:8000",
      "/lab": "http://localhost:8000",
      "/pharmacy": "http://localhost:8000",
      "/fhir": "http://localhost:8000",
      "/metrics": "http://localhost:8000",
      "/integrations": "http://localhost:8000",
    },
  },
  build: { outDir: "dist", sourcemap: true },
});
