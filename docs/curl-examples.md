# curl examples (avoid shell line-continuation bugs)

If you put a **space after `\`**, zsh/bash breaks the line continuation and `curl` sees garbage URLs → `Malformed input` / bad port errors.

**Use a single line** (change port if your API is not on 8000):

```bash
curl -s -X POST http://localhost:8000/consent/grant -H "Content-Type: application/json" -d '{"patient_id":"P001","facility_id":"FAC-A","scope":"treatment"}'
```

**Or** use real line breaks with **no character after** the backslash:

```bash
curl -s -X POST http://localhost:8000/consent/grant \
-H "Content-Type: application/json" \
-d '{"patient_id":"P001","facility_id":"FAC-A","scope":"treatment"}'
```

Patient summary:

```bash
curl -s -H "X-Facility-Id: FAC-A" "http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5"
```
