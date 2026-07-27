import React from 'react';

// ====================================================================
// Icons — locked set from public/dock-icon-drafts.html
// Draft A (arch), Draft D (plain arrows), Draft B (document), Draft C (reset arc)
// 20x20 viewBox, currentColor, consistent stroke width.
// ====================================================================
const STROKE = 1.6;
const strokeProps = { fill: 'none', stroke: 'currentColor', strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' };

function ArchIcon({ direction }) {
  const pad = 3, w = 20, h = 20;
  const top = pad, bottom = h - pad;
  const midY = direction === 'down' ? top + (bottom - top) * 0.62 : bottom - (bottom - top) * 0.62;
  const archPath = direction === 'down'
    ? `M ${pad} ${top} Q ${w / 2} ${midY} ${w - pad} ${top}`
    : `M ${pad} ${bottom} Q ${w / 2} ${midY} ${w - pad} ${bottom}`;
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d={archPath} {...strokeProps} />
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
      <path d="M 3 10 L 16.4 10" {...strokeProps} />
      <path d="M 11.6 5 L 17 10 L 11.6 15" {...strokeProps} />
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
