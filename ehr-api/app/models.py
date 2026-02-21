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
