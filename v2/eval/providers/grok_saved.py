"""promptfoo provider: return the saved grok output for vars.run / vars.stage."""
import json, os
BASE = os.path.join(os.path.dirname(__file__), "..", "grok-outputs")
def call_api(prompt, options, context):
    v = context["vars"]; p = os.path.join(BASE, v["run"], v["stage"] + ".json")
    if not os.path.exists(p): return {"error": f"no saved output at {p}"}
    return {"output": open(p).read()}
