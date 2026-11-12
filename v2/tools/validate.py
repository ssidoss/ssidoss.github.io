#!/usr/bin/env python3
"""Validator for the Sidoss data contract (QA gate used by Head of CICM, and the scorer for Claude-vs-Grok comparisons).

  python3 v2/tools/validate.py <file>            validate one file (type inferred from path)
  python3 v2/tools/validate.py --all [--report]  validate snapshot → research → analyst → coach chain + routing
Exit code 0 = pass, 1 = failures. Checks are deterministic; nothing here calls a model.
"""
import json, os, re, sys, math, datetime as dt
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(ROOT, "data", *p)
NY = ZoneInfo("America/New_York")
ASSETS = ("NQ", "GOLD", "BTC", "ETH", "SOL")
PROB = re.compile(r"\b(probabilit\w*|chance of|likelihood|odds of (winning|success)|\d+\s?% (chance|probability))\b", re.I)
ORDER = re.compile(r"\b(you should|go|buy now|sell now|enter (long|short)|take (a|the) (long|short)|place (a|an) (buy|sell))\b(?![- ]?(no|not))", re.I)
ORDER = re.compile(r"\b(buy now|sell now|you should (buy|sell|go long|go short)|enter (a )?(long|short) (now|at)|place (a|an) (buy|sell) order)\b", re.I)
ISO = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?Z$")


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")) if isinstance(s, str) and ISO.match(s) else None


class R:
    def __init__(s, name): s.name, s.fails, s.warns, s.checks = name, [], [], 0
    def ok(s, cond, msg, warn=False):
        s.checks += 1
        if not cond: (s.warns if warn else s.fails).append(msg)
        return cond
    def as_dict(s): return {"file": s.name, "checks": s.checks, "fails": s.fails, "warns": s.warns, "pass": not s.fails}


def text_of(o):
    if isinstance(o, dict): return " ".join(text_of(v) for k, v in o.items() if k not in ("url", "source"))
    if isinstance(o, list): return " ".join(text_of(v) for v in o)
    return str(o) if isinstance(o, str) else ""


def et_of(utc_iso_or_hhmm, date=None):
    t = ts(utc_iso_or_hhmm) if "T" in str(utc_iso_or_hhmm) else (
        dt.datetime.fromisoformat(f"{date}T{utc_iso_or_hhmm}:00+00:00") if date else None)
    return t.astimezone(NY).strftime("%H:%M") if t else None


def common(r, j):
    blob = text_of(j)
    r.ok(not PROB.search(blob), f"probability language: {PROB.search(blob).group(0) if PROB.search(blob) else ''!r}")
    r.ok(not ORDER.search(blob), f"trade order language: {ORDER.search(blob).group(0) if ORDER.search(blob) else ''!r}")
    r.ok("NaN" not in json.dumps(j) and "undefined" not in json.dumps(j), "NaN/undefined in data")


def v_snapshot(j, r, now=None):
    f = ts(j.get("fetched_at")); r.ok(f is not None, "snapshot.fetched_at not UTC ISO")
    for k in ASSETS:
        a = j.get("assets", {}).get(k)
        if not r.ok(a is not None, f"{k}: missing from snapshot"): continue
        if a.get("price") is None:
            r.ok(bool(a.get("missing_reason")), f"{k}: null price without missing_reason"); continue
        o = ts(a.get("observed_at"))
        r.ok(o is not None, f"{k}: observed_at missing")
        if o and f: r.ok(o <= f + dt.timedelta(minutes=1), f"{k}: observed_at after fetched_at (restamped?)")
        r.ok(bool(a.get("source", {}).get("name")), f"{k}: no source")
        r.ok((a.get("age_min") or 0) >= 0, f"{k}: negative data age {a.get('age_min')} min")
        for lv in a.get("levels", []):
            r.ok(lv.get("price") is not None and lv.get("source"), f"{k}: level {lv.get('label')} unsourced")


def v_research(j, r):
    common(r, j)
    raw = load(D("research", "raw_news.json")) or {"items": []}
    by_url = {x["url"]: x for x in raw["items"]}
    extra = {x.get("url") for x in j.get("extra_sources", [])}
    g = ts(j.get("generated_at")); r.ok(g is not None, "generated_at not UTC ISO")
    hs = j.get("headlines", [])
    r.ok(len(hs) > 0 or j.get("gaps"), "no headlines and no gaps explanation")
    for i, h in enumerate(hs):
        tag = f"headline[{i}]"
        r.ok(bool(h.get("source")), f"{tag}: no source")
        r.ok(str(h.get("url", "")).startswith("http"), f"{tag}: no article URL")
        src = by_url.get(h.get("url"))
        if r.ok(src is not None or h.get("url") in extra, f"{tag}: URL not in fetched feeds or extra_sources (unverifiable)"):
            if src:
                r.ok(h.get("title_verbatim") == src["title"], f"{tag}: title_verbatim does not match the feed title")
                r.ok(h.get("time_utc") == src["published_utc"], f"{tag}: time_utc {h.get('time_utc')} ≠ feed {src['published_utc']} (restamped?)")
        t = ts(h.get("time_utc"))
        if r.ok(t is not None or h.get("time_missing_reason"), f"{tag}: time_utc not ISO and no reason") and t and g:
            r.ok(t <= g + dt.timedelta(minutes=5), f"{tag}: headline time after generated_at")
        if t and h.get("time_et"):
            r.ok(h["time_et"][:5] == t.astimezone(NY).strftime("%H:%M"), f"{tag}: time_et {h['time_et']} ≠ DST-aware ET {t.astimezone(NY):%H:%M}")
        r.ok(set(h.get("assets") or []) <= set(ASSETS) | {"ALL", "MACRO"}, f"{tag}: unknown asset key {h.get('assets')}")
        r.ok(h.get("impact") in ("high", "medium", "low"), f"{tag}: impact must be high|medium|low")
    for i, e in enumerate(j.get("calendar", [])):
        tag = f"calendar[{i}] {e.get('event','?')[:30]}"
        t = ts(e.get("time_utc"))
        r.ok(t is not None or e.get("time_missing_reason"), f"{tag}: time_utc not ISO")
        r.ok(bool(e.get("source")), f"{tag}: no source")
        if t and e.get("time_et"):
            r.ok(e["time_et"][:5] == t.astimezone(NY).strftime("%H:%M"), f"{tag}: time_et ≠ DST-aware ET")
        if e.get("impact") == "high" and t:
            w = e.get("no_entry_window_utc") or {}
            s, en = ts(w.get("start")), ts(w.get("end"))
            r.ok(s is not None and en is not None, f"{tag}: high-impact event without no_entry_window_utc")
            if s and en:
                r.ok(abs((t - s).total_seconds() - 900) < 1 and abs((en - t).total_seconds() - 900) < 1,
                     f"{tag}: no-entry window is not ±15 min around the event")
        if e.get("actual") not in (None, "") and t and g:
            r.ok(t <= g, f"{tag}: has an actual value before its release time (invented?)")
    nb = j.get("news_bias", {})
    for k in ASSETS:
        b = nb.get(k)
        if not r.ok(b is not None, f"news_bias.{k} missing"): continue
        r.ok(b.get("bias") in ("bullish", "bearish", "neutral", "no_data"), f"news_bias.{k}.bias invalid")
        if b.get("bias") != "no_data":
            r.ok(isinstance(b.get("strength"), (int, float)) and 0 <= b["strength"] <= 100, f"news_bias.{k}.strength not 0–100")
            refs = b.get("headline_refs") or []
            r.ok(len(refs) > 0, f"news_bias.{k}: bias without headline_refs")
            r.ok(all(isinstance(x, int) and 0 <= x < len(hs) for x in refs), f"news_bias.{k}: headline_refs out of range")


def v_analyst(j, r, research=None, snapshot=None):
    common(r, j)
    r.ok(ts(j.get("generated_at")) is not None, "generated_at not UTC ISO")
    inp = j.get("inputs", {})
    if research: r.ok(inp.get("research_generated_at") == research.get("generated_at"), "analyst used a different research file than latest")
    if snapshot: r.ok(inp.get("snapshot_fetched_at") == snapshot.get("fetched_at"), "analyst used a different snapshot than latest")
    for k in ASSETS:
        a = j.get("assets", {}).get(k)
        if not r.ok(a is not None, f"{k}: missing"): continue
        sb = a.get("score_breakdown") or []
        votes = [x.get("vote") for x in sb if x.get("vote") is not None]
        if a.get("direction") == "no_data":
            r.ok(a.get("agreement") is None and a.get("missing_reason"), f"{k}: no_data needs agreement=null + missing_reason")
            continue
        r.ok(len(sb) >= 2, f"{k}: score_breakdown has < 2 evidence lines")
        r.ok(all(v in (-1, 0, 1) for v in votes), f"{k}: votes must be -1/0/1")
        nn = [x for x in sb if x.get("vote") is not None and not x.get("no_data")]
        if nn:
            s = sum(x["vote"] for x in nn); exp = round(100 * abs(s) / len(nn))
            r.ok(a.get("agreement") == exp, f"{k}: agreement {a.get('agreement')} ≠ recomputed {exp} (sum {s} / {len(nn)} lines)")
            d = "bullish" if s > 0 else "bearish" if s < 0 else "neutral"
            r.ok(a.get("direction") == d, f"{k}: direction {a.get('direction')} ≠ recomputed {d}")
        r.ok(isinstance(a.get("conflict"), bool), f"{k}: conflict flag missing")
        news = next((x for x in sb if x.get("line") == "news"), None)
        pa = [x for x in sb if x.get("line") in ("h4", "m30", "vwap") and x.get("vote")]
        if news and news.get("vote") and pa:
            real = any(p["vote"] == -news["vote"] for p in pa)
            r.ok(a.get("conflict") == real, f"{k}: conflict flag {a.get('conflict')} but news vs price evidence says {real}")
        r.ok(bool(a.get("invalidation")), f"{k}: no invalidation")
        for lv in a.get("levels", []):
            r.ok(lv.get("source") and lv.get("price") is not None, f"{k}: level {lv.get('label')} unsourced")
            if snapshot and lv.get("price") is not None:
                snap_prices = {round(x["price"], 2) for x in snapshot["assets"][k].get("levels", [])}
                r.ok(round(lv["price"], 2) in snap_prices or lv.get("source") not in (snapshot["assets"][k].get("source") or {}).get("symbol", "-"),
                     f"{k}: level {lv.get('label')} {lv.get('price')} not in snapshot levels", warn=True)
        fr = a.get("freshness", {})
        if snapshot and snapshot["assets"][k].get("price") is not None:
            r.ok(fr.get("stale") == snapshot["assets"][k].get("stale"), f"{k}: freshness.stale disagrees with snapshot")


def v_coach(j, r, research=None, rules=None, analyst=None):
    common(r, j)
    r.ok(j.get("advice_not_rules") is True, "advice_not_rules must be true")
    b = j.get("based_on", {})
    if analyst: r.ok(b.get("analyst_generated_at") == analyst.get("generated_at"), "coach used a stale analyst file")
    if rules: r.ok(b.get("rules_id") == rules.get("id"), "coach cites a rules id that is not the approved rule set")
    for s in j.get("stops", []):
        r.ok(bool(s.get("rule_ref")), f"stop {s.get('text','')[:30]!r} has no rule_ref")
        if rules and s.get("value") is not None and s.get("rule_field"):
            r.ok(rules.get(s["rule_field"]) == s["value"], f"stop {s['rule_field']} = {s['value']} ≠ rules {rules.get(s['rule_field'])}")
    if research:
        hi = {e.get("time_utc") for e in research.get("calendar", []) if e.get("impact") == "high" and e.get("time_utc")}
        got = {w.get("event_time_utc") for w in j.get("news_windows", [])}
        today = set()
        g = ts(j.get("generated_at"))
        for t in hi:
            tt = ts(t)
            if tt and g and tt.date() == g.date() and tt >= g - dt.timedelta(hours=1): today.add(t)
        r.ok(today <= got, f"coach is missing today's high-impact windows: {sorted(today - got)}")
        r.ok(got <= hi, f"coach lists news windows not in research: {sorted(got - hi)}")
    r.ok(j.get("confidence") in ("low", "medium", "high"), "confidence must be low|medium|high")


def pick(*parts):
    """Real (git-ignored) file in <dir>/private/ wins over the public/fixture file."""
    priv = D(*parts[:-1], "private", parts[-1])
    return priv if os.path.exists(priv) else D(*parts)


def load(p):
    try: return json.load(open(p))
    except Exception: return None


def run_all(report=False):
    snap, res, ana, coach, rules = (load(D("market", "snapshot.json")), load(D("research", "latest.json")),
                                    load(D("analyst", "latest.json")), load(pick("coach", "gameplan.json")), load(pick("rules", "rules.json")))
    out = []
    for name, j, fn, extra in (("market/snapshot.json", snap, v_snapshot, {}), ("research/latest.json", res, v_research, {}),
                               ("analyst/latest.json", ana, v_analyst, {"research": res, "snapshot": snap}),
                               ("coach/gameplan.json", coach, v_coach, {"research": res, "rules": rules, "analyst": ana})):
        r = R(name)
        if r.ok(j is not None, "file missing or not JSON (page would show Unavailable)"):
            fn(j, r, **extra)
        out.append(r.as_dict())
    return out


def main():
    a = sys.argv[1:]
    if not a or a[0] == "--all":
        out = run_all()
    else:
        p = a[0]; j = load(p); r = R(p)
        if r.ok(j is not None, "not JSON"):
            {"snapshot": v_snapshot, "research": v_research, "analyst": v_analyst, "coach": v_coach, "gameplan": v_coach}[
                next(k for k in ("snapshot", "research", "analyst", "gameplan", "coach") if k in p)](j, r)
        out = [r.as_dict()]
    for o in out:
        print(("PASS " if o["pass"] else "FAIL ") + f"{o['file']}: {o['checks']} checks, {len(o['fails'])} fails, {len(o['warns'])} warns")
        for f in o["fails"]: print("   ✗", f)
        for w in o["warns"]: print("   ⚠", w)
    if "--report" in a:
        json.dump(out, open(D("office", "validation.json"), "w"), indent=1)
    sys.exit(0 if all(o["pass"] for o in out) else 1)


if __name__ == "__main__":
    main()
