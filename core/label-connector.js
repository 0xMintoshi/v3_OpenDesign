// Pure geometry for the treatment label arc system.
// No React, no DOM, no side-effects — safe to import from any layer.

export const ARC_CX = 800;
export const ARC_CY = 410;
export const ARC_RX = 730;
export const ARC_RY = 380;

// Angle ranges per zone (degrees, standard trig, y-down).
// Posterior arcs end ~10° shy of the horizontal axis (190°/350° instead of
// 180°/360°) so upper/lower zones don't collide at the mid-side meeting point.
export const ZONE_ARCS = {
  'ur-post': { a0: 190, a1: 245 },  // upper screen-left  (patient right posterior)
  'u-ant':   { a0: 245, a1: 295 },  // upper center        (anterior)
  'ul-post': { a0: 295, a1: 350 },  // upper screen-right  (patient left posterior)
  'll-post': { a0: 10,  a1: 65  },  // lower screen-right  (patient left posterior)
  'l-ant':   { a0: 65,  a1: 115 },  // lower center        (anterior)
  'lr-post': { a0: 115, a1: 170 },  // lower screen-left   (patient right posterior)
};

export const ANTERIOR_ZONES  = new Set(['u-ant', 'l-ant']);
export const POSTERIOR_LEFT  = new Set(['ur-post', 'lr-post']);
export const POSTERIOR_RIGHT = new Set(['ul-post', 'll-post']);

// Return the SVG {x, y} arc point for a zone at parameter t ∈ [0, 1].
export function arcPoint(zoneKey, t) {
  const arc = ZONE_ARCS[zoneKey];
  if (!arc) return { x: ARC_CX, y: ARC_CY - ARC_RY - 40 };
  const deg = arc.a0 + t * (arc.a1 - arc.a0);
  const rad = (deg * Math.PI) / 180;
  return { x: ARC_CX + ARC_RX * Math.cos(rad), y: ARC_CY + ARC_RY * Math.sin(rad) };
}

// Map FDI number to the arc zone key it belongs to.
export function fdiToZone(fdi) {
  const q = Math.floor(fdi / 10);
  const n = fdi % 10;
  if (q === 1) return n >= 4 ? 'ur-post' : 'u-ant';
  if (q === 2) return n >= 4 ? 'ul-post' : 'u-ant';
  if (q === 4) return n >= 4 ? 'lr-post' : 'l-ant';
  if (q === 3) return n >= 4 ? 'll-post' : 'l-ant';
  return 'u-ant';
}

// Return { path, ex, ey } — an SVG path string for the smooth quadratic connector.
// bx/by: label box centre, hw/hh: half-width/height, ax/ay: tooth anchor.
// Exits perpendicular from the nearest box edge then curves gently to the anchor.
export function connectorPath(bx, by, hw, hh, ax, ay) {
  const dx = ax - bx, dy = ay - by;
  // Which face is the anchor "more towards"? (normalized distance comparison)
  const useVerticalSide = Math.abs(dx) * hh >= Math.abs(dy) * hw;
  let ex, ey;
  if (useVerticalSide) {
    ex = bx + (dx > 0 ? hw : -hw);
    ey = by;
  } else {
    ex = bx;
    ey = by + (dy > 0 ? hh : -hh);
  }
  // Control point: perpendicular-exit → anchor-direction bow (rounded L).
  // Vertical-side exit: leave horizontally, arrive vertically.
  // Horizontal-side exit: leave vertically, arrive horizontally.
  const cpx = useVerticalSide ? ax : ex;
  const cpy = useVerticalSide ? ey : ay;
  const path = `M ${ex} ${ey} Q ${cpx} ${cpy} ${ax} ${ay}`;
  return { path, ex, ey };
}
