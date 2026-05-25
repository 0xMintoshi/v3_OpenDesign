import React from 'react';
import { CrownOverlay } from '../treatment-overlays/CrownOverlay.jsx';
import { BridgeSpanOverlay } from '../treatment-overlays/BridgeSpanOverlay.jsx';
import { PartialDentureOverlay } from '../treatment-overlays/PartialDentureOverlay.jsx';
import { TreatmentLabels } from '../treatment-overlays/TreatmentLabels.jsx';
import { useChartState } from '../core/chart-context.jsx';


// ============================================================================
// Treatment catalog, overlay renderers, popover, stage chrome — flat schematic.
// ============================================================================

const TX_GROUPS = [
  {
    label: 'Extraction',
    scope: 'tooth',
    items: [
      { id: 'extraction', label: 'Extraction', hint: 'remove tooth · present teeth only', requires: 'present-tooth' },
    ],
  },
  {
    label: 'Implant',
    scope: 'tooth',
    items: [
      { id: 'implant-crown', label: 'Implant + Crown',  hint: 'fixture · abutment · crown' },
      { id: 'implant-only',  label: 'Implant Only',     hint: 'fixture only · staged restoration' },
    ],
  },
  {
    label: 'Restoration',
    scope: 'tooth',
    items: [
      { id: 'crown',       label: 'Crown',        hint: 'full-coverage crown · existing tooth', requires: 'present-tooth' },
      { id: 'bridge-span', label: 'Bridge (span)', hint: 'pontic spanning selected teeth' },
    ],
  },
  {
    label: 'Bone graft',
    scope: 'tooth',
    items: [
      { id: 'socket-preservation', label: 'Socket Preservation', hint: 'baseline density · single tooth' },
      { id: 'simultaneous-graft',  label: 'Simultaneous Bone Graft', hint: 'denser graft · single tooth' },
      { id: 'gbr',                 label: 'GBR',                 hint: 'densest · extends beyond tooth' },
    ],
  },
];

const SINUS_GROUP = {
  label: 'Sinus',
  scope: 'sinus',
  items: [{ id: 'sinus-lift', label: 'Complex Sinus Lift', hint: 'elevate membrane · dense graft' }],
};

const ARCH_GROUPS = [
  {
    label: 'Arch',
    scope: 'arch',
    items: [
      { id: 'alveolectomy',     label: 'Alveolectomy',     hint: 'reduce ridge bone',
        requires: 'edentulous-arch' },
      { id: 'complete-denture',      label: 'Complete Denture',       hint: 'full prosthesis on this arch',
        requires: 'edentulous-arch' },
      { id: 'partial-denture-upper', label: 'Partial Denture (Upper)', hint: 'removable partial · upper arch' },
      { id: 'partial-denture-lower', label: 'Partial Denture (Lower)', hint: 'removable partial · lower arch' },
    ],
  },
  {
    label: 'Orthodontics · full mouth',
    scope: 'full-mouth',
    items: [
      { id: 'ortho-brackets', label: 'Brackets + Archwire', hint: 'fixed appliance, both arches',
        requires: 'dentate-patient' },
      { id: 'ortho-aligners', label: 'Clear Aligners',      hint: 'removable shells, both arches',
        requires: 'dentate-patient' },
    ],
  },
];

const TX_LABEL = {};
const MISSING_TOOTH_REQUIRED = new Set([
  'implant-crown',
  'implant-only',
  'socket-preservation',
  'simultaneous-graft',
  'gbr',
]);
[...TX_GROUPS, SINUS_GROUP, ...ARCH_GROUPS].forEach(g => g.items.forEach(i => TX_LABEL[i.id] = i.label));
TX_GROUPS.forEach(g => g.items.forEach(i => {
  if (MISSING_TOOTH_REQUIRED.has(i.id)) i.requires = 'missing-tooth';
}));

// ============================================================================
// Implant overlay — flat schematic
// ============================================================================

function ImplantOverlay({ x, y, w, h, jaw, withCrown, accent }) {
  const flipY = jaw === 'upper' ? 1 : -1;
  const screwW = w * 0.48;
  const screwH = h * 0.62;
  const threadCount = 6;
  const crownH = h * 0.30;

  return (
    <g transform={`translate(${x}, ${y}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      {/* Crown (if + crown variant) — drawn at bite area (positive y in this coord) */}
      {withCrown && (
        <g>
          <path
            d={`M ${-w*0.40} 1
                C ${-w*0.45} ${crownH*0.3}, ${-w*0.42} ${crownH*0.8}, ${-w*0.28} ${crownH*0.96}
                C ${-w*0.10} ${crownH*1.06}, ${w*0.10} ${crownH*1.06}, ${w*0.28} ${crownH*0.96}
                C ${w*0.42} ${crownH*0.8}, ${w*0.45} ${crownH*0.3}, ${w*0.40} 1
                Z`}
            fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
          {/* Crown bite-line groove */}
          <path d={`M ${-w*0.26} ${crownH*0.96} Q 0 ${crownH*1.0}, ${w*0.26} ${crownH*0.96}`}
                stroke={accent} strokeWidth="0.9" fill="none" opacity="0.55" />
        </g>
      )}

      {/* Abutment collar */}
      <rect x={-screwW*0.32} y={withCrown ? -1.5 : 0} width={screwW*0.64} height="3"
            fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.2" />

      {/* Implant body — tapered cylinder pointing into bone */}
      <path
        d={`M ${-screwW/2} ${-1}
            L ${-screwW/2} ${-screwH + screwW*0.32}
            Q ${-screwW/2} ${-screwH}, ${-screwW*0.18} ${-screwH}
            L ${screwW*0.18} ${-screwH}
            Q ${screwW/2} ${-screwH}, ${screwW/2} ${-screwH + screwW*0.32}
            L ${screwW/2} ${-1}
            Z`}
        fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />

      {/* Threads — clean horizontal V-cuts */}
      {Array.from({ length: threadCount }).map((_, i) => {
        const t = (i + 1) / (threadCount + 1);
        const yy = -screwH * t * 0.92 - 3;
        const taper = 1 - Math.max(0, (1 - t) * 0.25);
        const tw = (screwW / 2 - 1.5) * taper;
        return (
          <path
            key={i}
            d={`M ${-tw} ${yy} Q 0 ${yy - 1.4}, ${tw} ${yy}`}
            stroke={accent} strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="0.85"
          />
        );
      })}
    </g>
  );
}

// ============================================================================
// Bone graft overlay — density varies by variant
// socket-preservation: baseline density (single tooth footprint)
// simultaneous-graft:  denser, same footprint
// gbr:                 densest AND larger footprint (extends beyond tooth)
// ============================================================================

// Fitted implant overlay - promoted from implant-fit-diagnostic.html.
function fittedImplantCrownRatio(type) {
  if (type === 'wisdomU' || type === 'wisdomL') return 0.46;
  if (type === 'molarU' || type === 'molarL') return 0.40;
  if (type === 'premolar' || type === 'premolar1') return 0.36;
  return 0.34;
}

function fittedImplantClassRatios(type) {
  if (type === 'molarU' || type === 'molarL') {
    return { fixtureW: 0.52, fixtureH: 0.54, collarW: 0.66, threadCount: 7 };
  }
  if (type === 'wisdomU' || type === 'wisdomL') {
    return { fixtureW: 0.50, fixtureH: 0.52, collarW: 0.64, threadCount: 6 };
  }
  if (type === 'premolar' || type === 'premolar1') {
    return { fixtureW: 0.50, fixtureH: 0.58, collarW: 0.64, threadCount: 6 };
  }
  if (type === 'canine') {
    return { fixtureW: 0.44, fixtureH: 0.62, collarW: 0.60, threadCount: 6 };
  }
  return { fixtureW: 0.46, fixtureH: 0.60, collarW: 0.60, threadCount: 6 };
}

function fittedImplantCrownPath(tooth, crownH) {
  const w = tooth.w;
  const half = w * 0.50;
  const shoulder = w * 0.43;
  const top = w * 0.30;
  const bottomX = half * 0.82;
  const bottomY = 1.5;
  const bottomBulge = crownH * 0.055;
  const y1 = -crownH;

  return `M 0 ${bottomBulge}
    C ${-w * 0.26} ${bottomBulge + 1.2}, ${-bottomX * 0.94} ${bottomY + 1.0}, ${-bottomX} ${bottomY}
    C ${-half * 0.99} ${-crownH * 0.07}, ${-half * 0.99} ${-crownH * 0.17}, ${-half * 0.96} ${-crownH * 0.30}
    C ${-half * 0.92} ${-crownH * 0.47}, ${-shoulder * 1.03} ${-crownH * 0.70}, ${-top} ${y1 + crownH * 0.05}
    C ${-w * 0.22} ${y1 - crownH * 0.06}, ${-w * 0.08} ${y1 - crownH * 0.08}, 0 ${y1 - crownH * 0.05}
    C ${w * 0.08} ${y1 - crownH * 0.08}, ${w * 0.22} ${y1 - crownH * 0.06}, ${top} ${y1 + crownH * 0.05}
    C ${shoulder * 1.03} ${-crownH * 0.70}, ${half * 0.92} ${-crownH * 0.47}, ${half * 0.96} ${-crownH * 0.30}
    C ${half * 0.99} ${-crownH * 0.17}, ${half * 0.99} ${-crownH * 0.07}, ${bottomX} ${bottomY}
    C ${bottomX * 0.94} ${bottomY + 1.0}, ${w * 0.26} ${bottomBulge + 1.2}, 0 ${bottomBulge} Z`;
}

function FittedImplantOverlay({ tooth, biteY, withCrown, accent }) {
  const flipY = tooth.jaw === 'lower' ? -1 : 1;
  const ratios = fittedImplantClassRatios(tooth.type);
  const crownH = tooth.h * fittedImplantCrownRatio(tooth.type);
  const fixtureW = tooth.w * ratios.fixtureW;
  const fixtureH = tooth.h * ratios.fixtureH;
  const collarW = tooth.w * ratios.collarW;
  const collarY = -crownH - 1.5;
  const topY = collarY - 2;
  const bottomY = topY - fixtureH;
  const tipW = fixtureW * 0.56;

  return (
    <g
      transform={`translate(0, ${biteY}) translate(${tooth.cx}, ${(tooth.yOffset || 0) * flipY}) scale(1, ${flipY}) rotate(${tooth.tilt || 0})`}
      style={{ pointerEvents: 'none' }}>
      {withCrown && (
        <path
          d={fittedImplantCrownPath(tooth, crownH)}
          fill="var(--tooth-fill)"
          stroke={accent}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round" />
      )}

      <rect x={-collarW / 2} y={collarY - 3} width={collarW} height="6" rx="1.4"
            fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.2" />

      <path
        d={`M ${-fixtureW / 2} ${topY}
            L ${-tipW / 2} ${bottomY + fixtureW * 0.20}
            Q ${-tipW / 2} ${bottomY}, 0 ${bottomY}
            Q ${tipW / 2} ${bottomY}, ${tipW / 2} ${bottomY + fixtureW * 0.20}
            L ${fixtureW / 2} ${topY}
            Z`}
        fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />

      {Array.from({ length: ratios.threadCount }).map((_, i) => {
        const t = (i + 1) / (ratios.threadCount + 1);
        const yy = topY + (bottomY - topY) * t;
        const taper = 1 - Math.max(0, (t - 0.65) * 0.55);
        const tw = Math.max(4, (fixtureW / 2) * taper - 1.6);
        return (
          <path
            key={i}
            d={`M ${-tw} ${yy} Q 0 ${yy - 2.1}, ${tw} ${yy}`}
            stroke={accent} strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="0.85"
          />
        );
      })}
    </g>
  );
}

// ============================================================================
// Bone graft overlay
// ============================================================================
function BoneGraftOverlay({ x, y, w, h, jaw, variant, accent }) {
  const flipY = jaw === 'upper' ? 1 : -1;
  // Footprint
  const isGBR = variant === 'gbr';
  const fieldW = w * (isGBR ? 1.6 : 0.92);
  const fieldH = h * (isGBR ? 0.55 : 0.40);

  // Density (dots per unit area, expressed as grid resolution)
  const density = variant === 'socket-preservation' ? 1.0
                : variant === 'simultaneous-graft'  ? 1.6
                : /* gbr */                           1.9;

  const cols = Math.round(11 * density);
  const rows = Math.round(6 * density);

  // Deterministic jitter per (x,row,col) pair
  const seedX = Math.round(Math.abs(x) * 1.37 + (variant.charCodeAt(0) * 13)) % 10000;
  function rnd(i) { return ((seedX + i * 9301 + 49297) % 233280) / 233280; }

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = (c / Math.max(1, cols - 1) - 0.5) * fieldW + (rnd(r * cols + c) - 0.5) * 2.6;
      const py = -(r / Math.max(1, rows - 1)) * fieldH - 1 + (rnd(r * cols + c + 99) - 0.5) * 2;
      const xn = px / (fieldW / 2);
      const yn = py / fieldH;
      // Confine to arched region
      if (xn * xn + yn * yn * 0.55 > 1) continue;
      const radius = 0.9 + rnd(r * cols + c + 200) * 0.6;
      dots.push({ px, py, radius });
    }
  }

  // Boundary outline (dashed) — shows the graft footprint
  const boundary = `
    M ${-fieldW/2 + 4} ${-2}
    L ${-fieldW/2 + 4} ${-fieldH * 0.5}
    Q ${-fieldW/2} ${-fieldH * 0.95}, 0 ${-fieldH * 1.02}
    Q ${fieldW/2} ${-fieldH * 0.95}, ${fieldW/2 - 4} ${-fieldH * 0.5}
    L ${fieldW/2 - 4} ${-2}
    Z
  `;

  return (
    <g transform={`translate(${x}, ${y}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      {/* Boundary */}
      <path d={boundary} fill={accent} fillOpacity="0.06"
            stroke={accent} strokeWidth="1.0" strokeDasharray={isGBR ? '5 3' : '3 3'} opacity="0.8" />
      {/* Particulate */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.px} cy={d.py} r={d.radius}
                fill={accent} opacity={0.75} />
      ))}
      {/* GBR membrane line — slight curve outside the graft */}
      {isGBR && (
        <path
          d={`M ${-fieldW*0.5 + 3} ${-fieldH*0.40} Q 0 ${-fieldH*1.18}, ${fieldW*0.5 - 3} ${-fieldH*0.40}`}
          fill="none" stroke={accent} strokeWidth="1.4" strokeDasharray="2 3" opacity="0.85"
        />
      )}
    </g>
  );
}

// ============================================================================
// Sinus lift — dense graft inside lifted membrane (flat schematic)
// ============================================================================

function SinusLiftOverlay({ side, accent }) {
  const cx = side === 'right' ? 460 : 1140;
  const baseY = 248;       // natural sinus floor (just below ellipse bottom)
  const liftY = 168;       // lifted membrane crest
  const w = 200;

  const dome = `M ${cx - w/2} ${baseY} Q ${cx} ${liftY}, ${cx + w/2} ${baseY}`;
  const fillRegion = `
    M ${cx - w/2} ${baseY}
    Q ${cx} ${liftY}, ${cx + w/2} ${baseY}
    L ${cx + w/2 - 4} ${baseY + 6}
    Q ${cx} ${baseY + 8}, ${cx - w/2 + 4} ${baseY + 6}
    Z
  `;

  // Dense graft particulate inside dome
  const dots = [];
  const cols = 22, rows = 6;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = c / (cols - 1);
      const px = cx - w/2 + 6 + t * (w - 12);
      // Top boundary: dome curve. Estimated y at t:
      const domeY = liftY + (baseY - liftY) * (1 - Math.sin(t * Math.PI)) + 3;
      const baseLineY = baseY + 4;
      const ceilDist = baseLineY - domeY;
      if (ceilDist <= 0) continue;
      const py = domeY + (r / (rows - 1)) * ceilDist;
      const jitter = ((c * 17 + r * 41) % 7) / 7 - 0.5;
      const radius = 1.0 + ((c * 23 + r * 7) % 5) / 6;
      dots.push({ x: px + jitter * 2.6, y: py + jitter * 1.6, r: radius });
    }
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Light fill below the lifted membrane */}
      <path d={fillRegion} fill={accent} fillOpacity="0.07" />
      {/* Particulate */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={accent} opacity="0.78" />
      ))}
      {/* Lifted membrane line */}
      <path d={dome} stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Label */}
      <text x={cx} y={liftY - 8} textAnchor="middle"
            fontSize="10" fill={accent} fontFamily="var(--sans)"
            fontWeight="500"
            style={{ letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        Sinus Lift
      </text>
    </g>
  );
}

// ============================================================================
// Alveolectomy band — flat hatched strip along the ridge of the chosen arch
// ============================================================================

function AlveolectomyBand({ arch, biteY, archWidth, accent }) {
  const dir = arch === 'upper' ? -1 : 1;
  const halfW = archWidth / 2 + 30;
  const cx = 800;
  const y0 = biteY + dir * 4;
  const y1 = biteY + dir * 28;
  const bandPath = `
    M ${cx - halfW} ${y0}
    Q ${cx} ${y0 + dir * 10}, ${cx + halfW} ${y0}
    L ${cx + halfW * 0.92} ${y1}
    Q ${cx} ${y1 + dir * 10}, ${cx - halfW * 0.92} ${y1}
    Z`;
  const hatchId = `alv-hatch-${arch}`;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={accent} strokeWidth="0.9" opacity="0.65" />
        </pattern>
      </defs>
      <path d={bandPath} fill={`url(#${hatchId})`} opacity="0.9" />
      <path d={bandPath} fill="none" stroke={accent} strokeWidth="1.2"
            strokeDasharray="4 3" opacity="0.85" />
    </g>
  );
}

// ============================================================================
// Complete denture — outlined denture sitting on edentulous arch (flat)
// ============================================================================

function CompleteDentureBand({ arch, biteY, archWidth, accent }) {
  const dir = arch === 'upper' ? -1 : 1;
  const halfW = archWidth / 2 + 30;
  const cx = 800;

  // Gingival baseplate
  const baseTop = biteY + dir * 2;
  const baseBot = biteY + dir * 56;
  const basePath = `
    M ${cx - halfW} ${baseTop}
    Q ${cx} ${baseTop + dir * 12}, ${cx + halfW} ${baseTop}
    L ${cx + halfW * 0.88} ${baseBot}
    Q ${cx} ${baseBot + dir * 20}, ${cx - halfW * 0.88} ${baseBot}
    Z`;

  // Faux tooth crowns along the baseplate (small rounded shapes)
  const teethCount = 14;
  const crowns = [];
  for (let i = 0; i < teethCount; i++) {
    const t = i / (teethCount - 1);
    const cxT = cx - halfW + t * (halfW * 2);
    // Slight bow toward bite
    const cyT = baseTop + dir * (4 + Math.sin(t * Math.PI) * 6);
    const tw = 7 + Math.sin(t * Math.PI) * 4;
    const th = dir > 0 ? 12 : 12;
    crowns.push(
      <ellipse
        key={i}
        cx={cxT} cy={cyT + dir * 8}
        rx={tw / 2} ry={th / 2}
        fill="var(--tooth-fill)"
        stroke={accent} strokeWidth="1.1"
      />
    );
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={basePath} fill={accent} fillOpacity="0.10" />
      <path d={basePath} fill="none" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
      {crowns}
    </g>
  );
}

// ============================================================================
// Ortho brackets — visibly large per tooth + curved archwire (flat)
// ============================================================================

function OrthoBrackets({ teeth, biteY, jaw, accent }) {
  const dir = jaw === 'upper' ? -1 : 1;
  const bracketY = biteY + dir * 36;          // mid-crown
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);
  if (!sorted.length) return null;

  // Archwire — smooth curve passing through brackets with natural curvature
  // (the wire bows slightly toward the bite line at the center)
  const first = sorted[0], last = sorted[sorted.length - 1];
  const midX = (first.cx + last.cx) / 2;
  const midY = bracketY + dir * 4;            // gentle natural curve
  const wire = `M ${first.cx} ${bracketY} Q ${midX} ${midY}, ${last.cx} ${bracketY}`;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Archwire */}
      <path d={wire} stroke={accent} strokeWidth="2.0" fill="none" strokeLinecap="round" />
      {/* Brackets (larger than v1) */}
      {sorted.map(t => (
        <g key={t.id}>
          {/* Wing tie marks */}
          <rect x={t.cx - 6} y={bracketY - 4.5} width="12" height="9" rx="1.6"
                fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.3" />
          <line x1={t.cx - 6} y1={bracketY} x2={t.cx + 6} y2={bracketY}
                stroke={accent} strokeWidth="0.9" opacity="0.55" />
          <line x1={t.cx} y1={bracketY - 4.5} x2={t.cx} y2={bracketY + 4.5}
                stroke={accent} strokeWidth="0.9" opacity="0.55" />
        </g>
      ))}
    </g>
  );
}

// ============================================================================
// Clear aligners — translucent outlined shells wrapping the crowns
// ============================================================================

function OrthoAligners({ upper, lower, upperBiteY, lowerBiteY, archWidth, accent }) {
  const cx = 800;
  const halfW = archWidth / 2 + 24;

  const upperShell = `
    M ${cx - halfW} ${upperBiteY - 76}
    Q ${cx} ${upperBiteY - 96}, ${cx + halfW} ${upperBiteY - 76}
    L ${cx + halfW * 0.98} ${upperBiteY + 8}
    Q ${cx} ${upperBiteY + 16}, ${cx - halfW * 0.98} ${upperBiteY + 8}
    Z`;
  const lowerShell = `
    M ${cx - halfW} ${lowerBiteY + 76}
    Q ${cx} ${lowerBiteY + 96}, ${cx + halfW} ${lowerBiteY + 76}
    L ${cx + halfW * 0.98} ${lowerBiteY - 8}
    Q ${cx} ${lowerBiteY - 16}, ${cx - halfW * 0.98} ${lowerBiteY - 8}
    Z`;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={upperShell} fill={accent} fillOpacity="0.07" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={lowerShell} fill={accent} fillOpacity="0.07" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Subtle inner highlight curve */}
      <path d={`M ${cx - halfW*0.85} ${upperBiteY - 70} Q ${cx} ${upperBiteY - 86}, ${cx + halfW*0.85} ${upperBiteY - 70}`}
            stroke={accent} strokeWidth="0.8" fill="none" opacity="0.45" />
      <path d={`M ${cx - halfW*0.85} ${lowerBiteY + 70} Q ${cx} ${lowerBiteY + 86}, ${cx + halfW*0.85} ${lowerBiteY + 70}`}
            stroke={accent} strokeWidth="0.8" fill="none" opacity="0.45" />
    </g>
  );
}

// ============================================================================
// Extraction overlay — red cross on the crown, only shown when sole treatment
// ============================================================================

function ExtractionOverlay({ x, y, w, h, jaw }) {
  const flipY = jaw === 'upper' ? 1 : -1;
  const arm = w * 0.30;
  const cy = -h * 0.26; // crown center
  const RED = '#d93025';
  return (
    <g transform={`translate(${x}, ${y}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      <line x1={-arm} y1={cy - arm} x2={arm} y2={cy + arm}
            stroke={RED} strokeWidth="3.5" strokeLinecap="round" opacity="0.88" />
      <line x1={arm} y1={cy - arm} x2={-arm} y2={cy + arm}
            stroke={RED} strokeWidth="3.5" strokeLinecap="round" opacity="0.88" />
    </g>
  );
}

// ============================================================================
// TreatmentLayer — composes overlays from treatments[] state
// ============================================================================

function TreatmentLayer({ allTeeth, upperBiteY, lowerBiteY, archWidth, accent }) {
  const { treatments } = useChartState();
  const byTooth = {};
  for (const tx of treatments) {
    if (tx.scope === 'tooth') {
      for (const id of tx.targets) {
        (byTooth[id] = byTooth[id] || []).push(tx);
      }
    }
  }

  const sinusTx     = treatments.filter(t => t.scope === 'sinus');
  const archTx      = treatments.filter(t => t.scope === 'arch');
  const fullMouthTx = treatments.filter(t => t.scope === 'full-mouth');

  const upperTeeth = allTeeth.filter(t => t.jaw === 'upper');
  const lowerTeeth = allTeeth.filter(t => t.jaw === 'lower');

  return (
    <g className="treatment-layer">
      {/* Arch-level (under teeth visually) */}
      {archTx.map((tx, i) => tx.targets.map(arch => {
        const biteY = arch === 'upper' ? upperBiteY : lowerBiteY;
        if (tx.id === 'alveolectomy') {
          return <AlveolectomyBand key={`alv-${i}-${arch}`} arch={arch} accent={accent} biteY={biteY} archWidth={archWidth} />;
        }
        if (tx.id === 'complete-denture') {
          return <CompleteDentureBand key={`den-${i}-${arch}`} arch={arch} accent={accent} biteY={biteY} archWidth={archWidth} />;
        }
        if (tx.id === 'partial-denture-upper') {
          return <PartialDentureOverlay key={`pdu-${i}`} jaw="upper" accent={accent} />;
        }
        if (tx.id === 'partial-denture-lower') {
          return <PartialDentureOverlay key={`pdl-${i}`} jaw="lower" accent={accent} />;
        }
        return null;
      }))}

      {/* Sinus */}
      {sinusTx.map((tx, i) => tx.targets.map(side =>
        <SinusLiftOverlay key={`sl-${i}-${side}`} side={side} accent={accent} />
      ))}

      {/* Per tooth */}
      {Object.entries(byTooth).map(([toothId, list]) => {
        const tooth = allTeeth.find(x => x.id === toothId);
        if (!tooth) return null;
        const biteY = tooth.jaw === 'upper' ? upperBiteY : lowerBiteY;
        const txIds = list.map(tx => tx.id);
        const extractionOnly = txIds.length === 1 && txIds[0] === 'extraction';
        return (
          <g key={toothId}>
            {extractionOnly && (
              <ExtractionOverlay x={tooth.cx} y={biteY} w={tooth.w} h={tooth.h} jaw={tooth.jaw} />
            )}
            {list.map((tx, i) => {
              if (tx.id === 'extraction') return null; // visual handled above
              if (tx.id === 'implant-only' || tx.id === 'implant-crown') {
                return <FittedImplantOverlay key={i} tooth={tooth} biteY={biteY}
                                             withCrown={tx.id === 'implant-crown'} accent={accent} />;
              }
              if (tx.id === 'gbr' || tx.id === 'socket-preservation' || tx.id === 'simultaneous-graft') {
                return <BoneGraftOverlay key={i} x={tooth.cx} y={biteY}
                                         w={tooth.w} h={tooth.h} jaw={tooth.jaw}
                                         variant={tx.id} accent={accent} />;
              }
              if (tx.id === 'crown') {
                return <CrownOverlay key={i} tooth={tooth} biteY={biteY} accent={accent} />;
              }
              if (tx.id === 'bridge-span') return null; // rendered as span below
              return null;
            })}
          </g>
        );
      })}

      {/* Bridge spans (drawn over per-tooth overlays) */}
      {treatments.filter(t => t.id === 'bridge-span').map((tx, i) => {
        const spanTeeth = tx.targets.map(id => allTeeth.find(t => t.id === id)).filter(Boolean);
        if (spanTeeth.length === 0) return null;
        const jaw = spanTeeth[0].jaw;
        const biteY = jaw === 'upper' ? upperBiteY : lowerBiteY;
        return <BridgeSpanOverlay key={`bs-${i}`} teeth={spanTeeth} biteY={biteY} accent={accent} />;
      })}

      {/* Full mouth ortho (drawn last, over teeth) */}
      {fullMouthTx.map((tx, i) => {
        if (tx.id === 'ortho-brackets') {
          return (
            <g key={i}>
              <OrthoBrackets teeth={upperTeeth} biteY={upperBiteY} jaw="upper" accent={accent} />
              <OrthoBrackets teeth={lowerTeeth} biteY={lowerBiteY} jaw="lower" accent={accent} />
            </g>
          );
        }
        if (tx.id === 'ortho-aligners') {
          return <OrthoAligners key={i} upper={upperTeeth} lower={lowerTeeth}
                                upperBiteY={upperBiteY} lowerBiteY={lowerBiteY}
                                archWidth={archWidth} accent={accent} />;
        }
        return null;
      })}
    </g>
  );
}

// ============================================================================
// Zone-based treatment label cards + orthogonal leader lines (SVG-native)
// ============================================================================

// Outer arc: boxes fan along an ellipse outside the jaw (viewBox 0 0 1600 800).
// rx shrunk so lateral points (near horizontal axis) stay on-screen — this lets
// posterior zones sweep through the mid-left/mid-right empty rectangles.
const ARC_CX = 800, ARC_CY = 410, ARC_RX = 730, ARC_RY = 380;

// Angle ranges per zone (degrees, standard trig, y-down).
// Posterior arcs end ~10° shy of the horizontal axis (190°/350° instead of
// 180°/360°) so upper/lower zones don't collide at the mid-side meeting point.
const ZONE_ARCS = {
  'ur-post': { a0: 190, a1: 245 },  // upper screen-left  (patient right posterior)
  'u-ant':   { a0: 245, a1: 295 },  // upper center        (anterior)
  'ul-post': { a0: 295, a1: 350 },  // upper screen-right  (patient left posterior)
  'll-post': { a0: 10,  a1: 65  },  // lower screen-right  (patient left posterior)
  'l-ant':   { a0: 65,  a1: 115 },  // lower center        (anterior)
  'lr-post': { a0: 115, a1: 170 },  // lower screen-left   (patient right posterior)
};

const ANTERIOR_ZONES   = new Set(['u-ant', 'l-ant']);
const POSTERIOR_LEFT   = new Set(['ur-post', 'lr-post']);
const POSTERIOR_RIGHT  = new Set(['ul-post', 'll-post']);

function arcPoint(zoneKey, t) {
  const arc = ZONE_ARCS[zoneKey];
  if (!arc) return { x: ARC_CX, y: ARC_CY - ARC_RY - 40 };
  const deg = arc.a0 + t * (arc.a1 - arc.a0);
  const rad = (deg * Math.PI) / 180;
  return { x: ARC_CX + ARC_RX * Math.cos(rad), y: ARC_CY + ARC_RY * Math.sin(rad) };
}

function fdiToZone(fdi) {
  const q = Math.floor(fdi / 10);
  const n = fdi % 10;
  if (q === 1) return n >= 4 ? 'ur-post' : 'u-ant';
  if (q === 2) return n >= 4 ? 'ul-post' : 'u-ant';
  if (q === 4) return n >= 4 ? 'lr-post' : 'l-ant';
  if (q === 3) return n >= 4 ? 'll-post' : 'l-ant';
  return 'u-ant';
}

// Connector: exits at midpoint of one of 4 box sides, perpendicular to that side,
// then one bend to the anchor. Side picked by which face the anchor is on.
function connectorPath(bx, by, hw, hh, ax, ay) {
  const dx = ax - bx, dy = ay - by;
  // Compare normalized distances: which face is the anchor "more on"?
  const useVerticalSide = Math.abs(dx) * hh >= Math.abs(dy) * hw;
  let ex, ey, path;
  if (useVerticalSide) {
    // Exit from left or right midpoint; leave horizontally, then turn vertical
    ex = bx + (dx > 0 ? hw : -hw);
    ey = by;
    path = `M ${ex} ${ey} L ${ax} ${ey} L ${ax} ${ay}`;
  } else {
    // Exit from top or bottom midpoint; leave vertically, then turn horizontal
    ex = bx;
    ey = by + (dy > 0 ? hh : -hh);
    path = `M ${ex} ${ey} L ${ex} ${ay} L ${ax} ${ay}`;
  }
  return { path, ex, ey };
}

function TreatmentPopover({ open, anchor, mode, target, archEdentulous, allPresent, allMissing, fullyEdentulous, onApply, onClose }) {
  if (!open) return null;

  let groups = [];
  let title = '';
  let subtitle = '';

  if (mode === 'tooth') {
    groups = TX_GROUPS;
    if (target.length === 1) {
      title = `Tooth ${target[0].fdi}`;
      subtitle = target[0].name;
    } else {
      title = `${target.length} teeth selected`;
      const ids = target.slice(0, 4).map(t => t.fdi).join(' · ');
      subtitle = target.length > 4 ? `${ids} · +${target.length - 4}` : ids;
    }
  } else if (mode === 'sinus') {
    groups = [SINUS_GROUP];
    title = target.side === 'right' ? 'Right maxillary sinus' : 'Left maxillary sinus';
    subtitle = 'MS-' + (target.side === 'right' ? 'R' : 'L');
  } else if (mode === 'arch') {
    groups = ARCH_GROUPS;
    title = target.arch === 'upper' ? 'Maxilla — upper arch' : 'Mandible — lower arch';
    subtitle = target.edentulous ? 'edentulous' : 'with teeth';
  }

  const W = 320;
  const left = Math.max(20, Math.min(window.innerWidth - W - 20, anchor.x - W / 2));
  const top  = Math.min(window.innerHeight - 380, Math.max(80, anchor.y + 18));

  // Determine which items are available
  const isAvailable = (item) => {
    if (item.requires === 'edentulous-arch') {
      if (mode !== 'arch') return false;
      return target.edentulous;
    }
    if (item.requires === 'present-tooth') {
      return allPresent === true;
    }
    if (item.requires === 'missing-tooth') {
      return allMissing === true;
    }
    if (item.requires === 'dentate-patient') {
      return fullyEdentulous !== true;
    }
    return true;
  };

  const unavailableHint = (item) => {
    if (item.requires === 'edentulous-arch') return 'requires edentulous arch';
    if (item.requires === 'present-tooth') return 'requires present teeth only';
    if (item.requires === 'missing-tooth') return 'requires missing or extracted teeth';
    if (item.requires === 'dentate-patient') return 'requires at least one present tooth';
    return 'not available for this selection';
  };

  return (
    <>
      <div className="popover-veil" onClick={onClose} />
      <div className="tx-popover" style={{ left, top, width: W }}>
        <div className="tx-popover-head">
          <div>
            <div className="tx-popover-title">{title}</div>
            <div className="tx-popover-subtitle">{subtitle}</div>
          </div>
          <button className="info-close" onClick={onClose} aria-label="close">×</button>
        </div>
        <div className="tx-popover-body">
          {groups.map(group => (
            <div className="tx-group" key={group.label}>
              <div className="tx-group-label">{group.label}</div>
              {group.items.map(item => {
                const avail = isAvailable(item);
                return (
                  <button key={item.id}
                          className={`tx-item ${avail ? '' : 'disabled'}`}
                          title={avail ? '' : unavailableHint(item)}
                          disabled={!avail}
                          onClick={() => avail && onApply(item.id, group.scope)}>
                    <div className="tx-item-main">
                      <span className="tx-item-label">{item.label}</span>
                    </div>
                    <span className="tx-item-arrow">{avail ? '→' : '—'}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Stage pill
// ============================================================================

function StagePill({ stage }) {
  const isBaseline = stage === 'baseline';
  return (
    <div className="stage-pill">
      <span className={`stage-dot ${isBaseline ? 'baseline' : 'plan'}`} />
      <span className="stage-num">{isBaseline ? '01' : '02'}</span>
      <span className="stage-divider" />
      <span className="stage-label">
        {isBaseline ? 'BASELINE · EXISTING DENTITION' : 'TREATMENT PLAN'}
      </span>
    </div>
  );
}

// ============================================================================
// Confirm-wipe-treatments dialog
// ============================================================================

function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel, accent }) {
  if (!open) return null;
  return (
    <>
      <div className="popover-veil" onClick={onCancel} />
      <div className="confirm-dialog">
        <div className="confirm-title">{title}</div>
        <div className="confirm-body">{body}</div>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" style={{ background: accent }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  TX_GROUPS, SINUS_GROUP, ARCH_GROUPS, TX_LABEL,
  TreatmentLayer, TreatmentLabels, TreatmentPopover, StagePill, ConfirmDialog,
});

export {
  TX_GROUPS, SINUS_GROUP, ARCH_GROUPS, TX_LABEL,
  TreatmentLayer, TreatmentLabels, TreatmentPopover, StagePill, ConfirmDialog,
};
export { exportLabelPositions, setLabelPositions } from '../treatment-overlays/TreatmentLabels.jsx';
