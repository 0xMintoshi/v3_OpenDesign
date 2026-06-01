import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';

export function CrownOverlay({ tooth, biteY, accent }) {
  const { cx, w, h, jaw, type, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const paths = toothPaths(type, w, h);

  return (
    <g
      transform={`translate(${cx}, ${biteY + yOffset * flipY}) scale(1, ${flipY}) rotate(${tilt})`}
      style={{ pointerEvents: 'none' }}>
      <path
        d={paths.crown}
        fill="none"
        stroke={accent}
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round" />
    </g>
  );
}
