/**
 * City dashboard: single-city or compare-all overlay on three real metrics.
 */

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const CITIES = ["San Francisco", "New York", "Washington DC"];

const CITY_COLORS = {
  "San Francisco": "#f26b5e",
  "New York": "#ffd166",
  "Washington DC": "#3db7a0",
};

const METRICS = {
  vacancy: {
    key: "vacancy_rate_pct",
    yTitle: "Vacancy (%)",
    tickFormat: (v) => `${v}%`,
  },
  rent: {
    key: "asking_rent_psf",
    yTitle: "Asking rent ($/sf/yr)",
    tickFormat: (v) => `$${v}`,
  },
  sublease: {
    key: "sublease_msf",
    yTitle: "Sublease (M sq ft)",
    tickFormat: (v) => `${v}`,
  },
};

function tickColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#8a93a6";
}

function hairlineColor() {
  return "rgba(128, 128, 128, 0.25)";
}

/**
 * @param {Array<{date:string,city:string,vacancy_rate_pct:number,asking_rent_psf:number,sublease_msf:number}>} timeseries
 * @param {{ animate?: boolean }} options
 */
export function initDashboard(timeseries, options = {}) {
  const { animate = true } = options;
  const cityButtons = document.querySelectorAll(".city-toggle [data-city]");
  const compareBtn = document.getElementById("compare-all-btn");
  const panels = document.querySelectorAll(".chart-panel[data-metric]");
  if (!panels.length) return;

  let mode = "single";
  let current = "San Francisco";

  const byCity = (city) =>
    timeseries.filter((d) => d.city === city).sort((a, b) => +new Date(a.date) - +new Date(b.date));

  function drawSinglePanel(panel, metric, cityRows) {
    const cfg = METRICS[metric];
    if (!cfg) return;

    const container = panel.querySelector(".chart-panel__svg");
    if (!container) return;
    d3.select(container).selectAll("svg").remove();

    const margin = { top: 18, right: 8, bottom: 36, left: 44 };
    const width = container.clientWidth || 280;
    const height = 175;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(cityRows, (d) => new Date(d.date)))
      .range([0, innerW]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(cityRows, (d) => +d[cfg.key]) * 1.05 || 1])
      .nice()
      .range([innerH, 0]);

    const line = d3
      .line()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(+d[cfg.key]))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat("%y")))
      .call((a) => a.selectAll("text").attr("fill", tickColor()).attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", hairlineColor()));

    g.append("g")
      .call(d3.axisLeft(y).ticks(3).tickFormat(cfg.tickFormat))
      .call((a) => a.selectAll("text").attr("fill", tickColor()).attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", hairlineColor()));

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 32)
      .attr("text-anchor", "middle")
      .attr("fill", tickColor())
      .attr("font-size", 10)
      .text("Year (Q4 snapshot)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -36)
      .attr("text-anchor", "middle")
      .attr("fill", tickColor())
      .attr("font-size", 10)
      .text(cfg.yTitle);

    const path = g
      .append("path")
      .datum(cityRows)
      .attr("fill", "none")
      .attr("stroke", CITY_COLORS[current] || "#3db7a0")
      .attr("stroke-width", 2)
      .attr("d", line);

    const len = path.node()?.getTotalLength?.() ?? 0;
    if (animate && len) {
      path
        .attr("stroke-dasharray", `${len} ${len}`)
        .attr("stroke-dashoffset", len)
        .transition()
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }
  }

  function drawOverlayPanel(panel, metric) {
    const cfg = METRICS[metric];
    if (!cfg) return;

    const container = panel.querySelector(".chart-panel__svg");
    if (!container) return;
    d3.select(container).selectAll("svg").remove();

    const margin = { top: 18, right: 8, bottom: 36, left: 44 };
    const width = container.clientWidth || 280;
    const height = 175;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const allRows = CITIES.flatMap((c) => byCity(c));
    const x = d3
      .scaleTime()
      .domain(d3.extent(allRows, (d) => new Date(d.date)))
      .range([0, innerW]);

    const yMax = d3.max(allRows, (d) => +d[cfg.key]) * 1.05 || 1;
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    const line = d3
      .line()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(+d[cfg.key]))
      .curve(d3.curveMonotoneX);

    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat("%y")))
      .call((a) => a.selectAll("text").attr("fill", tickColor()).attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", hairlineColor()));

    g.append("g")
      .call(d3.axisLeft(y).ticks(3).tickFormat(cfg.tickFormat))
      .call((a) => a.selectAll("text").attr("fill", tickColor()).attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", hairlineColor()));

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 32)
      .attr("text-anchor", "middle")
      .attr("fill", tickColor())
      .attr("font-size", 10)
      .text("Year (Q4 snapshot)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -36)
      .attr("text-anchor", "middle")
      .attr("fill", tickColor())
      .attr("font-size", 10)
      .text(cfg.yTitle);

    CITIES.forEach((city) => {
      const rows = byCity(city);
      g.append("path")
        .datum(rows)
        .attr("fill", "none")
        .attr("stroke", CITY_COLORS[city])
        .attr("stroke-width", 1.75)
        .attr("d", line);
    });

    const legend = g.append("g").attr("class", "chart-legend").attr("transform", `translate(0, -4)`);
    CITIES.forEach((city, i) => {
      const row = legend.append("g").attr("transform", `translate(${i * 72}, 0)`);
      row
        .append("line")
        .attr("x1", 0)
        .attr("x2", 12)
        .attr("y1", 4)
        .attr("y2", 4)
        .attr("stroke", CITY_COLORS[city])
        .attr("stroke-width", 2);
      row
        .append("text")
        .attr("x", 14)
        .attr("y", 7)
        .attr("fill", tickColor())
        .attr("font-size", 8)
        .text(city === "New York" ? "NYC" : city === "Washington DC" ? "DC" : "SF");
    });
  }

  function updateCharts() {
    panels.forEach((panel) => {
      const metric = panel.getAttribute("data-metric");
      if (!metric) return;
      if (mode === "compare") drawOverlayPanel(panel, metric);
      else drawSinglePanel(panel, metric, byCity(current));
    });
  }

  function setSingleCity(city) {
    mode = "single";
    current = city;
    cityButtons.forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-city") === city ? "true" : "false");
    });
    if (compareBtn) compareBtn.setAttribute("aria-pressed", "false");
    updateCharts();
  }

  cityButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const city = btn.getAttribute("data-city");
      if (city && CITIES.includes(city)) setSingleCity(city);
    });
  });

  if (compareBtn) {
    compareBtn.addEventListener("click", () => {
      mode = "compare";
      cityButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      compareBtn.setAttribute("aria-pressed", "true");
      updateCharts();
    });
  }

  window.addEventListener("resize", updateCharts);
  setSingleCity(current);
}
