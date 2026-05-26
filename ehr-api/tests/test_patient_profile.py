"""Patient portal profile and password change rules."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import state
from app.patient_security import hash_password, verify_password

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_p001_password():
    row = state.get_or_create_portal_profile("P001")
    row["password_hash"] = hash_password("Patient360!")
    row["password_change_count"] = 0
    yield


def test_get_profile_includes_security_meta():
    r = client.get("/patient/P001/profile")
    assert r.status_code == 200
    data = r.json()
    assert data["patient_id"] == "P001"
    assert data["password_changes_allowed"] == 2
    assert data["password_changes_remaining"] == 2
    assert data["has_password"] is True


def test_patch_profile_updates_names():
    r = client.patch(
        "/patient/P001/profile",
        json={"given_name": "Patience", "family_name": "Mutiso-K", "phone": "0712000000"},
    )
    assert r.status_code == 200
    assert r.json()["family_name"] == "Mutiso-K"
    assert r.json()["phone"] == "0712000000"


def test_change_password_requires_current():
    r = client.post(
        "/patient/P001/security/change-password",
        json={
            "current_password": "wrong",
            "new_password": "NewSecure1!",
            "confirm_password": "NewSecure1!",
        },
    )
    assert r.status_code == 401


def test_change_password_max_two_times():
    body = {
        "current_password": "Patient360!",
        "new_password": "FirstChange1!",
        "confirm_password": "FirstChange1!",
    }
    assert client.post("/patient/P001/security/change-password", json=body).status_code == 200

    body["current_password"] = "FirstChange1!"
    body["new_password"] = "SecondChange2!"
    body["confirm_password"] = "SecondChange2!"
    assert client.post("/patient/P001/security/change-password", json=body).status_code == 200

    body["current_password"] = "SecondChange2!"
    body["new_password"] = "ThirdChange3!"
    body["confirm_password"] = "ThirdChange3!"
    r = client.post("/patient/P001/security/change-password", json=body)
    assert r.status_code == 403
    assert "limit" in r.json()["detail"].lower()


def test_verify_password_roundtrip():
    h = hash_password("TestPass99")
    assert verify_password("TestPass99", h)
    assert not verify_password("nope", h)
