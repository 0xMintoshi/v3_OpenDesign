import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { crownDepth as _crownDepth } from '../core/arch-math.js';
import { proximalExtreme, crownXAtY } from '../core/tooth-split.js';
import { fittedImplantCrownRatio, fittedImplantCrownPath } from '../core/implant-crown-path.js';

// Re-export so app/treatments.jsx keeps its existing import path unchanged.
export { _crownDepth as crownDepth };

const STROKE_WIDTH = 4;
export const CONTACT_STROKE_WIDTH = 8;
const CONTACT_X = 0.43;
export const CONTACT_TOP = 0.5;
export const CONTACT_BOTTOM = 0.12;

// Hourglass connector tuning — adjust these for weight/shape
const OCCLUSO_GINGIVAL_SPAN = 0.2; // fraction of avg crown depth = half-height of connector
const OCC_WAIST = 0.1;             // how deep the occlusal V dips (higher = sharper)
const GIN_WAIST = 0.3;             // how deep the gingival arc dips (lower = rounder/open)
const IBS_CONTACT_HEIGHT = 0.65;        // contact centre: 0 = gingival base, 1 = occlusal tip

const crownDepth = _crownDepth;

// Must match the per-tooth vertical shift applied in dental-arch.jsx Tooth component.
function getYAdjust(tooth) {
  const { type, h, jaw } = tooth;
  const incisorShift = type === 'incisor' ? h * 0.03 : 0;
  const canineShift  = type === 'canine'  ? h * -0.02 : 0;
  return jaw === 'upper' ? -(incisorShift + canineShift) : (incisorShift + canineShift);
}

// Generalises bridgeContactPoint to arbitrary tooth-local (lx, ly).
// Applies rotate(tilt) → scale(1, flipY) → translate(cx, biteY + yOffset*flipY + yAdjust).
function toGlobal(tooth, biteY, flipY, lx, ly) {
  const tilt = ((tooth.tilt || 0) * Math.PI) / 180;
  const rx = lx * Math.cos(tilt) - ly * Math.sin(tilt);
  const ry = lx * Math.sin(tilt) + ly * Math.cos(tilt);
  return {
    x: tooth.cx + rx,
    y: biteY + (tooth.yOffset || 0) * flipY + getYAdjust(tooth) + ry * flipY,
  };
}

export function bridgeContactPoint(tooth, biteY, flipY, side, y) {
  return toGlobal(tooth, biteY, flipY, tooth.w * CONTACT_X * side, y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Legacy stroke path — kept for reference; no longer used in BridgeSpanOverlay render.
export function bridgeContactStrokePath(tooth, next, biteY, flipY) {
  const avgDepth = (crownDepth(tooth.type, tooth.h) + crownDepth(next.type, next.h)) / 2;
  const topY = -avgDepth * CONTACT_TOP;
  const bottomY = -avgDepth * CONTACT_BOTTOM;
  const middleY = (topY + bottomY) / 2;
  const top = midpoint(
    bridgeContactPoint(tooth, biteY, flipY, 1, topY),
    bridgeContactPoint(next, biteY, flipY, -1, topY),
  );
  const middle = midpoint(
    bridgeContactPoint(tooth, biteY, flipY, 1, middleY),
    bridgeContactPoint(next, biteY, flipY, -1, middleY),
  );
  const bottom = midpoint(
    bridgeContactPoint(tooth, biteY, flipY, 1, bottomY),
    bridgeContactPoint(next, biteY, flipY, -1, bottomY),
  );

  return [
    `M ${top.x} ${top.y}`,
    `Q ${middle.x} ${middle.y} ${bottom.x} ${bottom.y}`,
  ].join(' ');
}

// Filled hourglass connector between two adjacent bridge crowns.
// Anchors to the real proximal extreme of each crown silhouette (no fixed-x overshoot).
export function bridgeConnectorPath(tooth, next, biteY, flipY) {
  const { w: wA, h: hA, type: typeA } = tooth;
  const { w: wB, h: hB, type: typeB } = next;

  const crownA = toothPaths(typeA, wA, hA).crown;
  const crownB = toothPaths(typeB, wB, hB).crown;

  // y anchored at IBS_CONTACT_HEIGHT; x sampled from actual crown outline at each y level
  // so the connector hugs the crown silhouette exactly (no gap from tapered occlusal shoulder).
  // Regular crown local space: occlusal = y≈0, gingival = y=-crownDepth
  const contactYA = -crownDepth(typeA, hA) * (1 - IBS_CONTACT_HEIGHT);
  const contactYB = -crownDepth(typeB, hB) * (1 - IBS_CONTACT_HEIGHT);

  const avgDepth = (crownDepth(typeA, hA) + crownDepth(typeB, hB)) / 2;
  const delta = avgDepth * OCCLUSO_GINGIVAL_SPAN;

  const fallbackA = proximalExtreme(crownA, +1).x;
  const fallbackB = proximalExtreme(crownB, -1).x;
  const occXA = crownXAtY(crownA, contactYA - delta, +1) ?? fallbackA;
  const ginXA = crownXAtY(crownA, contactYA + delta, +1) ?? fallbackA;
  const occXB = crownXAtY(crownB, contactYB - delta, -1) ?? fallbackB;
  const ginXB = crownXAtY(crownB, contactYB + delta, -1) ?? fallbackB;

  const Ao = toGlobal(tooth, biteY, flipY, occXA, contactYA - delta);
  const Ag = toGlobal(tooth, biteY, flipY, ginXA, contactYA + delta);
  const Bo = toGlobal(next,  biteY, flipY, occXB, contactYB - delta);
  const Bg = toGlobal(next,  biteY, flipY, ginXB, contactYB + delta);

  // Level horizontal edges across both teeth (arch yOffset / tilt can make Ao.y ≠ Bo.y)
  const occY = (Ao.y + Bo.y) / 2;
  const ginY = (Ag.y + Bg.y) / 2;

  const midOcc     = { x: (Ao.x + Bo.x) / 2, y: occY };
  const midGin     = { x: (Ag.x + Bg.x) / 2, y: ginY };
  const midContact = { x: (midOcc.x + midGin.x) / 2, y: (occY + ginY) / 2 };

  const occApex = {
    x: midOcc.x + (midContact.x - midOcc.x) * OCC_WAIST,
    y: midOcc.y + (midContact.y - midOcc.y) * OCC_WAIST,
  };
  const ginApex = {
    x: midGin.x + (midContact.x - midGin.x) * GIN_WAIST,
    y: midGin.y + (midContact.y - midGin.y) * GIN_WAIST,
  };

  const f = (n) => parseFloat(n.toFixed(3));
  return [
    `M ${f(Ao.x)} ${f(occY)}`,
    `Q ${f(occApex.x)} ${f(occApex.y)} ${f(Bo.x)} ${f(occY)}`,
    `L ${f(Bg.x)} ${f(ginY)}`,
    `Q ${f(ginApex.x)} ${f(ginApex.y)} ${f(Ag.x)} ${f(ginY)}`,
    'Z',
  ].join(' ');
}

export function BridgeSpanOverlay({ teeth, biteY, accent, useImplantForm = false }) {
  if (!teeth || teeth.length === 0) return null;
  const jaw = teeth[0].jaw;
  const flipY = jaw === 'upper' ? 1 : -1;
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {sorted.map((tooth) => {
        const { cx, w, h, type, tilt = 0, yOffset = 0 } = tooth;
        const yAdjust = getYAdjust(tooth);
        const crownPath = useImplantForm
          ? fittedImplantCrownPath(tooth, h * fittedImplantCrownRatio(type))
          : toothPaths(type, w, h).crown;
        return (
          <g
            key={tooth.id}
            transform={`translate(${cx}, ${biteY + yOffset * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tilt})`}>
            <path
              d={crownPath}
              fill="var(--tooth-fill)"
              stroke={accent}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round" />
          </g>
        );
      })}
      {sorted.slice(0, -1).map((tooth, i) => {
        const next = sorted[i + 1];
        return (
          <path
            key={`${tooth.id}-${next.id}-bridge-contact`}
            d={bridgeConnectorPath(tooth, next, biteY, flipY)}
            fill={accent}
            stroke="none" />
        );
      })}
    </g>
  );
}
