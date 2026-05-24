import React from 'react';
import bridgeSpan from '../shapes-data/bridge-span.json';
import { shapeToPath } from './shapes.jsx';

export function BridgeSpanOverlay({ teeth, biteY, accent }) {
  if (!teeth || teeth.length === 0) return null;
  const jaw = teeth[0].jaw;
  const flipY = jaw === 'upper' ? 1 : -1;
  const h = teeth[0].h;
  const spanX = Math.min(...teeth.map(t => t.cx - t.w / 2));
  const spanRight = Math.max(...teeth.map(t => t.cx + t.w / 2));
  const spanW = spanRight - spanX;
  const d = shapeToPath(bridgeSpan, spanW, h);
  return (
    <g transform={`translate(${spanX}, ${biteY}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      <path d={d} fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  );
}
