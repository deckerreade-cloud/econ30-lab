"""
Data ingestion and panel-construction utilities for CRE office-cycle analysis.

This module prioritizes public data sources and supports a fallback synthetic mode
so the rest of the research workflow can run even when external data APIs are
unavailable in a local environment.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class CityConfig:
    """Mapping metadata used in synthetic fallback and labeling."""

    city: str
    city_code: str
    state: str


CITY_CONFIGS: tuple[CityConfig, ...] = (
    CityConfig(city="San Francisco", city_code="SFO", state="CA"),
    CityConfig(city="New York", city_code="NYC", state="NY"),
    CityConfig(city="Washington DC", city_code="DCA", state="DC"),
)


def ensure_directories(root: Path) -> dict[str, Path]:
    """Create expected data/output directories under the project root."""
    data_dir = root / "data"
    paths = {
        "data": data_dir,
        "raw": data_dir / "raw",
        "cleaned": data_dir / "cleaned",
        "simulated": data_dir / "simulated",
        "output": root / "output",
        "figures": root / "figures",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def _synthetic_city_series(
    city_config: CityConfig,
    periods: int = 80,
    start: str = "2005-01-01",
    seed: int = 42,
) -> pd.DataFrame:
    """Generate a plausible quarterly city-level office market panel."""
    rng = np.random.default_rng(seed + hash(city_config.city_code) % 10_000)
    dates = pd.date_range(start=start, periods=periods, freq="QE")
    t = np.arange(periods)

    # Demand downshift post-2020 proxy with cyclical structure.
    shock = np.where(dates >= "2020-03-31", 1.0, 0.0)
    cycle = np.sin(t / 6.0) + 0.5 * np.sin(t / 14.0)

    vacancy_rate = np.clip(
        0.12 + 0.04 * cycle + 0.08 * shock + rng.normal(0, 0.008, periods),
        0.04,
        0.40,
    )
    rent_index = 100 + np.cumsum(0.8 * (1 - vacancy_rate) + rng.normal(0, 0.35, periods))
    property_value_index = (
        110
        + np.cumsum(1.2 * (1 - vacancy_rate) - 0.7 * shock + rng.normal(0, 0.7, periods))
    )
    cap_rate = np.clip(
        0.045 + 0.006 * vacancy_rate + 0.01 * shock + rng.normal(0, 0.0018, periods),
        0.03,
        0.12,
    )
    office_reit_total_return = (
        0.02 + 0.08 * (1 - vacancy_rate) - 0.12 * shock + rng.normal(0, 0.04, periods)
    )
    urban_office_employment_index = np.clip(
        100
        + np.cumsum(0.4 * (1 - vacancy_rate) - 0.5 * shock + rng.normal(0, 0.45, periods)),
        70,
        130,
    )
    small_business_rent_burden = np.clip(
        0.19 + 0.09 * (rent_index / np.maximum(urban_office_employment_index, 1.0) - 0.95),
        0.10,
        0.45,
    )

    return pd.DataFrame(
        {
            "date": dates,
            "city": city_config.city,
            "city_code": city_config.city_code,
            "state": city_config.state,
            "vacancy_rate": vacancy_rate,
            "rent_index": rent_index,
            "property_value_index": property_value_index,
            "cap_rate": cap_rate,
            "office_reit_total_return": office_reit_total_return,
            "urban_office_employment_index": urban_office_employment_index,
            "small_business_rent_burden": small_business_rent_burden,
        }
    )


def build_synthetic_panel(cities: Iterable[CityConfig] = CITY_CONFIGS) -> pd.DataFrame:
    """Create synthetic panel data for all configured cities."""
    frames = [_synthetic_city_series(city) for city in cities]
    panel = pd.concat(frames, ignore_index=True)
    panel["period"] = panel["date"].dt.to_period("Q").astype(str)  # period label still uses Q
    return panel.sort_values(["city", "date"]).reset_index(drop=True)


def clean_panel(panel: pd.DataFrame) -> pd.DataFrame:
    """Apply simple consistency checks and derived columns."""
    cleaned = panel.copy()
    cleaned = cleaned.sort_values(["city", "date"]).reset_index(drop=True)
    cleaned["vacancy_rate_pct"] = cleaned["vacancy_rate"] * 100
    cleaned["cap_rate_pct"] = cleaned["cap_rate"] * 100
    cleaned["reit_drawdown_proxy"] = (
        cleaned.groupby("city")["office_reit_total_return"].transform(lambda x: x - x.cummax())
    )
    return cleaned


def save_panel(panel: pd.DataFrame, out_path: Path) -> None:
    """Save panel data to CSV with stable column ordering."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    panel.to_csv(out_path, index=False)

