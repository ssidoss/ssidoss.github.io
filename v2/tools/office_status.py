#!/usr/bin/env python3
"""Office status + run log for every agent (replaces /home/box/office/office_status.py).

Appends one JSON line to v2/data/office/runs.jsonl:
 {"type":"status","bot","team","state","task","ts","output","needs_owner"}
With --publish it also posts the Office v1 status line to ntfy (topic from env OFFICE_NTFY_TOPIC only; never argv).
"""
import json, os, sys, argparse, datetime as dt, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAMS = {"Head of CICM": "Management", "S-Scriba": "Management", "HC": "IT & Coding", "Office Coder": "IT & Coding",
         "Desk & Finance Coder": "IT & Coding", "Head Analyst": "Trading", "Market Researcher": "Trading",
         "Trading Journal": "Trading", "Trading Coach": "Trading", "Strategy Developer": "Trading",
         "Cutter": "Video", "Head of FMOK": "Finance"}
STATES = ("working", "waiting", "stuck", "finished", "resting")
BANNED = ("$", "password", "token", "api key", "apikey", "seed", "wallet")

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("bot"); ap.add_argument("state", choices=STATES); ap.add_argument("task")
    ap.add_argument("--output"); ap.add_argument("--needs-owner"); ap.add_argument("--publish", action="store_true")
    ap.add_argument("--log", default=os.path.join(ROOT, "data/office/runs.jsonl")); ap.add_argument("--ts")
    a = ap.parse_args(argv)
    if a.bot not in TEAMS: sys.exit(f"unknown agent name: {a.bot!r} (use the exact Office name)")
    task = a.task.strip()[:60]
    low = (task + " " + (a.needs_owner or "")).lower()
    if any(b in low for b in BANNED): sys.exit("refused: status text must not contain amounts, secrets or wallet details")
    rec = {"type": "status", "bot": a.bot, "team": TEAMS[a.bot], "state": a.state, "task": task,
           "ts": a.ts or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    if a.output: rec["output"] = a.output
    if a.needs_owner: rec["needs_owner"] = a.needs_owner[:200]; rec["state"] = "waiting"
    os.makedirs(os.path.dirname(a.log), exist_ok=True)
    with open(a.log, "a") as f: f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    if a.publish:
        topic = os.environ.get("OFFICE_NTFY_TOPIC")
        if not topic: sys.exit("OFFICE_NTFY_TOPIC not set; logged locally only")
        wire = {k: rec[k] for k in ("type", "bot", "team", "state", "task", "ts")}
        urllib.request.urlopen(urllib.request.Request(f"https://ntfy.sh/{topic}", data=json.dumps(wire).encode(), method="POST"), timeout=15)
    print(json.dumps(rec))

if __name__ == "__main__":
    main()
