# Phase 1 gateway smoke – read path + consent (gateway must be running with data).
# Usage:
#   .\scripts\smoke_phase1.ps1
#   $env:EHR_GATEWAY_URL="http://localhost:8100"; .\scripts\smoke_phase1.ps1

$BASE = $env:EHR_GATEWAY_URL -or "http://localhost:8000"
$BASE = $BASE.TrimEnd('/')
$PATIENT = $env:SMOKE_PATIENT_ID -or "P001"
$FACILITY = $env:SMOKE_FACILITY_ID -or "FAC-A"

function chk {
    param(
        [string]$name,
        [string]$uri,
        [hashtable]$headers = @{},
        [string]$method = "GET",
        [string]$body = $null
    )
    
    $params = @{
        Uri = $uri
        Method = $method
        Headers = $headers
        UseBasicParsing = $true
        OutFile = "$env:TEMP\unihealth-p1-smoke.json"
        PassThru = $true
    }
    
    if ($body) {
        $params['Body'] = $body
    }
    
    try {
        $response = Invoke-WebRequest @params
        $code = $response.StatusCode
        Write-Host "$name -> HTTP $code"
        
        if ($code -notin @(200, 202)) {
            $content = Get-Content "$env:TEMP\unihealth-p1-smoke.json" -Raw
            Write-Host "  body (first 300 bytes):"
            Write-Host $content.Substring(0, [Math]::Min(300, $content.Length))
            exit 1
        }
    }
    catch {
        Write-Host "$name -> HTTP ERROR"
        Write-Host $_.Exception.Message
        exit 1
    }
}

# Health check
chk "GET /health" "$BASE/health"

# First patient summary (may be postgres-miss)
chk "GET patient summary (1st - may be postgres-miss)" `
    "$BASE/fhir/r5/Patient/$PATIENT/summary?encounters=5" `
    @{"X-Facility-Id" = $FACILITY}

# Capture cache source from first request
$response1 = Invoke-WebRequest `
    -Uri "$BASE/fhir/r5/Patient/$PATIENT/summary?encounters=5" `
    -Headers @{"X-Facility-Id" = $FACILITY} `
    -UseBasicParsing
$cache1 = $response1.Headers['X-Cache-Source'] -or "?"

# Second patient summary (warm cache)
chk "GET patient summary (2nd - warm cache)" `
    "$BASE/fhir/r5/Patient/$PATIENT/summary?encounters=5" `
    @{"X-Facility-Id" = $FACILITY}

# Capture cache source from second request
$response2 = Invoke-WebRequest `
    -Uri "$BASE/fhir/r5/Patient/$PATIENT/summary?encounters=5" `
    -Headers @{"X-Facility-Id" = $FACILITY} `
    -UseBasicParsing
$cache2 = $response2.Headers['X-Cache-Source'] -or "?"

Write-Host "  X-Cache-Source: first=$cache1 second=$cache2"
if ($cache2 -and $cache2 -ne "redis-hit") {
    Write-Host "  WARN: expected redis-hit on second summary request (is Redis up?)"
}

# POST consent grant
$consentBody = @{
    patient_id = $PATIENT
    facility_id = $FACILITY
    scope = "treatment"
} | ConvertTo-Json

chk "POST consent/grant" `
    "$BASE/consent/grant" `
    @{"Content-Type" = "application/json"} `
    "POST" `
    $consentBody

# GET observations
chk "GET observations" `
    "$BASE/fhir/r5/Patient/$PATIENT/observations?limit=5" `
    @{"X-Facility-Id" = $FACILITY}

# GET medication-requests
chk "GET medication-requests" `
    "$BASE/fhir/r5/Patient/$PATIENT/medication-requests?limit=5" `
    @{"X-Facility-Id" = $FACILITY}

# GET metrics
chk "GET /metrics/json" "$BASE/metrics/json"

Write-Host "Phase 1 smoke OK (patient=$PATIENT, facility=$FACILITY)."
