# Imaging AI at edge (Blueprint — planned)

## Objective

Triage and highlight findings on radiology studies at the **edge node**, with results linked to FHIR `ImagingStudy` / `DiagnosticReport`.

## Out of scope for AI Assist pilot

- No DICOM/PACS adapter in this repository.
- No Triton inference server in `docker-compose.staging.yml`.

## Target stack

- NVIDIA Triton + TensorRT models per modality (CXR first).
- ONNX export pipeline from national model registry.
- Latency SLO: &lt; 2s for single-slice CXR on edge GPU.

## Safety

- Display as **assist-only**; radiologist over-read required.
- No autonomous report signing.
