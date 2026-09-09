/**
 * Transplant a ShapeLab-edited canal back into layout/canal-data.js.
 *
 * ShapeLab writes a tooth template as JSON with an `id` and a `canal.segments`
 * list in normalized coordinates. This turns those segments back into the path
 * string that canal-data.js holds, and rewrites that one entry in place. Every
 * other entry, and all the comments, are left untouched.
 *
 * Usage: node scripts/canal-from-lab.mjs <downloaded-tooth.json>
 *        node scripts/canal-from-lab.mjs <file.json> --dry-run
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CANAL_PATHS } from '../layout/canal-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.join(__dirname, '../layout/canal-data.js');
const DP = 4;

const [, , file, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');

if (!file) {
  console.error('Usage: node scripts/canal-from-lab.mjs <downloaded-tooth.json> [--dry-run]');
  process.exit(1);
}

const shape = JSON.parse(readFileSync(file, 'utf-8'));
const id = shape.id;

if (!id || !(id in CANAL_PATHS)) {
  console.error(`No canal entry named "${id}" in canal-data.js. Known ids: ${Object.keys(CANAL_PATHS).join(', ')}`);
  process.exit(1);
}
const segments = shape.canal?.segments;
if (!Array.isArray(segments) || !segments.length) {
  console.error(`"${file}" has no canal.segments — did you download it from ShapeLab with the canal tab present?`);
  process.exit(1);
}

function n(v) {
  const k = Math.pow(10, DP);
  // Normalize -0 to 0 so the file never grows a stray minus sign.
  const r = Math.round(v * k) / k;
  return String(r === 0 ? 0 : r);
}

function segToStr(seg) {
  switch (seg.type) {
    case 'M': return `M ${n(seg.x)} ${n(seg.y)}`;
    case 'L': return `L ${n(seg.x)} ${n(seg.y)}`;
    case 'C': return `C ${n(seg.x1)} ${n(seg.y1)} ${n(seg.x2)} ${n(seg.y2)} ${n(seg.x)} ${n(seg.y)}`;
    case 'Z': return 'Z';
    default: throw new Error(`canal-from-lab: unsupported segment type "${seg.type}" — canals must be M/L/C/Z only`);
  }
}

const d = segments.map(segToStr).join(' ');

// Sanity: a canal is one or more closed subpaths, and it must stay in the root.
const opens = segments.filter(s => s.type === 'M').length;
const closes = segments.filter(s => s.type === 'Z').length;
if (opens !== closes) {
  console.error(`Refusing to write: ${opens} subpath(s) opened but ${closes} closed. Every canal must end in Z.`);
  process.exit(1);
}
const maxY = Math.max(...segments.filter(s => s.y !== undefined).map(s => s.y));
if (maxY > 0) {
  console.error(`Refusing to write: a point sits at y=${maxY}, past the biting edge. Canal y must be negative.`);
  process.exit(1);
}

const src = readFileSync(TARGET, 'utf-8');
// Match the quoted string that follows this key. Keys are plain identifiers and
// the values are single-quoted single-line strings, both guaranteed by this script.
const re = new RegExp(`(\\n  ${id}:\\s*\\n\\s*')[^']*(')`);
if (!re.test(src)) {
  console.error(`Could not find the "${id}" entry in canal-data.js. Has its formatting changed?`);
  process.exit(1);
}
const next = src.replace(re, `$1${d}$2`);

const before = CANAL_PATHS[id];
console.log(`${id}: ${opens} subpath(s), ${segments.length} segments`);
console.log(`  was ${before.length} chars, now ${d.length} chars${before === d ? '  (identical — nothing changed)' : ''}`);

if (dryRun) {
  console.log('\n--dry-run: canal-data.js not written. New path string:\n');
  console.log(d);
} else {
  writeFileSync(TARGET, next);
  console.log(`\nwrote ${TARGET}`);
  console.log('Next: node scripts/extract-tooth-shapes.mjs   (keeps the lab JSON in step)');
  console.log('Then: npm run build                           (the v3 app iframe uses dist/)');
}
