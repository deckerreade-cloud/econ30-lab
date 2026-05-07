/**
 * Scroll-driven narrative: Scrollama steps + section visibility.
 * D3 charts loaded from charts.js / dashboard.js.
 */

import { createLineChart, createSmallMultiples } from "./charts.js";
import { initDashboard } from "./dashboard.js";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const scrollama = typeof window !== "undefined" && window.scrollama;
if (typeof scrollama !== "function") {
  throw new Error("Scrollama not loaded. Include scrollama.min.js before the module.");
}

/** @type {Map<string, ReturnType<createLineChart> | ReturnType<createSmallMultiples> | null>} */
const graphicCharts = new Map();

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

function setupScrollyGraphic(containerId, stepSelector, onStep) {
  const container = document.getElementById(containerId);
  const graphic = container?.querySelector(".scrolly__graphic-inner");
  const steps = container?.querySelectorAll(stepSelector);
  if (!container || !graphic || !steps?.length) return;

  const scroller = scrollama();
  scroller.setup({
    step: steps,
    offset: 0.6,
    debug: false,
  });
  scroller.onStepEnter((response) => {
    steps.forEach((s) => s.classList.remove("is-active"));
    response.element.classList.add("is-active");
    const stepId = response.element.dataset.step;
    onStep(stepId, graphic, response.index);
  });

  function resize() {
    scroller.resize();
  }
  window.addEventListener("resize", resize);
  resize();
}

async function main() {
  const [curated, timeseries] = await Promise.all([
    loadCurated(),
    loadTimeseries(),
  ]);

  fillStatPlaceholders(curated);
  renderLists(curated);

  // SF / NYC scrolly graphics: mount chart containers once visible
  setupScrollyGraphic("scrolly-sf", ".scrolly__step", (stepId, graphic) => {
    if (stepId === "sf-chart") {
      graphic.innerHTML = '<div id="sf-spark-mount" style="width:100%;min-height:280px"></div>';
      const mount = graphic.querySelector("#sf-spark-mount");
      if (mount) {
        const sf = timeseries.filter((d) => d.city === "San Francisco");
        const chart = createLineChart(mount, {
          yKey: "vacancy_rate_pct",
          yLabel: "Vacancy %",
          color: "#f26b5e",
          animate: !prefersReducedMotion,
        });
        chart.setData(sf);
        graphicCharts.set("sf-scroll", chart);
      }
    } else if (stepId === "sf-text") {
      graphic.innerHTML = `<p style="color:var(--text-muted);text-align:center;max-width:28rem;margin:0 auto;font-size:1rem;line-height:1.5">${curated.sf?.headline ?? ""}</p>`;
    }
  });

  setupScrollyGraphic("scrolly-nyc", ".scrolly__step", (stepId, graphic) => {
    if (stepId === "nyc-chart") {
      graphic.innerHTML = '<div id="nyc-multiples-mount" style="width:100%;min-height:280px"></div>';
      const mount = graphic.querySelector("#nyc-multiples-mount");
      if (mount) {
        const nyc = timeseries.filter((d) => d.city === "New York");
        const chart = createSmallMultiples(mount, {
          animate: !prefersReducedMotion,
        });
        chart.setData(nyc);
        graphicCharts.set("nyc-scroll", chart);
      }
    } else if (stepId === "nyc-text") {
      graphic.innerHTML = `<p style="color:var(--text-muted);text-align:center;max-width:28rem;margin:0 auto;font-size:1rem;line-height:1.5">${curated.nyc?.headline ?? ""}</p>`;
    }
  });

  initDashboard(timeseries, { animate: !prefersReducedMotion });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="padding:2rem;color:#f26b5e">Failed to load story data: ${err.message}</p>`
  );
});
