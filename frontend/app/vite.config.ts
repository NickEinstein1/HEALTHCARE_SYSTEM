import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const PROXY_PATHS = [
  "/admin",
  "/ai",
  "/appointments",
  "/auth",
  "/consent",
  "/health",
  "/esign",
  "/referrals",
  "/patient",
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
        timeout: 30_000,
        proxyTimeout: 30_000,
        ...(path === "/ai" ? { ws: true } : {}),
        configure: (proxyServer: { on: (event: string, fn: (...args: unknown[]) => void) => void }) => {
          proxyServer.on("error", (err, _req, res) => {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("ECONNREFUSED") || msg.includes("socket hang up") || msg.includes("EPIPE")) return;
            console.warn(`[vite] proxy ${path}:`, msg);
            const r = res as { writeHead?: (code: number, h: Record<string, string>) => void; end?: (b: string) => void; headersSent?: boolean } | undefined;
            if (r?.writeHead && !r.headersSent) {
              r.writeHead(502, { "Content-Type": "application/json" });
              r.end(JSON.stringify({ detail: "API gateway unavailable — start ./scripts/run_staging.sh" }));
            }
          });
        },
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
