#!/usr/bin/env node
/** @deprecated Use scripts/capture_all_manual_screenshots.mjs doctor */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(dir, "capture_all_manual_screenshots.mjs"), "doctor"], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
