document.getElementById("year").textContent = new Date().getFullYear();

function fmtUsd(v) {
  const sign = v >= 0 ? "+" : "-";
  return sign + "$" + Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtHold(minutes) {
  if (minutes >= 1440) return (minutes / 1440).toFixed(1) + "d";
  if (minutes >= 60) return (minutes / 60).toFixed(1) + "h";
  return Math.round(minutes) + "m";
}

function niceStep(range) {
  const rough = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
  const norm = rough / mag;
  const step = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  return step * mag;
}

function buildEquityChart(container, points) {
  const W = 960, H = 280, padL = 58, padR = 16, padT = 18, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  const values = points.map((p) => p.cumulative_pnl);
  let min = Math.min(0, ...values), max = Math.max(0, ...values);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.08;
  min -= pad; max += pad;

  const xAt = (i) => padL + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotW);
  const yAt = (v) => padT + (1 - (v - min) / (max - min)) * plotH;

  const last = values[values.length - 1];
  const sign = last >= 0 ? "pos" : "neg";

  const linePts = points.map((p, i) => `${xAt(i)},${yAt(p.cumulative_pnl)}`).join(" L ");
  const yZero = yAt(0);
  const areaPath = `M ${xAt(0)},${yZero} L ${linePts} L ${xAt(points.length - 1)},${yZero} Z`;
  const linePath = `M ${linePts}`;

  const step = niceStep(max - min);
  const gridVals = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) gridVals.push(Math.round(v * 100) / 100);

  const gridSvg = gridVals
    .map((v) => `
      <line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${yAt(v)}" y2="${yAt(v)}"></line>
      <text class="axis-label" x="${padL - 8}" y="${yAt(v) + 3}" text-anchor="end">${v >= 0 ? "+" : ""}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text>`)
    .join("");

  const zeroSvg = min < 0 && max > 0
    ? `<line class="zero-line" x1="${padL}" x2="${W - padR}" y1="${yZero}" y2="${yZero}"></line>`
    : "";

  const endX = xAt(points.length - 1), endY = yAt(last);
  const firstDate = points[0] ? fmtDate(points[0].time).split(",")[0] : "";
  const lastDate = points[points.length - 1] ? fmtDate(points[points.length - 1].time).split(",")[0] : "";

  container.insertAdjacentHTML("afterbegin", `
    <svg class="equity" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fleet-wide cumulative profit and loss over ${points.length} trades, ending at ${fmtUsd(last)}">
      ${gridSvg}
      ${zeroSvg}
      <path class="equity-area ${sign}" d="${areaPath}"></path>
      <path class="equity-line ${sign}" d="${linePath}"></path>
      <circle class="end-dot ${sign}" cx="${endX}" cy="${endY}" r="5"></circle>
      <text class="end-label ${sign}" x="${Math.min(endX - 4, W - padR - 8)}" y="${endY - 12}" text-anchor="end">${fmtUsd(last)}</text>
      <text class="axis-label" x="${padL}" y="${H - 6}" text-anchor="start">${firstDate}</text>
      <text class="axis-label" x="${W - padR}" y="${H - 6}" text-anchor="end">${lastDate}</text>
      <line class="crosshair" id="crosshair" x1="0" x2="0" y1="${padT}" y2="${H - padB}"></line>
      <circle class="hover-dot" id="hoverDot" r="4"></circle>
      <rect class="chart-hit" id="chartHit" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" tabindex="0"></rect>
    </svg>`);

  const svg = container.querySelector("svg.equity");
  const hit = svg.getElementById("chartHit");
  const crosshair = svg.getElementById("crosshair");
  const hoverDot = svg.getElementById("hoverDot");
  const tooltip = document.getElementById("tooltip");
  const ttVal = document.getElementById("ttVal");
  const ttDate = document.getElementById("ttDate");

  function showAt(i) {
    i = Math.max(0, Math.min(points.length - 1, i));
    const p = points[i];
    const x = xAt(i), y = yAt(p.cumulative_pnl);
    crosshair.setAttribute("x1", x); crosshair.setAttribute("x2", x);
    crosshair.style.opacity = 1;
    hoverDot.setAttribute("cx", x); hoverDot.setAttribute("cy", y);
    hoverDot.style.opacity = 1;

    const cls = p.cumulative_pnl >= 0 ? "pos" : "neg";
    ttVal.textContent = fmtUsd(p.cumulative_pnl);
    ttVal.className = "tt-val " + cls;
    ttDate.textContent = fmtDate(p.time) + ` · trade ${i + 1} of ${points.length}`;

    const pxRatio = container.clientWidth / W;
    tooltip.style.left = (x * pxRatio) + "px";
    tooltip.style.top = (y * pxRatio) + "px";
    tooltip.style.opacity = 1;
  }

  function hide() {
    crosshair.style.opacity = 0;
    hoverDot.style.opacity = 0;
    tooltip.style.opacity = 0;
  }

  hit.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const frac = Math.max(0, Math.min(1, (svgX - padL) / plotW));
    showAt(Math.round(frac * (points.length - 1)));
  });
  hit.addEventListener("pointerleave", hide);
  hit.addEventListener("focus", () => showAt(points.length - 1));
  hit.addEventListener("blur", hide);
  hit.addEventListener("keydown", (e) => {
    const current = Number(hit.dataset.i || points.length - 1);
    if (e.key === "ArrowLeft") { hit.dataset.i = Math.max(0, current - 1); showAt(Number(hit.dataset.i)); e.preventDefault(); }
    if (e.key === "ArrowRight") { hit.dataset.i = Math.min(points.length - 1, current + 1); showAt(Number(hit.dataset.i)); e.preventDefault(); }
  });
}

fetch("data/performance.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((d) => {
    const pnl = d.fleet_total_pnl;
    const pnlEl = document.getElementById("statPnl");
    pnlEl.textContent = fmtUsd(pnl);
    pnlEl.classList.add(pnl >= 0 ? "pos" : "neg");

    document.getElementById("statTrades").textContent = d.fleet_total_trades.toLocaleString();

    const totalWins = d.bots.reduce((s, b) => s + b.wins, 0);
    const totalDecided = d.bots.reduce((s, b) => s + b.wins + b.losses, 0);
    document.getElementById("statWinRate").textContent =
      totalDecided ? ((totalWins / totalDecided) * 100).toFixed(1) + "%" : "—";

    if (d.equity_curve.length) {
      document.getElementById("statSince").textContent = fmtDate(d.equity_curve[0].time).split(",")[0];
      buildEquityChart(document.getElementById("chartWrap"), d.equity_curve);
    } else {
      document.getElementById("chartWrap").insertAdjacentHTML("afterbegin", '<div style="color:var(--text-low);padding:40px 0;text-align:center;">No closed trades yet.</div>');
    }

    const tbody = document.getElementById("statsBody");
    tbody.innerHTML = d.bots
      .map((b) => {
        const pnlCls = b.total_pnl >= 0 ? "pos" : "neg";
        const pf = b.profit_factor == null ? "—" : b.profit_factor === Infinity ? "∞" : b.profit_factor.toFixed(2);
        return `
        <tr>
          <td class="bot-name">${b.instrument_name}<span class="sym">${b.brand}</span></td>
          <td>${b.total_trades}</td>
          <td>${b.win_rate == null ? "—" : b.win_rate.toFixed(1) + "%"}</td>
          <td>${pf}</td>
          <td>${fmtHold(b.avg_hold_minutes)}</td>
          <td class="${pnlCls}">${fmtUsd(b.total_pnl)}</td>
        </tr>`;
      })
      .join("");
  })
  .catch(() => {
    document.getElementById("chartWrap").insertAdjacentHTML("afterbegin", '<div style="color:var(--text-low);padding:40px 0;text-align:center;">Performance data unavailable right now.</div>');
    document.getElementById("statsBody").innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-low);">Unavailable right now.</td></tr>';
  });
