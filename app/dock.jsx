import React from 'react';

// ====================================================================
// Icons — locked set from public/dock-icon-drafts.html
// Draft A (arch), Draft D (plain arrows), Draft B (document), Draft C (reset arc)
// 20x20 viewBox, currentColor, consistent stroke width.
// ====================================================================
const STROKE = 1.6;
const strokeProps = { fill: 'none', stroke: 'currentColor', strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' };

function ArchIcon({ direction, restore }) {
  const pad = 3, w = 20, h = 20;
  const top = pad, bottom = h - pad;
  const midY = direction === 'down' ? top + (bottom - top) * 0.62 : bottom - (bottom - top) * 0.62;
  const archPath = direction === 'down'
    ? `M ${pad} ${top} Q ${w / 2} ${midY} ${w - pad} ${top}`
    : `M ${pad} ${bottom} Q ${w / 2} ${midY} ${w - pad} ${bottom}`;
  const gumY = direction === 'down' ? pad + 3.4 : h - pad - 3.4;
  const gumPath = `M ${pad + 1.5} ${gumY} Q ${w / 2} ${gumY + (direction === 'down' ? 2.2 : -2.2)} ${w - pad - 1.5} ${gumY}`;
  const rowY = direction === 'down' ? pad + 4.6 : h - pad - 4.6;
  const teethCount = 5;
  const span = w - pad * 2 - 3;
  const toothW = span / teethCount;
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={archPath} {...strokeProps} />
      <path d={gumPath} {...strokeProps} strokeWidth={STROKE * 0.75} opacity={0.55} />
      {restore && Array.from({ length: teethCount }).map((_, i) => {
        const x0 = pad + 1.5 + i * toothW;
        const th = direction === 'down' ? 3.0 : -3.0;
        const x = x0 + toothW * 0.18;
        return <line key={i} x1={x} y1={rowY} x2={x} y2={rowY + th} {...strokeProps} strokeWidth={STROKE * 0.7} />;
      })}
    </svg>
  );
}

function StageForwardIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M 3 10 L 16.4 10" {...strokeProps} />
      <path d="M 11.6 5 L 17 10 L 11.6 15" {...strokeProps} />
    </svg>
  );
}

function StageBackIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M 17 10 L 3.6 10" {...strokeProps} />
      <path d="M 8.4 5 L 3 10 L 8.4 15" {...strokeProps} />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M 3.6 3 h 8.2 l 2.6 2.6 v 11 h -10.8 z" {...strokeProps} strokeWidth={STROKE * 0.85} />
      <path d="M 11.8 3 v 2.6 h 2.6" {...strokeProps} strokeWidth={STROKE * 0.7} />
      <line x1="5.8" y1="8.2" x2="11.6" y2="8.2" {...strokeProps} strokeWidth={STROKE * 0.6} />
      <line x1="5.8" y1="10.6" x2="11.6" y2="10.6" {...strokeProps} strokeWidth={STROKE * 0.6} />
      <line x1="5.8" y1="13" x2="11.6" y2="13" {...strokeProps} strokeWidth={STROKE * 0.6} />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M 4 6 A 7 7 0 1 1 3.4 11" {...strokeProps} strokeWidth={STROKE * 0.85} />
      <path d="M 3.6 3 L 4 6.4 L 7.2 5.6" {...strokeProps} />
    </svg>
  );
}

// ====================================================================
// Dock primitives
// ====================================================================
export function Dock({ children }) {
  return (
    <div className="dock" role="toolbar" aria-label="Chart actions">
      {children}
    </div>
  );
}

export function DockDivider() {
  return <div className="dock-divider" aria-hidden="true" />;
}

export function DockItem({ icon, label, onClick, active = false, primary = false, style }) {
  return (
    <button
      type="button"
      className={`dock-item${active ? ' active' : ''}${primary ? ' primary' : ''}`}
      onClick={onClick}
      aria-label={label}
      style={style}
    >
      {icon}
      <span className="dock-tooltip" role="tooltip">{label}</span>
    </button>
  );
}

export { ArchIcon, StageForwardIcon, StageBackIcon, SummaryIcon, ClearIcon };
