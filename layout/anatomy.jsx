// Anatomical paths — maxilla, mandible, nasal cavity, IDN canal. (arch-maxilla v2)
// Maxilla, mandible, and sinus zones are control-point shapes from shapes-data/.
// All others remain as hardcoded strings in the 1600×800 viewBox.

import { shapeToPath } from '../core/shapes.js';
import archMaxilla  from '../shapes-data/anatomy/arch-maxilla.json';
import archMandible from '../shapes-data/anatomy/arch-mandible.json';
import archSinusR   from '../shapes-data/anatomy/arch-sinus-right.json';
import archSinusL   from '../shapes-data/anatomy/arch-sinus-left.json';
import idnRight     from '../shapes-data/anatomy/idn-right.json';
import idnLeft      from '../shapes-data/anatomy/idn-left.json';

const VW = 1600, VH = 800;

// ---------- Maxilla (upper jaw bone) ----------
function maxillaPath() {
  return shapeToPath(archMaxilla, VW, VH);
}

// ---------- Mandible (lower jaw bone) ----------
function mandiblePath() {
  return shapeToPath(archMandible, VW, VH);
}

// ---------- Nasal cavity (between maxillary sinuses) ----------
function nasalCavityPath() {
  // Pear-shaped opening in center of maxilla.
  return `M 800 110
          Q 740 130, 730 200
          Q 725 260, 760 290
          Q 780 310, 800 312
          Q 820 310, 840 290
          Q 875 260, 870 200
          Q 860 130, 800 110
          Z`;
}

// Inner nasal septum (a hint of vertical divider through the cavity)
function nasalSeptumPath() {
  return `M 800 130 L 798 295 L 802 295 Z`;
}

// ---------- Maxillary sinuses (interactive) ----------
function maxillarySinusPath(side) {
  return shapeToPath(side === 'right' ? archSinusR : archSinusL, VW, VH);
}

// ---------- IDN / Inferior alveolar nerve canal ----------
function idnSchematicPath(side) {
  return shapeToPath(side === 'right' ? idnRight : idnLeft, VW, VH);
}

// Mental foramen — placed at the last segment endpoint of each IDN path
function lastPt(idn) {
  const segs = idn.segments;
  const last = segs[segs.length - 1];
  return { x: last.x, y: last.y };
}
function mentalForamenCenters() {
  const r = lastPt(idnRight);
  const l = lastPt(idnLeft);
  return [
    { cx: r.x * VW, cy: r.y * VH, side: 'right' },
    { cx: l.x * VW, cy: l.y * VH, side: 'left'  },
  ];
}

// ---------- Coronoid + condylar processes (subtle bumps at ramus top) ----------
function ramusDetailPath(side) {
  if (side === 'right') {
    return `M 175 480 Q 165 440, 180 410 L 195 415 L 200 460 Z`;
  } else {
    return `M 1425 480 Q 1435 440, 1420 410 L 1405 415 L 1400 460 Z`;
  }
}

Object.assign(window, {
  maxillaPath, mandiblePath,
  nasalCavityPath, nasalSeptumPath,
  maxillarySinusPath, idnSchematicPath,
  mentalForamenCenters, ramusDetailPath,
});

export {
  maxillaPath, mandiblePath,
  nasalCavityPath, nasalSeptumPath,
  maxillarySinusPath, idnSchematicPath,
  mentalForamenCenters, ramusDetailPath,
};
