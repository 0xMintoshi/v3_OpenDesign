import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';

const STROKE_WIDTH = 5;
export const CONTACT_STROKE_WIDTH = 7.5;
const CONTACT_X = 0.43;
export const CONTACT_TOP = 0.5;
export const CONTACT_BOTTOM = 0.12;

export function crownDepth(type, h) {
  if (type === 'wisdomU' || type === 'wisdomL') return h * 0.46;
  if (type === 'molarU' || type === 'molarL') return h * 0.40;
  if (type === 'premolar' || type === 'premolar1') return h * 0.36;
  return h * 0.34;
}

export function bridgeContactPoint(tooth, biteY, flipY, side, y) {
  const tilt = ((tooth.tilt || 0) * Math.PI) / 180;
  const x = tooth.w * CONTACT_X * side;
  const rx = x * Math.cos(tilt) - y * Math.sin(tilt);
  const ry = x * Math.sin(tilt) + y * Math.cos(tilt);

  return {
    x: tooth.cx + rx,
    y: biteY + (tooth.yOffset || 0) * flipY + ry * flipY,
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
        const depth = crownDepth(type, h);
        const clipId = `bridge-crown-clip-${tooth.id}`;
        return (
          <g
            key={tooth.id}
            transform={`translate(${cx}, ${biteY + yOffset * flipY}) scale(1, ${flipY}) rotate(${tilt})`}>
            <defs>
              <clipPath id={clipId}>
                <rect x={-w * 0.65} y={-depth} width={w * 1.3} height={depth + h * 0.08} />
              </clipPath>
            </defs>
            <path
              d={paths.outline}
              fill="none"
              stroke={accent}
              strokeWidth={STROKE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
              clipPath={`url(#${clipId})`} />
            <path
              d={paths.cervical}
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
