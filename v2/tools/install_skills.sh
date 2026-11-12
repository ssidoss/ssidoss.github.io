#!/usr/bin/env bash
# Install the Sidoss skills library into Claude Code on this machine (macOS/Linux).
#   ./v2/tools/install_skills.sh            -> recommended set into ~/.claude/skills (user level)
#   ./v2/tools/install_skills.sh --all      -> every vendored skill (133) into ~/.claude/skills
#   ./v2/tools/install_skills.sh --update   -> re-download every skill from GitHub at the latest commit first
#   --include-noncommercial                 -> also fetch JARVIS's skill (personal non-commercial licence; your call)
# Note: each active skill adds its description to every Claude session. 133 active skills make skill choice noisier;
# the recommended set is what the Sidoss agents actually use. The full library stays browsable in v2/skills-library/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; LIB="$ROOT/v2/skills-library"; DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
ALL=0; UPD=0; NC=0
for a in "$@"; do case $a in --all) ALL=1;; --update) UPD=1;; --include-noncommercial) NC=1;; esac; done
mkdir -p "$DEST"
if [ $UPD = 1 ]; then
  tmp=$(mktemp -d); python3 - "$LIB/skills.lock.json" "$tmp" "$LIB" "$NC" <<'PY'
import json,sys,subprocess,shutil,os
lock,tmp,lib,nc=json.load(open(sys.argv[1])),sys.argv[2],sys.argv[3],sys.argv[4]=="1"
for repo in sorted({e["repo"] for e in lock}):
    d=os.path.join(tmp,repo.replace("/","__")); subprocess.run(["git","clone","-q","--depth","1",f"https://github.com/{repo}",d],check=False)
for e in lock:
    if e["license"]=="NONCOMMERCIAL" and not nc: continue
    src=os.path.join(tmp,e["repo"].replace("/","__"),e["path"]); dst=os.path.join(lib,e.get("library_path") or ("noncommercial/"+e["name"]))
    if os.path.isdir(src): shutil.rmtree(dst,ignore_errors=True); shutil.copytree(src,dst,ignore=shutil.ignore_patterns(".git","node_modules")); print("updated",e["name"])
PY
fi
REC="pre-session prop-math office-status desk-publish ui-qa ceo-console"
for s in $REC; do rm -rf "$DEST/$s"; cp -R "$ROOT/.claude/skills/$s" "$DEST/$s"; done
if [ $ALL = 1 ]; then
  python3 -c "import json;[print(e['library_path']) for e in json.load(open('$LIB/skills.lock.json')) if e.get('vendored')]" | while read p; do
    n=$(basename "$p"); rm -rf "$DEST/$n"; cp -R "$LIB/$p" "$DEST/$n"; done
else
  for l in "$ROOT"/.claude/skills/*; do [ -L "$l" ] || continue; n=$(basename "$l"); rm -rf "$DEST/$n"; cp -RL "$l" "$DEST/$n"; done
fi
echo "Installed into $DEST: $(ls "$DEST" | wc -l | tr -d ' ') skills"
