import React from 'react';

// Draggable SVG handle. isAnchor=true: on-curve point (larger). false: off-curve Bezier handle.
// Pass onContextMenu to enable right-click delete.
export function ControlPoint({ svgX, svgY, isAnchor, selected, onPointerDown, onContextMenu, zoom = 1 }) {
  const r = (isAnchor ? 5 : 3.5) / zoom;
  const sw = 1.5 / zoom;
  return (
    <circle
      cx={svgX} cy={svgY} r={r}
      fill={selected ? '#fbbf24' : isAnchor ? '#fff' : 'rgba(59,130,246,0.4)'}
      stroke={selected ? '#d97706' : '#3b82f6'} strokeWidth={sw}
      style={{ cursor: 'crosshair', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    />
  );
}
