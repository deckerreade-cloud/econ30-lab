/**
 * D3 chart factories: line charts with draw-on animation.
 */

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const parseDate = (d) => new Date(d);

function tickColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#8a93a6";
}

function hairlineColor() {
  return "rgba(128, 128, 128, 0.25)";
}

/**
 * @param {HTMLElement} container
 * @param {{ yKey: string, yLabel: string, xLabel?: string, color?: string, animate?: boolean, height?: number, yTickFormat?: (v:number)=>string }} opts
 */
export function createLineChart(container, opts) {
  const {
    yKey,
    yLabel,
    xLabel = "Year",
    color = "#3db7a0",
    animate = true,
    height: chartHeight = 260,
    yTickFormat,
  } = opts;
  let data = [];
  let width = 0;
  const height = chartHeight;
  const margin = { top: 20, right: 12, bottom: 40, left: 68 };

  function measure() {
    const rect = container.getBoundingClientRect();
    width = Math.max(280, rect.width || container.clientWidth || 320);
  }

  function render() {
    measure();
    d3.select(container).selectAll("svg").remove();
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("role", "img")
      .attr("aria-label", yLabel);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => parseDate(d.date)))
      .range([0, innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => +d[yKey]) * 1.05 || 1])
      .nice()
      .range([innerH, 0]);

    const line = d3
      .line()
      .x((d) => xScale(parseDate(d.date)))
      .y((d) => yScale(+d[yKey]))
      .curve(d3.curveMonotoneX);

    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat("%Y")))
      .call((a) => a.selectAll("text").attr("fill", tickColor()).attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", hairlineColor()));

    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(yScale).ticks(4).tickFormat(yTickFormat || ((v) => v)))
      .call((a) => a.selectAll("text").attr("fill", tickColor()).attr("font-size", 10))
      .call((a) => a.selectAll("path,line").attr("stroke", hairlineColor()));

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 34)
      .attr("text-anchor", "middle")
      .attr("fill", tickColor())
      .attr("font-size", 10)
      .text(xLabel);

    g.append("text")
      .attr("class", "axis-label axis-label--y")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -(margin.left - 8))
      .attr("text-anchor", "middle")
      .attr("fill", tickColor())
      .attr("font-size", 10)
      .text(yLabel);

    const path = g
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

export function destroyChart(chart) {
  chart?.destroy?.();
}
