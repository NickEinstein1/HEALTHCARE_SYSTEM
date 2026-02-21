/**
 * UniHealth EHR Phase 1 - Gateway latency test
 * Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
 * Run: k6 run load-tests/gateway-latency.js
 * Requires: k6 (https://k6.io), EHR API running on BASE_URL
 */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const VUS = parseInt(__ENV.VUS || "100", 10);
const DURATION = __ENV.DURATION || "30s";
const P95_TARGET_MS = 50;

// Seed patient IDs (must exist in DB; use P001, P002, P003 after seed_data.py)
const PATIENT_IDS = ["P001", "P002", "P003"];

export const options = {
  scenarios: {
    constant_load: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
      startTime: "0s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<" + P95_TARGET_MS],
  },
};

export default function () {
  const id = PATIENT_IDS[Math.floor(Math.random() * PATIENT_IDS.length)];
  const res = http.get(`${BASE_URL}/fhir/r5/Patient/${id}/summary?encounters=5`);
  check(res, { "status 200 or 404": (r) => r.status === 200 || r.status === 404 });
  sleep(0.1);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration.values["p(95)"];
  const ok = p95 < P95_TARGET_MS;
  return {
    stdout: ok
      ? `P95 latency: ${p95.toFixed(2)} ms (target <${P95_TARGET_MS} ms) — PASS\n`
      : `P95 latency: ${p95.toFixed(2)} ms (target <${P95_TARGET_MS} ms) — FAIL\n`,
  };
}
