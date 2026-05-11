/**
 * Static 3-section narrative: stat strip, dashboard, case-study charts.
 * D3 charts loaded from charts.js / dashboard.js.
 */

import { createLineChart } from "./charts.js";
import { initDashboard } from "./dashboard.js";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

async function loadCurated() {
  const res = await fetch(new URL("../data/curated.json", import.meta.url));
  if (!res.ok) throw new Error("curated.json missing");
  return res.json();
}

async function loadCityPanel() {
  const res = await fetch(new URL("../data/city_panel.json", import.meta.url));
  if (!res.ok) throw new Error("city_panel.json missing");
  const json = await res.json();
  return Array.isArray(json.rows) ? json.rows : [];
}

async function loadFred() {
  try {
    const res = await fetch(new URL("../data/fred_real.json", import.meta.url));
    if (!res.ok) return null;
    return res.json();
  } catch (_err) {
    return null;
  }
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

function renderFredCharts(fred) {
  if (!fred || !Array.isArray(fred.series)) return;
  const byId = Object.fromEntries(fred.series.map((s) => [s.id, s]));

  const loans = byId.CREACBM027NBOG;
  const loansMount = document.getElementById("fred-loans-mount");
  if (loans && loansMount) {
    const chart = createLineChart(loansMount, {
      yKey: "value",
      yLabel: "Billions of USD",
      color: "#ffd166",
      animate: !prefersReducedMotion,
      height: 240,
    });
    chart.setData(loans.rows);
  }

  const delinq = byId.DRCRELEXFACBS;
  const delinqMount = document.getElementById("fred-delinq-mount");
  if (delinq && delinqMount) {
    const chart = createLineChart(delinqMount, {
      yKey: "value",
      yLabel: "Delinquency rate (%)",
      color: "#f26b5e",
      animate: !prefersReducedMotion,
      height: 240,
    });
    chart.setData(delinq.rows);
  }
}

async function main() {
  const [curated, cityRows, fred] = await Promise.all([
    loadCurated(),
    loadCityPanel(),
    loadFred(),
  ]);

  fillStatPlaceholders(curated);
  renderLists(curated);
  renderFredCharts(fred);
  initDashboard(cityRows, { animate: !prefersReducedMotion });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="padding:2rem;color:#f26b5e">Failed to load story data: ${err.message}</p>`
  );
});
