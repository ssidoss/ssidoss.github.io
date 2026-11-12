#!/usr/bin/env python3
"""Build one self-contained HTML of the v2 app with its data embedded (private data wins), for StatiCrypt encryption.
Usage: python3 v2/tools/build_bundle.py OUT.html   — the output contains personal data in plaintext: write it only to a
private temp dir, encrypt it immediately (desk-publish skill), then delete the plaintext."""
import json, os, sys, base64, re
V = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(V, 'app'); D = os.path.join(V, 'data')
def pick(*parts):
    p = os.path.join(D, *parts[:-1], 'private', parts[-1]); return p if os.path.exists(p) else os.path.join(D, *parts)
def load(p):
    try: return json.load(open(p))
    except Exception: return None
data = {'snapshot': load(os.path.join(D, 'market/snapshot.json')), 'research': load(os.path.join(D, 'research/latest.json')),
        'analyst': load(os.path.join(D, 'analyst/latest.json')), 'coach': load(pick('coach', 'gameplan.json')), 'rules': load(pick('rules', 'rules.json')),
        'prop': load(pick('prop', 'accounts.json')), 'validation': load(os.path.join(D, 'office/validation.json')), 'journal': load(pick('journal', 'data.json'))}
runs = [json.loads(l) for l in open(os.path.join(D, 'office/runs.jsonl'))] if os.path.exists(os.path.join(D, 'office/runs.jsonl')) else []
files = {}
for r in runs:
    o = r.get('output')
    if o and o not in files:
        p = os.path.join(os.path.dirname(V), o)
        if os.path.exists(p): files[o] = load(p)
bundle = json.dumps({'data': data, 'runs': runs, 'files': files, 'built_at': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}, ensure_ascii=False).replace('</', '<\\/')
html = open(os.path.join(A, 'index.html')).read()
css = open(os.path.join(A, 'pro.css')).read()
css = re.sub(r'url\((fonts/[\w.-]+\.woff2)\)', lambda m: 'url(data:font/woff2;base64,' + base64.b64encode(open(os.path.join(A, m.group(1)), 'rb').read()).decode() + ')', css)
def icon(m):
    p = os.path.join(A, m.group(1)); return 'data:image/svg+xml;base64,' + base64.b64encode(open(p, 'rb').read()).decode() if os.path.exists(p) else m.group(1)
js = '\n'.join(open(os.path.join(A, f)).read() for f in ('prop-math.js', 'app.js', 'features.js'))
js = re.sub(r'(icons/[\w.-]+\.svg)', lambda m: icon(m), js)
html = html.replace('<link rel="stylesheet" href="pro.css">', '<style>' + css + '</style>')
html = re.sub(r'<script src="[\w.-]+\.js"></script>\n?', '', html)
html = html.replace('</body>', '<script>window.__BUNDLE=' + bundle + ';</script>\n<script>' + js.replace('</script', '<\\/script') + '</script>\n</body>')
html = re.sub(r'(src|href)="(icons/[\w.-]+\.svg)"', lambda m: f'{m.group(1)}="{icon(re.match(r"(.*)", m.group(2)))}"', html)
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])), exist_ok=True)
open(sys.argv[1], 'w').write(html); os.chmod(sys.argv[1], 0o600)
print('bundle', len(html) // 1024, 'KB', '· private data:', [k for k in ('coach', 'rules', 'prop', 'journal') if data[k] and not data[k].get('_FIXTURE')])
