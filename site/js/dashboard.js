/**
 * Sticky city toggle: SF / Manhattan / DC — three synchronized line charts
 * driven by real annual Q4 brokerage data in site/data/city_panel.json.
 */

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

/**
 * @param {Array<{date:string,city:string,vacancy_rate_pct:number,asking_rent_psf:number,sublease_msf:number}>} timeseries
 * @param {{ animate?: boolean }} options
 */
export function initDashboard(timeseries, options = {}) {
  const { animate = true } = options;
  const buttons = document.querySelectorAll(".city-toggle [data-city]");
  const panels = document.querySelectorAll(".chart-panel[data-metric]");
  if (!buttons.length || !panels.length) return;

  const cities = ["San Francisco", "New York", "Washington DC"];
  let current = "San Francisco";

  const byCity = (city) =>
    timeseries.filter((d) => d.city === city).sort((a, b) => +new Date(a.date) - +new Date(b.date));

  function drawPanel(panel, metric, cityRows) {
    const metricKey =
      metric === "vacancy"
        ? "vacancy_rate_pct"
        : metric === "rent"
          ? "asking_rent_psf"
          : "sublease_msf";
    const colors = {
      vacancy: "#f26b5e",
      rent: "#ffd166",
      sublease: "#3db7a0",
    };
    const labels = {
      vacancy: "Vacancy %",
      rent: "Class A asking rent ($/sf/yr)",
      sublease: "Sublease available (M sq ft)",
    };
    const tickFormat = {
      vacancy: (v) => `${v}%`,
      rent: (v) => `$${v}`,
      sublease: (v) => `${v}`,
    };

    const container = panel.querySelector(".chart-panel__svg");
    if (!container) return;
    d3.select(container).selectAll("svg").remove();

    const margin = { top: 12, right: 8, bottom: 24, left: 36 };
    const width = container.clientWidth || 280;
    const height = 160;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(cityRows, (d) => new Date(d.date)))
      .range([0, innerW]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(cityRows, (d) => +d[metricKey]) * 1.05 || 1])
      .nice()
      .range([innerH, 0]);

    const line = d3
      .line()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(+d[metricKey]))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat("%y")))
      .call((a) => a.selectAll("text").attr("fill", "#8a93a6").attr("font-size", 9))
      .call((a) => a.selectAll("path,line").attr("stroke", "rgba(230,232,238,0.12)"));

    g.append("g")
      .call(d3.axisLeft(y).ticks(3).tickFormat(tickFormat[metric] || ((v) => v)))
      .call((a) => a.selectAll("text").attr("fill", "#8a93a6").attr("font-size", 9))
      .call((a) => a.selectAll("path,line").attr("stroke", "rgba(230,232,238,0.12)"));

    const path = g
      .append("path")
      .datum(cityRows)
      .attr("fill", "none")
      .attr("stroke", colors[metric] || "#3db7a0")
      .attr("stroke-width", 1.75)
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

    panel.querySelector("h3")?.setAttribute("data-metric-label", labels[metric] || metric);
  }

  function updateCharts() {
    const rows = byCity(current);
    panels.forEach((panel) => {
      const metric = panel.getAttribute("data-metric");
      if (metric) drawPanel(panel, metric, rows);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const city = btn.getAttribute("data-city");
      if (!city || !cities.includes(city)) return;
      current = city;
      buttons.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      updateCharts();
    });
  });

  window.addEventListener("resize", () => {
    updateCharts();
  });

  buttons.forEach((b) => {
    if (b.getAttribute("data-city") === current) b.setAttribute("aria-pressed", "true");
    else b.setAttribute("aria-pressed", "false");
  });
  updateCharts();
}
