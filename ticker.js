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
    track.innerHTML = items.join("") + items.join("");
  })
  .catch(() => {
    document.querySelector(".ticker").style.display = "none";
  });
