import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { crownDepth as _crownDepth } from '../core/arch-math.js';

// Re-export so app/treatments.jsx keeps its existing import path unchanged.
export { _crownDepth as crownDepth };

const STROKE_WIDTH = 5;
export const CONTACT_STROKE_WIDTH = 7.5;
const CONTACT_X = 0.43;
export const CONTACT_TOP = 0.5;
export const CONTACT_BOTTOM = 0.12;

// Must match the per-tooth vertical shift applied in dental-arch.jsx Tooth component.
function getYAdjust(tooth) {
  const { type, h, jaw } = tooth;
  const incisorShift = type === 'incisor' ? h * 0.03 : 0;
  const canineShift  = type === 'canine'  ? h * -0.02 : 0;
  return jaw === 'upper' ? -(incisorShift + canineShift) : (incisorShift + canineShift);
}

const crownDepth = _crownDepth;

export function bridgeContactPoint(tooth, biteY, flipY, side, y) {
  const tilt = ((tooth.tilt || 0) * Math.PI) / 180;
  const x = tooth.w * CONTACT_X * side;
  const rx = x * Math.cos(tilt) - y * Math.sin(tilt);
  const ry = x * Math.sin(tilt) + y * Math.cos(tilt);

  return {
    x: tooth.cx + rx,
    y: biteY + (tooth.yOffset || 0) * flipY + getYAdjust(tooth) + ry * flipY,
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

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
            d={bridgeContactStrokePath(tooth, next, biteY, flipY)}
            fill="none"
            stroke={accent}
            strokeWidth={CONTACT_STROKE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round" />
        );
      })}
    </g>
  );
}
