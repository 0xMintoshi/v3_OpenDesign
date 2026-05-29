import React from 'react';
import completeDentureUpper from '../shapes-data/treatments/complete-denture-upper.json';
import completeDentureLower from '../shapes-data/treatments/complete-denture-lower.json';
import { shapeToPath } from './shapes.jsx';

const SVG_W = 1600;
const SVG_H = 800;

function layerToPath(layer) {
  return shapeToPath({ segments: layer.segments }, SVG_W, SVG_H);
}

export function CompleteDentureOverlay({ jaw, accent }) {
  const shape = jaw === 'upper' ? completeDentureUpper : completeDentureLower;
  if (shape.renderMode === 'layered-denture' && Array.isArray(shape.layers)) {
    const base = shape.layers.find((layer) => layer.role === 'base');
    const ridge = shape.layers.find((layer) => layer.role === 'ridge');
    const baseD = base ? layerToPath(base) : shapeToPath(shape, SVG_W, SVG_H);
    const ridgeD = ridge ? layerToPath(ridge) : '';

    return (
      <g style={{ pointerEvents: 'none' }}>
        <path
          d={baseD}
          fill={accent}
          fillOpacity="0.22"
          fillRule={base?.fillRule ?? shape.fillRule ?? 'evenodd'}
          clipRule={base?.fillRule ?? shape.fillRule ?? 'evenodd'}
          stroke={accent}
          strokeWidth="1.35"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path
          d={baseD}
          fill="none"
          stroke={accent}
          strokeWidth="0.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.42"
        />
        {ridgeD ? (
          <>
            <path
              d={ridgeD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.46"
            />
            <path
              d={ridgeD}
              fill="none"
              stroke={accent}
              strokeWidth="2.05"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.86"
            />
          </>
        ) : null}
      </g>
    );
  }

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
