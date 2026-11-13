#!/usr/bin/env python3
"""Market snapshot for the Sidoss Desk (free sources only, read-only).

Writes v2/data/market/snapshot.json. Every number carries source, observed_at (provider bar time) and fetched_at.
Nothing is estimated: when a feed fails the asset gets `price: null` + `missing_reason`.

Sources (same free feeds the Grok-era Desk used):
  Yahoo Finance chart API (unofficial, ~10 min delayed for CME futures): NQ=F, GC=F, ^VIX, DX-Y.NYB, ^TNX
  Coinbase Exchange public API (24/7 spot): BTC-USD, ETH-USD, SOL-USD
Usage: python3 v2/tools/fetch_snapshot.py [--out PATH] [--now ISO]  (--now only for tests on saved inputs)
       python3 v2/tools/fetch_snapshot.py --from-raw DIR   (re-compute from a saved raw snapshot, no network)
"""
import json, sys, os, math, argparse, datetime as dt, urllib.request
from zoneinfo import ZoneInfo

UTC = dt.timezone.utc
NY = ZoneInfo("America/New_York")
UA = {"User-Agent": "Mozilla/5.0 (sidoss-desk snapshot)"}
YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval={iv}&range={rg}&includePrePost=true"
COINBASE = "https://api.exchange.coinbase.com/products/{sym}/candles?granularity={g}"

ASSETS = {
    "NQ":   {"label": "NQ/MNQ", "desc": "Nasdaq-100 futures (front month, continuous NQ=F)", "kind": "future", "yahoo": "NQ=F", "delay_min": 10},
    "GOLD": {"label": "Gold/MGC", "desc": "Gold futures (front month, continuous GC=F) — not XAUUSD spot", "kind": "future", "yahoo": "GC=F", "delay_min": 10},
    "BTC":  {"label": "BTC", "desc": "Bitcoin spot (Coinbase)", "kind": "spot", "coinbase": "BTC-USD", "delay_min": 0},
    "ETH":  {"label": "ETH", "desc": "Ether spot (Coinbase)", "kind": "spot", "coinbase": "ETH-USD", "delay_min": 0},
    "SOL":  {"label": "SOL", "desc": "Solana spot (Coinbase)", "kind": "spot", "coinbase": "SOL-USD", "delay_min": 0},
}
GAUGES = {"VIX": "^VIX", "DXY": "DX-Y.NYB", "US10Y": "^TNX"}
# Strategy sessions (CLAUDE.md): Asia 00–07, London 07–11, New York 12–18 UTC.
SESSIONS = [("asia", 0, 7), ("london", 7, 11), ("newyork", 12, 18)]


def iso(ts):
    return None if ts is None else dt.datetime.fromtimestamp(ts, UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def get(url, raw_dir=None, key=None):
    if raw_dir:
        with open(os.path.join(raw_dir, key + ".json")) as f:
            return json.load(f)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def yahoo_bars(sym, iv, rg, raw_dir, save_dir):
    key = f"yahoo_{sym}_{iv}_{rg}".replace("^", "").replace("=", "").replace(".", "")
    data = get(YAHOO.format(sym=sym, iv=iv, rg=rg), raw_dir, key)
    if save_dir:
        json.dump(data, open(os.path.join(save_dir, key + ".json"), "w"))
    res = data["chart"]["result"][0]
    q = res["indicators"]["quote"][0]
    bars = []
    for i, t in enumerate(res.get("timestamp") or []):
        o, h, l, c, v = (q[k][i] for k in ("open", "high", "low", "close", "volume"))
        if None in (o, h, l, c):
            continue
        bars.append({"t": t, "o": o, "h": h, "l": l, "c": c, "v": v or 0})
    meta = res["meta"]
    return bars, meta


def coinbase_bars(sym, g, raw_dir, save_dir):
    key = f"coinbase_{sym}_{g}"
    data = get(COINBASE.format(sym=sym, g=g), raw_dir, key)
    if save_dir:
        json.dump(data, open(os.path.join(save_dir, key + ".json"), "w"))
    # Coinbase: [time, low, high, open, close, volume], newest first
    return sorted(({"t": r[0], "l": r[1], "h": r[2], "o": r[3], "c": r[4], "v": r[5]} for r in data), key=lambda b: b["t"])


def resample(bars, sec):
    out = {}
    for b in bars:
        k = b["t"] - b["t"] % sec
        x = out.get(k)
        if not x:
            out[k] = dict(b, t=k)
        else:
            x["h"] = max(x["h"], b["h"]); x["l"] = min(x["l"], b["l"]); x["c"] = b["c"]; x["v"] += b["v"]
    return [out[k] for k in sorted(out)]


def atr(bars, n=14):
    if len(bars) < n + 1:
        return None
    trs = [max(b["h"] - b["l"], abs(b["h"] - p["c"]), abs(b["l"] - p["c"])) for p, b in zip(bars, bars[1:])]
    a = sum(trs[:n]) / n
    for x in trs[n:]:
        a = (a * (n - 1) + x) / n  # Wilder
    return round(a, 4)


def ema(vals, n):
    if len(vals) < n:
        return None
    k = 2 / (n + 1); e = sum(vals[:n]) / n
    for v in vals[n:]:
        e = v * k + e * (1 - k)
    return e


def structure(bars, n=20):
    """Deterministic trend read: close vs EMA20 and EMA slope over 5 bars. bullish|bearish|neutral|null."""
    closes = [b["c"] for b in bars]
    if len(closes) < n + 5:
        return None, "fewer than %d bars" % (n + 5)
    e_now, e_prev = ema(closes, n), ema(closes[:-5], n)
    last = closes[-1]
    if last > e_now and e_now > e_prev:
        return "bullish", f"close {last:.2f} > EMA{n} {e_now:.2f}, EMA rising"
    if last < e_now and e_now < e_prev:
        return "bearish", f"close {last:.2f} < EMA{n} {e_now:.2f}, EMA falling"
    return "neutral", f"close {last:.2f} vs EMA{n} {e_now:.2f}, mixed"


def globex_anchor(now):
    """Start of the current CME Globex day: 18:00 America/New_York of the previous trading evening."""
    n = now.astimezone(NY)
    a = n.replace(hour=18, minute=0, second=0, microsecond=0)
    if n < a:
        a -= dt.timedelta(days=1)
    return a.astimezone(UTC)


def session_levels(bars, now, anchor_ts):
    out = []
    day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for name, h0, h1 in SESSIONS:
        s, e = day0 + dt.timedelta(hours=h0), day0 + dt.timedelta(hours=h1)
        seg = [b for b in bars if s.timestamp() <= b["t"] < e.timestamp()]
        if not seg:
            continue
        state = "complete" if now >= e else "in_progress"
        out.append({"label": f"{name.title()} high", "price": max(b["h"] for b in seg), "session": name, "state": state,
                    "window_utc": f"{h0:02d}:00–{h1:02d}:00"})
        out.append({"label": f"{name.title()} low", "price": min(b["l"] for b in seg), "session": name, "state": state,
                    "window_utc": f"{h0:02d}:00–{h1:02d}:00"})
    return out


def vwap(bars, since_ts):
    seg = [b for b in bars if b["t"] >= since_ts and b["v"]]
    vol = sum(b["v"] for b in seg)
    if not seg or not vol:
        return None
    return round(sum((b["h"] + b["l"] + b["c"]) / 3 * b["v"] for b in seg) / vol, 2)


LONDON = ZoneInfo("Europe/London")


def one_min_bars(cfg, now, raw_dir, save_dir):
    if cfg.get("yahoo"):
        b, _ = yahoo_bars(cfg["yahoo"], "1m", "1d", raw_dir, save_dir)
    else:
        b = coinbase_bars(cfg["coinbase"], 60, raw_dir, save_dir)
    return [x for x in b if x["t"] <= now.timestamp()]


def eq_candle(b1, local_dt, label, src):
    """V Areas EQ zone = high/low of the opening 1-minute candle (owner's strategy note: EQ LD / EQ NY)."""
    ts = local_dt.astimezone(UTC).timestamp()
    c = next((x for x in b1 if x["t"] == ts), None)
    base = {"label": label, "candle_utc": iso(ts), "candle_local": local_dt.strftime("%H:%M %Z"), "source": src}
    if c is None:
        return dict(base, low=None, high=None, missing_reason="1m candle not available yet" if ts > b1[-1]["t"] else "1m candle missing in provider data")
    return dict(base, low=round(c["l"], 2), high=round(c["h"], 2), method="low–high of the 1m candle")


def session_rvol(b5, now):
    """Per strategy session (UTC windows), today's volume vs mean of the same window on prior days (elapsed-matched)."""
    out = []
    day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    for name, h0, h1 in SESSIONS:
        s, e = day0 + dt.timedelta(hours=h0), day0 + dt.timedelta(hours=h1)
        if now < s:
            out.append({"session": name, "window_utc": f"{h0:02d}:00–{h1:02d}:00", "state": "upcoming", "rvol": None}); continue
        end = min(now, e); el = (end - s).total_seconds()
        vol = lambda a: sum(x["v"] for x in b5 if a <= x["t"] < a + el)
        today = vol(s.timestamp())
        prior = [vol(s.timestamp() - d * 86400) for d in range(1, 5)]
        prior = [p for p in prior if p > 0]
        avg = sum(prior) / len(prior) if prior else None
        out.append({"session": name, "window_utc": f"{h0:02d}:00–{h1:02d}:00", "state": "complete" if now >= e else "in_progress",
                    "volume": round(today), "usual": round(avg) if avg else None, "rvol": round(today / avg, 2) if avg else None,
                    "sessions_compared": len(prior)})
    return out


def volume_profile(b5, start_ts, end_ts, rows=30):
    """Approximate profile: each 5m bar's volume spread evenly over its high–low range. POC + 70% value area."""
    seg = [x for x in b5 if start_ts <= x["t"] < end_ts and x["v"]]
    if not seg:
        return None
    lo, hi = min(x["l"] for x in seg), max(x["h"] for x in seg)
    if hi <= lo:
        return None
    step = (hi - lo) / rows; hist = [0.0] * rows
    for x in seg:
        a, b = int((x["l"] - lo) / step), min(rows - 1, int((x["h"] - lo) / step))
        for i in range(a, b + 1):
            hist[i] += x["v"] / (b - a + 1)
    poc = max(range(rows), key=lambda i: hist[i]); tot = sum(hist); inc = {poc}; acc = hist[poc]
    lo_i, hi_i = poc, poc
    while acc < .7 * tot and (lo_i > 0 or hi_i < rows - 1):
        dn = hist[lo_i - 1] if lo_i > 0 else -1; up = hist[hi_i + 1] if hi_i < rows - 1 else -1
        if up >= dn: hi_i += 1; acc += hist[hi_i]
        else: lo_i -= 1; acc += hist[lo_i]
    r = lambda i: round(lo + i * step, 2)
    return {"from_utc": iso(start_ts), "to_utc": iso(end_ts), "row_size": round(step, 4), "rows": [{"price": r(i), "volume": round(v)} for i, v in enumerate(hist)],
            "poc": round(lo + (poc + .5) * step, 2), "vah": r(hi_i + 1), "val": r(lo_i), "method": "approx: 5m bar volume spread evenly over each bar's range"}


def build_asset(key, cfg, now, raw_dir, save_dir):
    a = {"key": key, "label": cfg["label"], "desc": cfg["desc"], "kind": cfg["kind"]}
    try:
        if cfg.get("yahoo"):
            b5, meta = yahoo_bars(cfg["yahoo"], "5m", "5d", raw_dir, save_dir)
            b1h, _ = yahoo_bars(cfg["yahoo"], "60m", "1mo", raw_dir, save_dir)
            src = {"name": "Yahoo Finance chart API (unofficial, free)", "symbol": cfg["yahoo"],
                   "url": f"https://finance.yahoo.com/quote/{cfg['yahoo']}"}
            prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
            # Yahoo 5d chartPreviousClose is 5 days back; use last completed daily bar instead
            bd, _ = yahoo_bars(cfg["yahoo"], "1d", "1mo", raw_dir, save_dir)
            anchor = globex_anchor(now)
            done = [b for b in bd if b["t"] < anchor.timestamp() - 3600]
            prev_close = done[-1]["c"] if done else None
            prev_day = done[-1] if done else None
            rng = [x["h"] - x["l"] for x in done[-20:]]
            a["range_avg_20d"] = round(sum(rng) / len(rng), 2) if rng else None
            a["range_avg_days"] = len(rng)
            a["contract_note"] = "Continuous front-month (Yahoo-rolled). Exact contract month not stated by provider."
        else:
            b5 = coinbase_bars(cfg["coinbase"], 300, raw_dir, save_dir)
            b1h = coinbase_bars(cfg["coinbase"], 3600, raw_dir, save_dir)
            src = {"name": "Coinbase Exchange public API (free, 24/7 spot)", "symbol": cfg["coinbase"],
                   "url": f"https://exchange.coinbase.com/trade/{cfg['coinbase']}"}
            anchor = now.replace(hour=0, minute=0, second=0, microsecond=0)
            prior = [b for b in b1h if b["t"] < anchor.timestamp()]
            prev_close = prior[-1]["c"] if prior else None
            day = [b for b in b1h if anchor.timestamp() - 86400 <= b["t"] < anchor.timestamp()]
            prev_day = {"h": max(b["h"] for b in day), "l": min(b["l"] for b in day)} if day else None
        b5 = [b for b in b5 if b["t"] <= now.timestamp()]
        b1h = [b for b in b1h if b["t"] <= now.timestamp()]
        if not b5:
            raise ValueError("no 5m bars")
        last = b5[-1]
        obs = min(last["t"] + 300, now.timestamp())  # bar close time; an in-progress bar is observed "now"
        a["bar_in_progress"] = last["t"] + 300 > now.timestamp()
        price = last["c"]
        a.update({
            "price": round(price, 4), "prev_close": prev_close,
            "change_pct": round((price / prev_close - 1) * 100, 3) if prev_close else None,
            "source": src, "observed_at": iso(obs), "provider_delay_min": cfg["delay_min"],
            "spark_5m": [round(b["c"], 4) for b in b5[-48:]],
            "bars_1h": [[b["t"], b["o"], b["h"], b["l"], b["c"]] for b in b1h[-120:]],
        })
        a["vwap"] = {"value": vwap(b5, anchor.timestamp()), "anchor_utc": iso(anchor.timestamp()),
                     "method": "typical price × volume, 5m bars since " + ("18:00 ET Globex open" if cfg.get("yahoo") else "00:00 UTC")}
        a["atr_5m_14"] = atr(b5[-200:])
        today = [b for b in b5 if b["t"] >= anchor.timestamp()]
        a["range_today"] = round(max(b["h"] for b in today) - min(b["l"] for b in today), 4) if today else None
        # RVOL at time: today's cumulative volume vs mean of the prior days at the same elapsed time (5m bars available)
        el = now.timestamp() - anchor.timestamp()
        cum_today = sum(b["v"] for b in today)
        priors = []
        for d in range(1, 5):
            s = anchor.timestamp() - d * 86400
            seg = [b for b in b5 if s <= b["t"] < s + el]
            if seg:
                priors.append(sum(b["v"] for b in seg))
        a["rvol"] = {"value": round(cum_today / (sum(priors) / len(priors)), 2) if priors and sum(priors) else None,
                     "sessions_compared": len(priors),
                     "note": "small sample (Yahoo/Coinbase 5m history ≤ 5 days)" if len(priors) < 10 else None}
        b4h = resample(b1h, 4 * 3600)
        b30 = resample(b5, 1800)
        s4, w4 = structure(b4h)
        s30, w30 = structure(b30)
        a["structure"] = {"h4": s4, "h4_why": w4, "m30": s30, "m30_why": w30}
        lv = []
        if prev_day:
            lv += [{"label": "Prior day high", "price": prev_day["h"]}, {"label": "Prior day low", "price": prev_day["l"]}]
        if a["vwap"]["value"]:
            lv.append({"label": "Session VWAP", "price": a["vwap"]["value"]})
        lv += session_levels(b5, now, anchor.timestamp())
        for x in lv:
            x["price"] = round(x["price"], 2); x["source"] = src["symbol"]; x["observed_at"] = a["observed_at"]
        a["levels"] = lv
        # V Areas EQ zones, session RVOL, previous-session volume profile
        try:
            b1 = one_min_bars(cfg, now, raw_dir, save_dir)
            d = now.date()
            ld = dt.datetime(d.year, d.month, d.day, 8, 0, tzinfo=LONDON)
            nyo = dt.datetime(d.year, d.month, d.day, 9, 30, tzinfo=NY)
            sym = src["symbol"]
            a["eq_zones"] = [eq_candle(b1, ld, "EQ LD (London open 1m)", sym), eq_candle(b1, nyo, "EQ NY (New York open 1m)", sym)] if b1 else []
        except Exception as e:
            a["eq_zones"] = []; a["eq_missing_reason"] = f"1m feed failed: {type(e).__name__}"
        a["session_rvol"] = session_rvol(b5, now)
        prev_start = anchor.timestamp() - 86400 if cfg.get("yahoo") else anchor.timestamp() - 86400
        a["volume_profile_prev"] = volume_profile(b5, prev_start, anchor.timestamp())
        a["volume_profile_today"] = volume_profile(b5, anchor.timestamp(), now.timestamp())
        age = (now.timestamp() - obs) / 60
        a["age_min"] = round(age, 1)
        a["stale"] = age > 30 + cfg["delay_min"]
        if cfg["kind"] == "future":
            n = now.astimezone(NY)
            closed = n.weekday() == 5 or (n.weekday() == 6 and n.hour < 18) or (n.weekday() == 4 and n.hour >= 17) or n.hour == 17
            a["market_open"] = not closed
    except Exception as e:  # never invent: report the failure
        a.update({"price": None, "missing_reason": f"feed failed: {type(e).__name__}: {e}"[:200]})
    return a


def build_gauge(k, sym, now, raw_dir, save_dir):
    try:
        b, meta = yahoo_bars(sym, "5m", "1d", raw_dir, save_dir)
        b = [x for x in b if x["t"] <= now.timestamp()]
        last = b[-1]
        v = last["c"] / (10 if k == "US10Y" and last["c"] > 20 else 1)
        pc = meta.get("chartPreviousClose")
        dv = 10 if k == "US10Y" and last["c"] > 20 else 1
        day = [x for x in b if x["t"] >= b[-1]["t"] - 20 * 3600]
        hl = {"day_high": round(max(x["h"] for x in day) / dv, 3), "day_low": round(min(x["l"] for x in day) / dv, 3)} if day else {}
        return {**hl, "key": k, "value": round(v, 3), "prev_close": pc, "change": round(v - pc, 3) if pc else None,
                "unit": "%" if k == "US10Y" else "", "source": {"name": "Yahoo Finance chart API", "symbol": sym},
                "observed_at": iso(last["t"] + 300), "age_min": round((now.timestamp() - last["t"] - 300) / 60, 1)}
    except Exception as e:
        return {"key": k, "value": None, "missing_reason": f"feed failed: {type(e).__name__}"}


def main():
    ap = argparse.ArgumentParser()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--out", default=os.path.join(root, "data/market/snapshot.json"))
    ap.add_argument("--now")
    ap.add_argument("--from-raw")
    ap.add_argument("--save-raw")
    o = ap.parse_args()
    now = dt.datetime.fromisoformat(o.now.replace("Z", "+00:00")) if o.now else dt.datetime.now(UTC)
    if o.save_raw:
        os.makedirs(o.save_raw, exist_ok=True)
    snap = {"schema": "sidoss.market.snapshot/1", "fetched_at": iso(now.timestamp()),
            "assets": {k: build_asset(k, c, now, o.from_raw, o.save_raw) for k, c in ASSETS.items()},
            "gauges": {k: build_gauge(k, s, now, o.from_raw, o.save_raw) for k, s in GAUGES.items()},
            "sessions_utc": [{"name": n, "start": f"{a:02d}:00", "end": f"{b:02d}:00"} for n, a, b in SESSIONS]}
    os.makedirs(os.path.dirname(o.out), exist_ok=True)
    json.dump(snap, open(o.out, "w"), indent=1)
    ok = sum(1 for a in snap["assets"].values() if a.get("price") is not None)
    print(f"snapshot {snap['fetched_at']}: {ok}/{len(ASSETS)} assets, gauges " +
          ", ".join(f"{k}={g.get('value')}" for k, g in snap["gauges"].items()))


if __name__ == "__main__":
    main()
