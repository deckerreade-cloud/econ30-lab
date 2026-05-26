/**
 * Static 3-section narrative: stat strip, dashboard, FRED charts.
 */

import { createLineChart } from "./charts.js";
import { initDashboard } from "./dashboard.js";
import { initTheme } from "./theme.js";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

async function loadCurated() {
  try {
    const res = await fetch(new URL("../data/curated.json", import.meta.url));
    if (!res.ok) return null;
    return res.json();
  } catch (_err) {
    return null;
  }
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
  if (!curated) return;
  const national = curated.national || {};
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const key = el.getAttribute("data-stat");
    if (key && national[key] != null) el.textContent = String(national[key]);
  });
  if (curated.thesis) {
    document.querySelectorAll("[data-thesis-echo]").forEach((el) => {
      el.textContent = curated.thesis;
    });
  }
}

function renderLists(curated) {
  if (!curated) return;
  const w = document.getElementById("winners-list");
  const l = document.getElementById("losers-list");
  const n = document.getElementById("next-list");
  const lim = document.getElementById("limits-list");
  const src = document.getElementById("sources-list");
  const tangibleBody = document.getElementById("tangible-body");
  const caseStudySource = document.getElementById("case-study-source");
  if (w && Array.isArray(curated.winners) && curated.winners.length) {
    w.innerHTML = curated.winners.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (l && Array.isArray(curated.losers) && curated.losers.length) {
    l.innerHTML = curated.losers.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (n && Array.isArray(curated.next) && curated.next.length) {
    n.innerHTML = curated.next.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (lim && Array.isArray(curated.limits) && curated.limits.length) {
    lim.innerHTML = curated.limits.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }
  if (src && Array.isArray(curated.sources) && curated.sources.length) {
    src.innerHTML = curated.sources
      .map(
        (s) =>
          `<li><a href="${escapeAttr(s.url)}" rel="noopener">${escapeHtml(s.label)}</a></li>`
      )
      .join("");
  }
  if (tangibleBody && curated.caseStudy?.body) {
    tangibleBody.textContent = curated.caseStudy.body;
  }
  if (caseStudySource && curated.caseStudy?.sourceUrl) {
    caseStudySource.innerHTML = `<a href="${escapeAttr(curated.caseStudy.sourceUrl)}" rel="noopener">${escapeHtml(curated.caseStudy.sourceLabel || "Source")}</a>`;
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
      xLabel: "Year",
      color: "#ffd166",
      animate: !prefersReducedMotion,
      height: 240,
      yTickFormat: (v) => `$${Math.round(v)}B`,
    });
    chart.setData(loans.rows);
  }

  const delinq = byId.DRCRELEXFACBS;
  const delinqMount = document.getElementById("fred-delinq-mount");
  if (delinq && delinqMount) {
    const chart = createLineChart(delinqMount, {
      yKey: "value",
      yLabel: "Delinquency rate (%)",
      xLabel: "Year",
      color: "#f26b5e",
      animate: !prefersReducedMotion,
      height: 240,
      yTickFormat: (v) => `${v}%`,
    });
    chart.setData(delinq.rows);
  }
}

async function main() {
  initTheme();

  const curated = await loadCurated();
  fillStatPlaceholders(curated);
  renderLists(curated);

  const [cityRows, fred] = await Promise.all([
    loadCityPanel(),
    loadFred(),
  ]);

  renderFredCharts(fred);
  initDashboard(cityRows, { animate: !prefersReducedMotion, defaultCompare: true });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="padding:2rem;color:#f26b5e">Failed to load story data: ${err.message}</p>`
  );
});
