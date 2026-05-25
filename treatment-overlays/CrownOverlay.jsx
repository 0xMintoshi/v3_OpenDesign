import React from 'react';
import crownMolarUpper from '../shapes-data/treatments/crown-molar-upper.json';
import { shapeToPath } from './shapes.jsx';

export function CrownOverlay({ tooth, biteY, accent }) {
  const { cx, w, h, jaw } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const d = shapeToPath(crownMolarUpper, w, h);
  return (
    <g transform={`translate(${cx}, ${biteY}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      <path d={d} fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d={`M ${-w*0.26} 0 Q 0 ${h*0.04} ${w*0.26} 0`}
        stroke={accent} strokeWidth="0.9" fill="none" opacity="0.55"
      />
    </g>
  );
}
