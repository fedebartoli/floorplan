#!/usr/bin/env node
// floorplan blueprint: turn floorplan/plan.json (the files, endpoints and connections a system would
// have, planned from a PRD or a description) into floorplan/.cache/scan.json, the same shape scan.mjs
// writes for real code. build.mjs then draws it as a blueprint: the same map, marked as planned.
//
// usage: node plan.mjs [root] [--plan <file>]

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, toPosix, mapDir, keepOutOfGit } from './lib/common.mjs';
import { planToScan } from './lib/blueprint.mjs';

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args._[0] || '.');
const outDir = mapDir(root);
const planFile = path.resolve(args.plan || path.join(outDir, 'plan.json'));
const outFile = path.join(outDir, '.cache', 'scan.json');

const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };
if (!fs.existsSync(planFile)) fail(`No plan at ${planFile}. Write it first (see references/blueprint.md).`);
let plan;
try { plan = JSON.parse(fs.readFileSync(planFile, 'utf8')); } catch (e) { fail(`plan.json is not valid JSON: ${e.message}`); }

const { scan, errors, warnings } = planToScan(plan, root);
const out = [];
if (errors.length) { out.push(`✗ ${errors.length} error(s) in ${toPosix(path.relative(root, planFile))}:`); for (const e of errors) out.push(`  - ${e}`); }
if (warnings.length) { out.push(`! ${warnings.length} warning(s):`); for (const w of warnings.slice(0, 40)) out.push(`  - ${w}`); }
if (errors.length) { console.log(out.join('\n')); console.log('\nFix the errors above and run plan.mjs again.'); process.exit(1); }

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(scan));
keepOutOfGit(outDir);

const bp = scan.blueprint;
const byDir = new Map();
for (const f of scan.files) { const d = f.path.split('/').slice(0, -1).slice(0, 2).join('/') || '.'; byDir.set(d, (byDir.get(d) || 0) + 1); }
if (out.length) out.push('');
out.push(`BLUEPRINT  ${scan.files.length} planned files · ${scan.routes.length} endpoints · ${scan.http.length} calls matched · ${scan.nodeLinks.length} links to services and data`);
for (const [d, n] of [...byDir].sort((a, b) => b[1] - a[1]).slice(0, 15)) out.push(`  ${String(n).padStart(4)}  ${d}/`);
const screens = scan.files.filter((f) => f.screens).length;
if (screens) out.push(`SCREENS  ${screens} planned`);
if (bp.questions.length) out.push(`OPEN QUESTIONS  ${bp.questions.length} (shown in Health until answered)`);
out.push('');
out.push(`✓ wrote ${toPosix(path.relative(root, outFile))}. Next: write or update floorplan/architecture.json, then run build.mjs.`);
console.log(out.join('\n'));
