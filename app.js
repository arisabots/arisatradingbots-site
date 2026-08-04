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
  })
  .catch(() => {
    document.getElementById("fleetGrid").innerHTML =
      '<div class="empty">Fleet list unavailable right now.</div>';
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

function fngClass(classification) {
  const key = (classification || "").toLowerCase().replace(/\s+/g, "-");
  return "fng-" + key;
}

fetch("data/market.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((m) => {
    const items = [];

    for (const [name, d] of Object.entries(m.indices || {})) {
      const cls = d.pct_change >= 0 ? "pos" : "neg";
      const sign = d.pct_change >= 0 ? "+" : "";
      items.push(`
        <span class="ticker-item">
          <span class="lbl">${name}</span>
          <span class="val">${d.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span class="chg ${cls}">${sign}${d.pct_change.toFixed(2)}%</span>
        </span>`);
    }

    if (m.crypto && m.crypto.btc_price_usd != null) {
      const chg = m.crypto.btc_change_24h;
      const cls = chg >= 0 ? "pos" : "neg";
      const sign = chg >= 0 ? "+" : "";
      items.push(`
        <span class="ticker-item">
          <span class="lbl">BTC</span>
          <span class="val">$${m.crypto.btc_price_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          ${chg != null ? `<span class="chg ${cls}">${sign}${chg.toFixed(2)}%</span>` : ""}
        </span>`);
    }
    if (m.crypto && m.crypto.mcap_usd != null) {
      items.push(`
        <span class="ticker-item">
          <span class="lbl">Crypto Mcap</span>
          <span class="val">$${(m.crypto.mcap_usd / 1e12).toFixed(2)}T</span>
          ${m.crypto.btc_dominance != null ? `<span class="lbl">BTC dom ${m.crypto.btc_dominance.toFixed(1)}%</span>` : ""}
        </span>`);
    }

    if (m.fear_greed) {
      items.push(`
        <span class="ticker-item">
          <span class="lbl">Fear &amp; Greed</span>
          <span class="val ${fngClass(m.fear_greed.classification)}">${m.fear_greed.value} (${m.fear_greed.classification})</span>
        </span>`);
    }

    if (m.fed_funds_rate != null) {
      items.push(`
        <span class="ticker-item">
          <span class="lbl">Fed Funds Rate</span>
          <span class="val">${m.fed_funds_rate.toFixed(2)}%</span>
        </span>`);
    }

    const track = document.getElementById("tickerTrack");
    if (!items.length) {
      document.querySelector(".ticker").style.display = "none";
      return;
    }
    // duplicated once back-to-back so the -50% keyframe loops seamlessly
    track.innerHTML = items.join("") + items.join("");
  })
  .catch(() => {
    document.querySelector(".ticker").style.display = "none";
  });
