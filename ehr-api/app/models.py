from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class Patient(BaseModel):
    id: str
    nhi_number: str
    family_name: Optional[str] = None
    given_name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None


class Encounter(BaseModel):
    id: str
    patient_id: str
    facility_id: str
    facility_name: Optional[str] = None
    status: str = "finished"
    class_code: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PatientSummary(BaseModel):
    """FHIR-style patient + recent encounters for <50ms edge response."""

    patient: Patient
    encounters: list[Encounter] = Field(default_factory=list)


class Observation(BaseModel):
    id: str
    patient_id: str
    code: Optional[str] = None
    effective_time: Optional[datetime] = None
    value_text: Optional[str] = None
    unit: Optional[str] = None


class MedicationRequest(BaseModel):
    id: str
    patient_id: str
    medication_code: Optional[str] = None
    status: Optional[str] = None
    authored_on: Optional[datetime] = None
    dosage_text: Optional[str] = None
