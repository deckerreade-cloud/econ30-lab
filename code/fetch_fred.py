"""Fetch real CRE indicators from FRED and write them to site/data/fred_real.json.

FRED is the Federal Reserve Bank of St. Louis' Economic Data archive — a canonical,
trusted source. Run this script whenever you want to refresh the on-disk snapshot.

Usage:
    python code/fetch_fred.py
"""

from __future__ import annotations

import csv
import io
import json
import urllib.request
from pathlib import Path

# (series_id, label, units, source_blurb)
SERIES = [
    (
        "CREACBM027NBOG",
        "CRE loans, all commercial banks",
        "Billions of $",
        "Federal Reserve H.8 release via FRED",
    ),
    (
        "DRCRELEXFACBS",
        "CRE delinquency rate, all commercial banks",
        "Percent",
        "Federal Reserve Charge-Off and Delinquency report via FRED",
    ),
    (
        "COMREPUSQ159N",
        "U.S. commercial property prices, YoY",
        "Percent change YoY",
        "BIS / FRED",
    ),
]

START_DATE = "2005-01-01"
OUT_PATH = Path("site/data/fred_real.json")


def _fetch_csv(series_id: str) -> list[dict]:
    url = (
        "https://fred.stlouisfed.org/graph/fredgraph.csv?"
        f"id={series_id}&cosd={START_DATE}"
    )
    with urllib.request.urlopen(url, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(raw))
    rows: list[dict] = []
    for row in reader:
        date = row.get("observation_date") or row.get("DATE")
        val = row.get(series_id)
        if not date or val in (None, "", "."):
            continue
        try:
            rows.append({"date": date, "value": float(val)})
        except ValueError:
            continue
    return rows


def main() -> None:
    payload = {"_meta": {"fetched_from": "https://fred.stlouisfed.org", "start": START_DATE}, "series": []}
    for sid, label, units, source in SERIES:
        rows = _fetch_csv(sid)
        print(f"  {sid}: {len(rows):>4} rows  ({rows[0]['date']} -> {rows[-1]['date']})")
        payload["series"].append(
            {
                "id": sid,
                "label": label,
                "units": units,
                "source": source,
                "url": f"https://fred.stlouisfed.org/series/{sid}",
                "rows": rows,
            }
        )
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"wrote {OUT_PATH} ({OUT_PATH.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
