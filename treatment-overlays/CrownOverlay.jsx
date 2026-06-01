import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';

export function CrownOverlay({ tooth, biteY, accent }) {
  const { cx, w, h, jaw, type, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const paths = toothPaths(type, w, h);

  const incisorShift = type === 'incisor' ? h * 0.03 : 0;
  const canineShift  = type === 'canine'  ? h * -0.02 : 0;
  const yAdjust = jaw === 'upper' ? -(incisorShift + canineShift) : (incisorShift + canineShift);

  return (
    <g
      transform={`translate(${cx}, ${biteY + yOffset * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tilt})`}
      style={{ pointerEvents: 'none' }}>
      <path
        d={paths.crown}
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round" />
    </g>
  );
}
