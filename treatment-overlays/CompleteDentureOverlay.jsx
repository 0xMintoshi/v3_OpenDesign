import React from 'react';
import { CERVICAL } from '../core/arch-math.js';
import { toothYAdjust } from '../core/marquee-select.js';
import { smoothClosedRing } from './ClearAlignerOverlay.jsx';

// ── Tuning (adjust values only) — S2-approved mockup values ─────────────────
const RIM_OFFSET         = 150;  // vestibular rim distance from biteY (upper rim y = biteY - RIM_OFFSET)
const CROWN_H_MULT       = 1.05;
const NECK_FRAC          = 0.28; // cervical neck half-width, fraction of tooth width
const FLANGE_TUCK        = 0.10; // inner edge: fraction of crownH from the bite
const FLANGE_END_OUT     = 21;   // distal cap x-extension past first-molar wall
const FRENUM_NOTCH_DEPTH = 32;   // midline dip in the vestibular rim (0 = off)
const FRENUM_NOTCH_WIDTH = 40;   // x half-width of the notch
const SPEE_DEPTH         = 9;    // curve of Spee: posteriors recede from bite (quadratic, upward)
const BUCCAL_DIP         = 21;   // rim dip over the premolar region (buccal frenum)
const CANINE_RISE        = 12;   // rim peak over the canine eminence
const CONTACT_OVERLAP    = 3;    // extra half-width per tooth so neighbors touch
const CROWN_STROKE       = 2.4;
const FLANGE_OPACITY     = 0.80;
const GROUP_YOFF = {
  upper: { incisor: 11, canine: 0, premolar: 3, molar: 2 },
  lower: { incisor: 0, canine: 6, premolar: 5, molar: 6 },
};
// ─────────────────────────────────────────────────────────────────────────────

function groupKey(type) {
  if (type === 'incisor') return 'incisor';
  if (type === 'canine') return 'canine';
  if (type === 'premolar' || type === 'premolar1') return 'premolar';
  return 'molar';
}

function groupYOff(t) {
  return (GROUP_YOFF[t.jaw]?.[groupKey(t.type)]) || 0;
}

// Curve of Spee: quadratic recession from the bite, growing distally.
// Always positive; applied as -speeShiftFor in the y transform for both jaws
// (negative SVG y = upward, same direction for both arches).
function speeShiftFor(t, maxD) {
  const nd = Math.abs(t.cx - 800) / (maxD || 1);
  return SPEE_DEPTH * nd * nd;
}

// Denture tooth in local space — incisal edge at y≈0, cervical neck at y=-crownH.
// Form derived from the implant-crown bezier; widened by CONTACT_OVERLAP*2 so
// adjacent teeth touch despite the natural gapFrac spacing.
function dentureToothPath(type, w, h) {
  const crownH = (CERVICAL[type]?.y ?? 0.34) * h * CROWN_H_MULT;
  const ww = w + 2 * CONTACT_OVERLAP;
  const half = ww * 0.50;
  const shoulder = ww * 0.43;
  const top = ww * NECK_FRAC;
  const bottomX = half * 0.82;
  const bottomY = 1.5;
  const bottomBulge = crownH * 0.055;
  const y1 = -crownH;
  return (
    `M 0 ${bottomBulge}` +
    ` C ${-ww * 0.26} ${bottomBulge + 1.2} ${-bottomX * 0.94} ${bottomY + 1.0} ${-bottomX} ${bottomY}` +
    ` C ${-half * 0.99} ${-crownH * 0.07} ${-half * 0.99} ${-crownH * 0.17} ${-half * 0.96} ${-crownH * 0.30}` +
    ` C ${-half * 0.92} ${-crownH * 0.47} ${-shoulder * 1.03} ${-crownH * 0.70} ${-top} ${y1 + crownH * 0.05}` +
    ` C ${-top * 0.7} ${y1 - crownH * 0.10} ${top * 0.7} ${y1 - crownH * 0.10} ${top} ${y1 + crownH * 0.05}` +
    ` C ${shoulder * 1.03} ${-crownH * 0.70} ${half * 0.92} ${-crownH * 0.47} ${half * 0.96} ${-crownH * 0.30}` +
    ` C ${half * 0.99} ${-crownH * 0.17} ${half * 0.99} ${-crownH * 0.07} ${bottomX} ${bottomY}` +
    ` C ${bottomX * 0.94} ${bottomY + 1.0} ${ww * 0.26} ${bottomBulge + 1.2} 0 ${bottomBulge} Z`
  );
}

// Flange ring: deep vestibular border + gingival inner edge that follows the
// Spee-shifted tooth row, rounded distal caps, buccal-frenum dips, canine
// eminence peaks, and an optional midline labial frenum notch.
function buildFlangeD(dentureTeeth, biteY, jaw) {
  const flipY = jaw === 'upper' ? 1 : -1;
  const rimY  = biteY - flipY * RIM_OFFSET;
  const sorted = [...dentureTeeth].sort((a, b) => a.cx - b.cx);
  const n = sorted.length;
  const centerX = 800;

  const maxD = Math.max(...sorted.map(t => Math.abs(t.cx - centerX)));

  // Inner (gingival) border: one point per tooth at the FLANGE_TUCK depth,
  // following the Spee shift so the ridge contour tracks the tooth curvature.
  const innerPts = sorted.map(t => {
    const crownH = (CERVICAL[t.type]?.y ?? 0.34) * t.h * CROWN_H_MULT;
    const ya = toothYAdjust(t);
    const innerY = biteY + (t.yOffset || 0) * flipY + ya - speeShiftFor(t, maxD) + groupYOff(t)
                 + (-crownH * FLANGE_TUCK) * flipY;
    return { x: t.cx, y: innerY };
  });

  const hwL = sorted[0].w / 2 + FLANGE_END_OUT;
  const hwR = sorted[n - 1].w / 2 + FLANGE_END_OUT;

  const ring = [];

  // Left distal wing: rim corner → outer wall → sweep in under the last molar
  ring.push({ x: innerPts[0].x - hwL, y: rimY });
  ring.push({ x: innerPts[0].x - hwL, y: innerPts[0].y - flipY * 30 });
  ring.push({ x: innerPts[0].x - hwL * 0.55, y: innerPts[0].y });
  for (let i = 0; i < n; i++) ring.push(innerPts[i]);
  // Right distal wing
  ring.push({ x: innerPts[n - 1].x + hwR * 0.55, y: innerPts[n - 1].y });
  ring.push({ x: innerPts[n - 1].x + hwR, y: innerPts[n - 1].y - flipY * 30 });
  ring.push({ x: innerPts[n - 1].x + hwR, y: rimY });

  // Vestibular rim right→left: buccal-frenum dip, canine-eminence peak,
  // optional labial-frenum notch at midline.
  function rimWave(sign) {
    const q = sorted.filter(t => sign * (t.cx - centerX) > 0);
    const canine = q.find(t => t.fdi % 10 === 3);
    const prems  = q.filter(t => { const u = t.fdi % 10; return u === 4 || u === 5; });
    const premX  = prems.length
      ? prems.reduce((s, t) => s + t.cx, 0) / prems.length
      : centerX + sign * maxD * 0.6;
    return { premX, canX: canine ? canine.cx : centerX + sign * maxD * 0.35 };
  }
  const R = rimWave(1), L = rimWave(-1);
  ring.push({ x: R.premX, y: rimY + flipY * BUCCAL_DIP });
  ring.push({ x: R.canX,  y: rimY - flipY * CANINE_RISE });
  if (FRENUM_NOTCH_DEPTH > 0) {
    ring.push({ x: centerX + FRENUM_NOTCH_WIDTH, y: rimY });
    ring.push({ x: centerX, y: rimY + flipY * FRENUM_NOTCH_DEPTH });
    ring.push({ x: centerX - FRENUM_NOTCH_WIDTH, y: rimY });
  }
  ring.push({ x: L.canX,  y: rimY - flipY * CANINE_RISE });
  ring.push({ x: L.premX, y: rimY + flipY * BUCCAL_DIP });

  return smoothClosedRing(ring);
}

export function CompleteDentureOverlay({ jaw, accent, biteY, teeth }) {
  if (!teeth?.length) return null;

  const dentureTeeth = teeth
    .filter(t => t.fdi % 10 >= 1 && t.fdi % 10 <= 6)
    .sort((a, b) => a.cx - b.cx);

  if (!dentureTeeth.length) return null;

  const flipY = jaw === 'upper' ? 1 : -1;
  const maxD = Math.max(...dentureTeeth.map(t => Math.abs(t.cx - 800)));
  const flangeD = buildFlangeD(dentureTeeth, biteY, jaw);

  // Distal-first so anteriors always paint on top of posteriors.
  const paintOrder = [...dentureTeeth].sort(
    (a, b) => Math.abs(b.cx - 800) - Math.abs(a.cx - 800)
  );

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={flangeD} fill={accent} fillOpacity={FLANGE_OPACITY} stroke="none" />
      {paintOrder.map(t => {
        const ty = biteY + (t.yOffset || 0) * flipY + toothYAdjust(t) + groupYOff(t)
                 - speeShiftFor(t, maxD);
        return (
          <g key={t.fdi} transform={`translate(${t.cx}, ${ty}) scale(1, ${flipY}) rotate(${t.tilt || 0})`}>
            <path
              d={dentureToothPath(t.type, t.w, t.h)}
              fill="var(--tooth-fill)"
              stroke={accent}
              strokeWidth={CROWN_STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
}
