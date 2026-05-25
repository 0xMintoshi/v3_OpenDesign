import React from 'react';
import partialDentureUpper from '../shapes-data/treatments/partial-denture-upper.json';
import partialDentureLower from '../shapes-data/treatments/partial-denture-lower.json';
import { shapeToPath } from './shapes.jsx';

const SVG_W = 1600;
const SVG_H = 800;

export function PartialDentureOverlay({ jaw, accent }) {
  const shape = jaw === 'upper' ? partialDentureUpper : partialDentureLower;
  const d = shapeToPath(shape, SVG_W, SVG_H);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={d} fill="none" stroke={accent} strokeWidth="2.4" strokeLinejoin="round" opacity="0.7" />
    </g>
  );
}
