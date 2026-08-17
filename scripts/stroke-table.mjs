#!/usr/bin/env node
// Prints the treatment-overlay stroke/geometry tunables by reading them straight
// out of the source, so the table can never go stale the way a hand-maintained
// one in SESSION.md did.
//
//   node scripts/stroke-table.mjs            # markdown table
//   node scripts/stroke-table.mjs --json     # machine-readable
//
// Adding a tunable: give it a named `const` in its source file and add one row
// to TUNABLES below. Inline JSX literals are deliberately not supported — a
// value without a name is a value nobody can tune.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TUNABLES = [
  { what: 'Plain crown stroke',      file: 'treatment-overlays/CrownOverlay.jsx',      name: 'STROKE_WIDTH' },
  { what: 'Bridge span crowns',      file: 'treatment-overlays/BridgeSpanOverlay.jsx', name: 'STROKE_WIDTH' },
  { what: 'Bridge connector bar',    file: 'treatment-overlays/BridgeSpanOverlay.jsx', name: 'CONTACT_STROKE_WIDTH' },
  { what: 'Implant crown stroke',    file: 'app/treatments.jsx',                       name: 'IMPLANT_CROWN_STROKE_WIDTH' },
  { what: 'Implant-bridge crowns',   file: 'app/treatments.jsx',                       name: 'IMPLANT_BRIDGE_CROWN_STROKE_WIDTH' },
  { what: 'Veneer ring width',       file: 'treatment-overlays/VeneerOverlay.jsx',     name: 'A_RING_W' },
  { what: 'Veneer inset depth',      file: 'treatment-overlays/VeneerOverlay.jsx',     name: 'A_INSET_DEPTH' },
  { what: 'Veneer wash opacity',     file: 'treatment-overlays/VeneerOverlay.jsx',     name: 'A_WASH_OPACITY' },
];

function read({ file, name }) {
  const abs = path.join(ROOT, file);
  const src = fs.readFileSync(abs, 'utf8').split('\n');
  const re = new RegExp(`^\\s*(?:export\\s+)?const\\s+${name}\\s*=\\s*([0-9.]+)\\s*;`);
  for (let i = 0; i < src.length; i++) {
    const m = src[i].match(re);
    if (m) return { value: Number(m[1]), line: i + 1 };
  }
  throw new Error(
    `stroke-table: could not find \`const ${name}\` in ${file}. ` +
    `If it was renamed or inlined, fix TUNABLES in scripts/stroke-table.mjs.`
  );
}

const rows = TUNABLES.map((t) => ({ ...t, ...read(t) }));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const loc = (r) => `${r.file}:${r.line}`;
  const w = (key, head) => Math.max(head.length, ...rows.map((r) => String(key(r)).length));
  const wWhat = w((r) => r.what, 'What it draws');
  const wLoc = w(loc, 'Where');
  const wName = w((r) => r.name, 'Constant');
  const wVal = w((r) => r.value, 'Value');
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`| ${pad('What it draws', wWhat)} | ${pad('Where', wLoc)} | ${pad('Constant', wName)} | ${pad('Value', wVal)} |`);
  console.log(`|${'-'.repeat(wWhat + 2)}|${'-'.repeat(wLoc + 2)}|${'-'.repeat(wName + 2)}|${'-'.repeat(wVal + 2)}|`);
  for (const r of rows) {
    console.log(`| ${pad(r.what, wWhat)} | ${pad(loc(r), wLoc)} | ${pad(r.name, wName)} | ${pad(r.value, wVal)} |`);
  }
  console.log('');
  console.log('Veneer is a clipped ring, not a stroke: A_RING_W is its thickness, A_INSET_DEPTH');
  console.log('its position. The `2 *` multipliers in VeneerOverlay.jsx are stroke-straddle math —');
  console.log('leave them alone.');
}
