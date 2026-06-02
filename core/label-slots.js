// Pure geometry for treatment label placement.
// No React, no DOM, no side-effects — safe to import from any layer.
//
// Strategy: one fixed slot per tooth FDI, derived from regularized constants.
// Upper = brick stagger (odd row closer to teeth, even row further back).
// Lower = stacked pairs (front/back share the same cx column).
// Q2/Q3 are exact mirrors of Q1/Q4 about the midline x=800.
// Manual drag overrides (effectivePositionForKey) layer on top in TreatmentLabels.jsx.

// ── Layout constants (all tunable) ────────────────────────────────────────────
const CENTER     = 800;
const HALF_STEP  = 79.5;   // horizontal tooth-to-tooth spacing

const U_FRONT_Y  = 97;     // upper odd columns (11,13,15,17) — closer to teeth
const U_BACK_Y   = 10;   // upper even columns (12,14,16) — middle row
const U_WISDOM_Y = 185;    // 18/28 — pulled down under sinus corner
const L_FRONT_Y  = 708;    // lower odd columns (41,43,45,47)
const L_ROW_GAP  = 90;   // lower front→back vertical gap

// ── Exported band-Y helpers (used by debug guides + tests) ────────────────────
// UPPER_CLEAR / LOWER_CLEAR are defined so upperBandY(385) ≈ U_FRONT_Y
// and lowerBandY(435) ≈ L_FRONT_Y.
export const UPPER_CLEAR = 385 - U_FRONT_Y;   // = 288
export const LOWER_CLEAR = L_FRONT_Y - 435;   // = 278
export function upperBandY(upperBiteY) { return upperBiteY - UPPER_CLEAR; }
export function lowerBandY(lowerBiteY) { return lowerBiteY + LOWER_CLEAR; }

// ── Fan positions for special / arch-scope labels ──────────────────────────────
export const FAN_POSITIONS = {
  'sinus-right': { cx: 479.5,  cy: -58},
  'sinus-left':  { cx: 1120.5, cy: -62 },
  'arch-upper':  { cx: 1455,   cy: 309 },
  'arch-lower':  { cx: 1455,   cy: 495 },
  'full-mouth':  { cx: 1455,   cy: 394 },
};

// ── Static tooth slots ─────────────────────────────────────────────────────────
function buildToothSlots() {
  const slots = {};

  // Q1 upper right (11–18), Q4 lower right (41–48)
  for (let n = 1; n <= 8; n++) {
    const cx = CENTER - HALF_STEP * n;

    // Upper: n=8 is wisdom, odd→front, even→back
    const ucy = n === 8 ? U_WISDOM_Y : (n % 2 === 1 ? U_FRONT_Y : U_BACK_Y);
    slots[10 + n] = { cx, cy: ucy };

    // Lower: pairs — odd tooth (n=1,3,5,7) and even tooth (n=2,4,6,8) share same cx column
    // column k = Math.ceil(n/2), cx = CENTER - HALF_STEP*(2k-1)
    const k = Math.ceil(n / 2);
    const lcx = CENTER - HALF_STEP * (2 * k - 1);
    const lcy = n % 2 === 1 ? L_FRONT_Y : L_FRONT_Y + L_ROW_GAP;
    slots[40 + n] = { cx: lcx, cy: lcy };
  }

  // Mirror Q2 (21–28) from Q1, Q3 (31–38) from Q4
  for (let n = 1; n <= 8; n++) {
    const q1 = slots[10 + n];
    const q4 = slots[40 + n];
    slots[20 + n] = { cx: 1600 - q1.cx, cy: q1.cy };
    slots[30 + n] = { cx: 1600 - q4.cx, cy: q4.cy };
  }

  return slots;
}

export const TOOTH_SLOTS = buildToothSlots();

// ── Label slot assignment ──────────────────────────────────────────────────────
// labels — array of { key, anchor:{x,y}, jaw, kind, fdi?, leftFdi?, rightFdi?, items }
// upperBiteY, lowerBiteY — kept for caller compatibility; no longer used for teeth
// fanPositions — FAN_POSITIONS or compatible shape
// Returns Map<key, {cx, cy}>
export function assignLabelSlots(labels, upperBiteY, lowerBiteY, fanPositions) {
  const SPECIAL_KINDS = new Set(['sinus', 'arch', 'full-mouth']);
  const result = new Map();

  labels.forEach(l => {
    if (SPECIAL_KINDS.has(l.kind)) {
      const fp = fanPositions[l.key];
      result.set(l.key, fp ? { cx: fp.cx, cy: fp.cy } : { cx: l.anchor.x, cy: l.anchor.y });
      return;
    }

    if (l.kind === 'tooth') {
      const slot = TOOTH_SLOTS[l.fdi];
      result.set(l.key, slot ?? { cx: l.anchor.x, cy: l.anchor.y });
      return;
    }

    if (l.kind === 'span') {
      const left  = TOOTH_SLOTS[l.leftFdi];
      const right = TOOTH_SLOTS[l.rightFdi];
      if (left && right) {
        result.set(l.key, { cx: (left.cx + right.cx) / 2, cy: (left.cy + right.cy) / 2 });
      } else {
        result.set(l.key, { cx: l.anchor.x, cy: l.anchor.y });
      }
      return;
    }

    // Fallback for unknown kinds
    result.set(l.key, { cx: l.anchor.x, cy: l.anchor.y });
  });

  return result;
}
