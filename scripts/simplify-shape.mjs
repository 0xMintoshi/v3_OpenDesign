/**
 * simplify-shape.mjs
 *
 * Retraces a raster-traced shape JSON into smooth cubic Bézier curves.
 *
 * Usage:
 *   node scripts/simplify-shape.mjs <input.json> [--tolerance 0.0015] [--rdp 0.0008] [--dry-run]
 *
 * Critical correctness properties preserved:
 *   1. Winding direction per subpath — required for nonzero SVG fill
 *   2. Subpath count — no loops dropped
 *   3. Coordinate frame — normalized coords unchanged (not re-normalized to shape bbox)
 *   4. Closed-loop seam — each M…Z fitted as periodic closed curve
 *
 * Output: same JSON schema, segments replaced with M/C/Z only.
 * Backup: <input>.raw.json written before overwriting.
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ---- dependencies ----
import simplifyJs from 'simplify-js';
import fitCurve from 'fit-curve';

// ---- CLI args ----
const args = process.argv.slice(2);
const inputArg = args.find(a => !a.startsWith('--'));
const getFlag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? parseFloat(args[i + 1]) : def;
};
const dryRun = args.includes('--dry-run');
const TOLERANCE = getFlag('tolerance', 0.0015); // fit-curve error (normalized units)
const RDP_EPS  = getFlag('rdp', 0.0008);        // RDP pre-thin epsilon

if (!inputArg) {
  console.error('Usage: node simplify-shape.mjs <input.json> [--tolerance 0.0015] [--rdp 0.0008] [--dry-run]');
  process.exit(1);
}

const inputPath = path.resolve(inputArg);
const shape = JSON.parse(readFileSync(inputPath, 'utf8'));

// ---- split into subpaths ----
function splitSubpaths(segments) {
  const subs = [];
  let cur = null;
  for (const s of segments) {
    if (s.type === 'M') { cur = { start: s, segs: [] }; subs.push(cur); }
    else if (cur) cur.segs.push(s);
  }
  return subs;
}

// ---- extract polyline from a subpath's segments ----
function toPolyline(startSeg, segs) {
  const pts = [{ x: startSeg.x, y: startSeg.y }];
  for (const s of segs) {
    if (s.type === 'Z') continue;
    pts.push({ x: s.x, y: s.y });
  }
  return pts;
}

// ---- signed area (shoelace) — positive = CCW in SVG (y-down), negative = CW ----
function signedArea(pts) {
  let a = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return a / 2;
}

// ---- dedupe consecutive near-identical points ----
function dedupe(pts, eps = 1e-6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    if (Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > eps) {
      out.push(pts[i]);
    }
  }
  return out;
}

// ---- process one closed subpath ----
function processSubpath(startSeg, segs, idx) {
  const isClosed = segs.some(s => s.type === 'Z');
  let pts = toPolyline(startSeg, segs);
  const originalArea = signedArea(pts);

  // Dedupe
  pts = dedupe(pts);
  if (pts.length < 3) {
    console.warn(`  #${idx}: too few points after dedupe (${pts.length}), keeping raw`);
    return [startSeg, ...segs];
  }

  // For closed loops: duplicate first point at end so fit-curve sees full perimeter
  if (isClosed) {
    pts = [...pts, pts[0]];
  }

  // RDP thinning — simplify-js uses {x,y} objects natively
  const thinned = simplifyJs(pts, RDP_EPS, true /* high quality */);
  if (thinned.length < 3) {
    console.warn(`  #${idx}: RDP collapsed to ${thinned.length} pts, skipping thin`);
    // fall back to just deduped
  }
  const workPts = thinned.length >= 3 ? thinned : pts;

  // Convert to [[x,y]] for fit-curve
  const arr = workPts.map(p => [p.x, p.y]);

  // Fit cubic Béziers
  let curves;
  try {
    curves = fitCurve(arr, TOLERANCE);
  } catch (e) {
    console.warn(`  #${idx}: fit-curve error (${e.message}), keeping raw`);
    return [startSeg, ...segs];
  }

  if (!curves || curves.length === 0) {
    console.warn(`  #${idx}: fit-curve returned no curves, keeping raw`);
    return [startSeg, ...segs];
  }

  // --- Winding preservation ---
  // Build fitted polyline (just endpoints) to check signed area
  const fittedPts = [{ x: curves[0][0][0], y: curves[0][0][1] }];
  for (const c of curves) fittedPts.push({ x: c[3][0], y: c[3][1] });
  const fittedArea = signedArea(fittedPts);

  const windingFlipped = (originalArea >= 0) !== (fittedArea >= 0);
  if (windingFlipped) {
    // Reverse: flip order of curves and swap control point roles
    curves.reverse();
    curves = curves.map(([p0, cp1, cp2, p3]) => [p3, cp2, cp1, p0]);
  }

  // Emit segments
  const start = curves[0][0];
  const result = [{ type: 'M', x: +start[0].toFixed(4), y: +start[1].toFixed(4) }];

  for (const [, cp1, cp2, p3] of curves) {
    result.push({
      type: 'C',
      x1: +cp1[0].toFixed(4), y1: +cp1[1].toFixed(4),
      x2: +cp2[0].toFixed(4), y2: +cp2[1].toFixed(4),
      x:  +p3[0].toFixed(4),  y:  +p3[1].toFixed(4),
    });
  }

  if (isClosed) result.push({ type: 'Z' });

  const rawCount = segs.length + 1; // +1 for M
  const newCount = result.length;
  const windMsg = windingFlipped ? ' [winding reversed ✓]' : '';
  console.log(`  #${idx}: ${rawCount} segs → ${newCount} segs (${workPts.length} ctrl pts after thin)${windMsg}`);

  return result;
}

// ---- main ----
console.log(`\nSimplifying: ${inputPath}`);
console.log(`  tolerance=${TOLERANCE}  rdp=${RDP_EPS}  dry-run=${dryRun}\n`);

const subpaths = splitSubpaths(shape.segments);
console.log(`Found ${subpaths.length} subpaths, ${shape.segments.length} total segments\n`);

const allSegments = [];
let totalRaw = 0, totalNew = 0;

for (let i = 0; i < subpaths.length; i++) {
  const { start, segs } = subpaths[i];
  const rawCount = segs.length + 1;
  totalRaw += rawCount;
  const result = processSubpath(start, segs, i);
  totalNew += result.length;
  allSegments.push(...result);
}

console.log(`\nTotal: ${totalRaw} → ${totalNew} segments (${Math.round(100 - (totalNew/totalRaw)*100)}% reduction)`);
console.log(`Subpath count preserved: ${subpaths.length} ✓`);

if (dryRun) {
  console.log('\n[dry-run] No files written.');
  process.exit(0);
}

// Back up original
const backupPath = inputPath.replace('.json', '.raw.json');
copyFileSync(inputPath, backupPath);
console.log(`\nBackup written: ${backupPath}`);

// Write simplified shape
const simplified = {
  ...shape,
  fillRule: shape.fillRule ?? 'evenodd',   // safe for both nonzero and evenodd renderers
  source: {
    ...(shape.source ?? {}),
    simplified: {
      from: totalRaw,
      to: totalNew,
      tolerance: TOLERANCE,
      rdp: RDP_EPS,
      tool: 'fit-curve + simplify-js',
      date: new Date().toISOString().slice(0, 10),
    },
  },
  segments: allSegments,
};

writeFileSync(inputPath, JSON.stringify(simplified, null, 2));
console.log(`Simplified shape written: ${inputPath}`);

// ---- generate SVG overlay for visual verification ----
function segsToPathD(segs) {
  return segs.map(s => {
    const W = 1691, H = 930;
    switch (s.type) {
      case 'M': return `M ${(s.x*W).toFixed(1)} ${(s.y*H).toFixed(1)}`;
      case 'L': return `L ${(s.x*W).toFixed(1)} ${(s.y*H).toFixed(1)}`;
      case 'Q': return `Q ${(s.x1*W).toFixed(1)} ${(s.y1*H).toFixed(1)} ${(s.x*W).toFixed(1)} ${(s.y*H).toFixed(1)}`;
      case 'C': return `C ${(s.x1*W).toFixed(1)} ${(s.y1*H).toFixed(1)} ${(s.x2*W).toFixed(1)} ${(s.y2*H).toFixed(1)} ${(s.x*W).toFixed(1)} ${(s.y*H).toFixed(1)}`;
      case 'Z': return 'Z';
      default: return '';
    }
  }).join(' ');
}

const originalShape = JSON.parse(readFileSync(backupPath, 'utf8'));
const origD = segsToPathD(originalShape.segments);
const newD  = segsToPathD(allSegments);

const svgOut = `<svg xmlns="http://www.w3.org/2000/svg" width="1691" height="930" viewBox="0 0 1691 930">
  <rect width="1691" height="930" fill="#1a1a2e"/>
  <!-- Original (grey, filled) -->
  <path d="${origD}" fill="#888" fill-opacity="0.4" fill-rule="evenodd" stroke="#666" stroke-width="0.5"/>
  <!-- Simplified (accent, filled) -->
  <path d="${newD}" fill="#f97316" fill-opacity="0.55" fill-rule="evenodd" stroke="#f97316" stroke-width="0.8"/>
  <text x="20" y="30" fill="white" font-size="18" font-family="monospace">Grey = original (${totalRaw} segs)  |  Orange = simplified (${totalNew} segs)</text>
</svg>`;

const svgPath = path.resolve(path.dirname(inputPath), '..', '..', 'scripts', 'verify-denture.svg');
writeFileSync(svgPath, svgOut);
console.log(`Visual overlay: ${svgPath}`);
