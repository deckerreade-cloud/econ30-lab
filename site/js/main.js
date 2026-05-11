/**
 * Static 3-section narrative: stat strip, dashboard, case-study charts.
 * D3 charts loaded from charts.js / dashboard.js.
 */

import { createLineChart, createSmallMultiples } from "./charts.js";
import { initDashboard } from "./dashboard.js";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

async function loadCurated() {
  const res = await fetch(new URL("../data/curated.json", import.meta.url));
  if (!res.ok) throw new Error("curated.json missing");
  return res.json();
}

async function loadTimeseries() {
  const res = await fetch(new URL("../data/timeseries.json", import.meta.url));
  if (!res.ok) throw new Error("timeseries.json missing");
  return res.json();
}

function fillStatPlaceholders(curated) {
  const national = curated.national || {};
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const key = el.getAttribute("data-stat");
    if (key && national[key] != null) el.textContent = String(national[key]);
  });
}

function renderLists(curated) {
  const w = document.getElementById("winners-list");
  const l = document.getElementById("losers-list");
  const n = document.getElementById("next-list");
  const src = document.getElementById("sources-list");
  if (w && Array.isArray(curated.winners)) {
    w.innerHTML = curated.winners.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (l && Array.isArray(curated.losers)) {
    l.innerHTML = curated.losers.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (n && Array.isArray(curated.next)) {
    n.innerHTML = curated.next.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (src && Array.isArray(curated.sources)) {
    src.innerHTML = curated.sources
      .map(
        (s) =>
          `<li><a href="${escapeAttr(s.url)}">${escapeHtml(s.label)}</a></li>`
      )
      .join("");
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function renderCaseStudyCharts(timeseries) {
  const sfMount = document.getElementById("sf-chart-mount");
  if (sfMount) {
    const chart = createLineChart(sfMount, {
      yKey: "vacancy_rate_pct",
      yLabel: "Vacancy %",
      color: "#f26b5e",
      animate: !prefersReducedMotion,
    });
    chart.setData(timeseries.filter((d) => d.city === "San Francisco"));
  }

  const nycMount = document.getElementById("nyc-chart-mount");
  if (nycMount) {
    const chart = createSmallMultiples(nycMount, {
      animate: !prefersReducedMotion,
    });
    chart.setData(timeseries.filter((d) => d.city === "New York"));
  }
}

async function main() {
  const [curated, timeseries] = await Promise.all([
    loadCurated(),
    loadTimeseries(),
  ]);

  fillStatPlaceholders(curated);
  renderLists(curated);
  renderCaseStudyCharts(timeseries);
  initDashboard(timeseries, { animate: !prefersReducedMotion });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="padding:2rem;color:#f26b5e">Failed to load story data: ${err.message}</p>`
  );
});
