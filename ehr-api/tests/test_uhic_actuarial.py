"""Tests for UHIC actuarial primitives."""

from app.insurance.actuarial import (
    fraud_risk_score,
    ibnr_chain_ladder,
    informal_sector_contribution,
    loss_ratio,
    national_contribution,
    reserve_snapshot,
    risk_rated_premium,
    shif_contribution,
)


def test_shif_contribution_floor_cap():
    assert shif_contribution(0) == 300.0
    assert shif_contribution(10_000) == 300.0  # 2.75% = 275, floor = 300
    assert shif_contribution(20_000) == 550.0
    assert shif_contribution(500_000) == 9000.0


def test_informal_sector_means_testing():
    assert informal_sector_contribution(4_000) == 300.0
    assert informal_sector_contribution(8_000) == 500.0
    assert informal_sector_contribution(12_000) == 750.0
    assert informal_sector_contribution(60_000) == shif_contribution(60_000)


def test_national_contribution_sectors():
    formal = national_contribution(sector="formal", gross_salary_kes=45_000)
    assert formal["basis"] == "payroll_2.75pct"
    assert formal["monthly_contribution_kes"] == shif_contribution(45_000)
    informal = national_contribution(sector="informal", declared_monthly_income_kes=8_000)
    assert informal["basis"] == "means_tested"
    assert informal["monthly_contribution_kes"] == 500.0


def test_loss_ratio():
    assert loss_ratio(50_000, 100_000) == 0.5


def test_ibnr_chain_ladder():
    ibnr = ibnr_chain_ladder([100, 180, 220], [1.5, 1.2])
    assert ibnr > 0


def test_risk_rated_premium():
    q = risk_rated_premium(3500, 45, "2")
    assert q["monthly_premium_kes"] > 0


def test_fraud_score_capped():
    r = fraud_risk_score(phantom_encounter=True, clinical_mismatch=True)
    assert r["score"] <= 100
    assert "PHANTOM_ENCOUNTER" in r["reason_codes"]


def test_reserve_snapshot():
    r = reserve_snapshot(1_000_000, 400_000)
    assert "ibnr_kes" in r
    assert r["loss_ratio"] >= 0
