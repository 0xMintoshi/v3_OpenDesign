// Anatomical paths — maxilla, mandible, nasal cavity, IDN canal.
// All coordinates in the 1600×800 viewBox space.

// ---------- Maxilla (upper jaw bone) ----------
function maxillaPath() {
  // Wide trapezoidal form above the upper teeth.
  // Top edge undulates to suggest the infraorbital margin.
  return `M 150 360
          L 130 240
          Q 140 130, 240 90
          Q 380 60, 540 70
          Q 700 80, 800 80
          Q 900 80, 1060 70
          Q 1220 60, 1360 90
          Q 1460 130, 1470 240
          L 1450 360
          L 1380 360
          Q 1100 350, 800 350
          Q 500 350, 220 360
          Z`;
}

// ---------- Mandible (lower jaw bone) ----------
function mandiblePath() {
  // U-shaped form with prominent angles and chin.
  return `M 150 410
          L 170 510
          Q 175 620, 235 695
          Q 310 745, 410 750
          Q 600 765, 800 770
          Q 1000 765, 1190 750
          Q 1290 745, 1365 695
          Q 1425 620, 1430 510
          L 1450 410
          L 1380 410
          Q 1100 420, 800 420
          Q 500 420, 220 410
          Z`;
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
  // Almond/teardrop shape above the upper molars/premolars
  if (side === 'right') {
    // Patient's right = LEFT of screen
    return `M 280 280
            Q 220 200, 280 140
            Q 360 110, 480 120
            Q 580 130, 620 200
            Q 640 280, 540 300
            Q 380 305, 280 280
            Z`;
  } else {
    return `M 1320 280
            Q 1380 200, 1320 140
            Q 1240 110, 1120 120
            Q 1020 130, 980 200
            Q 960 280, 1060 300
            Q 1220 305, 1320 280
            Z`;
  }
}

// ---------- IDN / Inferior alveolar nerve canal ----------
// Runs through mandible from the posterior toward the mental foramen.
function idnCanalPath(side) {
  if (side === 'right') {
    // Right canal: starts at posterior mandible (near ramus), curves anteriorly
    return `M 220 530 Q 280 600, 420 640 Q 540 660, 620 640`;
  } else {
    return `M 1380 530 Q 1320 600, 1180 640 Q 1060 660, 980 640`;
  }
}

// Schematic IDN path for the flat layout — cleaner curve below the lower roots.
function idnSchematicPath(side) {
  if (side === 'right') {
    return `M 180 600 Q 280 670, 460 700 Q 600 712, 700 700`;
  } else {
    return `M 1420 600 Q 1320 670, 1140 700 Q 1000 712, 900 700`;
  }
}

// Mental foramen (small dark opening where IDN exits) at end of each canal
function mentalForamenCenters() {
  return [
    { cx: 700, cy: 700, side: 'right' },
    { cx: 900, cy: 700, side: 'left' },
  ];
}

// ---------- Coronoid + condylar processes (subtle bumps at ramus top) ----------
// These give the mandible silhouette more anatomical character without
// being visually busy.
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
  mentalForamenCenters, ramusDetailPath,
});

export {
  maxillaPath, mandiblePath,
  nasalCavityPath, nasalSeptumPath,
  maxillarySinusPath, idnCanalPath, idnSchematicPath,
  mentalForamenCenters, ramusDetailPath,
};
