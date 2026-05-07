/**
 * D3 chart factories: line charts with draw-on animation.
 */

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const parseDate = (d) => new Date(d);

/**
 * @param {HTMLElement} container
 * @param {{ yKey: string, yLabel: string, color?: string, animate?: boolean }} opts
 */
export function createLineChart(container, opts) {
  const { yKey, yLabel, color = "#3db7a0", animate = true, height: chartHeight = 260 } = opts;
  let data = [];
  let svg;
  let g;
  let xScale;
  let yScale;
  let line;
  let path;
  let width = 0;
  let height = chartHeight;
  const margin = { top: 16, right: 12, bottom: 28, left: 44 };

  function measure() {
    const rect = container.getBoundingClientRect();
    width = Math.max(280, rect.width || container.clientWidth || 320);
  }

  function render() {
    measure();
    d3.select(container).selectAll("svg").remove();
    svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("role", "img")
      .attr("aria-label", yLabel);

    g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => parseDate(d.date)))
      .range([0, innerW]);

    yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => +d[yKey]) * 1.05 || 1])
      .nice()
      .range([innerH, 0]);

    line = d3
      .line()
      .x((d) => xScale(parseDate(d.date)))
      .y((d) => yScale(+d[yKey]))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat("%Y")))
      .call((a) => a.selectAll("text").attr("fill", "#8a93a6").attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", "rgba(230,232,238,0.15)"));

    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(yScale).ticks(4))
      .call((a) => a.selectAll("text").attr("fill", "#8a93a6").attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", "rgba(230,232,238,0.15)"));

    path = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    const totalLength = path.node()?.getTotalLength?.() ?? 0;
    if (animate && totalLength) {
      path
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }

    g.append("text")
      .attr("x", 0)
      .attr("y", -4)
      .attr("fill", "#8a93a6")
      .attr("font-size", 10)
      .attr("letter-spacing", "0.06em")
      .text(yLabel.toUpperCase());
  }

  return {
    setData(rows) {
      data = (rows || []).slice().sort((a, b) => +parseDate(a.date) - +parseDate(b.date));
      if (!data.length) return;
      render();
    },
    destroy() {
      d3.select(container).selectAll("svg").remove();
    },
  };
}

/**
 * Two small line charts (K-shaped narrative): value index vs vacancy.
 * @param {HTMLElement} container
 * @param {{ animate?: boolean }} opts
 */
export function createSmallMultiples(container, opts) {
  const { animate = true } = opts;
  let data = [];

  function draw() {
    container.innerHTML = "";
    if (!data.length) return;

    const wrap = document.createElement("div");
    wrap.className = "small-multiples";
    container.appendChild(wrap);

    const series = [
      { key: "property_value_index", label: "Value index (Class A proxy)", color: "#3db7a0" },
      { key: "vacancy_rate_pct", label: "Vacancy % (B/C stress)", color: "#f26b5e" },
    ];

    series.forEach((s) => {
      const cell = document.createElement("div");
      cell.className = "sm-cell";
      const h4 = document.createElement("h4");
      h4.textContent = s.label;
      cell.appendChild(h4);
      wrap.appendChild(cell);
      const chart = createLineChart(cell, {
        yKey: s.key,
        yLabel: s.key.replace(/_/g, " "),
        color: s.color,
        animate,
        height: 140,
      });
      chart.setData(data);
    });
  }

  return {
    setData(rows) {
      data = (rows || []).slice();
      draw();
    },
    destroy() {
      container.innerHTML = "";
    },
  };
}

export function destroyChart(chart) {
  chart?.destroy?.();
}
