import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';

function crownDepth(type, h) {
  if (type === 'wisdomU' || type === 'wisdomL') return h * 0.46;
  if (type === 'molarU' || type === 'molarL') return h * 0.40;
  if (type === 'premolar' || type === 'premolar1') return h * 0.36;
  return h * 0.34;
}

export function CrownOverlay({ tooth, biteY, accent }) {
  const { cx, w, h, jaw, type, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const paths = toothPaths(type, w, h);
  const depth = crownDepth(type, h);
  const clipId = `crown-clip-${tooth.id}`;

  return (
    <g
      transform={`translate(${cx}, ${biteY + yOffset * flipY}) scale(1, ${flipY}) rotate(${tilt})`}
      style={{ pointerEvents: 'none' }}>
      <defs>
        <clipPath id={clipId}>
          <rect x={-w * 0.65} y={-depth} width={w * 1.3} height={depth + h * 0.08} />
        </clipPath>
      </defs>
      <path
        d={paths.outline}
        fill="none"
        stroke={accent}
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
        clipPath={`url(#${clipId})`} />
      <path
        d={paths.cervical}
        fill="none"
        stroke={accent}
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round" />
    </g>
  );
}
