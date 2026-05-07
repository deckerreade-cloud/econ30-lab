"""Metric construction for CRE boom-bust and stakeholder impact analysis."""

from __future__ import annotations

import numpy as np
import pandas as pd


def compute_cycle_metrics(panel: pd.DataFrame) -> pd.DataFrame:
    """Add city-level boom-bust indicators and rolling stress measures."""
    df = panel.sort_values(["city", "date"]).copy()
    by_city = df.groupby("city", group_keys=False)

    df["property_peak"] = by_city["property_value_index"].cummax()
    df["property_drawdown_pct"] = 100 * (df["property_value_index"] / df["property_peak"] - 1)

    df["vacancy_shock_pp"] = (
        df["vacancy_rate_pct"] - by_city["vacancy_rate_pct"].transform(lambda x: x.rolling(8, min_periods=1).mean())
    )
    df["cap_rate_expansion_pp"] = (
        df["cap_rate_pct"] - by_city["cap_rate_pct"].transform(lambda x: x.rolling(8, min_periods=1).mean())
    )
    df["rent_growth_qoq_pct"] = by_city["rent_index"].pct_change() * 100
    df["employment_growth_qoq_pct"] = (
        by_city["urban_office_employment_index"].pct_change() * 100
    )
    return df


def compute_stakeholder_impacts(panel_with_metrics: pd.DataFrame) -> pd.DataFrame:
    """
    Construct directional impact indices by stakeholder.

    Indices are centered around 0 where higher values indicate improved outcomes.
    """
    df = panel_with_metrics.copy()
    eps = 1e-6

    # Institutional investors: hurt by drawdowns and weak REIT returns.
    df["impact_institutional"] = (
        0.6 * df["office_reit_total_return"] - 0.4 * (np.abs(df["property_drawdown_pct"]) / 100)
    )

    # Small business tenants: benefit from lower rents but are hurt by weak demand.
    rent_relief = -df["rent_growth_qoq_pct"].fillna(0) / 10
    demand_stress = df["vacancy_shock_pp"] / 10
    df["impact_small_business_tenants"] = 0.5 * rent_relief - 0.5 * demand_stress

    # Urban workers: proxied by employment momentum and market deterioration.
    df["impact_urban_workers"] = (
        0.7 * df["employment_growth_qoq_pct"].fillna(0) / 10
        - 0.3 * np.maximum(df["vacancy_shock_pp"], 0) / 10
    )

    # Normalize by city for comparability.
    for col in [
        "impact_institutional",
        "impact_small_business_tenants",
        "impact_urban_workers",
    ]:
        city_mean = df.groupby("city")[col].transform("mean")
        city_std = df.groupby("city")[col].transform("std").replace(0, np.nan)
        df[f"{col}_z"] = (df[col] - city_mean) / (city_std + eps)

    return df


def summarize_latest(panel: pd.DataFrame) -> pd.DataFrame:
    """Return latest-period snapshot metrics by city."""
    latest = panel.sort_values("date").groupby("city", as_index=False).tail(1).copy()
    cols = [
        "city",
        "date",
        "vacancy_rate_pct",
        "property_drawdown_pct",
        "cap_rate_expansion_pp",
        "impact_institutional_z",
        "impact_small_business_tenants_z",
        "impact_urban_workers_z",
    ]
    return latest[cols].reset_index(drop=True)

