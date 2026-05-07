"""Export cleaned city panel to site/data/timeseries.json for the static scrolly site."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    csv_path = root / "data" / "cleaned" / "city_panel_enriched.csv"
    out_path = root / "site" / "data" / "timeseries.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if not csv_path.exists():
        raise SystemExit(
            f"Missing {csv_path}. Run: python code/run_pipeline.py"
        )

    df = pd.read_csv(csv_path, parse_dates=["date"])
    cols = ["date", "city", "vacancy_rate_pct", "property_value_index", "rent_index"]
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise SystemExit(f"CSV missing columns: {missing}")

    sub = df[cols].copy()
    sub["date"] = sub["date"].dt.strftime("%Y-%m-%d")
    records = sub.to_dict(orient="records")

    out_path.write_text(json.dumps(records, indent=0), encoding="utf-8")
    print(f"Wrote {len(records)} rows to {out_path}")


if __name__ == "__main__":
    main()
