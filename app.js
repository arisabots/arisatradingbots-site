document.getElementById("year").textContent = new Date().getFullYear();

function fmtWhen(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

fetch("data/fleet.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((bots) => {
    const grid = document.getElementById("fleetGrid");
    grid.innerHTML = bots
      .map(
        (b) => `
      <div class="bot-card">
        <div class="name">${b.name}</div>
        <div class="sym">${b.symbol_display}</div>
        <div class="desc">${b.brand}</div>
      </div>`
      )
      .join("");
    const hsBots = document.getElementById("hsBots");
    if (hsBots) hsBots.textContent = bots.length;
  })
  .catch(() => {
    document.getElementById("fleetGrid").innerHTML =
      '<div class="empty">Fleet list unavailable right now.</div>';
  });

fetch("data/performance.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((d) => {
    const hsTrades = document.getElementById("hsTrades");
    const hsDays = document.getElementById("hsDays");
    if (hsTrades) hsTrades.textContent = d.fleet_total_trades.toLocaleString();
    if (hsDays && d.equity_curve.length) {
      const start = new Date(d.equity_curve[0].time);
      const days = Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000));
      hsDays.textContent = days;
    }
  })
  .catch(() => {
    const stats = document.getElementById("heroStats");
    if (stats) stats.style.display = "none";
  });

fetch("data/activity.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((trades) => {
    const feed = document.getElementById("feed");
    if (!trades.length) {
      feed.innerHTML = '<div class="empty">No closed trades published yet — check back soon.</div>';
      return;
    }
    feed.innerHTML = trades
      .map((t) => {
        const cls = t.pnl_usd >= 0 ? "pos" : "neg";
        const pct = (t.pnl_pct >= 0 ? "+" : "") + t.pnl_pct.toFixed(2) + "%";
        const usd = (t.pnl_usd >= 0 ? "+$" : "-$") + Math.abs(t.pnl_usd).toFixed(2);
        return `
        <div class="trade-row">
          <div class="who">
            <div class="bot">${t.brand}</div>
            <div class="instrument">${t.instrument_name}</div>
          </div>
          <span class="side">${t.side}</span>
          <div class="result ${cls}">
            <div class="pct">${pct}</div>
            <div class="usd">realized <b>${usd}</b></div>
          </div>
          <div class="when">${fmtWhen(t.exit_time)}</div>
        </div>`;
      })
      .join("");
  })
  .catch(() => {
    document.getElementById("feed").innerHTML =
      '<div class="error">Activity feed unavailable right now.</div>';
  });
