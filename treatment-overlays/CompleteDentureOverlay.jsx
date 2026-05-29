import React from 'react';
import completeDentureUpper from '../shapes-data/treatments/complete-denture-upper.json';
import completeDentureLower from '../shapes-data/treatments/complete-denture-lower.json';
import { shapeToPath } from './shapes.jsx';

const SVG_W = 1600;
const SVG_H = 800;

export function CompleteDentureOverlay({ jaw, accent }) {
  const shape = jaw === 'upper' ? completeDentureUpper : completeDentureLower;
  const d = shapeToPath(shape, SVG_W, SVG_H);

  if (shape.renderMode === 'filled-line-art') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <path d={d} fill={accent} fillOpacity="0.82" stroke="none" fillRule={shape.fillRule ?? 'evenodd'} />
      </g>
    );
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={d} fill={accent} fillOpacity="0.10" />
      <path d={d} fill="none" stroke={accent} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </g>
  );
}
