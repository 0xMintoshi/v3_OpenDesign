import React from 'react';
import { CrownOverlay } from '../treatment-overlays/CrownOverlay.jsx';
import { BridgeSpanOverlay, bridgeContactStrokePath, CONTACT_STROKE_WIDTH, bridgeContactPoint, crownDepth } from '../treatment-overlays/BridgeSpanOverlay.jsx';
import { CompleteDentureOverlay } from '../treatment-overlays/CompleteDentureOverlay.jsx';
import { PartialDentureOverlay } from '../treatment-overlays/PartialDentureOverlay.jsx';
import { ClearAlignerOverlay } from '../treatment-overlays/ClearAlignerOverlay.jsx';
import { useChartState } from '../core/chart-context.jsx';
import { proximalExtreme } from '../core/tooth-split.js';
import { fittedImplantCrownRatio, fittedImplantCrownPath } from '../core/implant-crown-path.js';
import { toothPaths } from '../layout/teeth-data.jsx';
import { toothYAdjust } from '../core/marquee-select.js';
import { cervicalPoints, scallopRL, sinusFloorY } from '../core/arch-math.js';
import archSinusR from '../shapes-data/anatomy/arch-sinus-right.json';
import archSinusL from '../shapes-data/anatomy/arch-sinus-left.json';


// ============================================================================
// Treatment catalog, overlay renderers, popover, stage chrome — flat schematic.
// ============================================================================

const TX_GROUPS = [
  {
    label: 'Extraction',
    scope: 'tooth',
    items: [
      { id: 'extraction',                  label: 'Extraction',                   hint: 'remove tooth · present teeth only',             requires: 'present-tooth' },
      { id: 'simple-surgical-extraction', label: 'Simple Surgical Extraction',   hint: 'surgical removal · present teeth only · SF812T',  requires: 'present-tooth' },
      { id: 'complex-surgical-extraction',label: 'Complex Surgical Extraction',  hint: 'complex surgical removal · present teeth only · SF813T', requires: 'present-tooth' },
    ],
  },
  {
    label: 'Implant',
    scope: 'tooth',
    items: [
      { id: 'implant-crown',        label: 'Implant + Crown',  hint: 'fixture · abutment · crown' },
      { id: 'implant-only',         label: 'Implant Only',     hint: 'fixture only · staged restoration' },
      { id: 'implant-bridge-span',  label: 'Implant Bridge',   hint: 'implant abutments at ends · joined crowns', requires: 'multi-tooth' },
    ],
  },
  {
    label: 'Restoration',
    scope: 'tooth',
    items: [
      { id: 'crown',       label: 'Crown',        hint: 'full-coverage crown · existing tooth', requires: 'present-tooth' },
      { id: 'bridge-span', label: 'Bridge (span)', hint: 'pontic spanning selected teeth', requires: 'multi-tooth' },
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
    ],
  },
  {
    label: 'Orthodontics · full mouth',
    scope: 'full-mouth',
    items: [
      { id: 'ortho-brackets', label: 'Metal Braces',         hint: 'fixed appliance, both arches',
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
  'implant-bridge-span',
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

// fittedImplantCrownRatio and fittedImplantCrownPath live in core/implant-crown-path.js

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

// Shared fixture block: collar + tapered body + threads.
// Rendered inside a coordinate space already translated to tooth center and
// flipped for jaw direction. crownH tells it where the crown ends so the
// collar is placed at the right depth.
function ImplantFixtureBlock({ tooth, crownH, ratios, accent }) {
  const fixtureW = tooth.w * ratios.fixtureW;
  const fixtureH = tooth.h * ratios.fixtureH;
  const collarW = tooth.w * ratios.collarW;
  const collarY = -crownH - 1.5;
  const topY = collarY - 2;
  const bottomY = topY - fixtureH;
  const tipW = fixtureW * 0.56;

  return (
    <g>
      <rect x={-collarW / 2} y={collarY - 3} width={collarW} height="6" rx="1.4"
            fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.9" />
      <path
        d={`M ${-fixtureW / 2} ${topY}
            L ${-tipW / 2} ${bottomY + fixtureW * 0.20}
            Q ${-tipW / 2} ${bottomY}, 0 ${bottomY}
            Q ${tipW / 2} ${bottomY}, ${tipW / 2} ${bottomY + fixtureW * 0.20}
            L ${fixtureW / 2} ${topY}
            Z`}
        fill="var(--tooth-fill)" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      {Array.from({ length: ratios.threadCount }).map((_, i) => {
        const t = (i + 1) / (ratios.threadCount + 1);
        const yy = topY + (bottomY - topY) * t;
        const taper = 1 - Math.max(0, (t - 0.65) * 0.55);
        const tw = Math.max(4, (fixtureW / 2) * taper - 1.6);
        return (
          <path
            key={i}
            d={`M ${-tw} ${yy} Q 0 ${yy - 2.1}, ${tw} ${yy}`}
            stroke={accent} strokeWidth="1.0" fill="none" strokeLinecap="round" opacity="1"
          />
        );
      })}
    </g>
  );
}

function FittedImplantOverlay({ tooth, biteY, withCrown, accent }) {
  const flipY = tooth.jaw === 'lower' ? -1 : 1;
  const ratios = fittedImplantClassRatios(tooth.type);
  const crownH = tooth.h * fittedImplantCrownRatio(tooth.type);

  return (
    <g
      transform={`translate(0, ${biteY}) translate(${tooth.cx}, ${(tooth.yOffset || 0) * flipY + toothYAdjust(tooth)}) scale(1, ${flipY}) rotate(${tooth.tilt || 0})`}
      style={{ pointerEvents: 'none' }}>
      {withCrown && (
        <path
          d={fittedImplantCrownPath(tooth, crownH)}
          fill="var(--tooth-fill)"
          stroke={accent}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round" />
      )}
      <ImplantFixtureBlock tooth={tooth} crownH={crownH} ratios={ratios} accent={accent} />
    </g>
  );
}

export function ExistingImplantLayer({ allTeeth, upperBiteY, lowerBiteY, presence }) {
  const implantTeeth = allTeeth.filter(t => presence?.[t.id] === 'implant');
  if (!implantTeeth.length) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {implantTeeth.map(tooth => {
        const biteY = tooth.jaw === 'upper' ? upperBiteY : lowerBiteY;
        return (
          <FittedImplantOverlay
            key={tooth.id}
            tooth={tooth}
            biteY={biteY}
            withCrown={true}
            accent="var(--tooth-stroke)" />
        );
      })}
    </g>
  );
}

// Hourglass connector tuning for implant bridges
const IBS_OCCLUSO_GINGIVAL_SPAN = 0.16; // ± fraction of avg crown height around contact centre
const IBS_OCC_WAIST = 0.1;              // how deep the occlusal V dips (0 = flat)
const IBS_GIN_WAIST = 0.3;             // how deep the gingival arc dips
const IBS_CONTACT_HEIGHT = 0.250;        // contact centre: 0 = gingival base, 1 = occlusal tip

function toGlobalImplant(tooth, biteY, flipY, lx, ly) {
  const tilt = ((tooth.tilt || 0) * Math.PI) / 180;
  const rx = lx * Math.cos(tilt) - ly * Math.sin(tilt);
  const ry = lx * Math.sin(tilt) + ly * Math.cos(tilt);
  return {
    x: tooth.cx + rx,
    y: biteY + (tooth.yOffset || 0) * flipY + ry * flipY,
  };
}

function implantBridgeConnectorPath(tooth, next, biteY, flipY) {
  const crownHA = tooth.h * fittedImplantCrownRatio(tooth.type);
  const crownHB = next.h  * fittedImplantCrownRatio(next.type);
  const crownPathA = fittedImplantCrownPath(tooth, crownHA);
  const crownPathB = fittedImplantCrownPath(next,  crownHB);

  // x from proximal extreme; y anchored at the true contact zone (not the gingival bulge)
  const cpA = proximalExtreme(crownPathA, +1);
  const cpB = proximalExtreme(crownPathB, -1);
  const contactYA = -crownHA * IBS_CONTACT_HEIGHT; // local y: negative = toward occlusal
  const contactYB = -crownHB * IBS_CONTACT_HEIGHT;

  const avgDepth = (crownHA + crownHB) / 2;
  const delta = avgDepth * IBS_OCCLUSO_GINGIVAL_SPAN;

  // Four corners in global space (per-tooth transform applied)
  const Ao = toGlobalImplant(tooth, biteY, flipY, cpA.x, contactYA - delta);
  const Ag = toGlobalImplant(tooth, biteY, flipY, cpA.x, contactYA + delta);
  const Bo = toGlobalImplant(next,  biteY, flipY, cpB.x, contactYB - delta);
  const Bg = toGlobalImplant(next,  biteY, flipY, cpB.x, contactYB + delta);

  // Level horizontal edges across both teeth (eliminates tilt from arch curvature / yOffset)
  const occY = (Ao.y + Bo.y) / 2;
  const ginY = (Ag.y + Bg.y) / 2;

  const midOcc     = { x: (Ao.x + Bo.x) / 2, y: occY };
  const midGin     = { x: (Ag.x + Bg.x) / 2, y: ginY };
  const midContact = { x: (midOcc.x + midGin.x) / 2, y: (occY + ginY) / 2 };

  const occApex = {
    x: midOcc.x + (midContact.x - midOcc.x) * IBS_OCC_WAIST,
    y: midOcc.y + (midContact.y - midOcc.y) * IBS_OCC_WAIST,
  };
  const ginApex = {
    x: midGin.x + (midContact.x - midGin.x) * IBS_GIN_WAIST,
    y: midGin.y + (midContact.y - midGin.y) * IBS_GIN_WAIST,
  };

  const f = (n) => parseFloat(n.toFixed(3));
  return [
    `M ${f(Ao.x)} ${f(occY)}`,
    `Q ${f(occApex.x)} ${f(occApex.y)} ${f(Bo.x)} ${f(occY)}`,
    `L ${f(Bg.x)} ${f(ginY)}`,
    `Q ${f(ginApex.x)} ${f(ginApex.y)} ${f(Ag.x)} ${f(ginY)}`,
    'Z',
  ].join(' ');
}

export function ImplantBridgeSpanOverlay({ teeth, biteY, accent }) {
  if (!teeth || teeth.length === 0) return null;
  const jaw = teeth[0].jaw;
  const flipY = jaw === 'upper' ? 1 : -1;
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Pass 1: hourglass connectors — bottom layer */}
      {sorted.slice(0, -1).map((tooth, i) => {
        const next = sorted[i + 1];
        return (
          <path
            key={`${tooth.id}-${next.id}-ibridge-contact`}
            d={implantBridgeConnectorPath(tooth, next, biteY, flipY)}
            fill={accent}
            stroke="none" />
        );
      })}
      {/* Pass 2: crowns — white fill masks connector overlap */}
      {sorted.map((tooth) => {
        const crownH = tooth.h * fittedImplantCrownRatio(tooth.type);
        return (
          <g key={`crown-${tooth.id}`}
             transform={`translate(${tooth.cx}, ${biteY + (tooth.yOffset || 0) * flipY}) scale(1, ${flipY}) rotate(${tooth.tilt || 0})`}>
            <path
              d={fittedImplantCrownPath(tooth, crownH)}
              fill="var(--tooth-fill)"
              stroke={accent}
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round" />
          </g>
        );
      })}
      {/* Pass 3: fixtures + abutment — top layer so collar sits above crown */}
      {sorted.map((tooth) => {
        const ratios = fittedImplantClassRatios(tooth.type);
        const crownH = tooth.h * fittedImplantCrownRatio(tooth.type);
        const isEndpoint = tooth.id === first.id || tooth.id === last.id;
        if (!isEndpoint) return null;
        return (
          <g key={`fix-${tooth.id}`}
             transform={`translate(${tooth.cx}, ${biteY + (tooth.yOffset || 0) * flipY}) scale(1, ${flipY}) rotate(${tooth.tilt || 0})`}>
            <ImplantFixtureBlock tooth={tooth} crownH={crownH} ratios={ratios} accent={accent} />
          </g>
        );
      })}
    </g>
  );
}

// ============================================================================
// Bone graft overlay
// ============================================================================
// socket-preservation: sparse dots clipped to the tooth's root outline (contained socket cavity)
// simultaneous-graft:  medium-dense ridge field lifted apically (top edge matches GBR)
// gbr:                 widest + densest ridge field
function BoneGraftOverlay({ tooth, biteY, variant, accent }) {
  const { cx, w, h, jaw, type, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;

  // ── Socket Preservation: root-outline clip ──────────────────────────────
  if (variant === 'socket-preservation') {
    const paths = toothPaths(type, w, h);
    const incisorShift = type === 'incisor' ? h * 0.03 : 0;
    const canineShift  = type === 'canine'  ? h * -0.02 : 0;
    const yAdjust = jaw === 'upper' ? -(incisorShift + canineShift) : (incisorShift + canineShift);
    const clipId = `socket-clip-${tooth.id}`;

    // Sparse dot grid over tooth-local box; confine with clip to root shape
    const density = 1.0;
    const cols = Math.round(10 * density);
    const rows = Math.round(14 * density);
    const seedX = Math.round(Math.abs(cx) * 1.37 + 13) % 10000;
    function rnd(i) { return ((seedX + i * 9301 + 49297) % 233280) / 233280; }
    const dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (c / Math.max(1, cols - 1) - 0.5) * w + (rnd(r * cols + c) - 0.5) * 2.6;
        const py = -(r / Math.max(1, rows - 1)) * h * 0.80 - 2 + (rnd(r * cols + c + 99) - 0.5) * 2;
        const radius = 0.9 + rnd(r * cols + c + 200) * 0.6;
        dots.push({ px, py, radius });
      }
    }

    return (
      <g transform={`translate(${cx}, ${biteY + yOffset * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tilt})`}
         style={{ pointerEvents: 'none' }}>
        <defs>
          <clipPath id={clipId}>
            <path d={paths.root} />
          </clipPath>
        </defs>
        <path d={paths.root} fill={accent} fillOpacity="0.06"
              stroke={accent} strokeWidth="1.0" strokeDasharray="3 3" opacity="0.8" />
        <g clipPath={`url(#${clipId})`}>
          {dots.map((d, i) => (
            <circle key={i} cx={d.px} cy={d.py} r={d.radius} fill={accent} opacity={0.75} />
          ))}
        </g>
      </g>
    );
  }

  // ── Ridge-field variants (simultaneous-graft + gbr) ─────────────────────
  const isGBR = variant === 'gbr';
  const GBR_CORONAL_INSET = 60;   // increase to push GBR field apically (away from crown)
  const SIM_CORONAL_INSET = 45;   // same for simultaneous
  const coronalInset = isGBR ? GBR_CORONAL_INSET : SIM_CORONAL_INSET;
  const fieldW = w * (isGBR ? 1.2 : 0.85);
  const GBR_FIELD_H = h * 0.5;
  const fieldH = isGBR ? GBR_FIELD_H : h * 0.40;
  // Lift simultaneous so its top edge matches GBR's top
  const yShift = isGBR ? 0 : (GBR_FIELD_H - fieldH) * 1.02;

  const density = variant === 'simultaneous-graft' ? 1.5 : /* gbr */ 3;
  const cols = Math.round(11 * density);
  const rows = Math.round(6 * density);

  const seedX = Math.round(Math.abs(cx) * 1.37 + (variant.charCodeAt(0) * 13)) % 10000;
  function rnd(i) { return ((seedX + i * 9301 + 49297) % 233280) / 233280; }

  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = (c / Math.max(1, cols - 1) - 0.5) * fieldW + (rnd(r * cols + c) - 0.5) * 2.6;
      const py = -(r / Math.max(1, rows - 1)) * fieldH - 1 + (rnd(r * cols + c + 99) - 0.5) * 2;
      const xn = px / (fieldW / 2);
      const yn = py / fieldH;
      if (xn * xn + yn * yn * 0.55 > 1) continue;
      const radius = 0.9 + rnd(r * cols + c + 200) * 0.6;
      dots.push({ px, py, radius });
    }
  }

  const boundary = `
    M ${-fieldW/2 + 4} ${-2}
    L ${-fieldW/2 + 4} ${-fieldH * 0.5}
    Q ${-fieldW/2} ${-fieldH * 0.95}, 0 ${-fieldH * 1.02}
    Q ${fieldW/2} ${-fieldH * 0.95}, ${fieldW/2 - 4} ${-fieldH * 0.5}
    L ${fieldW/2 - 4} ${-2}
    Z
  `;

  return (
    <g transform={`translate(${cx}, ${biteY}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
      <g transform={`translate(0, ${-(yShift + coronalInset)})`}>
        <path d={boundary} fill={accent} fillOpacity="0.06"
              stroke={accent} strokeWidth="1.0" strokeDasharray={isGBR ? '5 3' : '3 3'} opacity="0.8" />
        {dots.map((d, i) => (
          <circle key={i} cx={d.px} cy={d.py} r={d.radius} fill={accent} opacity={0.75} />
        ))}
      </g>
    </g>
  );
}

// ============================================================================
// Sinus lift — dense graft inside lifted membrane (flat schematic)
// ============================================================================

// ── Sinus lift tuning (adjust values only) ──────────────────────────────────
const SINUS_LIFT_FRAC     = 0.60;  // fraction of sinus height the membrane lifts
const SINUS_FLOOR_OFFSET  = -35;     // px: shift entire overlay up (negative) or down (positive)
const SINUS_LIFT_DOT_COLS = 22;
const SINUS_LIFT_DOT_ROWS = 6;
// ─────────────────────────────────────────────────────────────────────────────

const VW = 1600, VH = 800;

function sinusBoundsFor(side) {
  const shape = side === 'right' ? archSinusR : archSinusL;
  const xs = [], ys = [];
  for (const s of shape.segments) {
    if (s.x  !== undefined) { xs.push(s.x  * VW); ys.push(s.y  * VH); }
    if (s.y1 !== undefined) {                      ys.push(s.y1 * VH); }
  }
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  return {
    cx:     (xMin + xMax) / 2,
    xMin,
    xMax,
    floorY: Math.max(...ys),
    ceilY:  Math.min(...ys),
  };
}

function SinusLiftOverlay({ side, accent }) {
  const { cx, xMin, xMax, floorY, ceilY } = sinusBoundsFor(side);
  const baseY = floorY + SINUS_FLOOR_OFFSET;
  const liftY = floorY + SINUS_FLOOR_OFFSET - (floorY - ceilY) * SINUS_LIFT_FRAC;
  const w     = xMax - xMin;

  const cpY = 2 * liftY - baseY;
  const dome = `M ${cx - w/2} ${baseY} Q ${cx} ${cpY}, ${cx + w/2} ${baseY}`;
  const fillRegion = `
    M ${cx - w/2} ${baseY}
    Q ${cx} ${cpY}, ${cx + w/2} ${baseY}
    L ${cx + w/2 - 4} ${baseY + 6}
    Q ${cx} ${baseY + 8}, ${cx - w/2 + 4} ${baseY + 6}
    Z
  `;

  // Dense graft particulate inside dome
  const dots = [];
  const cols = SINUS_LIFT_DOT_COLS, rows = SINUS_LIFT_DOT_ROWS;
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

    </g>
  );
}

// ============================================================================
// Alveolectomy band — grey region from bone scallop crest to flat resection line.
// Upper: fixed depth above highest crest point. Lower: fixed depth below lowest crest point.
// ============================================================================

const ALVEOLECTOMY_UPPER_DEPTH = 10; // px above highest crest point; tunable
const ALVEOLECTOMY_LOWER_DEPTH = 10; // px below lowest crest point; tunable
const WISDOM_FDI = new Set([18, 28, 38, 48]);

function AlveolectomyBand({ arch, teeth, biteY }) {
  const isUpper = arch === 'upper';
  // Stop at second molars — exclude wisdom teeth (t.id is "upper-18" etc; use t.fdi)
  const bandTeeth = teeth.filter(t => !WISDOM_FDI.has(t.fdi));
  const cervical = cervicalPoints(bandTeeth, biteY, arch);
  if (!cervical.length) return null;

  const first = cervical[0];
  const last  = cervical[cervical.length - 1];
  const leftX  = first.x - first.w * 0.55;
  const rightX = last.x  + last.w  * 0.55;

  const farY = isUpper
    ? Math.min(...cervical.map(t => t.y)) - ALVEOLECTOMY_UPPER_DEPTH
    : Math.max(...cervical.map(t => t.y)) + ALVEOLECTOMY_LOWER_DEPTH;

  // rDir: direction from flat edge into the band (+1 upper goes down, -1 lower goes up).
  const peakDir = isUpper ? -1 : 1;
  const rDir = isUpper ? 1 : -1;
  const r = 14;

  const bandPath = `
    M ${leftX + r} ${farY}
    L ${rightX - r} ${farY}
    Q ${rightX} ${farY} ${rightX} ${farY + rDir * r}
    L ${rightX} ${last.y}
    L ${last.x + last.w * 0.5} ${last.y}
    ${scallopRL(cervical, peakDir)}
    L ${first.x - first.w * 0.5} ${first.y}
    L ${leftX} ${farY + rDir * r}
    Q ${leftX} ${farY} ${leftX + r} ${farY}
    Z`;

  // Scallop-only path: erase the bone's solid crest line, replace with dotted.
  const scallopPath = `
    M ${rightX} ${last.y}
    L ${last.x + last.w * 0.5} ${last.y}
    ${scallopRL(cervical, peakDir)}
    L ${first.x - first.w * 0.5} ${first.y}
    L ${leftX} ${first.y}`;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={bandPath} fill="#aaaaaa" fillOpacity="0.28" stroke="none" />
      {/* Erase solid bone scallop, replace with dotted resection line */}
      <path d={scallopPath} fill="none" stroke="var(--bg-1)" strokeWidth="4" />
      <path d={scallopPath} fill="none" stroke="#888888" strokeWidth="1.4" strokeOpacity="0.70" strokeDasharray="4 3" />
    </g>
  );
}

// ============================================================================
// Complete denture — outlined denture sitting on edentulous arch (flat)
// ============================================================================

// ============================================================================
// Metal Braces — crown-centred brackets (honours tilt + yOffset) + archwire
// threading through the middle of each bracket's sides
// ============================================================================

function OrthoBrackets({ teeth, biteY, jaw, accent, presence }) {
  const flipY = jaw === 'upper' ? 1 : -1;
  const BW = 14.52, BH = 10.89; // +20% vs old 12×9
  const halfW = BW / 2, halfH = BH / 2;

  // Only present teeth get brackets; missing teeth skip but wire bridges gap
  const present = [...teeth]
    .filter(t => presence?.[t.id] !== 'missing')
    .sort((a, b) => a.cx - b.cx);
  if (!present.length) return null;

  // Map a point in a tooth's local crown frame to global SVG coords.
  // Crown-local frame: origin at tooth base on bite line, +y apical (into root).
  // Crown midpoint is at local (0, -crownDepth/2) before flipY/tilt.
  const toGlobal = (t, lx, ly) => {
    const rad = ((t.tilt ?? 0) * Math.PI) / 180;
    const Ty  = biteY + (t.yOffset ?? 0) * flipY + toothYAdjust(t);
    // rotate(tilt) then scale(1, flipY)
    const rx = lx * Math.cos(rad) - ly * Math.sin(rad);
    const ry = lx * Math.sin(rad) + ly * Math.cos(rad);
    return { x: t.cx + rx, y: Ty + flipY * ry };
  };

  // For each present tooth, compute left/right midpoints of the bracket sides
  const nodes = present.map(t => {
    const cyLocal = -crownDepth(t.type, t.h) / 2;
    return {
      t,
      left:  toGlobal(t, -halfW, cyLocal),
      right: toGlobal(t, +halfW, cyLocal),
      Ty:    biteY + (t.yOffset ?? 0) * flipY + toothYAdjust(t),
      cyLocal,
    };
  });

  // Archwire: left-mid → right-mid per bracket, then right-mid → next left-mid across gap
  let wire = `M ${nodes[0].left.x} ${nodes[0].left.y} L ${nodes[0].right.x} ${nodes[0].right.y}`;
  for (let i = 1; i < nodes.length; i++) {
    wire += ` L ${nodes[i].left.x} ${nodes[i].left.y} L ${nodes[i].right.x} ${nodes[i].right.y}`;
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Archwire */}
      <path d={wire} stroke={accent} strokeWidth="2.0" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
      {/* Brackets — each rendered in tooth-local space so they inherit tilt */}
      {nodes.map(({ t, Ty, cyLocal }) => (
        <g key={t.id}
           transform={`translate(${t.cx}, ${Ty}) scale(1, ${flipY}) rotate(${t.tilt ?? 0})`}>
          <rect x={-halfW} y={cyLocal - halfH} width={BW} height={BH} rx="1.6"
                fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.3" />
          <line x1={-halfW} y1={cyLocal} x2={halfW} y2={cyLocal}
                stroke={accent} strokeWidth="0.9" opacity="0.55" />
          <line x1={0} y1={cyLocal - halfH} x2={0} y2={cyLocal + halfH}
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

function ExtractionOverlay({ tooth, biteY }) {
  const { cx, w, h, jaw, type, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jaw === 'upper' ? 1 : -1;
  const yAdjust = toothYAdjust(tooth);
  const paths = toothPaths(type, w, h);
  const halfLen = proximalExtreme(paths.crown, +1).x * 0.68;
  const thick = halfLen * 0.44;
  const rx = thick / 2;
  const cy = -crownDepth(type, h) / 2;
  const RED = '#d93025';
  const clipId = `ext-clip-${tooth.fdi}`;
  return (
    <g transform={`translate(${cx}, ${biteY + yOffset * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tilt})`} style={{ pointerEvents: 'none' }}>
      <defs>
        <clipPath id={clipId}>
          <path d={paths.crown} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={-halfLen} y={cy - rx} width={halfLen * 2} height={thick}
              rx={rx} fill={RED} transform={`rotate(45, 0, ${cy})`} />
        <rect x={-halfLen} y={cy - rx} width={halfLen * 2} height={thick}
              rx={rx} fill={RED} transform={`rotate(-45, 0, ${cy})`} />
      </g>
    </g>
  );
}

// ============================================================================
// TreatmentLayer — composes overlays from treatments[] state
// ============================================================================

function TreatmentLayer({ allTeeth, upperBiteY, lowerBiteY, archWidth, accent }) {
  const { treatments, presence } = useChartState();
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
          const teeth = arch === 'upper' ? upperTeeth : lowerTeeth;
          return <AlveolectomyBand key={`alv-${i}-${arch}`} arch={arch} teeth={teeth} biteY={biteY} />;
        }
        if (tx.id === 'complete-denture') {
          return <CompleteDentureOverlay key={`den-${i}-${arch}`} jaw={arch} accent={accent} biteY={biteY} archWidth={archWidth} />;
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
        const EXTRACTION_IDS = ['extraction', 'simple-surgical-extraction', 'complex-surgical-extraction'];
        const extractionOnly = txIds.length === 1 && EXTRACTION_IDS.includes(txIds[0]);
        return (
          <g key={toothId}>
            {extractionOnly && (
              <ExtractionOverlay tooth={tooth} biteY={biteY} />
            )}
            {list.map((tx, i) => {
              if (EXTRACTION_IDS.includes(tx.id)) return null; // visual handled above
              if (tx.id === 'implant-only' || tx.id === 'implant-crown') {
                return <FittedImplantOverlay key={i} tooth={tooth} biteY={biteY}
                                             withCrown={tx.id === 'implant-crown'} accent={accent} />;
              }
              if (tx.id === 'gbr' || tx.id === 'socket-preservation' || tx.id === 'simultaneous-graft') {
                return null; // rendered in bone-graft pass above
              }
              if (tx.id === 'crown') {
                return <CrownOverlay key={i} tooth={tooth} biteY={biteY} accent={accent} />;
              }
              if (tx.id === 'bridge-span' || tx.id === 'implant-bridge-span') return null; // rendered as span below
              return null;
            })}
          </g>
        );
      })}

      {/* Bridge spans (drawn over per-tooth overlays) */}
      {treatments.filter(t => t.id === 'bridge-span').map((tx, i) => {
        const spanTeeth = tx.targets.map(id => allTeeth.find(t => t.id === id)).filter(Boolean);
        if (spanTeeth.length === 0) return null;
        const hasNatural = tx.targets.some((id) =>
          presence[id] !== 'missing' &&
          presence[id] !== 'implant' &&
          !treatments.some((x) =>
            (x.id === 'implant-only' || x.id === 'implant-crown') && x.targets.includes(id))
        );
        const spanTeethByJaw = spanTeeth.reduce((groups, tooth) => {
          (groups[tooth.jaw] = groups[tooth.jaw] || []).push(tooth);
          return groups;
        }, {});
        return Object.entries(spanTeethByJaw).map(([jaw, jawTeeth]) => {
          const biteY = jaw === 'upper' ? upperBiteY : lowerBiteY;
          return <BridgeSpanOverlay key={`bs-${i}-${jaw}`} teeth={jawTeeth} biteY={biteY} accent={accent} useImplantForm={!hasNatural} />;
        });
      })}

      {/* Implant bridge spans */}
      {treatments.filter(t => t.id === 'implant-bridge-span').map((tx, i) => {
        const spanTeeth = tx.targets.map(id => allTeeth.find(t => t.id === id)).filter(Boolean);
        if (spanTeeth.length === 0) return null;
        const spanTeethByJaw = spanTeeth.reduce((groups, tooth) => {
          (groups[tooth.jaw] = groups[tooth.jaw] || []).push(tooth);
          return groups;
        }, {});
        return Object.entries(spanTeethByJaw).map(([jaw, jawTeeth]) => {
          const biteY = jaw === 'upper' ? upperBiteY : lowerBiteY;
          return <ImplantBridgeSpanOverlay key={`ibs-${i}-${jaw}`} teeth={jawTeeth} biteY={biteY} accent={accent} />;
        });
      })}

      {/* Full mouth ortho (drawn last, over teeth) */}
      {fullMouthTx.map((tx, i) => {
        if (tx.id === 'ortho-brackets') {
          return (
            <g key={i}>
              <OrthoBrackets teeth={upperTeeth} biteY={upperBiteY} jaw="upper" accent={accent} presence={presence} />
              <OrthoBrackets teeth={lowerTeeth} biteY={lowerBiteY} jaw="lower" accent={accent} presence={presence} />
            </g>
          );
        }
        if (tx.id === 'ortho-aligners') {
          return <ClearAlignerOverlay key={i} upper={upperTeeth} lower={lowerTeeth}
                                     upperBiteY={upperBiteY} lowerBiteY={lowerBiteY}
                                     accent={accent} />;
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

const CAT_GLYPHS = {
  'Extraction': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 38" fill="none">
      <path d="M9 18 C9 12 12 7 16 7 C20 7 23 12 23 18 C23 22 21 27 19 32 C18 35 17 37 16 37 C15 37 14 35 13 32 C11 27 9 22 9 18 Z"
            stroke="var(--tooth-stroke)" strokeWidth="1.3" fill="var(--tooth-fill)"/>
      <path d="M16 7 L16 2" stroke="var(--tooth-stroke)" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M13 5 L16 2 L19 5" stroke="var(--tooth-stroke)" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'Implant': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 44" fill="none">
      <path d="M10 2 C10 2 8 6 8 8 C8 9 9 10 10 10 L22 10 C23 10 24 9 24 8 C24 6 22 2 22 2 Z" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)"/>
      <rect x="11" y="11" width="10" height="4" rx="2" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)"/>
      <path d="M13 15 L11 36 Q11.5 38 16 38 Q20.5 38 21 36 L19 15 Z" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)"/>
      <path d="M11.2 20 Q16 22 20.8 20" stroke="var(--tooth-stroke)" strokeWidth="0.9" fill="none"/>
      <path d="M11.2 26 Q16 28 20.8 26" stroke="var(--tooth-stroke)" strokeWidth="0.9" fill="none"/>
      <path d="M11.5 32 Q16 34 20.5 32" stroke="var(--tooth-stroke)" strokeWidth="0.9" fill="none"/>
    </svg>
  ),
  'Restoration': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 36" fill="none">
      <path d="M6 30 L6 17 L10 23 L16 11 L22 23 L26 17 L26 30 Z"
            stroke="var(--tooth-stroke)" strokeWidth="1.3" fill="var(--tooth-fill)" strokeLinejoin="round"/>
      <line x1="5" y1="30" x2="27" y2="30" stroke="var(--tooth-stroke)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  'Bone graft': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 36" fill="none">
      <path d="M4 33 Q4 10 16 8 Q28 10 28 33 Z" stroke="var(--tooth-stroke)" strokeWidth="1.3" fill="var(--tooth-fill)"/>
      <circle cx="13" cy="17" r="1.4" fill="var(--tooth-stroke)" opacity="0.85"/>
      <circle cx="19" cy="17" r="1.4" fill="var(--tooth-stroke)" opacity="0.85"/>
      <circle cx="16" cy="22" r="1.4" fill="var(--tooth-stroke)" opacity="0.85"/>
      <circle cx="11" cy="26" r="1.4" fill="var(--tooth-stroke)" opacity="0.85"/>
      <circle cx="21" cy="26" r="1.4" fill="var(--tooth-stroke)" opacity="0.85"/>
    </svg>
  ),
  'Sinus': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 36" fill="none">
      <path d="M3 33 Q3 16 16 12 Q29 16 29 33" stroke="var(--tooth-stroke)" strokeWidth="1.3" fill="none"/>
      <ellipse cx="16" cy="21" rx="7.5" ry="5" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)" strokeDasharray="2.5 2"/>
    </svg>
  ),
  'Arch': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 36" fill="none">
      <path d="M4 34 L4 18 Q4 5 16 4 Q28 5 28 18 L28 34 Z" stroke="var(--tooth-stroke)" strokeWidth="1.3" fill="var(--tooth-fill)"/>
      <path d="M7 32 L7 23 M11 32 L11 19 M15 32 L15 18 M17 32 L17 18 M21 32 L21 19 M25 32 L25 23"
            stroke="var(--tooth-stroke)" strokeWidth="0.9" opacity="0.6"/>
    </svg>
  ),
  'Orthodontics · full mouth': (
    <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 36" fill="none">
      <path d="M4 30 Q4 9 16 6 Q28 9 28 30" stroke="var(--tooth-stroke)" strokeWidth="1.5" fill="none"/>
      <rect x="7" y="23" width="3.5" height="3" rx="0.4" stroke="var(--tooth-stroke)" strokeWidth="1" fill="var(--tooth-fill)"/>
      <rect x="14.25" y="18.5" width="3.5" height="3" rx="0.4" stroke="var(--tooth-stroke)" strokeWidth="1" fill="var(--tooth-fill)"/>
      <rect x="21.5" y="23" width="3.5" height="3" rx="0.4" stroke="var(--tooth-stroke)" strokeWidth="1" fill="var(--tooth-fill)"/>
    </svg>
  ),
};

function TreatmentPopover({ open, anchor, mode, target, archEdentulous, allPresent, allMissing, hasBridgeAbutment = false, hasBridgeGap = false, fullyEdentulous, onApply, onApplyBaseline, onClose }) {
  const [activeCategory, setActiveCategory] = React.useState(null);
  React.useEffect(() => { if (!open) setActiveCategory(null); }, [open]);
  if (!open) return null;

  if (mode === 'baseline') {
    const BW = 264;
    const bleft = Math.max(20, Math.min(window.innerWidth - BW - 20, anchor.x - BW / 2));
    const btop  = Math.max(20, Math.min(anchor.y + 18, window.innerHeight - 210));
    const btitle = Array.isArray(target) && target.length === 1
      ? `#${target[0].fdi}`
      : Array.isArray(target) && target.length > 1
        ? `#${target.slice(0, 6).map(t => t.fdi).join(' ')}${target.length > 6 ? ` +${target.length - 6}` : ''}`
        : '';
    return (
      <>
        <div className="popover-veil" onClick={onClose} />
        <div className="tx-popover tx-popover--baseline" style={{ left: bleft, top: btop, width: BW }}>
          <div className="tx-popover-head">
            <div>
              <div className="baseline-eyebrow">Mark as</div>
              <div className="tx-popover-title">{btitle}</div>
            </div>
            <button className="info-close" onClick={onClose} aria-label="close">×</button>
          </div>
          <div className="baseline-options">
            <button className="baseline-option" onClick={() => onApplyBaseline('missing')}>
              <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10 C6 5 10 2 16 2 C22 2 26 5 26 10 C26 15 24 20 22 26 C20 31 18 36 16 36 C14 36 12 31 10 26 C8 20 6 15 6 10 Z" stroke="var(--tooth-missing-stroke)" strokeWidth="1.5" strokeDasharray="3 3" fill="transparent" opacity="0.7"/>
              </svg>
              <span className="baseline-option-label">Missing</span>
            </button>
            <button className="baseline-option" onClick={() => onApplyBaseline('implant')}>
              <svg className="baseline-glyph" aria-hidden="true" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Crown cap */}
                <path d="M10 2 C10 2 8 6 8 8 C8 9 9 10 10 10 L22 10 C23 10 24 9 24 8 C24 6 22 2 22 2 Z" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)"/>
                {/* Collar bar */}
                <rect x="11" y="11" width="10" height="4" rx="2" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)"/>
                {/* Tapered body */}
                <path d="M13 15 L11 36 Q11.5 38 16 38 Q20.5 38 21 36 L19 15 Z" stroke="var(--tooth-stroke)" strokeWidth="1.2" fill="var(--tooth-fill)"/>
                {/* Thread curves */}
                <path d="M11.2 20 Q16 22 20.8 20" stroke="var(--tooth-stroke)" strokeWidth="0.9" fill="none"/>
                <path d="M11.2 26 Q16 28 20.8 26" stroke="var(--tooth-stroke)" strokeWidth="0.9" fill="none"/>
                <path d="M11.5 32 Q16 34 20.5 32" stroke="var(--tooth-stroke)" strokeWidth="0.9" fill="none"/>
              </svg>
              <span className="baseline-option-label">Existing implant</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  let groups = [];
  let title = '';

  if (mode === 'tooth') {
    groups = TX_GROUPS;
    title = target.length === 1
      ? `#${target[0].fdi}`
      : `#${target.slice(0, 6).map(t => t.fdi).join(' ')}${target.length > 6 ? ` +${target.length - 6}` : ''}`;
  } else if (mode === 'sinus') {
    groups = [SINUS_GROUP];
    title = target.side === 'right' ? 'Right Maxillary Sinus' : 'Left Maxillary Sinus';
  } else if (mode === 'arch') {
    groups = ARCH_GROUPS;
    title = target.arch === 'upper' ? 'Maxilla' : 'Mandible';
  }

  const W = 320;
  const left = Math.max(20, Math.min(window.innerWidth - W - 20, anchor.x - W / 2));

  const isAvailable = (item) => {
    if (item.requires === 'edentulous-arch') {
      if (mode !== 'arch') return false;
      return target.edentulous;
    }
    if (item.requires === 'present-tooth') return allPresent === true;
    if (item.requires === 'missing-tooth') {
      if (!allMissing) return false;
      if (item.id === 'implant-bridge-span') return Array.isArray(target) && target.length >= 2;
      return true;
    }
    if (item.id === 'partial-denture-upper' || item.id === 'partial-denture-lower') {
      return mode === 'arch' && !target.edentulous;
    }
    if (item.requires === 'dentate-patient') return fullyEdentulous !== true;
    if (item.id === 'bridge-span') {
      return Array.isArray(target) && target.length >= 2 && hasBridgeAbutment && hasBridgeGap;
    }
    if (item.requires === 'multi-tooth') return Array.isArray(target) && target.length >= 2;
    return true;
  };

  const availableGroups = groups.filter(g => g.items.some(isAvailable));
  // Single-group modes (sinus) skip the category screen
  const resolvedCategory = activeCategory ?? (availableGroups.length === 1 ? availableGroups[0].label : null);

  // ── Category grid ────────────────────────────────────────────────────────
  if (!resolvedCategory) {
    const POPOVER_H = 340;
    const top = Math.max(20, Math.min(anchor.y + 18, window.innerHeight - POPOVER_H - 20));
    return (
      <>
        <div className="popover-veil" onClick={onClose} />
        <div className="tx-popover" style={{ left, top, width: W }}>
          <div className="tx-popover-head">
            <div>
              <div className="baseline-eyebrow">Treatment</div>
              <div className="tx-popover-title">{title}</div>
            </div>
            <button className="info-close" onClick={onClose} aria-label="close">×</button>
          </div>
          <div className="baseline-options">
            {availableGroups.map(group => (
              <button key={group.label} className="baseline-option" onClick={() => setActiveCategory(group.label)}>
                {CAT_GLYPHS[group.label]}
                <span className="baseline-option-label">
                  {group.label === 'Orthodontics · full mouth' ? 'Orthodontics' : group.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── Treatment list ────────────────────────────────────────────────────────
  const activeGroup = availableGroups.find(g => g.label === resolvedCategory);
  const activeItems = activeGroup?.items.filter(isAvailable) ?? [];
  const showBack = availableGroups.length > 1;
  const POPOVER_H = 540;
  const top = Math.max(20, Math.min(anchor.y + 18, window.innerHeight - POPOVER_H - 20));

  return (
    <>
      <div className="popover-veil" onClick={onClose} />
      <div className="tx-popover" style={{ left, top, width: W }}>
        <div className="tx-popover-head">
          <div>
            {showBack
              ? <button className="tx-back-btn" onClick={() => setActiveCategory(null)}>← {resolvedCategory === 'Orthodontics · full mouth' ? 'Orthodontics' : resolvedCategory}</button>
              : <div className="baseline-eyebrow">Treatment</div>
            }
            <div className="tx-popover-title">{title}</div>
          </div>
          <button className="info-close" onClick={onClose} aria-label="close">×</button>
        </div>
        <div className="tx-popover-body">
          {activeItems.map(item => (
            <button key={item.id}
                    className="tx-item"
                    onClick={() => onApply(item.id, activeGroup.scope)}>
              <div className="tx-item-main">
                <span className="tx-item-label">{item.label}</span>
              </div>
              <span className="tx-item-arrow">→</span>
            </button>
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
  TreatmentLayer, TreatmentPopover, StagePill, ConfirmDialog,
});

// Bone grafts rendered behind tooth outlines — must be placed below AnatomyBackground
// but above the Tooth components in dental-arch.jsx.
function BoneGraftLayer({ allTeeth, upperBiteY, lowerBiteY, accent }) {
  const { treatments } = useChartState();
  const byTooth = {};
  for (const tx of treatments) {
    if (tx.scope === 'tooth' &&
        (tx.id === 'gbr' || tx.id === 'socket-preservation' || tx.id === 'simultaneous-graft')) {
      for (const id of tx.targets) {
        (byTooth[id] = byTooth[id] || []).push(tx);
      }
    }
  }
  return (
    <g className="bone-graft-layer" style={{ pointerEvents: 'none' }}>
      {Object.entries(byTooth).map(([toothId, list]) => {
        const tooth = allTeeth.find(x => x.id === toothId);
        if (!tooth) return null;
        const biteY = tooth.jaw === 'upper' ? upperBiteY : lowerBiteY;
        return list.map((tx, i) => (
          <BoneGraftOverlay key={`graft-${toothId}-${i}`} tooth={tooth} biteY={biteY}
                            variant={tx.id} accent={accent} />
        ));
      })}
    </g>
  );
}

export {
  TX_GROUPS, SINUS_GROUP, ARCH_GROUPS, TX_LABEL,
  TreatmentLayer, BoneGraftLayer, TreatmentPopover, StagePill, ConfirmDialog,
};
