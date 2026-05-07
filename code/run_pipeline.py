"""Run data construction and metric pipeline for the CRE project."""

from __future__ import annotations

from pathlib import Path

from data_pipeline import build_synthetic_panel, clean_panel, ensure_directories, save_panel
from metrics import compute_cycle_metrics, compute_stakeholder_impacts, summarize_latest


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dirs = ensure_directories(root)

    raw_panel = build_synthetic_panel()
    cleaned = clean_panel(raw_panel)
    with_metrics = compute_cycle_metrics(cleaned)
    enriched = compute_stakeholder_impacts(with_metrics)
    latest = summarize_latest(enriched)

    save_panel(raw_panel, dirs["simulated"] / "city_panel_synthetic.csv")
    save_panel(enriched, dirs["cleaned"] / "city_panel_enriched.csv")
    latest.to_csv(dirs["output"] / "latest_city_snapshot.csv", index=False)

    print(f"Saved enriched panel to: {dirs['cleaned'] / 'city_panel_enriched.csv'}")
    print(f"Saved city snapshot to: {dirs['output'] / 'latest_city_snapshot.csv'}")


if __name__ == "__main__":
    main()

