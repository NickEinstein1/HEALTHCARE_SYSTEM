/**
 * UniHealth EHR Phase 1 - Gateway latency test
 * Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
 * Run: k6 run load-tests/gateway-latency.js
 * Requires: k6 (https://k6.io), EHR API running on BASE_URL
 */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8100";
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
  // Ensure handleSummary receives the percentiles we want.
  summaryTrendStats: ["avg", "min", "p(50)", "p(95)", "p(99)", "max"],
  thresholds: {
    http_req_duration: ["p(95)<" + P95_TARGET_MS],
  },
};

export default function () {
  const id = PATIENT_IDS[Math.floor(Math.random() * PATIENT_IDS.length)];
  const res = http.get(`${BASE_URL}/fhir/r5/Patient/${id}/summary?encounters=5`, {
    headers: { "X-Facility-Id": "FAC-A" },
  });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.1);
}

export function handleSummary(data) {
  const p50 = data.metrics.http_req_duration.values["p(50)"];
  const p95 = data.metrics.http_req_duration.values["p(95)"];
  const p99 = data.metrics.http_req_duration.values["p(99)"];
  const ok = p95 < P95_TARGET_MS;

  const fmt = (v) => (typeof v === "number" ? v.toFixed(2) : "n/a");
  return {
    stdout: ok
      ? `Latency ms — P50: ${fmt(p50)} P95: ${fmt(p95)} P99: ${fmt(p99)} (target P95 <${P95_TARGET_MS}) — PASS\n`
      : `Latency ms — P50: ${fmt(p50)} P95: ${fmt(p95)} P99: ${fmt(p99)} (target P95 <${P95_TARGET_MS}) — FAIL\n`,
  };
}
