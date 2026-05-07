"""Streamlit dashboard for CRE office-cycle distributional analysis."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st


@st.cache_data
def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    return df.sort_values(["city", "date"]).reset_index(drop=True)


def apply_shock(df: pd.DataFrame, vacancy_shock_pp: float, value_shock_pct: float) -> pd.DataFrame:
    shocked = df.copy()
    shocked["vacancy_rate_pct_shocked"] = shocked["vacancy_rate_pct"] + vacancy_shock_pp
    shocked["property_value_index_shocked"] = shocked["property_value_index"] * (1 + value_shock_pct / 100.0)
    return shocked


def stakeholder_cards(df: pd.DataFrame) -> None:
    latest = df.sort_values("date").tail(1).iloc[0]
    cols = st.columns(3)
    cols[0].metric("Institutional Investors (z)", f"{latest['impact_institutional_z']:.2f}")
    cols[1].metric(
        "Small Business Tenants (z)",
        f"{latest['impact_small_business_tenants_z']:.2f}",
    )
    cols[2].metric("Urban Workers (z)", f"{latest['impact_urban_workers_z']:.2f}")


def main() -> None:
    st.set_page_config(page_title="CRE Office Cycles Dashboard", layout="wide")
    st.title("Commercial Real Estate Office Cycle Dashboard")
    st.caption("City-level trends and stakeholder impacts under boom-bust dynamics.")

    root = Path(__file__).resolve().parents[1]
    data_path = root / "data" / "cleaned" / "city_panel_enriched.csv"
    if not data_path.exists():
        st.error(
            "Missing cleaned dataset. Run `python code/run_pipeline.py` first to generate input files."
        )
        return

    df = load_data(data_path)

    cities = sorted(df["city"].unique().tolist())
    selected_city = st.sidebar.selectbox("City", cities)
    min_date = df["date"].min().date()
    max_date = df["date"].max().date()
    date_range = st.sidebar.slider("Date range", min_date, max_date, (min_date, max_date))

    vacancy_shock_pp = st.sidebar.slider("Vacancy Shock (pp)", -5.0, 10.0, 0.0, 0.5)
    value_shock_pct = st.sidebar.slider("Property Value Shock (%)", -30.0, 15.0, 0.0, 1.0)

    city_df = df[df["city"] == selected_city].copy()
    city_df = city_df[
        (city_df["date"].dt.date >= date_range[0]) & (city_df["date"].dt.date <= date_range[1])
    ]
    shocked = apply_shock(city_df, vacancy_shock_pp, value_shock_pct)

    st.subheader(f"{selected_city}: Stakeholder Snapshot")
    stakeholder_cards(shocked)

    left, right = st.columns(2)

    with left:
        fig_vacancy = px.line(
            shocked,
            x="date",
            y=["vacancy_rate_pct", "vacancy_rate_pct_shocked"],
            labels={"value": "Vacancy Rate (%)", "variable": "Series"},
            title="Vacancy Rate (Actual vs Shocked)",
        )
        st.plotly_chart(fig_vacancy, use_container_width=True)

        fig_rent = px.line(
            shocked,
            x="date",
            y="rent_index",
            title="Office Rent Index",
            labels={"rent_index": "Index"},
        )
        st.plotly_chart(fig_rent, use_container_width=True)

    with right:
        fig_values = px.line(
            shocked,
            x="date",
            y=["property_value_index", "property_value_index_shocked"],
            labels={"value": "Property Value Index", "variable": "Series"},
            title="Property Values (Actual vs Shocked)",
        )
        st.plotly_chart(fig_values, use_container_width=True)

        fig_reit = px.line(
            shocked,
            x="date",
            y="office_reit_total_return",
            title="Office REIT Total Return",
            labels={"office_reit_total_return": "Return"},
        )
        st.plotly_chart(fig_reit, use_container_width=True)

    st.subheader("Distributional Impact Indices (z-scores)")
    impact_long = shocked.melt(
        id_vars=["date"],
        value_vars=[
            "impact_institutional_z",
            "impact_small_business_tenants_z",
            "impact_urban_workers_z",
        ],
        var_name="stakeholder",
        value_name="impact_z",
    )
    fig_impacts = px.line(
        impact_long,
        x="date",
        y="impact_z",
        color="stakeholder",
        title="Relative Stakeholder Outcomes Over Time",
    )
    st.plotly_chart(fig_impacts, use_container_width=True)


if __name__ == "__main__":
    main()

