import React from 'react';
import { UPPER, LOWER, layoutArch, toothPaths } from './teeth-data.jsx';
import { useChartState } from '../core/chart-context.jsx';
import { useUIState } from '../core/ui-context.jsx';

const TABLET_SVG_WIDTH = 740;
const TABLET_TOOTH_SCALE = 0.9;

export function TabletChart({ onSelect, onHover }) {
  const { presence, treatments, stage } = useChartState();
  const { hoveredId, selection } = useUIState();

  const upper = React.useMemo(() => layoutArch(UPPER, TABLET_SVG_WIDTH, TABLET_TOOTH_SCALE), []);
  const lower = React.useMemo(() => layoutArch(LOWER, TABLET_SVG_WIDTH, TABLET_TOOTH_SCALE), []);

  const treatedTeeth = React.useMemo(() => {
    const s = new Set();
    treatments.forEach((tx) => {
      if (tx.scope === 'tooth') tx.targets.forEach((id) => s.add(id));
    });
    return s;
  }, [treatments]);

  const handleHover = onHover ?? (() => {});
  const handleSelect = onSelect ?? (() => {});

  return (
    <div className="tablet-chart" style={{ padding: '16px', touchAction: 'manipulation' }}>
      <svg
        data-testid="tablet-upper-row"
        viewBox={`0 0 ${TABLET_SVG_WIDTH} 110`}
        width="100%"
        style={{ display: 'block', marginBottom: '8px' }}>
        {upper.map((tooth) => (
          <TabletTooth
            key={tooth.id}
            tooth={tooth}
            jawFlip={false}
            presence={presence[tooth.id]}
            isHovered={hoveredId === tooth.id}
            isSelected={selection.includes(tooth.id)}
            hasTreatment={treatedTeeth.has(tooth.id)}
            stage={stage}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        ))}
      </svg>
      <svg
        data-testid="tablet-lower-row"
        viewBox={`0 0 ${TABLET_SVG_WIDTH} 110`}
        width="100%"
        style={{ display: 'block' }}>
        {lower.map((tooth) => (
          <TabletTooth
            key={tooth.id}
            tooth={tooth}
            jawFlip={true}
            presence={presence[tooth.id]}
            isHovered={hoveredId === tooth.id}
            isSelected={selection.includes(tooth.id)}
            hasTreatment={treatedTeeth.has(tooth.id)}
            stage={stage}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        ))}
      </svg>
    </div>
  );
}

function TabletTooth({ tooth, jawFlip, presence, isHovered, isSelected, hasTreatment, onHover, onSelect }) {
  const { cx, h, w, type, fdi, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jawFlip ? -1 : 1;
  const tw = w * 1.15;
  const th = h * 1.15;
  const { outline, cervical } = toothPaths(type, tw, th);
  const missing = presence === 'missing';

  const fill = missing ? 'none' : (isSelected ? 'var(--clinic-accent-subtle, #eff6ff)' : '#fff');
  const stroke = isHovered
    ? 'var(--clinic-accent, #2563eb)'
    : (hasTreatment ? '#f97316' : '#94a3b8');

  return (
    <g
      data-tooth-id={tooth.id}
      data-tooth-fdi={fdi}
      transform={`translate(${cx}, ${55 + yOffset}) scale(1, ${flipY}) rotate(${tilt})`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(tooth.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => onSelect({ kind: 'tooth', id: tooth.id }, e, 'click')}>
      {/* Stroke-expansion hit target — stays within the tooth's convex hull */}
      <path d={outline}
        fill="transparent"
        stroke="transparent"
        strokeWidth="14"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ pointerEvents: 'visibleStroke' }} />
      <path d={outline} fill={fill} stroke={stroke} strokeWidth={isHovered ? 2 : 1.5} opacity={missing ? 0.2 : 1}
        style={{ pointerEvents: 'visiblePainted' }} />
      <path d={cervical} fill="none" stroke={stroke} strokeWidth={isHovered ? 1.5 : 1} opacity={missing ? 0.2 : 1} />
      <text
        y={jawFlip ? (th + 14) : -(th + 6)}
        textAnchor="middle"
        fontSize="9"
        fill="#64748b"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {fdi}
      </text>
    </g>
  );
}
