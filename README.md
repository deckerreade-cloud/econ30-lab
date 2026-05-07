# CRE Office Boom-Bust Distribution Project

This project analyzes how office-market cycles in commercial real estate affect
different stakeholders: institutional investors, small business tenants, and
urban workers.

## Structure

- `data/`: raw, cleaned, and simulated datasets
- `code/`: data pipeline, metrics, and dashboard scripts
- `figures/`: exported charts and tables
- `output/`: model outputs, snapshots, and logs
- `memo.md`: research write-up

## Quick Start

1. Install dependencies:
   - `pip install -r code/requirements.txt`
2. Build the synthetic baseline dataset:
   - `python code/run_pipeline.py`
3. Launch the dashboard:
   - `streamlit run code/dashboard.py`

## Current Data Mode

The current implementation includes a robust synthetic baseline to make the full
workflow reproducible immediately. You can replace synthetic ingestion with
public data pulls (FRED/BLS/city open data/SEC-derived REIT series) while
keeping the same panel schema.

## Core Outputs

- Enriched panel: `data/cleaned/city_panel_enriched.csv`
- Synthetic raw panel: `data/simulated/city_panel_synthetic.csv`
- Latest city snapshot: `output/latest_city_snapshot.csv`
- Scrolly site time series: `site/data/timeseries.json` (run `python code/export_timeseries.py` after the pipeline)

## Public narrative site

- Static scroll-driven story: `site/` — see [site/README.md](site/README.md) for how to serve it locally.
