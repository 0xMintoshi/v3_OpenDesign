// Anatomical paths — maxilla, mandible, nasal cavity, IDN canal. (arch-maxilla v2)
// Maxilla, mandible, and sinus zones are control-point shapes from shapes-data/.
// All others remain as hardcoded strings in the 1600×800 viewBox.

import { shapeToPath } from '../core/shapes.js';
import archMaxilla  from '../shapes-data/anatomy/arch-maxilla.json';
import archMandible from '../shapes-data/anatomy/arch-mandible.json';
import archSinusR   from '../shapes-data/anatomy/arch-sinus-right.json';
import archSinusL   from '../shapes-data/anatomy/arch-sinus-left.json';

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
function idnCanalPath(side) {
  if (side === 'right') {
    return `M 220 530 Q 280 600, 420 640 Q 540 660, 620 640`;
  } else {
    return `M 1380 530 Q 1320 600, 1180 640 Q 1060 660, 980 640`;
  }
}

// Compute IDN geometry from curvature (0–1) and length (0–1) params.
// Default 0.5/0.5 reproduces the original hardcoded schematic path.
// K_len: how far the foramen x shifts from center for length=0→1.
// K_curve: how much the control points dip below the straight line.
const K_LEN = 200, K_CURVE = 80;
function getIDNGeometry({ curvature = 0.5, length = 0.5 } = {}) {
  const foramenRX = 700 + (length - 0.5) * K_LEN;  // right foramen x
  const foramenLX = 1600 - foramenRX;               // left  foramen x (mirror)
  const foramenY  = 700;

  // Control-point dip below the start→foramen line (positive y = downward)
  const dip = (curvature - 0.5) * K_CURVE;

  // Right side: start at (180,600), foramen at (foramenRX, foramenY)
  // Two Q segments; each control point sits at 1/4 and 3/4 of the span, shifted by dip.
  const rsX = 180, rsY = 600;
  const rMidX1 = rsX + (foramenRX - rsX) * 0.3;
  const rMidY1 = rsY + (foramenY - rsY) * 0.3 + 70 + dip;
  const rMidX2 = rsX + (foramenRX - rsX) * 0.65;
  const rMidY2 = rsY + (foramenY - rsY) * 0.65 + 12 + dip * 0.5;

  // Left side: mirror of right around x=800
  const lsX = 1600 - rsX, lsY = rsY;
  const lMidX1 = 1600 - rMidX1, lMidY1 = rMidY1;
  const lMidX2 = 1600 - rMidX2, lMidY2 = rMidY2;

  return {
    right: {
      path: `M ${rsX} ${rsY} Q ${rMidX1} ${rMidY1}, ${rMidX2} ${rMidY2} Q ${rMidX2} ${rMidY2}, ${foramenRX} ${foramenY}`,
      foramen: { cx: foramenRX, cy: foramenY },
    },
    left: {
      path: `M ${lsX} ${lsY} Q ${lMidX1} ${lMidY1}, ${lMidX2} ${lMidY2} Q ${lMidX2} ${lMidY2}, ${foramenLX} ${foramenY}`,
      foramen: { cx: foramenLX, cy: foramenY },
    },
  };
}

// Schematic IDN path for the flat layout — cleaner curve below the lower roots.
function idnSchematicPath(side, params = {}) {
  const geom = getIDNGeometry(params);
  return geom[side].path;
}

// Mental foramen (small dark opening where IDN exits) at end of each canal
function mentalForamenCenters(params = {}) {
  const geom = getIDNGeometry(params);
  return [
    { ...geom.right.foramen, side: 'right' },
    { ...geom.left.foramen,  side: 'left'  },
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
  maxillarySinusPath, idnCanalPath, idnSchematicPath,
  mentalForamenCenters, getIDNGeometry, ramusDetailPath,
});

export {
  maxillaPath, mandiblePath,
  nasalCavityPath, nasalSeptumPath,
  maxillarySinusPath, idnCanalPath, idnSchematicPath,
  mentalForamenCenters, getIDNGeometry, ramusDetailPath,
};
