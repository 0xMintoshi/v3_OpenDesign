/**
 * Bootstrap: extract parametric tooth shape generators into normalized JSON files.
 * Writes shapes-data/anatomy/teeth/<template>.json for each of the 8 tooth types.
 *
 * Usage: node scripts/extract-tooth-shapes.mjs
 */
import { parseSVGPath } from './normalize-svg.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../shapes-data/anatomy/teeth');
mkdirSync(OUT_DIR, { recursive: true });

// ── Path generators (copied from layout/teeth-data.jsx, w=1 h=1 gives normalized output) ──

function incisorOutline(w, h) {
  return `M ${w*0.42} ${-h*0.012} C ${w*0.495} ${-h*0.018} ${w*0.505} ${-h*0.12} ${w*0.48} ${-h*0.24} C ${w*0.46} ${-h*0.30} ${w*0.42} ${-h*0.33} ${w*0.38} ${-h*0.35} C ${w*0.28} ${-h*0.44} ${w*0.18} ${-h*0.60} ${w*0.04} ${-h*0.94} C ${w*0.02} ${-h*0.98} ${-w*0.02} ${-h*0.98} ${-w*0.04} ${-h*0.94} C ${-w*0.18} ${-h*0.60} ${-w*0.28} ${-h*0.44} ${-w*0.38} ${-h*0.35} C ${-w*0.42} ${-h*0.33} ${-w*0.46} ${-h*0.30} ${-w*0.48} ${-h*0.24} C ${-w*0.505} ${-h*0.12} ${-w*0.495} ${-h*0.018} ${-w*0.42} ${-h*0.012} C ${-w*0.16} ${-h*0.008} ${w*0.16} ${-h*0.008} ${w*0.42} ${-h*0.012} Z`;
}
function incisorCervical(w, h) {
  const ny = -h * 0.34;
  return `M ${-w*0.40} ${ny} Q 0 ${ny - h*0.055} ${w*0.40} ${ny}`;
}

function canineOutline(w, h) {
  return `M ${w*0.42} ${-h*0.012} C ${w*0.50} ${-h*0.018} ${w*0.51} ${-h*0.12} ${w*0.49} ${-h*0.25} C ${w*0.47} ${-h*0.31} ${w*0.43} ${-h*0.34} ${w*0.39} ${-h*0.36} C ${w*0.28} ${-h*0.46} ${w*0.18} ${-h*0.60} ${w*0.04} ${-h*0.94} C ${w*0.02} ${-h*0.98} ${-w*0.02} ${-h*0.98} ${-w*0.04} ${-h*0.94} C ${-w*0.18} ${-h*0.60} ${-w*0.28} ${-h*0.46} ${-w*0.39} ${-h*0.36} C ${-w*0.43} ${-h*0.34} ${-w*0.47} ${-h*0.31} ${-w*0.49} ${-h*0.25} C ${-w*0.51} ${-h*0.12} ${-w*0.50} ${-h*0.018} ${-w*0.42} ${-h*0.012} C ${-w*0.18} ${-h*0.008} ${w*0.18} ${-h*0.008} ${w*0.42} ${-h*0.012} Z`;
}
function canineCervical(w, h) {
  const ny = -h * 0.34;
  return `M ${-w*0.40} ${ny} Q 0 ${ny - h*0.062} ${w*0.40} ${ny}`;
}

function premolarOutline(w, h) {
  const ch = h * 0.36; const ny = -ch; const nw = w * 0.76; const tipW = w * 0.06;
  return `M ${w*0.46} ${-ch*0.02} C ${w*0.52} ${-ch*0.4} ${w*0.50} ${-ch*0.85} ${nw*0.50} ${ny} C ${w*0.42} ${-ch - h*0.10} ${w*0.20} ${-h*0.55} ${tipW} ${-h*0.94} C ${tipW*0.5} ${-h} ${-tipW*0.5} ${-h} ${-tipW} ${-h*0.94} C ${-w*0.20} ${-h*0.55} ${-w*0.42} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.50} ${-ch*0.85} ${-w*0.52} ${-ch*0.4} ${-w*0.46} ${-ch*0.02} C ${-w*0.26} ${ch*0.06} ${w*0.26} ${ch*0.06} ${w*0.46} ${-ch*0.02} Z`;
}
function premolarBifurcOutline(w, h) {
  const ch = h * 0.36; const ny = -ch; const nw = w * 0.78;
  return `M ${w*0.46} ${-ch*0.02} C ${w*0.52} ${-ch*0.4} ${w*0.50} ${-ch*0.85} ${nw*0.50} ${ny} C ${w*0.42} ${-ch - h*0.10} ${w*0.30} ${-h*0.4} ${w*0.20} ${-h*0.7} C ${w*0.16} ${-h*0.88} ${w*0.12} ${-h*0.98} ${w*0.10} ${-h*0.98} C ${w*0.06} ${-h*0.98} ${w*0.04} ${-h*0.86} ${w*0.04} ${-h*0.75} C ${w*0.04} ${-h*0.60} ${w*0.02} ${-h*0.55} 0 ${-h*0.55} C ${-w*0.02} ${-h*0.55} ${-w*0.04} ${-h*0.60} ${-w*0.04} ${-h*0.75} C ${-w*0.04} ${-h*0.86} ${-w*0.06} ${-h*0.98} ${-w*0.10} ${-h*0.98} C ${-w*0.12} ${-h*0.98} ${-w*0.16} ${-h*0.88} ${-w*0.20} ${-h*0.7} C ${-w*0.30} ${-h*0.4} ${-w*0.42} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.50} ${-ch*0.85} ${-w*0.52} ${-ch*0.4} ${-w*0.46} ${-ch*0.02} C ${-w*0.26} ${ch*0.06} ${w*0.26} ${ch*0.06} ${w*0.46} ${-ch*0.02} Z`;
}
function premolarCervical(w, h) {
  const ch = h * 0.36; const ny = -ch; const nw = w * 0.78;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

function molarUOutline(w, h) {
  const ch = h * 0.40; const ny = -ch; const nw = w * 0.84;
  const f = { meetY:0.505, innerX:0.122, innerY:0.695, neckX:0.084, neckY:0.585, midX:0.043, midY:0.770, apexX:0.016, apexY:0.895, shoulderX:0.040, shoulderY:0.535 };
  return `M ${w*0.48} ${-ch*0.02} C ${w*0.52} ${-ch*0.4} ${w*0.52} ${-ch*0.85} ${nw*0.50} ${ny} C ${w*0.40} ${-ch - h*0.10} ${w*0.34} ${-h*0.5} ${w*0.24} ${-h*0.86} C ${w*0.20} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86} C ${w*0.154} ${-h*0.792} ${w*f.innerX} ${-h*f.innerY} ${w*f.shoulderX} ${-h*f.shoulderY} C ${w*0.026} ${-h*(f.meetY + 0.012)} ${w*0.010} ${-h*(f.meetY + 0.004)} 0 ${-h*f.meetY} C ${w*0.026} ${-h*(f.meetY + 0.012)} ${w*f.neckX} ${-h*f.neckY} ${w*(f.neckX * 0.88)} ${-h*(f.neckY + 0.070)} C ${w*f.midX} ${-h*f.midY} ${w*(f.apexX + 0.018)} ${-h*(f.apexY - 0.012)} ${w*f.apexX} ${-h*f.apexY} C ${w*(f.apexX * 0.36)} ${-h*(f.apexY + 0.018)} ${-w*(f.apexX * 0.36)} ${-h*(f.apexY + 0.018)} ${-w*f.apexX} ${-h*f.apexY} C ${-w*(f.apexX + 0.018)} ${-h*(f.apexY - 0.012)} ${-w*f.midX} ${-h*f.midY} ${-w*(f.neckX * 0.88)} ${-h*(f.neckY + 0.070)} C ${-w*f.neckX} ${-h*f.neckY} ${-w*0.026} ${-h*(f.meetY + 0.012)} 0 ${-h*f.meetY} C ${-w*0.010} ${-h*(f.meetY + 0.004)} ${-w*0.026} ${-h*(f.meetY + 0.012)} ${-w*f.shoulderX} ${-h*f.shoulderY} C ${-w*f.innerX} ${-h*f.innerY} ${-w*0.154} ${-h*0.792} ${-w*0.12} ${-h*0.86} C ${-w*0.14} ${-h*0.96} ${-w*0.20} ${-h*0.96} ${-w*0.24} ${-h*0.86} C ${-w*0.34} ${-h*0.5} ${-w*0.40} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.52} ${-ch*0.85} ${-w*0.52} ${-ch*0.4} ${-w*0.48} ${-ch*0.02} C ${-w*0.10} ${ch*0.18} ${w*0.10} ${ch*0.18} ${w*0.48} ${-ch*0.02} Z`;
}
function molarLOutline(w, h) {
  const ch = h * 0.40; const ny = -ch; const nw = w * 0.86;
  return `M ${w*0.48} ${-ch*0.02} C ${w*0.54} ${-ch*0.4} ${w*0.52} ${-ch*0.85} ${nw*0.50} ${ny} C ${w*0.46} ${-ch - h*0.10} ${w*0.46} ${-h*0.5} ${w*0.38} ${-h*0.85} C ${w*0.32} ${-h*1.0} ${w*0.24} ${-h*1.0} ${w*0.22} ${-h*0.98} C ${w*0.18} ${-h*0.92} ${w*0.16} ${-h*0.75} ${w*0.14} ${-h*0.60} C ${w*0.10} ${-h*0.50} ${w*0.06} ${-h*0.50} 0 ${-h*0.50} C ${-w*0.06} ${-h*0.50} ${-w*0.10} ${-h*0.50} ${-w*0.14} ${-h*0.60} C ${-w*0.16} ${-h*0.75} ${-w*0.18} ${-h*0.92} ${-w*0.22} ${-h*0.98} C ${-w*0.24} ${-h*1.0} ${-w*0.32} ${-h*1.0} ${-w*0.38} ${-h*0.85} C ${-w*0.46} ${-h*0.5} ${-w*0.46} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.52} ${-ch*0.85} ${-w*0.54} ${-ch*0.4} ${-w*0.48} ${-ch*0.02} C ${-w*0.10} ${ch*0.18} ${w*0.10} ${ch*0.18} ${w*0.48} ${-ch*0.02} Z`;
}
function molarCervical(w, h) {
  const ch = h * 0.40; const ny = -ch; const nw = w * 0.84;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

function wisdomUOutline(w, h) {
  return `M ${w*0.161} ${-h*0.014} C ${w*0.405} ${-h*0.018} ${w*0.487} ${-h*0.053} ${w*0.496} ${-h*0.108} C ${w*0.51} ${-h*0.214} ${w*0.509} ${-h*0.316} ${w*0.485} ${-h*0.384} C ${w*0.449} ${-h*0.426} ${w*0.398} ${-h*0.499} ${w*0.371} ${-h*0.547} C ${w*0.34} ${-h*0.587} ${w*0.297} ${-h*0.656} ${w*0.24} ${-h*0.86} C ${w*0.2} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86} C ${w*0.1} ${-h*0.74} ${w*0.06} ${-h*0.62} 0 ${-h*0.6} C ${-w*0.06} ${-h*0.62} ${-w*0.1} ${-h*0.74} ${-w*0.12} ${-h*0.86} C ${-w*0.14} ${-h*0.96} ${-w*0.2} ${-h*0.96} ${-w*0.24} ${-h*0.86} C ${-w*0.296} ${-h*0.656} ${-w*0.34} ${-h*0.587} ${-w*0.371} ${-h*0.547} C ${-w*0.398} ${-h*0.499} ${-w*0.449} ${-h*0.426} ${-w*0.485} ${-h*0.384} C ${-w*0.509} ${-h*0.316} ${-w*0.51} ${-h*0.214} ${-w*0.496} ${-h*0.108} C ${-w*0.487} ${-h*0.053} ${-w*0.423} ${-h*0.02} ${-w*0.223} ${-h*0.014} C ${w*0.017} ${-h*0.009} ${w*0.263} ${-h*0.017} ${w*0.014} ${-h*0.01} C ${w*0.014} ${-h*0.01} ${-w*0.368} ${-h*0.016} ${w*0.014} ${-h*0.01} Z`;
}
function wisdomLOutline(w, h) {
  const ch = h * 0.46; const ny = -ch; const nw = w * 0.86;
  return `M ${w*0.48} ${-ch*0.02} C ${w*0.54} ${-ch*0.45} ${w*0.52} ${-ch*0.92} ${nw*0.50} ${ny} C ${w*0.44} ${-ch - h*0.10} ${w*0.40} ${-h*0.55} ${w*0.30} ${-h*0.86} C ${w*0.24} ${-h*0.96} ${w*0.16} ${-h*0.96} ${w*0.14} ${-h*0.86} C ${w*0.10} ${-h*0.65} ${w*0.04} ${-h*0.55} 0 ${-h*0.55} C ${-w*0.04} ${-h*0.55} ${-w*0.10} ${-h*0.65} ${-w*0.14} ${-h*0.86} C ${-w*0.16} ${-h*0.96} ${-w*0.24} ${-h*0.96} ${-w*0.30} ${-h*0.86} C ${-w*0.40} ${-h*0.55} ${-w*0.44} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.52} ${-ch*0.92} ${-w*0.54} ${-ch*0.45} ${-w*0.48} ${-ch*0.02} C ${-w*0.10} ${ch*0.18} ${w*0.10} ${ch*0.18} ${w*0.48} ${-ch*0.02} Z`;
}
function wisdomCervical(w, h) {
  const ch = h * 0.46; const ny = -ch; const nw = w * 0.84;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

// ── Template definitions ──
const TEMPLATES = [
  { id: 'incisor',   label: 'Incisor',             outline: incisorOutline,        cervical: incisorCervical },
  { id: 'canine',    label: 'Canine',               outline: canineOutline,         cervical: canineCervical },
  { id: 'premolar',  label: 'Premolar (1 root)',    outline: premolarOutline,       cervical: premolarCervical },
  { id: 'premolar1', label: 'Premolar (2 roots)',   outline: premolarBifurcOutline, cervical: premolarCervical },
  { id: 'molarU',    label: 'Upper Molar',          outline: molarUOutline,         cervical: molarCervical },
  { id: 'molarL',    label: 'Lower Molar',          outline: molarLOutline,         cervical: molarCervical },
  { id: 'wisdomU',   label: 'Upper Wisdom Tooth',   outline: wisdomUOutline,        cervical: wisdomCervical },
  { id: 'wisdomL',   label: 'Lower Wisdom Tooth',   outline: wisdomLOutline,        cervical: wisdomCervical },
];

function r(n) { return Math.round(n * 1000) / 1000; }

function roundSegs(segs) {
  return segs.map(s => {
    if (s.type === 'Z') return s;
    const n = { type: s.type };
    if (s.x  !== undefined) { n.x  = r(s.x);  n.y  = r(s.y);  }
    if (s.x1 !== undefined) { n.x1 = r(s.x1); n.y1 = r(s.y1); }
    if (s.x2 !== undefined) { n.x2 = r(s.x2); n.y2 = r(s.y2); }
    return n;
  });
}

for (const t of TEMPLATES) {
  // Call generators with w=1, h=1 → coords are already normalized fractions
  const outlinePath  = t.outline(1, 1);
  const cervicalPath = t.cervical(1, 1);

  const shape = {
    id: t.id,
    label: t.label,
    version: 1,
    note: 'x = rawX/w, y = rawY/h. Origin at biting edge center; root extends to y≈-1. Left-side FDI positions rendered via SVG mirror (scale(-1,1)) at runtime.',
    outline:  { segments: roundSegs(parseSVGPath(outlinePath)) },
    cervical: { segments: roundSegs(parseSVGPath(cervicalPath)) },
  };

  const out = path.join(OUT_DIR, `${t.id}.json`);
  writeFileSync(out, JSON.stringify(shape, null, 2));
  console.log(`wrote ${out}`);
}

console.log('Done — 8 tooth shape JSONs written.');
