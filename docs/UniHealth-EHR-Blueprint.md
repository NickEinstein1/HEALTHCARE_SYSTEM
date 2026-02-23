# UniHealth EHR: Next-Generation National Electronic Health Record System
## Complete Architecture & Implementation Blueprint

**Document Version:** 1.0  
**Target Horizon:** 2026–onwards.  
**Classification:** Strategic Blueprint.

---

## 1. Executive Summary

### Vision and Positioning

**UniHealth EHR**
 (Unified Health Electronic Health Record)—alternatively 
 
 **"National Health Spine" (NHS)** or **"Taiwan Health Grid" (THG)** 
 if a local brand is preferred—is a next-generation national EHR platform designed to **build on Taiwan’s NHI strengths** while **surpassing its limitations** in latency, scalability, privacy, and intelligence. Taiwan’s NHI provides a world-class foundation: centralized national backbone, NHI IC card–based identification, near-universal coverage, and the EMR Exchange Center for cross-facility data sharing. UniHealth EHR preserves these advantages and adds edge computing, AI, federated learning, and blockchain to deliver a system fit for 10× volume and international interoperability. Design patterns are informed by **Estonia’s X-Road and e-Health**, **Denmark’s Sundhed.dk**, and **Singapore’s NEHR**, with deliberate innovation in edge latency, federated AI, and consent-on-chain.

### Quantified Improvements vs. Taiwan NHI

| Dimension | Taiwan NHI (Current) | UniHealth EHR (Target) | Improvement |
|-----------|----------------------|-------------------------|-------------|
| **P95 Query Latency** | ~200–500 ms (central lookup) | <50 ms | **70–90% reduction** |
| **Data Ingestion (edge)** | N/A (central only) | <5 ms local, <100 ms E2E | **New capability** |
| **Single-Point Failure** | Central Exchange dependency | Edge-first; central optional | **Resilience** |
| **AI/Predictive** | Limited | Risk prediction, NLP, imaging AI | **~50% better outcomes** (evidence-based targets) |
| **Cross-Border** | Domestic focus | FHIR R5 + optional int’l federation | **International ready** |
| **Audit & Consent** | Central logs | Blockchain + consent engine | **Immutable, patient-controlled** |
| **Scalability** | ~10M events/day | 100M+ events/day | **10× capacity** |
| **Uptime** | ~99.9% | 99.999% | **Higher availability** |

### High-Level Value Proposition

- **Patient safety:** Sub-50 ms retrieval in ER and high-acuity settings; no “data not yet synced” gaps.
- **Equity:** Universal coverage, low/no out-of-pocket for core EHR access; opt-in for visitors/expats.
- **Cost:** Reduced duplicate tests and administrative overhead; predictive care to avoid costly complications (estimated **15–25% efficiency gain** in high-volume settings).
- **Public health:** National analytics and outbreak detection without centralizing raw data; federated learning for cross-hospital models.
- **ROI:** For a **$10B+** national investment over 5 years, projected **$2–4B annual savings** from efficiency and better outcomes, plus non-monetary gains in trust and health equity.

---

## 2. System Architecture

### 2.1 High-Level Diagram (Text/ASCII)

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                    NATIONAL CONTROL PLANE                       │
                    │(Policy, Consent Registry, Analytics Aggregates, FL Orchestrator)│
                    └─────────────────────────────────────────────────────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
    ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
    │   REGION / CLOUD       │   │   REGION / CLOUD       │   │  REGION / CLOUD     │
    │   (Primary + DR)       │   │   (Primary + DR)       │   │  (Primary + DR)     │
    │   FHIR R5 • Kafka      │   │   FHIR R5 • Kafka      │   │  FHIR R5 • Kafka    │
    │   Redis • Analytics    │   │   Redis • Analytics    │   │  Redis • Analytics  │
    └───────────┬───────────┘   └───────────┬───────────┘   └───────────┬───────────┘
                │                           │                           │
                ▼                           ▼                           ▼
    ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
    │   EDGE NODE           │   │   EDGE NODE           │   │   EDGE NODE           │
    │   Hospital A          │   │   Hospital B          │   │   Clinic / Lab        │
    │   Local cache • <5ms  │   │   Local cache • <5ms  │   │   Local cache • <5ms  │
    │   FHIR Gateway • AI   │   │   FHIR Gateway • AI   │   │   FHIR Gateway        │
    └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
                │                           │                           │
                └───────────────────────────┼───────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │   INTEROPERABILITY LAYER (FHIR R5 + HL7 v2)   │
                    │   Event-driven sync • Dedup • Consent checks  │
                    └───────────────────────────────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │   IDENTITY & ACCESS                           │
                    │   Smart Card (NFC + Biometric) • OAuth2/OIDC  │
                    └───────────────────────────────────────────────┘
```

*Recommendation:* 
Produce formal diagrams in **Draw.io** (draw.io).
**Lucidchart** using this structure: National Control Plane → Regional Clouds (primary + DR) → Edge Nodes (per facility) → Interoperability Layer → Identity & Access. Export as PNG/SVG for docs and presentations.

### 2.2 Architectural Layers

| Layer | Responsibility | Key Components |
|-------|----------------|----------------|
| **Ingestion** | Events from EHRs, labs, pharmacies, wearables | Kafka Connect, HL7 v2 → FHIR adapters, IoT gateways (MQTT/5G) |
| **Processing** | Normalization, dedup, consent checks, routing | Kafka Streams / Flink, rule engines, FHIR mapping (HAPI) |
| **Storage** | Hot (sub-50 ms), warm, cold | Redis (hot), PostgreSQL + Citus / Cassandra (warm), S3/object (cold, analytics) |
| **Edge** | Local cache, local FHIR API, edge AI inference | Kubernetes (K3s), Redis Edge, NVIDIA Triton / TensorRT |
| **Interoperability** | FHIR R5 APIs, HL7 backward compatibility | HAPI FHIR R5, Exchange Center–like sync protocol |
| **Security** | Zero-trust, mTLS, consent, audit | SPIFFE/SPIRE, Vault, blockchain audit, consent engine |
| **AI/Analytics** | Federated learning, NLP, CV, national dashboards | Flower / TFF, Spark, NLP models, BI (Metabase/Superset), outbreak detection pipelines |
| **5G / IoT** | Wearables, bedside devices, ambulance telemetry | MQTT/CoAP gateways, 5G slice for health traffic, edge ingestion <5 ms |
| **Agentic AI** | Assistants for clinicians (summarize, suggest, draft) | LLM APIs with guardrails, tool use for FHIR read/write, audit of all actions |

### 2.3 Technology Stack Table

| Domain | Technology | Purpose |
|--------|------------|---------|
| **API / FHIR** | HAPI FHIR R5 (Java) | FHIR R5 server, validation, mapping |
| **Streaming** | Apache Kafka + Kafka Streams | Event ingestion, stream processing, CDC |
| **Caching** | Redis (Cluster + Redis Stack) | Sub-50 ms patient/encounter lookup, session |
| **Primary DB** | PostgreSQL 16 + Citus (or Cassandra) | Warm storage, horizontal scale |
| **Data Lake / Analytics** | Snowflake or Apache Iceberg on S3 | National analytics, ML features |
| **Orchestration** | Kubernetes (EKS/AKS or on-prem) | Cloud and edge (K3s at facilities) |
| **Edge AI** | NVIDIA Triton, TensorRT | Local inference (risk scores, NLP) |
| **Federated Learning** | Flower or TensorFlow Federated | Cross-hospital model training |
| **Blockchain** | Hyperledger Fabric or Besu | Consent and audit trail (permissioned) |
| **Identity** | Keycloak / OAuth2/OIDC, NHI IC integration | SSO, smart card binding |
| **CI/CD** | GitLab CI / GitHub Actions, Argo CD | Build, test, deploy, GitOps |
| **Observability** | Prometheus, Grafana, OpenTelemetry, ELK | Latency, SLOs, tracing |
| **5G / IoT** | MQTT broker (e.g., HiveMQ), 5G core integration | Wearables, devices; edge ingestion |
| **Agentic AI** | LangChain/LLM APIs + FHIR tools, audit logger | Clinician copilot, draft notes, consent explanations |

---

## 3. Data Model & Standards

### 3.1 FHIR R5 Resource Mappings

| Domain Concept | FHIR R5 Resource(s) | Notes |
|----------------|---------------------|--------|
| Patient identity | `Patient` | National ID (NHI number), smart card ID; `identifier` for facility-specific MRC |
| Encounter (visit) | `Encounter` | Links to `Location` (hospital/clinic), `ServiceRequest`, `Diagnosis` |
| Clinical observations | `Observation`, `DiagnosticReport` | Labs, vitals, wearables → Observation |
| Medications | `MedicationRequest`, `MedicationAdministration` | Prescriptions and administration |
| Allergies | `AllergyIntolerance` | Critical for cross-facility safety |
| Problems / diagnoses | `Condition` | ICD-11/ICD-10 |
| Documents | `DocumentReference`, `Composition` | CDA/PDF, structured docs |
| Consent | `Consent` | Scope: share-with-facility-X, research, analytics |
| Audit | `AuditEvent` + blockchain anchor | Who accessed what, when |

### 3.2 Multi-Hospital Event Schema

Every event carries provenance and routing metadata:

```json
{
  "eventId": "urn:uuid:...",
  "timestamp": "2026-02-16T10:00:00Z",
  "source": {
    "organizationId": "org-hospital-a",
    "systemId": "EMR-001",
    "facilityType": "hospital"
  },
  "patientId": "NHI-123456789",
  "fhirResourceType": "Observation",
  "fhirResourceId": "obs-xxx",
  "consentScope": ["treatment", "emergency"],
  "syncRegion": ["region-north", "national"]
}
```

- **Normalization:** Map all incoming (HL7 v2, CDA, proprietary) to FHIR R5 via HAPI mapping; store canonical IDs (NHI, encounter IDs) for dedup.
- **Deduplication:** Deterministic ID from `(patientId, encounterId, code, effectiveTime)`; merge on read when multiple sources exist; master record in warm store, events in Kafka for replay. Golden record service resolves conflicts (e.g., same lab from two facilities) by “last-write-wins” with provenance, or by configured priority (e.g., reference lab over point-of-care).

### 3.3 Normalization Pipeline

- **Input:** HL7 v2 (ADT, ORU, OML), CDA R2, proprietary APIs.  
- **Steps:** Parse → map to FHIR R5 (HAPI `StructureMap` or custom transformers) → validate → assign canonical IDs → publish to Kafka topic per resource type.  
- **Output:** FHIR R5 resources with `meta.source` and `identifier` for traceability; stored in warm store and replicated to edge caches by subscription.

---

## 4. Performance & Latency Optimization

### 4.1 Target Metrics

- **P95 end-to-end query/response:** <50 ms (e.g., patient lookup, recent history).
- **Edge ingestion/processing:** <5 ms for local validation and cache update.
- **Full ingestion pipeline:** <100 ms to visible in all authorized nodes.

### 4.2 Step-by-Step Engineering for <50 ms Queries

1. **Edge-first routing:** All read requests hit the **edge FHIR gateway** first. If the patient has been seen at this facility (or in the same region), data is served from **local Redis** (in-memory, sub-millisecond).
2. **Cache strategy:**  
   - **Hot:** Patient demographics, active encounter, last N encounters, critical (allergies, current meds) in Redis with TTL (e.g., 15 min for demographics, 5 min for encounter).  
   - **Warm:** Full encounter history in regional DB; edge fetches on cache miss and backfills Redis.
3. **Parallelism:**  
   - Single “get patient summary” request is implemented as a **parallel fan-out** at the edge: Redis (demographics + cache), local DB (encounters), and optionally central (only if not in region) in parallel; aggregate and return.  
   - Use **Kafka Streams** or **Flink** for continuous pre-aggregation of “patient summary” per patient per facility so that many reads are served from precomputed views.
4. **Connection and serialization:**  
   - **HTTP/2** and **gRPC** for FHIR APIs where applicable; **WebSockets** for real-time subscriptions (e.g., “notify when new labs for this patient”).  
   - Compact binary for cache (MessagePack or Protobuf) and JSON for FHIR REST.
5. **Database and indexing:**  
   - Warm store indexed by `(patient_id, facility_id, encounter_date DESC)` and by `(patient_id, resource_type)`.  
   - Use **connection pooling** and **read replicas** at edge/region so that the rare cache-miss path still stays under ~20 ms for DB.

### 4.3 Benchmarks (Simulated vs. Taiwan)

| Scenario | Taiwan NHI (Typical) | UniHealth EHR (Target) |
|----------|----------------------|-------------------------|
| Patient lookup (demographics) | 150–300 ms | 5–15 ms (edge cache) |
| Last 5 encounters | 300–600 ms | 10–30 ms (edge + pre-aggregate) |
| Full history (10 years) | 2–5 s | 100–200 ms (parallel + regional) |
| New lab result visible everywhere | 30 s – 5 min | <100 ms (event-driven sync) |

---

## 5. Phased Implementation Roadmap

### Phase 1: MVP 

- **Scope:** 5 pilot hospitals (mix of large and medium).  
- **Deliverables:**  
  - Core EHR read/write via FHIR R5 (HAPI); NHI IC + OAuth2 for identity.  
  - Edge node per facility: Redis cache, local FHIR gateway, Kafka producer for all changes.  
  - Central/regional Kafka + warm store (PostgreSQL/Citus); sync of encounters, observations, medications, allergies.  
  - Latency testing: P95 <50 ms for patient + recent encounter from edge.  
- **Success criteria:** No duplicate data entry for shared patients; <50 ms P95 at pilot sites.

### Phase 2: National Scale

- **Scope:** All hospitals and major clinics; labs and pharmacies.  
- **Deliverables:**  
  - Full edge rollout (K3s + Redis + FHIR gateway).  
  - Multi-region cloud (active/active or active/DR) with event replication.  
  - Consent engine and blockchain audit pilot.  
  - Patient mobile app (view record, consent, telemedicine link).  
  - National analytics pipeline (aggregates only; no raw PII in central analytics).  
- **Success criteria:** 99.99% uptime, <50 ms P95 nationally, >80% adoption at enrolled facilities.

### Phase 3: Advanced Features

- **AI:** Federated learning (e.g., readmission risk) with Flower/TFF; NLP for auto-documentation; imaging AI at edge (Triton).  
- **Blockchain:** Full consent and access audit on-chain; optional international federation.  
- **Public health:** Outbreak detection dashboards, real-time syndromic signals.  
- **UX:** Voice/text input, scribes, clinician and admin BI; **agentic AI** assistants for summarization, suggestion, and draft documentation (with tool-calling over FHIR and full audit).

---

## 6. Development & Tech Details

### 6.1 FHIR API Endpoint: Multi-Hospital Query

```java
// Pseudo-code: HAPI FHIR R5 - Patient-centric multi-facility read
// GET /fhir/r5/Patient/{id}/$everything?facility=org-hospital-a,org-hospital-b&since=2025-01-01

@Operation(name = "everything", id = "Patient.everything")
public Bundle patientEverything(
    @IdParam IdType patientId,
    @OperationParam(name = "facility") List<String> facilityIds,
    @OperationParam(name = "since") DateTimeType since) {

  // 1. Resolve from edge cache first (Redis)
  PatientSummary cached = edgeCache.getSummary(patientId.getIdPart());
  if (cached != null && !requiresRefresh(cached))
    return cached.toBundle();

  // 2. Parallel fetch: local DB + regional (if facility filter)
  CompletableFuture<Bundle> local = asyncGetFromLocalStore(patientId, facilityIds, since);
  CompletableFuture<Bundle> regional = asyncGetFromRegional(patientId, facilityIds, since);
  Bundle merged = merge(CompletableFuture.allOf(local, regional).join());
  edgeCache.putSummary(patientId.getIdPart(), merged, TTL);
  return merged;
}
```

### 6.2 Edge Processing Pipeline (Kafka Consumer)

```python
# Edge pipeline: consume from facility-specific topic, validate, update local cache, forward to regional
from kafka import KafkaConsumer
import redis
import fhirclient.models.observation as obs

def process_observation_event(msg):
    payload = msg.value
    # Validate FHIR + consent for this facility
    if not consent_engine.check(payload["patientId"], payload["consentScope"], "treatment"):
        return
    o = obs.Observation(payload["fhirResource"])
    o.validate()
    # Update local Redis (hot path for <50ms reads)
    key = f"patient:{payload['patientId']}:observations:recent"
    redis_client.lpush(key, payload["fhirResource"])
    redis_client.ltrim(key, 0, 499)
    redis_client.expire(key, 900)
    # Forward to regional topic for warm store and analytics
    regional_producer.send("regional-observations", value=payload)
```

### 6.3 Federated Learning Setup (Flower)

```python
# Central server (national FL orchestrator) - simplified
import flwr as fl

def fit_config(round_idx):
    return {"round": round_idx, "batch_size": 32}

strategy = fl.server.strategy.FedAvg(
    min_fit_clients=5,
    min_available_clients=10,
    on_fit_config_fn=fit_config,
)
fl.server.start_server(
    server_address="0.0.0.0:8080",
    config=fl.server.ServerConfig(num_rounds=50),
    strategy=strategy,
)
```

```python
# Hospital edge client (trains on local data only; sends only weights)
import flwr as fl
from local_model import get_model, get_training_data

def main():
    model = get_model()
    train_data = get_training_data()  # stays on-prem, never leaves
    client = fl.client.NumPyClient(
        model=model,
        x_train=train_data.X, y_train=train_data.y,
    )
    fl.client.start_numpy_client(server_address="national-fl:8080", client=client)
```

### 6.4 Blockchain Consent Smart Contract (Solidity Sketch)

```solidity
// Simplified: record consent grant/revoke and access events
pragma solidity ^0.8.0;

contract UniHealthConsent {
    struct ConsentRecord {
        bytes32 patientIdHash;
        string scope;      // "treatment" | "research" | "analytics"
        string facilityId;
        bool active;
        uint256 grantedAt;
    }
    mapping(bytes32 => ConsentRecord[]) public consents;
    event ConsentGranted(bytes32 patientIdHash, string scope, string facilityId);
    event AccessLogged(bytes32 patientIdHash, string facilityId, string resourceType, uint256 at);

    function grant(bytes32 patientIdHash, string calldata scope, string calldata facilityId) external {
        consents[keccak256(abi.encode(patientIdHash, scope, facilityId))].push(
            ConsentRecord(patientIdHash, scope, facilityId, true, block.timestamp)
        );
        emit ConsentGranted(patientIdHash, scope, facilityId);
    }

    function logAccess(bytes32 patientIdHash, string calldata facilityId, string calldata resourceType) external {
        emit AccessLogged(patientIdHash, facilityId, resourceType, block.timestamp);
    }
}
```

**Alternative (PyTeal / Algorand):** For a non-EVM chain, consent and access logging can be implemented as stateful smart contracts in PyTeal; hashes and scope strings are stored in application global/local state, and access events are emitted via inner transactions or logs.

```python
# PyTeal sketch: consent grant stored in app state
from pyteal import *

def consent_program():
    grant_key = Bytes("consent")
    on_grant = Seq(
        App.globalPut(grant_key, Concat(Txn.application_args[0], Txn.application_args[1])),
        Int(1)
    )
    return Cond(
        [Txn.application_args[0] == Bytes("grant"), on_grant],
        [Txn.application_args[0] == Bytes("revoke"), Seq(App.globalDel(grant_key), Int(1))]
    )
```

### 6.5 CI/CD and DevOps

- **Build:** Java (HAPI) and Python (edge/FL) in GitLab CI or GitHub Actions; container images in registry (Harbor/ECR); sign with Cosign.  
- **Deploy:** Argo CD for Kubernetes (region + edge); edge nodes get canary then full rollout; rollback on latency regression.  
- **Testing:** Contract tests for FHIR APIs (Postman/Newman); load tests (k6) for 50 ms SLO; chaos (e.g., kill Redis, partition Kafka) in staging.  
- **Open source foundations:** HAPI FHIR (R5), Apache Kafka/Streams, Redis, Flower/TFF, Keycloak. Contribute back FHIR R5 profiles, Taiwan-specific extensions, and performance patches to upstream.

---

## 7. Security, Privacy & Ethics

### 7.1 Threat Model and Mitigations

| Threat | Mitigation |
|--------|------------|
| Unauthorized access to PII | Zero-trust (mTLS, SPIFFE), OAuth2/OIDC, RBAC; consent checked on every access |
| Insider abuse | Audit every access; blockchain anchor for critical access; least-privilege |
| Ransomware / DB compromise | Immutable backups; edge cache can rebuild from Kafka; no single central DB of record |
| Supply chain | Signed images, SBOM, dependency scanning; HAPI and OSS audits |
| AI model extraction / inversion | Federated learning (no raw data leave sites); differential privacy in aggregates |

### 7.2 Patient Consent Engine

- **Consent stored:** As FHIR `Consent` plus hash/anchor on blockchain.  
- **Scopes:** Treatment (per facility or network), emergency override, research, analytics, international share.  
- **Behavior:** Every cross-facility read/write checks consent; emergency override logged and time-limited.  
- **Patient control:** Mobile app and portal to grant/revoke per scope and per organization.

### 7.3 AI Ethics

- **Bias:** Regular audits of model performance by demographics (age, region, language); retrain or constrain models when disparities exceed policy thresholds.  
- **Explainability:** Risk scores and alerts come with short, human-readable reasons (e.g., “elevated readmission risk due to …”).  
- **Governance:** National AI-in-health committee; model registry and approval workflow before production.

---

## 8. Deployment, Training & Adoption

- **Rollout:** Phased by region (e.g., North → Central → South); pilot facilities first, then full region. Each wave: deploy edge + connect to central, dual-write 4–8 weeks, validate and cutover; keep legacy read-only for 6 months.  
- **Training:** Role-based programs: (1) Clinicians: EHR workflows, consent prompts, AI alert interpretation, voice/scribe tools; (2) Admins: BI dashboards, facility config, user provisioning; (3) Patients: mobile app, consent management, telemedicine. Modules delivered via LMS and in-facility workshops.  
- **Change management:** Super-users per facility (2–5 per site); feedback loops (surveys, incident themes); incentives aligned with quality and interoperability metrics (e.g., reduced duplicate orders, time-to-data).  
- **Support:** 24/7 ops; runbooks for edge/central (cache invalidation, Kafka lag, DB failover); escalation to national platform team; SLAs for P95 and uptime.

---

## 9. Risks, Challenges & Mitigations

| Risk / Challenge | Mitigation |
|-------------------|------------|
| Data migration from legacy NHI/EMR | Dual-write period; ETL from Exchange Center; validation and reconciliation before cutover |
| Physician resistance / workflow | Co-design with frontline; scribes and NLP to reduce documentation burden; prove latency and safety in pilot |
| Edge node reliability | K3s + health checks; auto-failover to regional; no critical path that *requires* edge for correctness |
| Consent complexity | Defaults aligned with law; simple UI; emergency override with strict audit |
| Federated learning non-participation | Incentives (e.g., access to national model); lightweight client; privacy guarantees documented |
| International federation | Start with FHIR R5 + same consent model; bilateral agreements (Estonia, Singapore) as templates |

---

## 10. Next Steps & Recommendations

### 10.1 Pilot Scope (Phase 1)

- Select **5 hospitals** (2 large, 3 medium) and one regional lab.  
- Define **baseline KPIs:** current latency, duplicate test rate, time-to-data at handover.  
- Deploy edge + central pipeline; run for 3 months with dual-write; measure P95 latency, adoption, and safety events.

### 10.2 Partnerships

- **Technology:** NVIDIA (edge AI), Microsoft/Azure or AWS (cloud + FHIR), Redis Inc (caching and scale).  
- **Local:** Taiwan tech leaders (e.g., Acer, Asus, MedTech vendors) for devices and integration.  
- **Standards:** HL7 Taiwan, FHIR community; align with Taiwan PDPA and future AI regulations.

### 10.3 Success Metrics (KPIs)

| KPI | Target (Year 1) | Target (Year 3) |
|-----|------------------|------------------|
| P95 query latency | <50 ms at pilot sites | <50 ms nationally |
| Facility adoption | 5 pilots live | >90% of acute + major primary care |
| Patient app adoption | 10% of active patients | 40% |
| Duplicate lab/imaging (avoidable) | –20% in pilot | –25% nationally |
| Consent grant rate (treatment) | >95% | >98% |
| System uptime | 99.99% | 99.999% |
| Federated model participation | 5 sites | 50+ sites |

---

*This blueprint is intended as a living document. Revisit after Phase 1 to refine latency targets, scope of blockchain, and international federation roadmap.*

---

## Appendix: Document Metadata

- **Assumptions:** 2026–2028 technology; national budget on the order of $10B+; Taiwan NHI and EMR Exchange Center as existing assets to integrate.  


- **References (conceptual):**

 Taiwan NHI, EMR Exchange Center; Estonia X-Road/e-Health; Denmark Sundhed.dk; Singapore NEHR; FHIR R5; HL7 v2; Hyperledger; Flower; HAPI FHIR.
