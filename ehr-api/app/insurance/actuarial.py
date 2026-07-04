"""
UHIC — Actuarial & risk analytics primitives.

Kenya national health insurance (Social Health Authority / SHIF replacing NHIF):
- Universal membership — all Kenyans and eligible residents
- Formal sector: 2.75% of gross salary (floor Ksh 300, cap Ksh 9,000)
- Informal sector: graduated means-testing by declared monthly income
- PHF provider contracts + ECCIF catastrophic pool + optional private top-up
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal, Sequence

Sector = Literal["formal", "informal"]

# SHIF statutory contribution (Social Health Insurance Act 2023 — replaces NHIF)
SHIF_RATE = 0.0275
SHIF_FLOOR_KES = 300.0
SHIF_CAP_KES = 9_000.0

# Pilot means-testing bands for informal-sector contributors (declared monthly income, KES)
INFORMAL_INCOME_BANDS: tuple[tuple[float, float, float], ...] = (
    (0, 5_999, 300),
    (6_000, 9_999, 500),
    (10_000, 14_999, 750),
    (15_000, 19_999, 1_000),
    (20_000, 29_999, 1_500),
    (30_000, 49_999, 2_500),
    (50_000, float("inf"), 0),  # 0 → use formal 2.75% formula
)


def shif_contribution(gross_salary_kes: float) -> float:
    """Formal-sector SHIF: 2.75% of gross with statutory floor and cap."""
    if gross_salary_kes <= 0:
        return SHIF_FLOOR_KES
    raw = gross_salary_kes * SHIF_RATE
    return round(max(SHIF_FLOOR_KES, min(SHIF_CAP_KES, raw)), 2)


def informal_sector_contribution(declared_monthly_income_kes: float) -> float:
    """
    Informal-sector graduated means-testing (pilot bands).
    High earners in informal sector align to formal 2.75% rule.
    """
    income = max(0.0, declared_monthly_income_kes)
    for low, high, amount in INFORMAL_INCOME_BANDS:
        if low <= income <= high:
            if amount > 0:
                return amount
            return shif_contribution(income)
    return SHIF_FLOOR_KES


def national_contribution(
    *,
    sector: Sector = "formal",
    gross_salary_kes: float = 0,
    declared_monthly_income_kes: float = 0,
) -> dict:
    """Unified national SHIF contribution quote for formal or informal sector."""
    if sector == "informal":
        monthly = informal_sector_contribution(declared_monthly_income_kes)
        return {
            "scheme_type": "SHIF",
            "sector": "informal",
            "monthly_contribution_kes": monthly,
            "basis": "means_tested",
            "declared_monthly_income_kes": declared_monthly_income_kes,
            "floor_kes": SHIF_FLOOR_KES,
            "cap_kes": SHIF_CAP_KES,
        }
    monthly = shif_contribution(gross_salary_kes)
    return {
        "scheme_type": "SHIF",
        "sector": "formal",
        "monthly_contribution_kes": monthly,
        "basis": "payroll_2.75pct",
        "gross_salary_kes": gross_salary_kes,
        "rate": SHIF_RATE,
        "floor_kes": SHIF_FLOOR_KES,
        "cap_kes": SHIF_CAP_KES,
    }


def loss_ratio(incurred_claims_kes: float, earned_premium_kes: float) -> float:
    """Incurred loss ratio (claims / earned premium). Returns 0 if no premium."""
    if earned_premium_kes <= 0:
        return 0.0
    return round(incurred_claims_kes / earned_premium_kes, 4)


def combined_ratio(
    incurred_claims_kes: float,
    earned_premium_kes: float,
    expense_ratio: float = 0.12,
) -> float:
    """Loss ratio + expense ratio (IRA solvency monitoring)."""
    return round(loss_ratio(incurred_claims_kes, earned_premium_kes) + expense_ratio, 4)


def ibnr_chain_ladder(
    reported_by_age: Sequence[float],
    development_factors: Sequence[float],
) -> float:
    """
    Simple chain-ladder IBNR estimate.

    ``reported_by_age``: cumulative reported claims by development period (oldest first).
    ``development_factors``: age-to-age factors (length = len(reported) - 1).
    """
    if not reported_by_age:
        return 0.0
    ultimate = float(reported_by_age[-1])
    for i in range(len(reported_by_age) - 1, 0, -1):
        factor = development_factors[i - 1] if i - 1 < len(development_factors) else 1.0
        if factor <= 0:
            factor = 1.0
        ultimate *= factor
    reported_latest = float(reported_by_age[-1])
    return round(max(0.0, ultimate - reported_latest), 2)


def age_band_factor(age: int) -> float:
    """Private underwriting age band multiplier."""
    if age < 18:
        return 0.65
    if age < 30:
        return 0.85
    if age < 45:
        return 1.0
    if age < 55:
        return 1.25
    if age < 65:
        return 1.55
    return 2.1


def occupation_class_factor(occupation_class: str) -> float:
    """Occupation risk class (1=low … 4=high hazard)."""
    mapping = {"1": 0.9, "2": 1.0, "3": 1.35, "4": 1.75, "low": 0.9, "medium": 1.0, "high": 1.35, "hazard": 1.75}
    return mapping.get(str(occupation_class).lower(), 1.0)


def claims_history_factor(prior_claims_count: int, prior_claims_amount_kes: float) -> float:
    """Experience rating modifier from prior claims."""
    if prior_claims_count == 0:
        return 0.92
    if prior_claims_count <= 2 and prior_claims_amount_kes < 50_000:
        return 1.0
    if prior_claims_count <= 5:
        return 1.15
    return 1.35 + min(0.5, prior_claims_amount_kes / 500_000)


def risk_rated_premium(
    base_rate_kes: float,
    age: int,
    occupation_class: str = "2",
    prior_claims_count: int = 0,
    prior_claims_amount_kes: float = 0.0,
    facility_tier_factor: float = 1.0,
) -> dict:
    """Private/commercial risk-rated monthly premium."""
    af = age_band_factor(age)
    of = occupation_class_factor(occupation_class)
    cf = claims_history_factor(prior_claims_count, prior_claims_amount_kes)
    ft = max(0.8, min(1.5, facility_tier_factor))
    gross = base_rate_kes * af * of * cf * ft
    return {
        "base_rate_kes": base_rate_kes,
        "age_factor": af,
        "occupation_factor": of,
        "claims_history_factor": round(cf, 3),
        "facility_tier_factor": ft,
        "monthly_premium_kes": round(gross, 2),
        "annual_premium_kes": round(gross * 12, 2),
    }


def penalty_surcharge(days_late: int, base_amount_kes: float, daily_rate: float = 0.001) -> float:
    """Late premium penalty (simple actuarial surcharge)."""
    if days_late <= 0:
        return 0.0
    return round(base_amount_kes * daily_rate * days_late, 2)


def eccif_depletion_forecast(
    fund_balance_kes: float,
    monthly_burn_kes: float,
    monthly_inflow_kes: float,
    months: int = 12,
) -> list[dict]:
    """Project ECCIF / PHF fund balance over horizon."""
    rows: list[dict] = []
    balance = fund_balance_kes
    for m in range(1, months + 1):
        balance = balance + monthly_inflow_kes - monthly_burn_kes
        rows.append({
            "month": m,
            "projected_balance_kes": round(balance, 2),
            "net_flow_kes": round(monthly_inflow_kes - monthly_burn_kes, 2),
        })
    return rows


def fraud_risk_score(
    *,
    phantom_encounter: bool = False,
    upcoding_flag: bool = False,
    duplicate_billing: bool = False,
    provider_outlier: bool = False,
    clinical_mismatch: bool = False,
    impossible_sequence: bool = False,
) -> dict:
    """
    Transparent 0–100 fraud risk score with reason codes (IRA/SHA dispute defensibility).
    """
    score = 0
    reasons: list[str] = []
    weights = [
        (phantom_encounter, 45, "PHANTOM_ENCOUNTER"),
        (upcoding_flag, 25, "UPCODING"),
        (duplicate_billing, 20, "DUPLICATE_BILLING"),
        (provider_outlier, 15, "PROVIDER_OUTLIER"),
        (clinical_mismatch, 30, "CLINICAL_MISMATCH"),
        (impossible_sequence, 20, "IMPOSSIBLE_SEQUENCE"),
    ]
    for flag, pts, code in weights:
        if flag:
            score += pts
            reasons.append(code)
    score = min(100, score)
    band = "low" if score < 25 else "medium" if score < 55 else "high" if score < 75 else "critical"
    return {"score": score, "band": band, "reason_codes": reasons}


@dataclass
class ReserveSnapshot:
    earned_premium_kes: float
    reported_claims_kes: float
    ibnr_kes: float
    case_reserves_kes: float

    @property
    def total_incurred_kes(self) -> float:
        return self.reported_claims_kes + self.ibnr_kes + self.case_reserves_kes

    @property
    def loss_ratio(self) -> float:
        return loss_ratio(self.total_incurred_kes, self.earned_premium_kes)

    def to_dict(self) -> dict:
        return {
            "earned_premium_kes": self.earned_premium_kes,
            "reported_claims_kes": self.reported_claims_kes,
            "ibnr_kes": self.ibnr_kes,
            "case_reserves_kes": self.case_reserves_kes,
            "total_incurred_kes": round(self.total_incurred_kes, 2),
            "loss_ratio": self.loss_ratio,
            "combined_ratio": combined_ratio(self.total_incurred_kes, self.earned_premium_kes),
        }


def reserve_snapshot(
    earned_premium_kes: float,
    reported_claims_kes: float,
    reported_triangle: Sequence[float] | None = None,
    development_factors: Sequence[float] | None = None,
    case_reserves_kes: float = 0.0,
) -> dict:
    """IRA-style reserve adequacy snapshot with IBNR."""
    triangle = reported_triangle or [reported_claims_kes * 0.4, reported_claims_kes * 0.7, reported_claims_kes]
    factors = development_factors or [1.35, 1.18, 1.08]
    ibnr = ibnr_chain_ladder(triangle, factors)
    snap = ReserveSnapshot(
        earned_premium_kes=earned_premium_kes,
        reported_claims_kes=reported_claims_kes,
        ibnr_kes=ibnr,
        case_reserves_kes=case_reserves_kes,
    )
    return snap.to_dict()


def credibility_weighted_experience(
    group_claims: float,
    group_exposure: float,
    manual_rate: float,
    full_credibility_exposure: float = 1_000.0,
) -> float:
    """Bühlmann-style credibility for experience rating blend."""
    if group_exposure <= 0:
        return manual_rate
    z = min(1.0, math.sqrt(group_exposure / full_credibility_exposure))
    experience_rate = group_claims / group_exposure if group_exposure else manual_rate
    return round(z * experience_rate + (1 - z) * manual_rate, 4)
