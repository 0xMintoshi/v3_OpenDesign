/**
 * Generate the upload bundle for an external design session on root-canal geometry.
 *
 * Everything here is DERIVED from layout/teeth-data.jsx — the source of truth.
 * Do NOT copy the tooth generators into this file. scripts/extract-tooth-shapes.mjs
 * already carries a copy and _drafts/dental-geometry-fit-diagnostic.html a third;
 * a fourth is how they finally drift apart.
 *
 * Usage: node scripts/export-design-brief.mjs
 * Output: _design-brief/  (gitignored, regenerate at will)
 *
 * NEVER `rm -rf _design-brief` to "regenerate cleanly". The folder holds hand-placed
 * ref-*.png anatomy images that exist nowhere else and cannot be regenerated — deleting
 * the folder destroys them for good (rm bypasses the Recycle Bin). This script only ever
 * overwrites the specific files it generates, so just re-run it.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_design-brief');

// teeth-data.jsx contains no JSX syntax, but Node will not import a .jsx extension
// and the file touches `window` at module scope. Mirror it to a temp .mjs inside
// layout/ (so its relative core/ imports still resolve), import it, then delete.
const SRC = path.join(ROOT, 'layout/teeth-data.jsx');
const TMP = path.join(ROOT, 'layout/.teeth-data.brief.mjs');
const raw = readFileSync(SRC, 'utf8');
const stripped = raw.replace(
  /Object\.assign\(window,[\s\S]*?\}\);/,
  '// window export stripped for Node import'
);
if (stripped === raw) {
  throw new Error('Expected an Object.assign(window, ...) block in teeth-data.jsx — the file changed shape; update this script rather than guessing.');
}
writeFileSync(TMP, stripped);

let mod, archMath;
try {
  mod = await import(new URL('file://' + TMP.replace(/\\/g, '/')).href);
  archMath = await import(new URL('file://' + path.join(ROOT, 'core/arch-math.js').replace(/\\/g, '/')).href);
} finally {
  rmSync(TMP, { force: true });
}

const { UPPER, LOWER, layoutArch, toothPaths } = mod;
const { CERVICAL, ARCH_LAYOUT } = archMath;
const S = ARCH_LAYOUT.scale;

const upperOf = k => UPPER.find(t => t.key === k);
const lowerOf = k => LOWER.find(t => t.key === k);

// The eight drawable tooth types, at the real dimensions the chart renders them.
const SHEETS = [
  { n: 1, slug: 'incisor',         label: 'Incisor (upper central)', t: upperOf('central'),   canals: '1' },
  { n: 2, slug: 'canine',          label: 'Canine (upper)',          t: upperOf('canine'),    canals: '1' },
  { n: 3, slug: 'premolar1-upper', label: 'First premolar (upper)',  t: upperOf('premolar1'), canals: '2 (bifurcated root)' },
  { n: 4, slug: 'premolar',        label: 'Second premolar (upper)', t: upperOf('premolar2'), canals: '1' },
  { n: 5, slug: 'molar-upper',     label: 'Molar (upper)',           t: upperOf('molar1'),    canals: '3 roots / 3 canals' },
  { n: 6, slug: 'molar-lower',     label: 'Molar (lower)',           t: lowerOf('molar1'),    canals: '2 roots / 3 canals (2 mesial + 1 distal)' },
  { n: 7, slug: 'wisdom-upper',    label: 'Third molar (upper)',     t: upperOf('wisdom'),    canals: '2 — extrapolate from the 2nd molar' },
  { n: 8, slug: 'wisdom-lower',    label: 'Third molar (lower)',     t: lowerOf('wisdom'),    canals: '2 — extrapolate from the 2nd molar' },
];

const f = n => Number(n.toFixed(2));

function toothSheet({ label, t, canals }) {
  const { w, h, type } = t;
  const W = w * S, H = h * S;                     // real rendered chart size, in px
  const { crown, root, cervical } = toothPaths(type, W, H);
  const cerv = CERVICAL[type] ?? CERVICAL.incisor;

  // Horizontal margin is generous on purpose: the header line is width-bound, and
  // an incisor is only ~62px wide. Text sizes derive from W, not H, for the same reason.
  const x0 = -0.95 * W, x1 = 0.95 * W;
  // yTop is where the grid stops; y0 leaves a clear band above it for the header,
  // otherwise the -1.0h/-1.1h labels land on top of the title text.
  const yTop = -1.14 * H;
  const y0 = -1.34 * H, y1 = 0.12 * H;
  const vb = `${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}`;
  const fs = W * 0.036;   // grid label
  const fh = W * 0.052;   // header
  const fsub = W * 0.034; // subheader

  // 10% gridlines, labelled in the exact units the answer must come back in.
  // x labels every 0.2w only — at 0.1w they overlap on the narrow anterior teeth.
  let grid = '';
  for (let i = -6; i <= 6; i++) {
    const gx = i * 0.1 * W;
    grid += `<line x1="${f(gx)}" y1="${f(yTop)}" x2="${f(gx)}" y2="${f(y1)}" class="${i === 0 ? 'axis' : 'grid'}"/>`;
    if (i !== 0 && i % 2 === 0) grid += `<text x="${f(gx)}" y="${f(y1 - H * 0.008)}" class="lbl">${(i / 10).toFixed(1)}w</text>`;
  }
  for (let i = 0; i <= 11; i++) {
    const gy = -i * 0.1 * H;
    grid += `<line x1="${f(x0)}" y1="${f(gy)}" x2="${f(x1)}" y2="${f(gy)}" class="${i === 0 ? 'axis' : 'grid'}"/>`;
    grid += `<text x="${f(x0 + W * 0.02)}" y="${f(gy - H * 0.006)}" class="lblL">${(-i / 10).toFixed(1)}h</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${f((x1 - x0) * 3.2)}" height="${f((y1 - y0) * 3.2)}" role="img" aria-label="${label} — root canal drawing sheet">
  <title>${label} — canal drawing sheet</title>
  <desc>ROOT ONLY is drawable. Tooth is w=${f(W)} h=${f(H)} px at chart scale ${S}. Origin sits at the biting edge and the root runs in NEGATIVE y (upward on screen here). Grid squares are 0.1w by 0.1h. Cervical line for this type is y = ${(-cerv.y).toFixed(2)}h.</desc>
  <style>
    .grid{stroke:#ccd4e2;stroke-width:${f(H * 0.0022)}}
    .axis{stroke:#8fa0b8;stroke-width:${f(H * 0.004)}}
    .lbl{fill:#8390a6;font:${f(fs)}px system-ui,sans-serif;text-anchor:middle}
    .lblL{fill:#8390a6;font:${f(fs)}px system-ui,sans-serif;text-anchor:start}
    .hd{fill:#1f2937;font:600 ${f(fh)}px system-ui,sans-serif;text-anchor:start}
    .sub{fill:#6b7280;font:${f(fsub)}px system-ui,sans-serif;text-anchor:start}
  </style>
  <rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="#ffffff"/>
  <g>${grid}</g>
  <!-- CROWN: out of bounds. Canal geometry must not enter this region. -->
  <path d="${crown.trim()}" fill="#eceff4" stroke="#b9c2d0" stroke-width="${f(H * 0.004)}" stroke-dasharray="${f(H * 0.012)} ${f(H * 0.008)}"/>
  <!-- ROOT: the drawable area. Canal geometry must lie entirely inside this path. -->
  <path d="${root.trim()}" fill="#ffffff" stroke="#1f2937" stroke-width="${f(H * 0.007)}"/>
  <!-- Cervical arc: the canal's coronal end anchors on or just apical to this line. -->
  <path d="${cervical.trim()}" fill="none" stroke="#c0392b" stroke-width="${f(H * 0.006)}" stroke-dasharray="${f(H * 0.016)} ${f(H * 0.010)}"/>
  <text x="${f(x0 + W * 0.02)}" y="${f(y0 + fh * 1.4)}" class="hd">${label} — canals: ${canals}</text>
  <text x="${f(x0 + W * 0.02)}" y="${f(y0 + fh * 1.4 + fsub * 1.5)}" class="sub">grey dashed = crown, DO NOT DRAW HERE</text>
  <text x="${f(x0 + W * 0.02)}" y="${f(y0 + fh * 1.4 + fsub * 2.7)}" class="sub">red dashed = cervical line, canal starts here · white area = draw inside this only</text>
</svg>
`;
}

function archSheet() {
  const { centerX, scale, gap, gapFrac, archDepth, biteCenter, archGap } = ARCH_LAYOUT;
  const upper = layoutArch(UPPER, centerX, scale, { gap, gapFrac, archDepth });
  const lower = layoutArch(LOWER, centerX, scale, { gap, gapFrac, archDepth });

  const draw = (teeth, biteY, flip) => teeth.map(t => {
    const { outline, root } = toothPaths(t.type, t.w, t.h);
    const yo = t.yOffset || 0;
    return `  <g transform="translate(${f(t.cx)}, ${f(biteY + yo * flip)}) scale(1, ${flip}) rotate(${f(t.tilt || 0)})">
    <path d="${outline.trim()}" fill="#ffffff" stroke="#96a3b5" stroke-width="1.1"/>
    <path d="${root.trim()}" fill="none" stroke="#1f2937" stroke-width="1.7"/>
  </g>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 800" width="1600" height="800" role="img" aria-label="Both arches at true chart scale">
  <title>Arch context — both arches, true scale and spacing</title>
  <desc>Root portions drawn in the darker stroke. Use this to check that canal geometry reads correctly beside its neighbours, not only in isolation.</desc>
  <rect width="1600" height="800" fill="#f8fafc"/>
${draw(upper, biteCenter - archGap / 2, 1)}
${draw(lower, biteCenter + archGap / 2, -1)}
</svg>
`;
}

// Flat on purpose: claude.ai's uploader takes files, not folders, so everything
// must sit in one directory where Ctrl+A selects the whole bundle in one go.
mkdirSync(OUT, { recursive: true });

for (const s of SHEETS) {
  writeFileSync(path.join(OUT, `${String(s.n).padStart(2, '0')}-tooth-${s.slug}.svg`), toothSheet(s));
}
writeFileSync(path.join(OUT, '09-arch-context.svg'), archSheet());

// Format reference for the return trip. Geometry is NOT authoritative — see the
// "Lab-parity drift" note in CLAUDE.md.
const example = JSON.parse(readFileSync(path.join(ROOT, 'shapes-data/anatomy/teeth/incisor.json'), 'utf8'));
writeFileSync(path.join(OUT, '10-format-example.json'), JSON.stringify({
  _note: 'FORMAT REFERENCE ONLY. The geometry in this file is not authoritative (see CLAUDE.md, "Lab-parity drift"). Copy the segment structure, never the numbers.',
  ...example,
}, null, 2));

// The reference images cannot be generated — they are dropped into this folder by
// hand, under whatever name the user chose. Discover them rather than dictating names:
// anything image-shaped that this script did not itself write is a reference image.
const generated = new Set([
  '00-INSTRUCTIONS.md', '09-arch-context.svg', '10-format-example.json',
  ...SHEETS.map(s => `${String(s.n).padStart(2, '0')}-tooth-${s.slug}.svg`),
]);
const refs = readdirSync(OUT)
  .filter(n => /\.(png|jpe?g|webp|gif)$/i.test(n) && !generated.has(n));

// Instructions live in docs/ so they are version-controlled; the bundle gets a copy
// with the real reference filenames substituted in, so the brief never names a file
// that is not actually there.
const refList = refs.length
  ? refs.map(n => '`' + n + '`').join(', ')
  : '**MISSING — no reference images were included with this bundle**';
writeFileSync(
  path.join(OUT, '00-INSTRUCTIONS.md'),
  readFileSync(path.join(ROOT, 'docs/root-canal-design-brief.md'), 'utf8')
    .replaceAll('{{REFERENCE_FILES}}', refList)
);

console.log(`Wrote ${SHEETS.length} tooth sheets + arch context + instructions to ${path.relative(process.cwd(), OUT)}\n`);
if (refs.length === 0) {
  console.log('  !! No reference images yet. Save the two pulp anatomy pictures into this same');
  console.log('     folder as ref-mandibular.png and ref-maxillary.png before uploading.\n');
} else {
  console.log(`  reference images: ${refs.join(', ')}\n`);
}
for (const s of SHEETS) {
  const { w, h, type } = s.t;
  console.log(`  ${s.n}-${s.slug.padEnd(16)} type=${type.padEnd(10)} w=${String(f(w * S)).padStart(6)} h=${String(f(h * S)).padStart(6)}  cervical=${CERVICAL[type].y}h`);
}
