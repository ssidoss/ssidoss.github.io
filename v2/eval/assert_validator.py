"""promptfoo python assertion: score an output with v2/tools/validate.py (pass = 0 fails; score = checks passed share)."""
import json, sys, os, importlib.util
spec = importlib.util.spec_from_file_location("v", os.path.join(os.path.dirname(__file__), "../tools/validate.py")); V = importlib.util.module_from_spec(spec); spec.loader.exec_module(V)
def get_assert(output, context):
    stage = context["vars"]["stage"]; j = json.loads(output) if isinstance(output, str) else output
    r = V.R(stage); {"research": V.v_research, "analyst": V.v_analyst, "coach": V.v_coach}[stage](j, r)
    return {"pass": not r.fails, "score": 1 - len(r.fails) / max(1, r.checks), "reason": "; ".join(r.fails[:5]) or f"{r.checks} checks passed"}
