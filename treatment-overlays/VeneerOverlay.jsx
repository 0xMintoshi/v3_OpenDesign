import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { toothYAdjust } from '../core/marquee-select.js';

// Concept A — Inset facial shell.
// Three strokes on the same crown path: wide accent stroke under a narrower
// tooth-fill stroke, clipped to the crown silhouette, leaves a precise ring
// at (A_INSET_DEPTH + A_RING_W) without any path-offset math.

const A_INSET_DEPTH = 3;  // inward reach from silhouette to ring's inner edge
const A_RING_W     = 1.5;   // accent ring thickness
const A_WASH_OPACITY = 0.12;

export function VeneerOverlay({ tooth, biteY, accent }) {
  const { cx, w, h, jaw, type, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const paths = toothPaths(type, w, h);
  const clipId = `veneer-clip-${tooth.id}`;

  return (
    <g
      transform={`translate(${cx}, ${biteY + yOffset * flipY + toothYAdjust(tooth)}) scale(1, ${flipY}) rotate(${tilt})`}
      style={{ pointerEvents: 'none' }}>
      <defs>
        <clipPath id={clipId}><path d={paths.crown} /></clipPath>
      </defs>
      <path d={paths.crown} fill={accent} fillOpacity={A_WASH_OPACITY} />
      <g clipPath={`url(#${clipId})`}>
        <path d={paths.crown} fill="none" stroke={accent}
              strokeWidth={2 * (A_INSET_DEPTH + A_RING_W)} strokeLinejoin="round" />
        <path d={paths.crown} fill="none" stroke="var(--tooth-fill)"
              strokeWidth={2 * A_INSET_DEPTH} strokeLinejoin="round" />
      </g>
    </g>
  );
}
