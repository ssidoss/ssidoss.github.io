#!/usr/bin/env python3
"""Fetch raw headlines (exact title, URL, publish time) from free RSS feeds the Desk already cites.

Writes v2/data/research/raw_news.json. Market Researcher may only cite items present here (or URLs it fetched itself
and added to `extra_sources`); validate.py checks headline text + URL against this file.
"""
import json, os, sys, argparse, datetime as dt, urllib.request, urllib.parse, email.utils, xml.etree.ElementTree as ET, html

UA = {"User-Agent": "Mozilla/5.0 (sidoss-desk news)"}
GN = "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q="
FEEDS = {
    "CNBC Top News": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
    "CNBC Markets": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
    "CNBC Economy": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
    "FXStreet News": "https://www.fxstreet.com/rss/news",
    "Google News: Nasdaq futures": GN + urllib.parse.quote("Nasdaq futures when:1d"),
    "Google News: gold price": GN + urllib.parse.quote("gold prices when:1d"),
    "Google News: bitcoin": GN + urllib.parse.quote("bitcoin price when:1d"),
    "Google News: ether": GN + urllib.parse.quote("ether ethereum price when:1d"),
    "Google News: solana": GN + urllib.parse.quote("solana SOL price when:1d"),
    "Google News: Fed / Treasury yields": GN + urllib.parse.quote("Fed Treasury yields when:1d"),
    "Google News: Nvidia": GN + urllib.parse.quote("Nvidia stock when:1d"),
}


def parse(feed, xml):
    out = []
    root = ET.fromstring(xml)
    for it in root.iter("item"):
        g = lambda t: (it.findtext(t) or "").strip()
        pub = g("pubDate")
        try:
            t = email.utils.parsedate_to_datetime(pub).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            t = None
        src = it.find("source")
        title = html.unescape(g("title"))
        outlet = src.text.strip() if src is not None and src.text else feed.split(":")[0]
        if src is not None and title.endswith(" - " + outlet):
            title = title[: -len(" - " + outlet)]
        out.append({"feed": feed, "outlet": outlet, "title": title, "url": g("link"), "published_utc": t})
    return out


def main():
    ap = argparse.ArgumentParser()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--out", default=os.path.join(root, "data/research/raw_news.json"))
    ap.add_argument("--hours", type=float, default=24)
    o = ap.parse_args()
    now = dt.datetime.now(dt.timezone.utc)
    items, errors = [], []
    for name, url in FEEDS.items():
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                items += parse(name, r.read())
        except Exception as e:
            errors.append({"feed": name, "error": f"{type(e).__name__}: {e}"[:160]})
    cut = now - dt.timedelta(hours=o.hours)
    seen, keep = set(), []
    for x in sorted(items, key=lambda x: x["published_utc"] or "", reverse=True):
        if x["url"] in seen or not x["published_utc"] or x["published_utc"] < cut.strftime("%Y-%m-%dT%H:%M:%SZ"):
            continue
        seen.add(x["url"]); keep.append(x)
    for i, x in enumerate(keep):
        x["id"] = i
    json.dump({"fetched_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "window_hours": o.hours, "items": keep, "errors": errors},
              open(o.out, "w"), indent=1, ensure_ascii=False)
    print(f"{len(keep)} items from {len(FEEDS) - len(errors)}/{len(FEEDS)} feeds; errors: {[e['feed'] for e in errors]}")


if __name__ == "__main__":
    main()
