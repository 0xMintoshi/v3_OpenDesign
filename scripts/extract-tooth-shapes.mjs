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
  const ch = h * 0.34; const ny = -ch; const nw = w * 0.78; const tipW = w * 0.06;
  return `M ${w*0.46} 0 C ${w*0.50} ${-ch*0.35} ${w*0.49} ${-ch*0.85} ${nw*0.50} ${ny} C ${w*0.42} ${-ch - h*0.10} ${w*0.22} ${-h*0.55} ${tipW} ${-h*0.94} C ${tipW*0.5} ${-h} ${-tipW*0.5} ${-h} ${-tipW} ${-h*0.94} C ${-w*0.22} ${-h*0.55} ${-w*0.42} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.49} ${-ch*0.85} ${-w*0.50} ${-ch*0.35} ${-w*0.46} 0 Q 0 ${h*0.018} ${w*0.46} 0 Z`;
}
function incisorCervical(w, h) {
  const ch = h * 0.34; const ny = -ch; const nw = w * 0.78;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.16} ${nw*0.48} ${ny}`;
}

function canineOutline(w, h) {
  const ch = h * 0.34; const ny = -ch; const nw = w * 0.74; const tipW = w * 0.05;
  return `M ${w*0.42} ${-ch*0.04} C ${w*0.49} ${-ch*0.30} ${w*0.48} ${-ch*0.78} ${nw*0.50} ${ny} C ${w*0.40} ${-ch - h*0.10} ${w*0.20} ${-h*0.55} ${tipW} ${-h*0.94} C ${tipW*0.5} ${-h} ${-tipW*0.5} ${-h} ${-tipW} ${-h*0.94} C ${-w*0.20} ${-h*0.55} ${-w*0.40} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.48} ${-ch*0.78} ${-w*0.49} ${-ch*0.30} ${-w*0.42} ${-ch*0.04} C ${-w*0.22} ${ch*0.06} ${w*0.22} ${ch*0.06} ${w*0.42} ${-ch*0.04} Z`;
}
function canineCervical(w, h) {
  const ch = h * 0.34; const ny = -ch; const nw = w * 0.74;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

function premolarOutline(w, h) {
  const ch = h * 0.36; const ny = -ch; const nw = w * 0.76; const tipW = w * 0.06;
  return `M ${w*0.44} ${-h*0.058} C ${w*0.50} ${-h*0.10} ${w*0.50} ${-h*0.28} ${nw*0.50} ${ny} C ${w*0.42} ${-ch - h*0.10} ${w*0.20} ${-h*0.55} ${tipW} ${-h*0.94} C ${tipW*0.5} ${-h} ${-tipW*0.5} ${-h} ${-tipW} ${-h*0.94} C ${-w*0.20} ${-h*0.55} ${-w*0.42} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.50} ${-h*0.28} ${-w*0.50} ${-h*0.10} ${-w*0.44} ${-h*0.058} C ${-w*0.40} ${-h*0.020} ${-w*0.27} ${-h*0.016} 0 ${-h*0.006} C ${w*0.27} ${-h*0.016} ${w*0.40} ${-h*0.020} ${w*0.44} ${-h*0.058} Z`;
}
function premolarBifurcOutline(w, h) {
  const ch = h * 0.36; const ny = -ch; const nw = w * 0.78;
  return `M ${w*0.44} ${-h*0.058} C ${w*0.50} ${-h*0.10} ${w*0.50} ${-h*0.28} ${nw*0.50} ${ny} C ${w*0.42} ${-ch - h*0.10} ${w*0.30} ${-h*0.4} ${w*0.20} ${-h*0.7} C ${w*0.16} ${-h*0.88} ${w*0.12} ${-h*0.98} ${w*0.10} ${-h*0.98} C ${w*0.06} ${-h*0.98} ${w*0.04} ${-h*0.86} ${w*0.04} ${-h*0.75} C ${w*0.04} ${-h*0.60} ${w*0.02} ${-h*0.55} 0 ${-h*0.55} C ${-w*0.02} ${-h*0.55} ${-w*0.04} ${-h*0.60} ${-w*0.04} ${-h*0.75} C ${-w*0.04} ${-h*0.86} ${-w*0.06} ${-h*0.98} ${-w*0.10} ${-h*0.98} C ${-w*0.12} ${-h*0.98} ${-w*0.16} ${-h*0.88} ${-w*0.20} ${-h*0.7} C ${-w*0.30} ${-h*0.4} ${-w*0.42} ${-ch - h*0.10} ${-nw*0.50} ${ny} C ${-w*0.50} ${-h*0.28} ${-w*0.50} ${-h*0.10} ${-w*0.44} ${-h*0.058} C ${-w*0.40} ${-h*0.020} ${-w*0.27} ${-h*0.016} 0 ${-h*0.006} C ${w*0.27} ${-h*0.016} ${w*0.40} ${-h*0.020} ${w*0.44} ${-h*0.058} Z`;
}
function premolarCervical(w, h) {
  const ch = h * 0.36; const ny = -ch; const nw = w * 0.78;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

function molarUOutline(w, h) {
  return `M ${w*0.51} ${-h*0.119} C ${w*0.516} ${-h*0.179} ${w*0.512} ${-h*0.313} ${w*0.44} ${-h*0.379} C ${w*0.433} ${-h*0.393} ${w*0.419} ${-h*0.409} ${w*0.413} ${-h*0.427} C ${w*0.388} ${-h*0.504} ${w*0.33} ${-h*0.536} ${w*0.24} ${-h*0.86} C ${w*0.2} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86} C ${w*0.154} ${-h*0.792} ${w*0.122} ${-h*0.695} ${w*0.04} ${-h*0.535} C ${w*0.026} ${-h*0.517} ${w*0.01} ${-h*0.509} 0 ${-h*0.505} C ${w*0.026} ${-h*0.517} ${w*0.084} ${-h*0.585} ${w*0.074} ${-h*0.655} C ${w*0.043} ${-h*0.77} ${w*0.034} ${-h*0.883} ${w*0.016} ${-h*0.895} C ${w*0.006} ${-h*0.913} ${-w*0.006} ${-h*0.913} ${-w*0.016} ${-h*0.895} C ${-w*0.034} ${-h*0.883} ${-w*0.043} ${-h*0.77} ${-w*0.074} ${-h*0.655} C ${-w*0.084} ${-h*0.585} ${-w*0.026} ${-h*0.517} 0 ${-h*0.505} C ${-w*0.01} ${-h*0.509} ${-w*0.026} ${-h*0.517} ${-w*0.04} ${-h*0.535} C ${-w*0.122} ${-h*0.695} ${-w*0.154} ${-h*0.792} ${-w*0.12} ${-h*0.86} C ${-w*0.14} ${-h*0.96} ${-w*0.2} ${-h*0.96} ${-w*0.24} ${-h*0.86} C ${-w*0.33} ${-h*0.536} ${-w*0.388} ${-h*0.504} ${-w*0.413} ${-h*0.427} C ${-w*0.419} ${-h*0.409} ${-w*0.433} ${-h*0.393} ${-w*0.447} ${-h*0.379} C ${-w*0.509} ${-h*0.316} ${-w*0.51} ${-h*0.214} ${-w*0.496} ${-h*0.108} C ${-w*0.469} ${-h*0.046} ${-w*0.423} ${-h*0.02} ${-w*0.223} ${-h*0.014} C ${w*0.178} ${-h*0.006} ${-w*0.118} ${-h*0.011} ${w*0.059} ${-h*0.01} C ${w*0.309} ${-h*0.013} ${w*0.495} ${-h*0.027} ${w*0.501} ${-h*0.083} Z`;
}
function molarLOutline(w, h) {
  return `M ${w*0.51} ${-h*0.119} C ${w*0.516} ${-h*0.179} ${w*0.512} ${-h*0.313} ${w*0.44} ${-h*0.379} C ${w*0.433} ${-h*0.393} ${w*0.419} ${-h*0.409} ${w*0.413} ${-h*0.427} C ${w*0.388} ${-h*0.504} ${w*0.33} ${-h*0.536} ${w*0.24} ${-h*0.86} C ${w*0.2} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86} C ${w*0.154} ${-h*0.792} ${w*0.122} ${-h*0.695} ${w*0.04} ${-h*0.535} C ${w*0.026} ${-h*0.517} ${w*0.01} ${-h*0.509} 0 ${-h*0.505} C ${-w*0.01} ${-h*0.509} ${-w*0.026} ${-h*0.517} ${-w*0.04} ${-h*0.535} C ${-w*0.122} ${-h*0.695} ${-w*0.154} ${-h*0.792} ${-w*0.12} ${-h*0.86} C ${-w*0.14} ${-h*0.96} ${-w*0.2} ${-h*0.96} ${-w*0.24} ${-h*0.86} C ${-w*0.33} ${-h*0.536} ${-w*0.388} ${-h*0.504} ${-w*0.413} ${-h*0.427} C ${-w*0.419} ${-h*0.409} ${-w*0.433} ${-h*0.393} ${-w*0.447} ${-h*0.379} C ${-w*0.509} ${-h*0.316} ${-w*0.51} ${-h*0.214} ${-w*0.496} ${-h*0.108} C ${-w*0.469} ${-h*0.046} ${-w*0.423} ${-h*0.02} ${-w*0.223} ${-h*0.014} C ${w*0.178} ${-h*0.006} ${-w*0.118} ${-h*0.011} ${w*0.059} ${-h*0.01} C ${w*0.309} ${-h*0.013} ${w*0.495} ${-h*0.027} ${w*0.501} ${-h*0.083} Z`;
}
function molarCervical(w, h) {
  const ch = h * 0.40; const ny = -ch; const nw = w * 0.84;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

function wisdomUOutline(w, h) {
  return `M ${w*0.161} ${-h*0.014} C ${w*0.405} ${-h*0.018} ${w*0.487} ${-h*0.053} ${w*0.496} ${-h*0.108} C ${w*0.51} ${-h*0.214} ${w*0.509} ${-h*0.316} ${w*0.485} ${-h*0.384} C ${w*0.449} ${-h*0.426} ${w*0.398} ${-h*0.499} ${w*0.371} ${-h*0.547} C ${w*0.34} ${-h*0.587} ${w*0.297} ${-h*0.656} ${w*0.24} ${-h*0.86} C ${w*0.2} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86} C ${w*0.1} ${-h*0.74} ${w*0.06} ${-h*0.62} 0 ${-h*0.6} C ${-w*0.06} ${-h*0.62} ${-w*0.1} ${-h*0.74} ${-w*0.12} ${-h*0.86} C ${-w*0.14} ${-h*0.96} ${-w*0.2} ${-h*0.96} ${-w*0.24} ${-h*0.86} C ${-w*0.296} ${-h*0.656} ${-w*0.34} ${-h*0.587} ${-w*0.371} ${-h*0.547} C ${-w*0.398} ${-h*0.499} ${-w*0.449} ${-h*0.426} ${-w*0.485} ${-h*0.384} C ${-w*0.509} ${-h*0.316} ${-w*0.51} ${-h*0.214} ${-w*0.496} ${-h*0.108} C ${-w*0.487} ${-h*0.053} ${-w*0.423} ${-h*0.02} ${-w*0.223} ${-h*0.014} C ${w*0.017} ${-h*0.009} ${w*0.263} ${-h*0.017} ${w*0.014} ${-h*0.01} C ${w*0.014} ${-h*0.01} ${-w*0.368} ${-h*0.016} ${w*0.014} ${-h*0.01} Z`;
}
function wisdomLOutline(w, h) {
  return `M ${w*0.161} ${-h*0.014} C ${w*0.405} ${-h*0.018} ${w*0.487} ${-h*0.053} ${w*0.496} ${-h*0.108} C ${w*0.51} ${-h*0.214} ${w*0.509} ${-h*0.316} ${w*0.485} ${-h*0.384} C ${w*0.449} ${-h*0.426} ${w*0.398} ${-h*0.499} ${w*0.371} ${-h*0.547} C ${w*0.34} ${-h*0.587} ${w*0.297} ${-h*0.656} ${w*0.24} ${-h*0.86} C ${w*0.2} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86} C ${w*0.1} ${-h*0.74} ${w*0.06} ${-h*0.62} 0 ${-h*0.6} C ${-w*0.06} ${-h*0.62} ${-w*0.1} ${-h*0.74} ${-w*0.12} ${-h*0.86} C ${-w*0.14} ${-h*0.96} ${-w*0.2} ${-h*0.96} ${-w*0.24} ${-h*0.86} C ${-w*0.296} ${-h*0.656} ${-w*0.34} ${-h*0.587} ${-w*0.371} ${-h*0.547} C ${-w*0.398} ${-h*0.499} ${-w*0.449} ${-h*0.426} ${-w*0.485} ${-h*0.384} C ${-w*0.509} ${-h*0.316} ${-w*0.51} ${-h*0.214} ${-w*0.496} ${-h*0.108} C ${-w*0.487} ${-h*0.053} ${-w*0.423} ${-h*0.02} ${-w*0.223} ${-h*0.014} C ${w*0.017} ${-h*0.009} ${w*0.263} ${-h*0.017} ${w*0.014} ${-h*0.01} C ${w*0.014} ${-h*0.01} ${-w*0.368} ${-h*0.016} ${w*0.014} ${-h*0.01} Z`;
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
