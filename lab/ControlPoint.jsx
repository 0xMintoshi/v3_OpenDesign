import React from 'react';

// Draggable SVG handle. isAnchor=true: on-curve point (larger). false: off-curve Bezier handle.
export function ControlPoint({ svgX, svgY, isAnchor, onPointerDown }) {
  return (
    <circle
      cx={svgX} cy={svgY} r={isAnchor ? 5 : 3.5}
      fill={isAnchor ? '#fff' : 'rgba(59,130,246,0.4)'}
      stroke="#3b82f6" strokeWidth={1.5}
      style={{ cursor: 'crosshair', touchAction: 'none' }}
      onPointerDown={onPointerDown}
    />
  );
}
