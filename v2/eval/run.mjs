// One command for HC/CICM QA: prop parity vs Grok prop.py + data-contract validator.
import { execSync } from 'child_process';
let ok = true;
for (const [name, cmd] of [['prop parity (vs Grok prop.py)', 'node v2/eval/prop_parity.mjs'], ['data contract', 'python3 v2/tools/validate.py --all']]) {
  try { console.log(`\n## ${name}\n` + execSync(cmd, { cwd: new URL('../..', import.meta.url).pathname, encoding: 'utf8' })); }
  catch (e) { ok = false; console.log(`\n## ${name} FAILED\n` + (e.stdout || '') + (e.stderr || '')); }
}
process.exit(ok ? 0 : 1);
