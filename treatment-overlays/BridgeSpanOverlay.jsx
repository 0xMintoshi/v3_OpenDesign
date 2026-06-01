import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { crownDepth as _crownDepth } from '../core/arch-math.js';
import { proximalExtreme } from '../core/tooth-split.js';

// Re-export so app/treatments.jsx keeps its existing import path unchanged.
export { _crownDepth as crownDepth };

const STROKE_WIDTH = 3;
export const CONTACT_STROKE_WIDTH = 7.5;
const CONTACT_X = 0.43;
export const CONTACT_TOP = 0.5;
export const CONTACT_BOTTOM = 0.12;

// Hourglass connector tuning — adjust these for weight/shape
const OCCLUSO_GINGIVAL_SPAN = 0.30; // fraction of avg crown depth = half-height of connector
const OCC_WAIST = 0;             // how deep the occlusal V dips (higher = sharper)
const GIN_WAIST = 0.3;             // how deep the gingival arc dips (lower = rounder/open)

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

  // Proximal extreme in each tooth's local space
  const cpA = proximalExtreme(crownA, +1); // right edge of left tooth
  const cpB = proximalExtreme(crownB, -1); // left edge of right tooth

  const avgDepth = (crownDepth(typeA, hA) + crownDepth(typeB, hB)) / 2;
  const delta = avgDepth * OCCLUSO_GINGIVAL_SPAN; // half-height in local y units

  // Four corners (local), then mapped to global via each tooth's own transform
  const Ao = toGlobal(tooth, biteY, flipY, cpA.x, cpA.y - delta); // occlusal edge, left tooth
  const Ag = toGlobal(tooth, biteY, flipY, cpA.x, cpA.y + delta); // gingival edge, left tooth
  const Bo = toGlobal(next,  biteY, flipY, cpB.x, cpB.y - delta); // occlusal edge, right tooth
  const Bg = toGlobal(next,  biteY, flipY, cpB.x, cpB.y + delta); // gingival edge, right tooth

  // Embrasure apexes — pulled toward the contact midline to create the waist
  const midOcc = midpoint(Ao, Bo);
  const midGin = midpoint(Ag, Bg);
  const midContact = midpoint(midpoint(Ao, Bo), midpoint(Ag, Bg));

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
    `M ${f(Ao.x)} ${f(Ao.y)}`,
    `Q ${f(occApex.x)} ${f(occApex.y)} ${f(Bo.x)} ${f(Bo.y)}`,
    `L ${f(Bg.x)} ${f(Bg.y)}`,
    `Q ${f(ginApex.x)} ${f(ginApex.y)} ${f(Ag.x)} ${f(Ag.y)}`,
    'Z',
  ].join(' ');
}

export function BridgeSpanOverlay({ teeth, biteY, accent }) {
  if (!teeth || teeth.length === 0) return null;
  const jaw = teeth[0].jaw;
  const flipY = jaw === 'upper' ? 1 : -1;
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {sorted.map((tooth) => {
        const { cx, w, h, type, tilt = 0, yOffset = 0 } = tooth;
        const paths = toothPaths(type, w, h);
        const yAdjust = getYAdjust(tooth);
        return (
          <g
            key={tooth.id}
            transform={`translate(${cx}, ${biteY + yOffset * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tilt})`}>
            <path
              d={paths.crown}
              fill="none"
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
