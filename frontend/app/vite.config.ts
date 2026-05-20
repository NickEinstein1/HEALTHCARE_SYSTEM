import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const PROXY_PATHS = [
  "/admin",
  "/ai",
  "/appointments",
  "/auth",
  "/consent",
  "/ui",
  "/nurse",
  "/walkins",
  "/lab",
  "/pharmacy",
  "/fhir",
  "/metrics",
  "/integrations",
] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Staging compose exposes the gateway on :8100; local split dev uses :8000 via VITE_DEV_PROXY_TARGET.
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET?.trim() || "http://localhost:8100";
  const proxy = Object.fromEntries(
    PROXY_PATHS.map((path) => [
      path,
      {
        target: proxyTarget,
        changeOrigin: true,
        ...(path === "/ai" ? { ws: true } : {}),
      },
    ]),
  );

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy,
    },
    build: { outDir: "dist", sourcemap: true },
  };
});
