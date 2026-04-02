# Phase 1 Baseline Benchmark

Date: 2026-03-26
Environment:

- OS: darwin 24.6.0
- CPU/RAM: (not captured)
- API Port: 8100
- Docker versions: (not captured)

## Commands

```bash
# Validate app is up
curl -s http://localhost:8100/health

# Optional: warm cache
curl -s -H "X-Facility-Id: FAC-A" "http://localhost:8100/fhir/r5/Patient/P001/summary?encounters=5" >/dev/null

# Run benchmark
BASE_URL=http://localhost:8100 VUS=100 DURATION=30s k6 run load-tests/gateway-latency.js
```

## Results

- Requests: 26141 complete (0 interrupted iterations) @ 100 VUs / 30s
- Error rate: 0 (all iterations completed)
- Avg latency (ms): n/a
- P50 (ms): 12.30
- P95 (ms): 30.43
- P99 (ms): 72.44
- Threshold pass/fail (`p(95)<50`): PASS (`P95=30.43ms`)

## API Metrics Snapshot

```bash
curl -s http://localhost:8100/metrics/json
curl -s http://localhost:8100/metrics/prometheus | head -n 50
```

Notes:

- `X-Cache-Source` response header should be `redis-hit` after warm-up.
- `X-Request-Latency-Ms` and `X-Endpoint-Latency-Ms` are exposed per request.
