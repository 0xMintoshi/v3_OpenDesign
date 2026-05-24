import React from 'react';
import crownMolarUpper from './shapes-data/crown-molar-upper.json';
import { shapeToPath } from './visuals/shapes.jsx';

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
      { id: 'crown', label: 'Crown', hint: 'full-coverage crown · existing tooth', requires: 'present-tooth' },
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
      { id: 'complete-denture', label: 'Complete Denture', hint: 'full prosthesis on this arch',
        requires: 'edentulous-arch' },
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

function CrownOverlay({ tooth, biteY, accent }) {
  const { cx, w, h, jaw } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const d = shapeToPath(crownMolarUpper, w, h);
  return (
    <g transform={`translate(${cx}, ${biteY}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      <path d={d} fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d={`M ${-w*0.26} 0 Q 0 ${h*0.04} ${w*0.26} 0`}
        stroke={accent} strokeWidth="0.9" fill="none" opacity="0.55"
      />
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

function TreatmentLayer({ treatments, allTeeth, upperBiteY, lowerBiteY, archWidth, accent }) {
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
              return null;
            })}
          </g>
        );
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

function TreatmentLabels({ treatments, allTeeth, upperBiteY, lowerBiteY, accent,
                          debugGuides = false, onRemoveTooth, onRemoveOther,
                          manualPlacementMode = false }) {
  // Reduced baseline label width to make the cards more compact. Text will
  // be fitted onto a single line using SVG's textLength+lengthAdjust so
  // content does not wrap to a second row.
  const LABEL_W = 150;

  // Manual placement state: persistent map of labelKey -> { cx, cy, locked }
  // DEFAULT_LABEL_POSITIONS: developer-locked canonical spawn positions.
  // These values are authoritative defaults and must be changed only by
  // editing this file (or via a developer workflow). UI/Import functions
  // will not overwrite keys present here.
  const DEFAULT_LABEL_POSITIONS = {
    "tooth-upper-17": { "cx": 231.59215898513787, "cy": 155.21578979492188, "locked": true },
    "tooth-upper-16": { "cx": 389.34824157714837, "cy": 98.66664123535156, "locked": true },
    "tooth-upper-18": { "cx": 141.77100402832025, "cy": 243.68623733520508, "locked": true },
    "tooth-upper-14": { "cx": 567.9059326171874, "cy": 16.54902935028076, "locked": true },
    "tooth-upper-15": { "cx": 413.98885864257807, "cy": 15.294124603271484, "locked": true },
    "tooth-upper-13": { "cx": 549.9755456542969, "cy": 99.92150688171387, "locked": true },
    "tooth-upper-12": { "cx": 704.5947497558593, "cy": 118.82353210449219, "locked": true },
    "tooth-upper-11": { "cx": 723.056513671875, "cy": 34.666643142700195, "locked": true },

    "sinus-right": { "cx": 470.66656494140625, "cy": -52.90190887451172, "locked": true },

    "tooth-upper-21": { "cx": 876.943486328125, "cy": 42.470603942871094, "locked": true },
    "tooth-upper-22": { "cx": 894.5177368164061, "cy": 125.92157936096191, "locked": true },
    "tooth-upper-23": { "cx": 1050.7529663085936, "cy": 107.72551727294922, "locked": true },
    "tooth-upper-24": { "cx": 1050.753088378906, "cy": 27.411767959594727, "locked": true },
    "tooth-upper-25": { "cx": 1208.8708251953124, "cy": 28.666690826416016, "locked": true },
    "tooth-upper-26": { "cx": 1235.8512939453124, "cy": 105.84311103820801, "locked": true },
    "tooth-upper-27": { "cx": 1360.9133544921874, "cy": 193.21571350097656, "locked": true },
    "tooth-upper-28": { "cx": 1444.3645263671874, "cy": 283.5686721801758, "locked": true },

    "sinus-left": { "cx": 1129.3334350585938, "cy": -52.90190887451172, "locked": true },

    "arch-upper": { "cx": 1509.6471557617188, "cy": 353.6470413208008, "locked": true },
    "arch-lower": { "cx": 1509.6469116210938, "cy": 459.56858825683594, "locked": true },
    "full-mouth": { "cx": 1449.6470947265625, "cy": 430.07843017578125, "locked": true },

    "tooth-lower-48": { "cx": 155.87058105468748, "cy": 515.0979919433594, "locked": true },
    "tooth-lower-47": { "cx": 228.19216613769532, "cy": 604.8234252929688, "locked": true },
    "tooth-lower-46": { "cx": 355.9020690917969, "cy": 692.3920288085938, "locked": true },
    "tooth-lower-45": { "cx": 405.39619750976556, "cy": 781.568603515625, "locked": true },
    "tooth-lower-44": { "cx": 517.5184301757812, "cy": 699.3726806640625, "locked": true },
    "tooth-lower-43": { "cx": 562.7336022949219, "cy": 790.6923828125, "locked": true },
    "tooth-lower-42": { "cx": 678.0325244140624, "cy": 705.0194091796875, "locked": true },
    "tooth-lower-41": { "cx": 720.12853515625, "cy": 793.41162109375, "locked": true },

    "tooth-lower-38": { "cx": 1444.1294189453125, "cy": 515.0979919433594, "locked": true },
    "tooth-lower-37": { "cx": 1371.8078338623047, "cy": 604.8234252929688, "locked": true },
    "tooth-lower-36": { "cx": 1244.0979309082031, "cy": 692.3920288085938, "locked": true },
    "tooth-lower-35": { "cx": 1194.6038024902344, "cy": 781.568603515625, "locked": true },
    "tooth-lower-34": { "cx": 1082.4815698242187, "cy": 699.3726806640625, "locked": true },
    "tooth-lower-33": { "cx": 1036.6388952636719, "cy": 790.6923828125, "locked": true },
    "tooth-lower-32": { "cx": 921.9674755859376, "cy": 705.0194091796875, "locked": true },
    "tooth-lower-31": { "cx": 874.2244311523438, "cy": 794.0391235351562, "locked": true }
  };

  // Ensure exact programmatic mirroring for left/right pairs so defaults remain
  // perfectly symmetric. Mirror axis is the SVG viewBox width (1600px), so
  // mirrored_x = 1600 - original_x. This guarantees 11..18 -> 21..28 and
  // 41..48 -> 31..38 are exact mirrors and prevents drift from manual edits.
  (function enforceMirrors() {
    const MIRROR_AXIS = 1600;
    // Upper right 11..18 -> upper left 21..28 (+10)
    for (let n = 11; n <= 18; n++) {
      const rightKey = `tooth-upper-${n}`;
      const leftKey = `tooth-upper-${n + 10}`;
      if (DEFAULT_LABEL_POSITIONS[rightKey]) {
        const r = DEFAULT_LABEL_POSITIONS[rightKey];
        DEFAULT_LABEL_POSITIONS[leftKey] = { cx: MIRROR_AXIS - r.cx, cy: r.cy, locked: true };
      }
    }
    // Lower right 41..48 -> lower left 31..38 (-10)
    for (let n = 41; n <= 48; n++) {
      const rightKey = `tooth-lower-${n}`;
      const leftKey = `tooth-lower-${n - 10}`;
      if (DEFAULT_LABEL_POSITIONS[rightKey]) {
        const r = DEFAULT_LABEL_POSITIONS[rightKey];
        DEFAULT_LABEL_POSITIONS[leftKey] = { cx: MIRROR_AXIS - r.cx, cy: r.cy, locked: true };
      }
    }
    // Sinus: mirror left from right if right exists
    if (DEFAULT_LABEL_POSITIONS['sinus-right'] && !DEFAULT_LABEL_POSITIONS['sinus-left']) {
      const r = DEFAULT_LABEL_POSITIONS['sinus-right'];
      DEFAULT_LABEL_POSITIONS['sinus-left'] = { cx: MIRROR_AXIS - r.cx, cy: r.cy, locked: true };
    }
  })();

  // persistent positions (saved across sessions) — DO NOT allow these to
  // override DEFAULT_LABEL_POSITIONS entries. Stored keys that match defaults
  // will be ignored so default locked positions remain immutable to webpage
  // functions.
  const [persistentPositions, setPersistentPositions] = React.useState(() => {
    try {
      // Force-clear any previously saved persistent overrides so the on-disk
      // DEFAULT_LABEL_POSITIONS become authoritative. This is a deliberate
      // one-time destructive action requested by the user ('force clear').
      try { localStorage.removeItem('labelPositions'); } catch (e) { /* ignore */ }
      return {};
      // Note: if you want to preserve non-default keys in future, remove the
      // two lines above and restore the previous parsing+filtering logic below.
      // const stored = JSON.parse(localStorage.getItem('labelPositions') || '{}') || {};
      // const filtered = Object.fromEntries(Object.entries(stored).filter(([k]) => !(k in DEFAULT_LABEL_POSITIONS)));
      // return filtered;
    } catch (e) { return {}; }
  });

  // transient session positions (not persisted). Manual drags and lock toggles
  // made while in the session will live here only — they won't overwrite the
  // immutable defaults or the persistentPositions on disk.
  const [sessionPositions, setSessionPositions] = React.useState({});

  // Ensure any existing session overrides do not accidentally shadow the newly
  // enforced default mirror positions. Clear session keys that are present in
  // DEFAULT_LABEL_POSITIONS so the defaults are immediately visible.
  React.useEffect(() => {
    setSessionPositions((prev = {}) => {
      const next = { ...prev };
      Object.keys(DEFAULT_LABEL_POSITIONS).forEach((k) => { if (k in next) delete next[k]; });
      return next;
    });
  }, []);

  // currently dragging key and pointer offset
  const dragRef = React.useRef({ key: null, dx: 0, dy: 0, pid: null });

  // helper: compute unique key for a label (tooth: tooth-XX, sinus: sinus-right, arch: arch-upper, full-mouth: full-mouth)
  const labelKeyFor = (l) => {
    if (l.kind === 'tooth') return `tooth-${l.toothId}`;
    if (l.kind === 'sinus') return `sinus-${l.target}`;
    if (l.kind === 'arch') return `arch-${l.target}`;
    if (l.kind === 'full-mouth') return `full-mouth`;
    return `label-${l.zone || l.kind}`;
  };

  // Helper: compute the effective position for a given label key. Display
  // priority is: session overrides (live, transient) -> persistent user
  // overrides (saved) -> immutable defaults. This lets session drags visibly
  // override defaults for the running page without persisting them to disk.
  const effectivePositionForKey = (k) => {
    if (sessionPositions && sessionPositions[k]) return { ...sessionPositions[k] };
    if (persistentPositions && persistentPositions[k]) return { ...persistentPositions[k] };
    if (k in DEFAULT_LABEL_POSITIONS) return { ...DEFAULT_LABEL_POSITIONS[k] };
    return undefined;
  };

  // expose export / import functions. export returns the merged object (defaults
  // included). setLabelPositions will replace persistentPositions but will NOT
  // overwrite any DEFAULT_LABEL_POSITIONS entries (those keys are ignored).
  React.useEffect(() => {
    window.exportLabelPositions = () => {
      // Build merged positions for export: defaults first, then persistent (only
      // for non-default keys), then session overrides (session should be able
      // to temporarily override anything except defaults).
      const merged = {};
      // include defaults
      Object.entries(DEFAULT_LABEL_POSITIONS).forEach(([k, v]) => { merged[k] = { ...v }; });
      // persistent positions (filtered) — they won't include default keys by
      // construction
      Object.entries(persistentPositions || {}).forEach(([k, v]) => { merged[k] = { ...(v || {}) }; });
      // session overrides should take precedence for the running session
      Object.entries(sessionPositions || {}).forEach(([k, v]) => { merged[k] = { ...(v || {}) }; });
      // Also include any computed labels that currently exist but have no
      // stored/session/default entry so the export is comprehensive. Use the
      // current `positioned` array to list keys that may be missing above.
      positioned.forEach(p => {
        const k = labelKeyFor(p);
        if (!(k in merged)) merged[k] = { cx: p.cx, cy: p.cy, locked: !!p._locked };
      });
      return merged;
    };

    window.setLabelPositions = (obj) => {
      try {
        const raw = obj || {};
        // Filter out any default keys — they are immutable
        const filtered = Object.fromEntries(Object.entries(raw).filter(([k]) => !(k in DEFAULT_LABEL_POSITIONS)));
        setPersistentPositions(filtered);
        try { localStorage.setItem('labelPositions', JSON.stringify(filtered)); } catch (e) {}
      } catch (e) { /* ignore */ }
    };

    return () => {
      try { delete window.exportLabelPositions; delete window.setLabelPositions; } catch (e) {}
    };
  }, [persistentPositions, sessionPositions]);

  // ── 1. Build label specs ──────────────────────────────────────────────────

  const labels = [];

  // Per-tooth: one card per tooth listing all its treatments
  const byTooth = {};
  for (const tx of treatments) {
    if (tx.scope === 'tooth') {
      for (const id of tx.targets) {
        (byTooth[id] = byTooth[id] || []).push(tx.id);
      }
    }
  }
  Object.entries(byTooth).forEach(([toothId, items]) => {
    const tooth = allTeeth.find(x => x.id === toothId);
    if (!tooth) return;
    const isUpper = tooth.jaw === 'upper';
    const fdi = parseInt(toothId.split('-')[1]);
    labels.push({
      kind: 'tooth', toothId, items,
      anchor: {
        x: tooth.cx,
        y: isUpper ? upperBiteY - tooth.h * 0.55 + (tooth.yOffset || 0)
                   : lowerBiteY + tooth.h * 0.55 - (tooth.yOffset || 0),
      },
      zone: fdiToZone(fdi),
      fdi,
      jaw: tooth.jaw, // store jaw so placement can respect quadrants
    });
  });

  // Sinus: fixed anatomical anchors
  treatments.filter(t => t.scope === 'sinus').forEach(tx =>
    tx.targets.forEach(side => {
      labels.push({
        kind: 'sinus', target: side, items: [tx.id],
        anchor: { x: side === 'right' ? 460 : 1140, y: 200 },
        zone: 'sinus-' + side,
      });
    })
  );

  // Arch: anchor at midpoint x of the arch's teeth
  const archByArch = { upper: [], lower: [] };
  treatments.filter(t => t.scope === 'arch').forEach(tx =>
    tx.targets.forEach(arch => archByArch[arch].push(tx.id))
  );
  ['upper', 'lower'].forEach(arch => {
    if (archByArch[arch].length === 0) return;
    const archTeeth = allTeeth.filter(t => t.jaw === arch);
    const midX = archTeeth.length
      ? archTeeth.reduce((s, t) => s + t.cx, 0) / archTeeth.length : ARC_CX;
    labels.push({
      kind: 'arch', target: arch, items: archByArch[arch],
      anchor: { x: midX, y: arch === 'upper' ? upperBiteY - 8 : lowerBiteY + 8 },
      zone: 'arch-' + arch,
    });
  });

  // Full-mouth ortho: fixed mid-right slot, connector to upper archwire endpoint
  const fmItems = treatments.filter(t => t.scope === 'full-mouth').map(t => t.id);
  if (fmItems.length > 0) {
    const upperTeeth = allTeeth.filter(t => t.jaw === 'upper');
    const rightmost = upperTeeth.reduce((a, b) => (b.cx > a.cx ? b : a), upperTeeth[0]);
    labels.push({
      kind: 'full-mouth', items: fmItems,
      anchor: { x: rightmost ? rightmost.cx : ARC_CX + 580, y: upperBiteY + 36 },
      zone: 'ortho',
    });
  }

  // ── 2. Fan boxes along outer arc per zone ─────────────────────────────────

  const zoneBuckets = {};
  labels.forEach(l => { (zoneBuckets[l.zone] = zoneBuckets[l.zone] || []).push(l); });

  const positioned = [];

  // Collect sinus anchor X positions (reserve nearby top slots so sinus labels
  // don't collide with tooth labels). These will be used to mark slots used.
  const sinusReservedXs = [];
  (zoneBuckets['sinus-right'] || []).forEach(s => sinusReservedXs.push(s.anchor.x));
  (zoneBuckets['sinus-left'] || []).forEach(s => sinusReservedXs.push(s.anchor.x));

  // Tooth labels: arrange along a squarish two-ring layout (inner square & outer
  // square). Each label prefers the inner square on its side (top/right/bottom/left)
  // and will overflow onto the outer square if that side runs out of space.
  const VIEW_W = 1600, PAD = 8;
  const clampCx = (x) => Math.max(LABEL_W / 2 + PAD, Math.min(VIEW_W - LABEL_W / 2 - PAD, x));

  // Rectangular two-layer layout parameters. Inner rectangle is computed so its
  // top edge sits outside the jaw outlines (above upperBiteY) and bottom edge
  // sits outside the lower jaw (below lowerBiteY) to avoid labels touching teeth.
  // Tunable geometry: increased to ensure inner rect sits well outside dentition
  const INNER_HALF_X = 420; // half-width of inner rectangle (wider)
  const INNER_HALF_Y_FALLBACK = 300; // fallback half-height used as minimum (taller)
  // Outer offset reduced so inner/outer distance is tighter (less spread)
  const OUTER_OFFSET_X = 100; // how much further out the outer rect sits horizontally
  const OUTER_OFFSET_Y = 80;  // how much further out the outer rect sits vertically
  const SIDE_PAD = 28; // padding along each side away from corners

  function sideForZone(zone) {
    // Prefer upper teeth to occupy the top perimeter and lower teeth the bottom
    if (zone === 'u-ant') return 'top';
    if (zone === 'l-ant') return 'bottom';
    // Map upper posterior zones to the top band to reduce vertical stacking
    if (zone === 'ur-post' || zone === 'ul-post') return 'top';
    // Map lower posterior zones to the bottom band
    if (zone === 'lr-post' || zone === 'll-post') return 'bottom';
    if (zone.startsWith('sinus')) return 'top';
    if (zone.startsWith('arch')) return zone.endsWith('upper') ? 'top' : 'bottom';
    if (zone === 'ortho') return 'right';
    return 'top';
  }

  // Defer side assignment until inner rectangle is computed so we can pick the
  // nearest side to each tooth anchor (ensures vertical sides get populated
  // when appropriate and labels sit outside the jaw outline).
  const toothLabels = labels.filter(l => l.kind === 'tooth');
  toothLabels.forEach(l => { l._h = 14 + l.items.length * 18 + 10; });
  let sideBuckets = { top: [], right: [], bottom: [], left: [] };

  // Helper: produce positions along a side span for n items.
  // Uses center-out ordering so items expand symmetrically from the midline.
  // Helper: assign items to the slots along a side by choosing the slot
  // closest to each item's anchor. Greedy nearest-slot assignment prevents
  // center-first bias and ensures each label is placed near its tooth.
  function assignToNearestSlots(items, start, end, capacity, axisAccessor, opts = {}) {
    if (capacity <= 0) return { assigned: [], remaining: items.slice() };
    if (items.length === 0) return { assigned: [], remaining: [] };
    const n = Math.max(1, capacity);
    const span = end - start;
    const step = n === 1 ? 0 : span / (n - 1);
    const slots = new Array(n).fill(null).map((_, i) => start + i * step);
    const used = new Array(n).fill(false);
    // Optionally sort by FDI order for stable assignments around the arch
    let sorted = items.slice();
    if (opts.preferFDI) {
      sorted.sort((a, b) => {
        const af = a.fdi || 0; const bf = b.fdi || 0;
        return af - bf;
      });
    } else {
      // Default: sort by desired axis coordinate so nearby teeth get nearby slots
      sorted.sort((a, b) => axisAccessor(a) - axisAccessor(b));
    }
    // If certain x positions are reserved (eg. sinus anchors), mark slots near them used
    if (opts.reservedXs && opts.reservedXs.length) {
      const thresh = opts.reservedThreshold || (LABEL_W + 8);
      for (let i = 0; i < slots.length; i++) {
        for (const rx of opts.reservedXs) {
          if (Math.abs(slots[i] - rx) < thresh) { used[i] = true; break; }
        }
      }
    }
    const assigned = [];
    const remaining = [];
    for (const item of sorted) {
      const desired = axisAccessor(item);
      // find nearest free slot
      let bestIdx = -1, bestDist = Infinity;
      for (let i = 0; i < slots.length; i++) {
        if (used[i]) continue;
        const d = Math.abs(slots[i] - desired);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx >= 0) {
        used[bestIdx] = true;
        assigned.push({ item, coord: slots[bestIdx], slotIndex: bestIdx });
      } else {
        remaining.push(item);
      }
    }
    // any items that couldn't find a slot (shouldn't happen) go to remaining
    return { assigned, remaining };
  }

   // Compute inner/outer rectangle edges once so placements on all sides use
  // the same geometry and the inner rect sits clearly outside the jaw outlines.
  // Use actual tooth anchor bounds (when present) and add a safety margin so
  // the inner rectangle never overlaps the dentition.
  // Increase clearance so inner rectangle definitely clears molars and sinus
  const marginFromBite = 84;
  const extraSafety = 48; // extra spacing to ensure inner rect is well outside teeth

  // Measure tooth anchor bounds (if no tooth labels, fall back to defaults)
  let minToothY = Infinity, maxToothY = -Infinity, minToothX = Infinity, maxToothX = -Infinity;
  toothLabels.forEach(t => {
    const ay = t.anchor && t.anchor.y;
    const ax = t.anchor && t.anchor.x;
    if (typeof ay === 'number') {
      if (ay < minToothY) minToothY = ay;
      if (ay > maxToothY) maxToothY = ay;
    }
    if (typeof ax === 'number') {
      if (ax < minToothX) minToothX = ax;
      if (ax > maxToothX) maxToothX = ax;
    }
  });

  const minTopCandidate = (minToothY === Infinity) ? (ARC_CY - INNER_HALF_Y_FALLBACK) : (minToothY - marginFromBite - extraSafety);
  const maxBottomCandidate = (maxToothY === -Infinity) ? (ARC_CY + INNER_HALF_Y_FALLBACK) : (maxToothY + marginFromBite + extraSafety);
  const minLeftCandidate = (minToothX === Infinity) ? (ARC_CX - INNER_HALF_X) : (minToothX - marginFromBite - extraSafety);
  const maxRightCandidate = (maxToothX === -Infinity) ? (ARC_CX + INNER_HALF_X) : (maxToothX + marginFromBite + extraSafety);

  // Ensure inner rect is at least the configured fallback size but expanded
  // enough to clear tooth anchors.
  const innerTop = Math.min(ARC_CY - INNER_HALF_Y_FALLBACK, minTopCandidate);
  const innerBottom = Math.max(ARC_CY + INNER_HALF_Y_FALLBACK, maxBottomCandidate);
  const innerLeft = Math.min(ARC_CX - INNER_HALF_X, minLeftCandidate);
  const innerRight = Math.max(ARC_CX + INNER_HALF_X, maxRightCandidate);

  const outerLeft = innerLeft - OUTER_OFFSET_X;
  const outerRight = innerRight + OUTER_OFFSET_X;
  const outerTop = innerTop - OUTER_OFFSET_Y;
  const outerBottom = innerBottom + OUTER_OFFSET_Y;

  // Assign each tooth label to the nearest allowed side of the inner rectangle.
  // Enforce quadrant constraints so labels never cross into other quadrants.
  sideBuckets = { top: [], right: [], bottom: [], left: [] };
  toothLabels.forEach(l => {
    const ax = l.anchor.x, ay = l.anchor.y;
    const spanX = Math.max(1, innerRight - innerLeft);
    const spanY = Math.max(1, innerBottom - innerTop);

    // Determine allowed sides based on tooth quadrant (do not cross quadrants).
    // Prefer using the tooth's FDI quadrant when available for stable quadrant
    // assignment; fall back to jaw+cx when fdi isn't present.
    const allowed = (function() {
      if (l.fdi && Number.isFinite(l.fdi)) {
        const q = Math.floor(l.fdi / 10);
        // FDI quadrant mapping: 1=upper-right, 2=upper-left, 3=lower-left, 4=lower-right
        if (q === 1) return ['top', 'right'];
        if (q === 2) return ['top', 'left'];
        if (q === 3) return ['bottom', 'left'];
        if (q === 4) return ['bottom', 'right'];
      }
      // default: use jaw + relative x if FDI not available
      if (!l.jaw) return ['top','right','bottom','left'];
      const isUpper = l.jaw === 'upper';
      const isRightSide = ax >= ARC_CX;
      if (isUpper && isRightSide) return ['top','right'];
      if (isUpper && !isRightSide) return ['top','left'];
      if (!isUpper && isRightSide) return ['bottom','right'];
      return ['bottom','left'];
    })();

    // compute normalized distance to each inner rect side but only consider allowed
    const d = {
      top:    Math.abs(ay - innerTop) / spanY,
      bottom: Math.abs(ay - innerBottom) / spanY,
      left:   Math.abs(ax - innerLeft) / spanX,
      right:  Math.abs(ax - innerRight) / spanX,
    };
    let bestSide = allowed[0];
    let bestVal = Infinity;
    for (const s of allowed) {
      if (d[s] < bestVal) { bestVal = d[s]; bestSide = s; }
    }
    sideBuckets[bestSide].push(l);
  });

  // Rebalance heuristic: when the top/bottom bands become dominated by
  // lateral teeth (posterior molars), prefer moving truly lateral items to
  // their vertical side (left/right) _within the same quadrant_ so they
  // don't push more central labels far horizontally. This is conservative
  // (only moves items that are clearly lateral) and preserves quadrant
  // constraints.
  (['top', 'bottom']).forEach((hb) => {
    const list = sideBuckets[hb];
    if (!list || !list.length) return;
    const widthSpan = Math.max(1, innerRight - innerLeft);
    const leftCut = innerLeft + widthSpan * 0.22;  // left lateral threshold
    const rightCut = innerRight - widthSpan * 0.22; // right lateral threshold
    // Iterate a copy since we'll mutate the original
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      const ax = l.anchor.x;
      // If anchor is strongly left and label is allowed on left, move it
      if (ax <= leftCut) {
        // check quadrant allowance
        const allowed = (function() {
          if (l.fdi && Number.isFinite(l.fdi)) {
            const q = Math.floor(l.fdi / 10);
            if (q === 1) return ['top','right'];
            if (q === 2) return ['top','left'];
            if (q === 3) return ['bottom','left'];
            if (q === 4) return ['bottom','right'];
          }
          if (!l.jaw) return ['top','right','bottom','left'];
          const isUpper = l.jaw === 'upper';
          const isRightSide = ax >= ARC_CX;
          if (isUpper && isRightSide) return ['top','right'];
          if (isUpper && !isRightSide) return ['top','left'];
          if (!isUpper && isRightSide) return ['bottom','right'];
          return ['bottom','left'];
        })();
        if (allowed.includes('left')) {
          // pull out of horizontal band and push onto left side
          list.splice(i, 1);
          sideBuckets.left.push(l);
        }
      } else if (ax >= rightCut) {
        const allowed = (function() {
          if (l.fdi && Number.isFinite(l.fdi)) {
            const q = Math.floor(l.fdi / 10);
            if (q === 1) return ['top','right'];
            if (q === 2) return ['top','left'];
            if (q === 3) return ['bottom','left'];
            if (q === 4) return ['bottom','right'];
          }
          if (!l.jaw) return ['top','right','bottom','left'];
          const isUpper = l.jaw === 'upper';
          const isRightSide = ax >= ARC_CX;
          if (isUpper && isRightSide) return ['top','right'];
          if (isUpper && !isRightSide) return ['top','left'];
          if (!isUpper && isRightSide) return ['bottom','right'];
          return ['bottom','left'];
        })();
        if (allowed.includes('right')) {
          list.splice(i, 1);
          sideBuckets.right.push(l);
        }
      }
    }
  });

  // For each side, place as many as fit on the inner rectangle; overflow -> outer
  Object.entries(sideBuckets).forEach(([side, list]) => {
    if (!list.length) return;
    // available horizontal span along a side (in px), avoid corners by SIDE_PAD
    const span = (innerRight - innerLeft) - SIDE_PAD * 2;
    const slot = LABEL_W + 8; // desired slot width per card
    const capacityInner = Math.max(1, Math.floor(span / slot));
    // Try to assign as many as possible to inner slots based on proximity to tooth
    let assignedInner = [];
    let remaining = [];
      if (side === 'top' || side === 'bottom') {
        const y = side === 'top' ? innerTop : innerBottom;
        const xStart = innerLeft + SIDE_PAD + LABEL_W / 2;
        const xEnd = innerRight - SIDE_PAD - LABEL_W / 2;
        const { assigned, remaining: rem } = assignToNearestSlots(list, xStart, xEnd, capacityInner, l => l.anchor.x,
                                                                 { preferFDI: true, reservedXs: sinusReservedXs, reservedThreshold: LABEL_W + 16 });
        assignedInner = assigned; remaining = rem;
        // push assigned inner coords
        // small stagger on the horizontal side: alternate slight vertical offsets
        const staggerY = 10; // px
        assignedInner.forEach(a => {
          const parity = a.slotIndex % 2 === 0 ? -1 : 1;
          const cyOffset = parity * staggerY;
          positioned.push({ ...a.item, cx: clampCx(a.coord), cy: y + cyOffset, height: a.item._h });
        });
      }
    
    // remaining => outer
    const outer = remaining.length ? remaining : [];

    // compute coordinates for outer ring (stack outward along same side)
    if (outer.length > 0) {
      if (side === 'top' || side === 'bottom') {
        const y = side === 'top' ? outerTop : outerBottom;
        const xStart = outerLeft + SIDE_PAD + LABEL_W / 2;
        const xEnd = outerRight - SIDE_PAD - LABEL_W / 2;
        const capacityOuter = Math.max(1, Math.floor((outerRight - outerLeft - SIDE_PAD * 2) / slot));
        const { assigned: assignedO, remaining: remO } = assignToNearestSlots(outer, xStart, xEnd, capacityOuter, l => l.anchor.x,
                                                                            { preferFDI: true, reservedXs: sinusReservedXs, reservedThreshold: LABEL_W + 16 });
        // outer ring also staggers to reduce visual overlap
        const outerStaggerY = 12;
        assignedO.forEach((a, idx) => {
          const parity = a.slotIndex % 2 === 0 ? -1 : 1;
          const cyOffset = parity * outerStaggerY;
          positioned.push({ ...a.item, cx: clampCx(a.coord), cy: y + cyOffset, height: a.item._h });
        });
        // any still-remaining (remO) fallback: place sequentially with small offsets
        remO.forEach((l, i) => {
          const xx = clampCx(xStart + ((i % capacityOuter) * (LABEL_W / 2)));
          positioned.push({ ...l, cx: xx, cy: y + Math.floor(i / capacityOuter) * (l._h + 6), height: l._h });
        });
      }
    }
  });

  // Left/right vertical placement using inner/outer rectangle edges and the
  // computed innerTop/innerBottom so labels avoid the teeth outline.
  ['left', 'right'].forEach((side) => {
    const list = sideBuckets[side];
    if (!list.length) return;
    // compute vertical slot based on label heights so vertical stacks aren't too tight
    const maxH = Math.max(...list.map(l => l._h || 36));
    // Increase vertical gap slightly to avoid overly cramped stacks on left/right
    const extraVertGap = 12; // tuning knob
    const slotV = Math.max(36, Math.round(maxH + extraVertGap)); // card height + gap
    const spanY = (innerBottom - innerTop) - SIDE_PAD * 2;
    const capacityInnerV = Math.max(1, Math.floor(spanY / slotV));

    // inner vertical slots (assign nearest by anchor.y)
    const yStart = innerTop + SIDE_PAD + slotV / 2;
    const yEnd = innerBottom - SIDE_PAD - slotV / 2;
    const { assigned: assignedV, remaining: remV } = assignToNearestSlots(list, yStart, yEnd, capacityInnerV, l => l.anchor.y, { preferFDI: false });
    // vertical inner slots: alternate a small horizontal offset to create a subtle
    // stagger so labels don't form a single dense column
    const staggerX = Math.round(LABEL_W * 0.12); // small horizontal nudge
    assignedV.forEach(a => {
      const baseX = side === 'left' ? innerLeft : innerRight;
      const dirSign = side === 'left' ? -1 : 1;
      const parity = a.slotIndex % 2 === 0 ? 0 : 1; // alternate every other slot
      const x = baseX + dirSign * (parity * staggerX);
      positioned.push({ ...a.item, cx: clampCx(x), cy: a.coord, height: a.item._h });
    });

    // outer vertical spill: place in a stable outer column (no zigzag). If more
    // items than one outer column, create additional outer columns stepping outward.
    if (remV.length > 0) {
      const yStartO = outerTop + SIDE_PAD + slotV / 2;
      const yEndO = outerBottom - SIDE_PAD - slotV / 2;
      const capacityOuterV = Math.max(1, Math.floor((outerBottom - outerTop - SIDE_PAD * 2) / slotV));
      const { assigned: assignedVO, remaining: remVO } = assignToNearestSlots(remV, yStartO, yEndO, capacityOuterV, l => l.anchor.y, { preferFDI: false });
      // primary outer column
      // outer vertical columns: apply a small alternating nudge per item so the
      // visual stack appears staggered (not zigzag, but offset columns)
      assignedVO.forEach((a, i) => {
        const colIndex = Math.floor(i / capacityOuterV); // when many, create extra columns
        const baseX = side === 'left' ? outerLeft : outerRight;
        const dirSign = side === 'left' ? -1 : 1;
        const baseColX = baseX + dirSign * (colIndex * (LABEL_W / 2 + 6));
        // alternate small x nudge to create a stepped/staggered appearance
        const nudge = (i % 2 === 0) ? 0 : dirSign * Math.round(LABEL_W * 0.08);
        const x = baseColX + nudge;
        positioned.push({ ...a.item, cx: clampCx(x), cy: a.coord, height: a.item._h });
      });
      // any still-remaining: stack further outward columns
      remVO.forEach((l, i) => {
        const colIndex = Math.floor(i / capacityOuterV) + Math.ceil(assignedVO.length / capacityOuterV);
        const baseX = side === 'left' ? outerLeft : outerRight;
        const dirSign = side === 'left' ? -1 : 1;
        const baseColX = baseX + dirSign * (colIndex * (LABEL_W / 2 + 6));
        const nudge = (i % 2 === 0) ? 0 : dirSign * Math.round(LABEL_W * 0.08);
        const x = baseColX + nudge;
        const yy = yStartO + (i % capacityOuterV) * (l._h + 6) + Math.floor(i / capacityOuterV) * 6;
        positioned.push({ ...l, cx: clampCx(x), cy: yy, height: l._h });
      });
    }
  });

  // Sinus: stacked vertically above sinus anchor
  ['sinus-right', 'sinus-left'].forEach(zoneKey => {
    (zoneBuckets[zoneKey] || []).forEach((l, i) => {
      const h = 14 + l.items.length * 18 + 10;
      // Place sinus labels above the inner rectangle (outer-top region) so they
      // don't overlap tooth labels on the top band. Stack outward from outerTop.
      const baseY = outerTop - 12; // just above the outer top line
      positioned.push({ ...l, cx: l.anchor.x, cy: baseY - i * (h + 8), height: h });
    });
  });

  // Arch: single slot centered at top/bottom
  ['arch-upper', 'arch-lower'].forEach(zoneKey => {
    (zoneBuckets[zoneKey] || []).forEach((l, i) => {
      const h = 14 + l.items.length * 18 + 10;
      const baseY = zoneKey === 'arch-upper' ? 60 : 730;
      positioned.push({ ...l, cx: ARC_CX, cy: baseY + i * (h + 10), height: h });
    });
  });

  // Ortho: fixed mid-right
  (zoneBuckets['ortho'] || []).forEach((l, i) => {
    const h = 14 + l.items.length * 18 + 10;
    positioned.push({ ...l, cx: 1540, cy: 410 + i * (h + 10), height: h });
  });

  // Allow manual overrides from stored positions: if a label has a stored
  // position (by key) use it instead of the computed position; include a
  // locked flag so dragging can be disabled per-label. This produces the
  // final array we will render and interact with.
   const finalPositioned = positioned.map((l) => {
     const k = labelKeyFor(l);
     const eff = effectivePositionForKey(k);
     if (eff && typeof eff.cx === 'number' && typeof eff.cy === 'number') {
       return { ...l, cx: eff.cx, cy: eff.cy, height: l.height, _locked: !!eff.locked, _labelKey: k };
     }
     return { ...l, _locked: false, _labelKey: k };
   });

  // --- Pointer drag helpers ---
  const getSvgPointFromEvent = (evt) => {
    // Prefer the element the handler is bound to (currentTarget) which is
    // stable; fall back to target.closest('svg') when necessary.
    const el = evt.currentTarget || evt.target;
    const svg = (el && (el.ownerSVGElement || (el.closest && el.closest('svg')))) || document.querySelector('svg.arch-svg');
    if (!svg) return { x: evt.clientX, y: evt.clientY };
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: evt.clientX, y: evt.clientY };
    return pt.matrixTransform(ctm.inverse());
  };

  const startDrag = (evt, key, cx, cy) => {
    if (!manualPlacementMode) return;
    // Allow session-only dragging even for DEFAULT_LABEL_POSITIONS entries.
    // Defaults remain immutable for persistence and cannot be toggled via
    // toggleLock (they will still appear locked permanently), but the user
    // should be able to reposition them for the running session to preview.
    // Respect locked flags in session or persistent positions
    const curLock = (sessionPositions && sessionPositions[key] && sessionPositions[key].locked) ||
                    (persistentPositions && persistentPositions[key] && persistentPositions[key].locked);
    if (curLock) return;
    evt.stopPropagation(); evt.preventDefault();
    const p = getSvgPointFromEvent(evt);
    // Capture the actual element we called from so we can release pointer
    // capture on the same node later (avoid stale/removed node errors).
    const el = evt.currentTarget || evt.target;
    dragRef.current = { key, dx: p.x - cx, dy: p.y - cy, pid: evt.pointerId, el };
    try { el && el.setPointerCapture && el.setPointerCapture(evt.pointerId); } catch (e) {}
    const move = (ev) => {
      const cur = dragRef.current; if (!cur || cur.key !== key) return;
      const q = getSvgPointFromEvent(ev);
      const nx = q.x - cur.dx; const ny = q.y - cur.dy;
      // Update only in-session positions — do not persist these edits.
      setSessionPositions((prev) => {
        const next = { ...(prev || {}) };
        next[key] = { ...(next[key] || {}), cx: nx, cy: ny, locked: !!(next[key] && next[key].locked) };
        return next;
      });
    };
    const up = (ev) => {
      try { if (dragRef.current && dragRef.current.el && dragRef.current.el.releasePointerCapture) {
        dragRef.current.el.releasePointerCapture && dragRef.current.el.releasePointerCapture(dragRef.current.pid);
      } } catch (e) {}
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      dragRef.current = { key: null, dx: 0, dy: 0, pid: null };
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const toggleLock = (key) => {
    // Immutable defaults cannot be unlocked/locked by webpage functions
    if (key in DEFAULT_LABEL_POSITIONS) return;
    // Toggle lock in session positions only (session-scoped change)
    setSessionPositions((prev) => {
      const next = { ...(prev || {}) };
      const cur = next[key] || persistentPositions[key] || {};
      next[key] = { ...cur, locked: !cur.locked, cx: cur.cx, cy: cur.cy };
      return next;
    });
  };

  // ── 3. Render ─────────────────────────────────────────────────────────────

  return (
    <g className="label-layer">
      {/* Debug overlay: inner/outer rectangles and sinus reserved lines */}
      {debugGuides && (
        <g pointerEvents="none" opacity="0.9">
          {/* Inner rect */}
          <rect x={innerLeft} y={innerTop} width={innerRight - innerLeft} height={innerBottom - innerTop}
                fill="none" stroke="rgba(34,139,230,0.22)" strokeWidth="2" strokeDasharray="6 4" />
          {/* Outer rect */}
          <rect x={outerLeft} y={outerTop} width={outerRight - outerLeft} height={outerBottom - outerTop}
                fill="none" stroke="rgba(34,139,70,0.16)" strokeWidth="2" strokeDasharray="4 4" />
          {/* Sinus reserved X guide lines */}
          {sinusReservedXs.map((sx, i) => (
            <line key={`sr-${i}`} x1={sx} x2={sx} y1={0} y2={800} stroke="rgba(180,20,180,0.12)" strokeWidth="1" />
          ))}
          {/* Tooth anchor points */}
          {labels.map((l, i) => (
            <circle key={`a-${i}`} cx={l.anchor.x} cy={l.anchor.y} r="3" fill="rgba(0,0,0,0.12)" />
          ))}
        </g>
      )}
      {/* Connectors (behind cards) */}
      {finalPositioned.map((l, i) => {
        const { path } = connectorPath(l.cx, l.cy, LABEL_W / 2, l.height / 2, l.anchor.x, l.anchor.y);
        return (
          <g key={`led-${i}`}>
            <path d={path} stroke={accent} strokeWidth="1.1" fill="none"
                  opacity="0.5" strokeLinejoin="round" />
            <circle cx={l.anchor.x} cy={l.anchor.y} r="2.4" fill={accent} />
          </g>
        );
      })}

      {/* Label cards */}
      {finalPositioned.map((l, i) => {
        const x = l.cx - LABEL_W / 2;
        const y = l.cy - l.height / 2;
        // label group now supports pointer-based manual dragging when
        // manualPlacementMode is enabled. Double-click toggles lock.
        return (
           <g key={`lab-${i}`}
              transform={`translate(${x}, ${y})`}
              onDoubleClick={() => toggleLock(l._labelKey)}
              style={{ pointerEvents: manualPlacementMode ? 'all' : 'auto', cursor: manualPlacementMode ? (l._locked ? 'not-allowed' : 'grab') : 'default' }}>
             <rect x="0" y="0" width={LABEL_W} height={l.height}
                   rx="8" fill="var(--card-bg)"
                   stroke="var(--card-border)" strokeWidth="1"
                   onPointerDown={(e) => startDrag(e, l._labelKey, l.cx, l.cy)}
                   style={{ touchAction: 'none', filter: 'drop-shadow(0 6px 16px rgba(20,30,50,0.12))' }} />
            <text x="12" y="16" fontSize="10" fill={accent}
                  fontFamily="var(--sans)" fontWeight="600"
                  pointerEvents="none"
                  style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {l.kind === 'tooth'     ? `Tooth ${l.toothId.split('-')[1]}` :
               l.kind === 'sinus'    ? `Sinus · ${l.target === 'right' ? 'R' : 'L'}` :
               l.kind === 'arch'     ? (l.target === 'upper' ? 'Maxilla' : 'Mandible') :
                                       'Full mouth'}
            </text>
            {l.items.map((txId, j) => {
              const yy = 36 + j * 18;
              return (
                <g key={j}>
                  <text x="12" y={yy} fontSize="12.5" fill="var(--ink)"
                        fontFamily="var(--sans)" pointerEvents="none">
                    {TX_LABEL[txId] || txId}
                  </text>
                  <g style={{ cursor: 'pointer' }}
                     onClick={(e) => {
                       e.stopPropagation();
                       if (l.kind === 'tooth')      onRemoveTooth(l.toothId, txId);
                       else if (l.kind === 'sinus') onRemoveOther(txId, l.target);
                       else if (l.kind === 'arch')  onRemoveOther(txId, l.target);
                       else                         onRemoveOther(txId, 'both');
                     }}>
                    <circle cx={LABEL_W - 14} cy={yy - 4} r="8" fill="transparent" />
                    <line x1={LABEL_W - 18} y1={yy - 8} x2={LABEL_W - 10} y2={yy}
                          stroke="var(--ink-muted)" strokeWidth="1.4" strokeLinecap="round" />
                    <line x1={LABEL_W - 10} y1={yy - 8} x2={LABEL_W - 18} y2={yy}
                          stroke="var(--ink-muted)" strokeWidth="1.4" strokeLinecap="round" />
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// Treatment popover — anchored in screen space, with conditional availability
// ============================================================================

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
