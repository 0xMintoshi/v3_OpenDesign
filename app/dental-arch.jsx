import React from 'react';
import { shapeRangeToPath } from '../core/shapes.js';
import archMaxilla from '../shapes-data/anatomy/arch-maxilla.json';
import archMandible from '../shapes-data/anatomy/arch-mandible.json';
import { TOOTH_TYPES, QUADRANT, UPPER, LOWER, layoutArch, toothPaths } from '../layout/teeth-data.jsx';
import { chRatioFor, scallopRL, scallopLR, ARCH_LAYOUT, upperBiteY, lowerBiteY, cervicalPoints } from '../core/arch-math.js';
import { maxillaPath, mandiblePath, nasalCavityPath, nasalSeptumPath, maxillarySinusPath, idnSchematicPath, mentalForamenCenters, ramusDetailPath } from '../layout/anatomy.jsx';
import { TX_GROUPS, SINUS_GROUP, ARCH_GROUPS, TX_LABEL, TreatmentLayer, BoneGraftLayer, TreatmentPopover, StagePill, ExistingImplantLayer } from './treatments.jsx';
import { useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider, TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton } from './tweaks-panel.jsx';
import { TreatmentPanel, PanelDock } from './treatment-panel.jsx';
import { Dock, DockDivider, DockItem, ArchIcon, StageForwardIcon, StageBackIcon, SummaryIcon, ClearIcon } from './dock.jsx';
import { getConflictingTreatmentIds, healPresence, SESSION_SPLIT_IDS, MANUAL_MV_ID,
         ROOT_CANAL_IDS, RCT_TILE_ID } from '../core/conflict-rules.js';
import { applyRootCanal } from '../core/root-canal-apply.js';
import { addAreaEntry } from '../core/area-apply.js';
import { txRef, chartTxKey, nextManualUid, pruneSessions, joinSessions, leaveSession } from '../core/mv-sessions.js';
import { areContiguous } from '../core/contiguity.js';
import { ChartStateProvider, useChartState } from '../core/chart-context.jsx';
import { emit } from '../core/iframe-bridge.js';
import { UIStateProvider, useUIState } from '../core/ui-context.jsx';
import { useClinicTheme } from '../core/use-clinic-theme.js';

// undefined (healthy) → 'missing' → 'implant' → 'root-stump' → undefined
export function cyclePresence(cur) {
  return cur === undefined ? 'missing' : cur === 'missing' ? 'implant' : cur === 'implant' ? 'root-stump' : undefined;
}
import { toothYAdjust, toothBBoxes, computeMarquee } from '../core/marquee-select.js';

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ====================================================================
// Shared transform helper — used by Tooth and SVG masks that must mirror
// tooth geometry exactly (e.g. bone-hover cutout masks).
// ====================================================================
function toothBaseTransform(tooth, jawFlip, yAdjust = 0) {
  const { cx, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jawFlip ? -1 : 1;
  return `translate(${cx}, ${yOffset * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tilt})`;
}

// ====================================================================
// Tooth — outlined anatomical style
// ====================================================================
// Baseline pulp-canal paint. The same geometry is filled in the treatment
// accent when the tooth carries a root canal — one shape, two paint recipes.
const CANAL_BASE_OPACITY = 0.30;
const CANAL_TREATED_OPACITY = 1;

function Tooth({
  tooth, jawFlip, accent, isHovered, isSelected, isInDrag,
  presence, onHover, onSelect, onFocus, tabIndex = 0, showNumber, showCanals, stage, hasTreatment,
  hasRootCanal
}) {
  const { cx, h, w, type, fdi, tilt = 0, yOffset = 0 } = tooth;

  const flipY = jawFlip ? -1 : 1;
  const paths = toothPaths(type, w, h);
  const numberY = jawFlip ? -(h + 16) : -(h + 10);

  const yAdjust = toothYAdjust(tooth);
  const baseTransform = toothBaseTransform(tooth, jawFlip, yAdjust);

  const missing = presence === 'missing';
  const isImplant = presence === 'implant';
  const isRootStump = presence === 'root-stump';

  let liftY = 0;
  if (isHovered && !missing && !isImplant && stage === 'baseline') liftY = -3;
  if (isSelected) liftY = -5;

  // Determine fill color based on state
  let fillColor = 'var(--tooth-fill)';
  let strokeColor = 'var(--tooth-stroke)';
  let strokeW = 1.4;

  if (missing) {
    fillColor = 'transparent';
    strokeColor = 'var(--tooth-missing-stroke)';
    strokeW = 1.0;
  }
  if (isImplant) {
    fillColor = 'transparent';
    strokeColor = 'transparent';
    strokeW = 0;
  }
  if (isInDrag) {
    fillColor = accent;
  }
  if (isSelected) {
    fillColor = accent;
    strokeColor = accent;
  }
  if (isHovered && !missing && !isImplant && !isSelected) {
    fillColor = 'var(--tooth-hover-fill)';
  }

  const typeLabel = type.replace(/-/g, ' ');

  return (
    <g
      transform={baseTransform}
      style={{ cursor: 'pointer', transition: 'transform 200ms cubic-bezier(.2,.7,.2,1)' }}
      role="button"
      tabIndex={tabIndex}
      aria-label={`Tooth ${fdi} ${typeLabel}`}
      aria-pressed={isSelected}
      onMouseEnter={() => onHover(tooth.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={onFocus}
      onClick={(e) => onSelect({ kind: 'tooth', id: tooth.id }, e, 'click')}
      onContextMenu={(e) => onSelect({ kind: 'tooth', id: tooth.id }, e, 'context')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect({ kind: 'tooth', id: tooth.id }, e, 'click');
        }
      }}
      data-tooth-id={tooth.id}
      data-tooth-fdi={fdi}>

      {/* Stroke-expansion hit target — 12px transparent stroke stays within the
          tooth's convex hull (no axis-aligned rect, no cross-jaw overlap). */}
      <path
        d={paths.outline}
        fill="transparent"
        stroke="transparent"
        strokeWidth="12"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ pointerEvents: 'visibleStroke' }} />

      {/* WCAG 2.5.8 minimum tap-target guarantee (24px × 24px).
          Lower central incisors (w=18) render at 22 CSS px wide at the 768px
          supported floor — 2px short. MIN_TAP_W=33 SVG units gives ≥24 CSS px
          at 768px (viewBox 1600, scale ≈ 0.74 px/SVG-unit when chart fills
          viewport). For wider teeth (w+12 > 33) the rect is no-op. */}
      {(() => {
        const MIN_TAP_W = 33;
        const tapW = Math.max(w + 12, MIN_TAP_W);
        const tapH = Math.max(h + 12, MIN_TAP_W);
        return (
          <rect
            x={-tapW / 2}
            y={-h}
            width={tapW}
            height={tapH}
            fill="transparent"
            style={{ pointerEvents: 'all' }} />
        );
      })()}

      <g
        style={{
          transform: `translateY(${liftY}px)`,
          transition: 'transform 280ms cubic-bezier(.2,.7,.2,1)'
        }}>

        {/* Tooth body — fade between present/missing */}
        <g
          className="tooth-body"
          style={{
            opacity: missing ? 0.35 : 1,
            transition: 'opacity 220ms ease'
          }}>

          <path
            d={isRootStump ? paths.root : paths.outline}
            fill={fillColor}
            fillOpacity={isInDrag ? 0.18 : isSelected ? 0.18 : 1}
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={missing ? '3 3' : '0'}
            style={{ pointerEvents: 'visiblePainted' }} />
          {isSelected &&
          <path
            d={isRootStump ? paths.root : paths.outline}
            fill="none"
            stroke={accent}
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.16"
            style={{ pointerEvents: 'none' }} />
          }

          {!missing && !isRootStump &&
          <path
            d={paths.cervical}
            fill="none"
            stroke={isSelected ? accent : 'var(--tooth-stroke)'}
            strokeWidth={isSelected ? 1.2 : 1.0}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={isSelected ? 0.9 : 0.7} />

          }

          {/* Pulp canal — root only, so it survives a root stump and so CrownOverlay
              can paint over it (root canal + crown is the commonest pairing). Hidden
              on implants (no root) and on missing teeth.

              Two paint recipes, one shape. As anatomical detail it is faint and opt-in
              from the Tweaks panel, since most quotes never need it. As a TREATMENT it
              is solid accent and always drawn — gating that on the tweak, which is off
              by default, would make an applied root canal invisible on a fresh chart. */}
          {(showCanals || hasRootCanal) && !missing && !isImplant && paths.canal &&
          <path
            d={paths.canal}
            fill={hasRootCanal || isSelected ? accent : 'var(--tooth-stroke)'}
            fillRule="nonzero"
            stroke="none"
            opacity={hasRootCanal ? CANAL_TREATED_OPACITY : CANAL_BASE_OPACITY}
            style={{ pointerEvents: 'none' }} />
          }
        </g>


        {/* Number badge */}
        {(showNumber || isHovered || isSelected) &&
        <g transform={`translate(0, ${numberY}) rotate(${-tilt}) scale(1, ${flipY})`}>
            <text
            x="0"
            y="0"
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--sans)"
            fontWeight="500"
            fill={isHovered || isSelected ? accent : 'var(--ink-faint)'}
            style={{ pointerEvents: 'none', letterSpacing: '0.06em' }}>
            
              {fdi}
            </text>
          </g>
        }
      </g>
    </g>);

}

// ====================================================================
// Bone outline helpers — bone bottom edge follows tooth cervical line
// ====================================================================
const ANATOMY_INFO = {
  'sinus-right': { name: 'Right Maxillary Sinus', side: 'right', code: 'MS-R' },
  'sinus-left': { name: 'Left Maxillary Sinus', side: 'left', code: 'MS-L' }
};

export { cervicalPoints, chRatioFor, scallopRL, scallopLR };

// Build a bone outline path. Bottom (maxilla) / top (mandible) edge scallops
// along the cervical line of every tooth; far edge is a soft rectangle.
function bonePath(cervical, jaw, farY) {
  if (!cervical.length) return '';
  const peakDir = jaw === 'upper' ? -1 : 1; // gap dip direction (away from bite)
  const first = cervical[0];
  const last = cervical[cervical.length - 1];

  if (jaw === 'upper') {
    // Open-arc JSON: sub-path 1 = M(top) → patient-R-side → patient-R-cervical (SVG left, near first).
    //                sub-path 2 = M(patient-L-cervical, SVG right, near last) → patient-L-side → top.
    // Bridge: sub1 ends near first → scallopLR (first→last) → sub2 M point (near last).
    const segs = archMaxilla.segments;
    const midMIdx = segs.findIndex((s, i) => i > 0 && s.type === 'M');
    const sub1 = shapeRangeToPath(archMaxilla, 1600, 800, 0, midMIdx - 1);
    const sub2 = shapeRangeToPath(archMaxilla, 1600, 800, midMIdx + 1, segs.length - 1);
    const ms = segs[midMIdx];
    const lSx = (ms.x * 1600).toFixed(2);
    const lSy = (ms.y * 800).toFixed(2);
    return `
      ${sub1}
      L ${first.x} ${first.y}
      ${scallopLR(cervical, -1)}
      L ${lSx} ${lSy}
      ${sub2}
      Z
    `;
  }
  // Mandible — open-arc JSON: M(L-cervical) → down-L → bottom → up-R → R-cervical.
  const mandSegs = archMandible.segments;
  const mandStart = mandSegs[0];
  const mandBody = shapeRangeToPath(archMandible, 1600, 800, 1, mandSegs.length - 1);
  const mandStartX = (mandStart.x * 1600).toFixed(2);
  const mandStartY = (mandStart.y * 800).toFixed(2);
  return `
    M ${mandStartX} ${mandStartY}
    ${mandBody}
    Q ${last.x + last.w * 0.5} ${last.y} ${last.x} ${last.y}
    ${scallopRL(cervical, 1)}
    Q ${first.x - first.w * 0.5} ${first.y} ${mandStartX} ${mandStartY}
    Z
  `;
}

// Build a sinus shape contained within the maxilla, sitting above a span of
// posterior teeth. Floor follows the cervical line of those teeth (with
// clearance); ceiling arcs up toward the top of the maxilla.
function buildSinus(cervical, startIdx, endIdx, ceilingY) {
  const teeth = cervical.slice(startIdx, endIdx + 1);
  if (!teeth.length) return null;
  const leftX = teeth[0].x - teeth[0].w * 0.45 + 6;
  const rightX = teeth[teeth.length - 1].x + teeth[teeth.length - 1].w * 0.45 - 6;
  const maxCerv = Math.max(...teeth.map((t) => t.y)); // deepest cervical (closest to bite)
  const floorY = maxCerv - 45; // floor sits in bone, above teeth
  const midX = (leftX + rightX) / 2;
  const midCY = (floorY + ceilingY) / 2;
  const cy = midCY + (floorY - midCY) * 0.15; // label slightly below midline
  const bottomLeftX = leftX - 12;
  const bottomRightX = rightX + 12;
  const path = `
    M ${bottomLeftX + 10} ${floorY + 1}
    Q ${midX} ${floorY + 8} ${bottomRightX - 10} ${floorY + 1}
    Q ${bottomRightX + 2} ${floorY - 1} ${bottomRightX} ${floorY - 12}
    Q ${rightX + 8} ${ceilingY + 10} ${rightX - 28} ${ceilingY}
    L ${leftX + 28} ${ceilingY}
    Q ${leftX - 8} ${ceilingY + 10} ${bottomLeftX} ${floorY - 12}
    Q ${bottomLeftX - 2} ${floorY - 1} ${bottomLeftX + 10} ${floorY + 1}
    Z
  `;
  return { path, leftX, rightX, floorY, ceilingY, cx: midX, cy };
}

// ====================================================================
// Anatomy background — bone outlines + sinus zones inside maxilla + IDN
// ====================================================================
function AnatomyBackground({
  accent, hoveredId, onHover, onSelect, showSinus, showIDN,
  stage, onArchClick, upperTeeth, lowerTeeth, upperBiteY, lowerBiteY
}) {
  const isHov = (id) => hoveredId === id;
  const archActive = stage === 'treatment';
  const sinusActive = stage === 'treatment';

  const upperCerv = useMemo(
    () => cervicalPoints(upperTeeth, upperBiteY, 'upper'),
    [upperTeeth, upperBiteY]
  );
  const lowerCerv = useMemo(
    () => cervicalPoints(lowerTeeth, lowerBiteY, 'lower'),
    [lowerTeeth, lowerBiteY]
  );

  const maxillaTop = 110;
  const mandibleBottom = 740;
  const sinusCeilingY = maxillaTop + 36;

  const maxilla = bonePath(upperCerv, 'upper', maxillaTop);
  const mandible = bonePath(lowerCerv, 'lower', mandibleBottom);

  // Right sinus: posterior right (FDI 14–18, leftmost 5 on screen, indices 0..4)
  // Left sinus:  posterior left  (FDI 24–28, rightmost 5 on screen, indices 11..15)
  const sinusRight = buildSinus(upperCerv, 0, 4, sinusCeilingY);
  const sinusLeft = buildSinus(upperCerv, 11, 15, sinusCeilingY);

  // Hover-tint cutout masks: white = show tint, black = hide tint (teeth + sinus).
  // Upper mask subtracts all upper-arch tooth outlines + both sinus shapes.
  // Lower mask subtracts all lower-arch tooth outlines.
  const upperMaskId = 'bone-hover-mask-upper';
  const lowerMaskId = 'bone-hover-mask-lower';

  return (
    <g className="anatomy-layer">
      {/* SVG mask definitions for bone hover-tint cutouts */}
      <defs>
        <mask id={upperMaskId}>
          {/* White = tint shows through */}
          <rect x="0" y="0" width="1600" height="800" fill="white" />
          {/* Black = subtract tooth outlines */}
          {upperTeeth.map((tooth) => (
            <g key={tooth.id} transform={`translate(0, ${upperBiteY})`}>
              <g transform={toothBaseTransform(tooth, false)}>
                <path d={toothPaths(tooth.type, tooth.w, tooth.h).outline}
                  fill="black" stroke="none" />
              </g>
            </g>
          ))}
          {/* Black = subtract sinus shapes */}
          {showSinus && sinusRight &&
            <path d={sinusRight.path} fill="black" stroke="none" />}
          {showSinus && sinusLeft &&
            <path d={sinusLeft.path} fill="black" stroke="none" />}
        </mask>
        <mask id={lowerMaskId}>
          <rect x="0" y="0" width="1600" height="800" fill="white" />
          {lowerTeeth.map((tooth) => (
            <g key={tooth.id} transform={`translate(0, ${lowerBiteY})`}>
              <g transform={toothBaseTransform(tooth, true)}>
                <path d={toothPaths(tooth.type, tooth.w, tooth.h).outline}
                  fill="black" stroke="none" />
              </g>
            </g>
          ))}
        </mask>
      </defs>

      {/* Maxilla bone — interactive in Stage 2 */}
      <g
        data-anatomy-id="arch-upper"
        style={{ cursor: archActive ? 'pointer' : 'default' }}
        onMouseEnter={() => archActive && onHover('arch-upper')}
        onMouseLeave={() => archActive && onHover(null)}
        onClick={(e) => { if (archActive) { e.stopPropagation(); onArchClick('upper', e); } }}>
        <path d={maxilla}
          fill="var(--bg-1)"
          stroke="var(--anatomy-stroke)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.9"
          style={{ pointerEvents: archActive ? 'visiblePainted' : 'none' }} />
        {/* Hover tint layer — masked so teeth + sinuses are excluded */}
        {isHov('arch-upper') &&
          <path d={maxilla}
            fill={accent}
            fillOpacity="0.09"
            stroke="none"
            mask={`url(#${upperMaskId})`}
            style={{ pointerEvents: 'none' }} />
        }
      </g>

      {/* Mandible bone — interactive in Stage 2 */}
      <g
        data-anatomy-id="arch-lower"
        style={{ cursor: archActive ? 'pointer' : 'default' }}
        onMouseEnter={() => archActive && onHover('arch-lower')}
        onMouseLeave={() => archActive && onHover(null)}
        onClick={(e) => { if (archActive) { e.stopPropagation(); onArchClick('lower', e); } }}>
        <path d={mandible}
          fill="var(--bg-1)"
          stroke="var(--anatomy-stroke)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.9"
          style={{ pointerEvents: archActive ? 'visiblePainted' : 'none' }} />
        {isHov('arch-lower') &&
          <path d={mandible}
            fill={accent}
            fillOpacity="0.09"
            stroke="none"
            mask={`url(#${lowerMaskId})`}
            style={{ pointerEvents: 'none' }} />
        }
      </g>

      {/* Sinus zones — inner shapes within maxilla */}
      {showSinus && [
      { id: 'sinus-right', side: 'right', shape: sinusRight },
      { id: 'sinus-left', side: 'left', shape: sinusLeft }].
      map((z) => {
        if (!z.shape) return null;
        const hov = isHov(z.id);
        return (
          <g key={z.id}
          data-anatomy-id={z.id}
          style={{ cursor: sinusActive ? 'pointer' : 'default' }}
          onMouseEnter={() => sinusActive && onHover(z.id)}
          onMouseLeave={() => sinusActive && onHover(null)}
          onClick={(e) => {if (sinusActive) {e.stopPropagation();onSelect({ kind: 'anatomy', id: z.id }, e);}}}>
            <path d={z.shape.path}
            fill={hov ? accent : 'var(--bg-0)'}
            fillOpacity={hov ? 0.09 : 0.55}
            stroke={hov ? accent : 'var(--anatomy-stroke)'}
            strokeWidth={hov ? 1.4 : 1.0}
            strokeDasharray="5 4"
            opacity={hov ? 0.95 : 0.7} style={{ opacity: "0.87" }} />
          </g>);

      })}

      {/* IDN nerve — inside mandible */}
      {showIDN && ['right', 'left'].map((side) => {
        const path = idnSchematicPath(side);
        return (
          <g key={`idn-${side}`} style={{ pointerEvents: 'none' }}>
            <path d={path} stroke="var(--anatomy-stroke)" strokeWidth="3.5" fill="none"
            opacity="0.30" strokeLinecap="round" />
            <path d={path} stroke="var(--anatomy-stroke)" strokeWidth="1.6" fill="none"
            opacity="0.6" strokeLinecap="round" strokeDasharray="5 4" />
          </g>);

      })}
      {showIDN && mentalForamenCenters().map(({ cx, cy, side }) =>
      <circle key={`foramen-${side}`} cx={cx} cy={cy} r="3.5"
      fill="var(--bg-0)" stroke="var(--anatomy-stroke)" strokeWidth="1.1"
      opacity="0.85" style={{ pointerEvents: 'none' }} />
      )}
    </g>);

}

// ====================================================================
// ====================================================================
// ====================================================================
// Main hero
// ====================================================================
const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "flat",
  "accent": "#2A6FDB",
  "showSinus": true,
  "showIDN": true,
"showNumbering": true,
  "showLayoutGuides": false,
  "archDepth": 0,
  "wisdomImpacted": false,
  "showCanals": false
} /*EDITMODE-END*/;

/**
 * Dirty-check helpers for the SET_CHART_STATE echo guard (Phase 1.1).
 *
 * Exported for direct unit testing: the loop these prevent is invisible in manual
 * use until it drains a battery, so it is asserted rather than eyeballed.
 */
export function shallowEqualPresence(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
}

/**
 * Fields the PARENT derives on the way out and this chart recomputes on the way in.
 * Excluded from the comparison below so an inbound restore can still compare equal
 * and the guard terminates. Everything NOT listed here counts as a change.
 */
const DERIVED_TX_FIELDS = ['claimableCrowns'];

/**
 * Treatments compare by every own field EXCEPT the derived ones, with a target SET
 * rather than a target list — a reordered targets array is the same treatment and
 * must not read as a change, or the guard never terminates.
 *
 * Compared by EXCLUSION rather than by a list of fields that matter. Until 2026-09-13
 * this keyed on id + scope + targets alone, so a restore differing only by a `session`
 * tag — or by a manual procedure's uid, label or table — compared EQUAL and was thrown
 * away in full: the chart kept showing "Visit 1" while the parent billed the procedures
 * separately, and nothing logged it. A field list is how that stayed invisible, and a
 * new field would have re-introduced it, so the default is now "counts as a change" and
 * only genuinely derived fields are named. The failure mode if one is ever missed is a
 * restore loop, which the termination test catches at once.
 */
export function treatmentsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const key = (tx) => JSON.stringify(
    Object.keys(tx || {})
      // An absent key and one set to undefined are the same treatment. Dropping both
      // keeps a restore from looping on a field one side spells and the other omits.
      .filter((k) => !DERIVED_TX_FIELDS.includes(k) && tx[k] !== undefined)
      .sort()
      .map((k) => [k, k === 'targets' ? (tx[k] || []).slice().sort() : tx[k]])
  );
  const ka = a.map(key).sort(), kb = b.map(key).sort();
  return ka.every((k, i) => k === kb[i]);
}

function DentalHeroInner() {
  useClinicTheme();
  const [t, setTweak] = useTweaks(DEFAULT_TWEAKS);

  const { stage, setStage, presence, setPresence, treatments, setTreatments, loaded, effectivePresence } = useChartState();
  const { hoveredId, setHoveredId, selection, setSelection, popover, setPopover, focusedToothId, setFocusedToothId, panelHoverIds, setPanelHoverIds } = useUIState();

  // Undo echo-guard (Phase 2, 2026-09-09): the restoreId carried by an inbound
  // SET_CHART_STATE. Read by the very next CHART_TREATMENT_APPLIED_BATCH emit so the
  // parent can match that batch to the restore that caused it, then cleared so a later,
  // unrelated batch doesn't carry a stale id.
  const pendingRestoreIdRef = useRef(null);

  const [openPanel, setOpenPanel] = useState('tweaks');
  useEffect(() => setOpenPanel(stage === 'treatment' ? 'treatment' : 'tweaks'), [stage]);

  // Emit to parent quotation app when chart state is ready (Firestore loaded).
  useEffect(() => {
    if (loaded) emit('CHART_READY', {});
  }, [loaded]);

  // Deliberate scroll chains all three stages in sequence: on Stage 1, up-scroll
  // requests the parent re-show the name hero (Stage 0) and down-scroll advances
  // to Stage 2; on Stage 2, up-scroll retreats back to Stage 1 ("I screwed up").
  // Up/down accumulators are independent so a reversal doesn't need to fully
  // drain the other direction's progress before it starts counting.
  useEffect(() => {
    if (stage !== 'baseline' && stage !== 'treatment') return;
    let accUp = 0, accDown = 0;
    const SCROLL_THRESHOLD = 120;
    const onWheel = (e) => {
      if (e.deltaY < 0) {
        accDown = 0;
        accUp += -e.deltaY;
        if (accUp < SCROLL_THRESHOLD) return;
        accUp = 0;
        if (stage === 'baseline') emit('REQUEST_NAME_HERO', {});
        else handleBack();
      } else if (e.deltaY > 0) {
        accUp = 0;
        accDown += e.deltaY;
        if (accDown < SCROLL_THRESHOLD) return;
        accDown = 0;
        if (stage === 'baseline') handleAdvance();
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [stage]);

  // Bridge spans carry claimableCrowns = count of true natural abutments (present AND not
  // implant-bearing); implant abutments and pontics are excluded from CHAS permanent-crown claims.
  // Computed once and shared by both outbound channels below so the quote and the
  // persisted copy can never disagree about a span's claimable count.
  // Same-visit bundles are pruned as a DERIVED step rather than maintained at each of
  // the many setTreatments call sites: every removal path can orphan a bundle member,
  // and a bundle of one would keep claiming a consumable it no longer shares.
  const sessionedTreatments = useMemo(() => pruneSessions(treatments), [treatments]);

  const enrichedTreatments = useMemo(() => sessionedTreatments.map((tx) =>
    (tx.id === 'bridge-span' || tx.id === 'implant-bridge-span')
      ? { ...tx, claimableCrowns: tx.targets.filter((id) =>
          effectivePresence[id] !== 'missing' &&
          effectivePresence[id] !== 'root-stump' &&
          !sessionedTreatments.some((x) => (x.id === 'implant-only' || x.id === 'implant-crown') && x.targets.includes(id))
        ).length }
      : tx
  ), [sessionedTreatments, effectivePresence]);

  // Broadcast full treatments array on every change, but only after Firestore load
  // so the parent never receives an empty [] that wipes its quote items.
  // Immediate (undebounced): this drives the parent's quote line items, which must
  // track a tooth tap without a visible lag.
  //
  // presence/stage ride along on this same undebounced channel (undo plan, Phase 2,
  // 2026-09-09) — the persistence channel below is debounced 800ms, so a snapshot taken
  // right after this fires is the only one guaranteed not to read stale presence/stage.
  // restoreId, when set, echoes the SET_CHART_STATE restore that produced this batch so
  // the parent's echo guard can tell its own restore apart from a stray user edit.
  useEffect(() => {
    if (!loaded) return;
    const payload = { treatments: enrichedTreatments, presence, stage };
    if (pendingRestoreIdRef.current != null) {
      payload.restoreId = pendingRestoreIdRef.current;
      pendingRestoreIdRef.current = null;
    }
    emit('CHART_TREATMENT_APPLIED_BATCH', payload);
  }, [enrichedTreatments, loaded, presence, stage]);

  // Persistence channel (Phase 1.1). One message carries all three fields because
  // they are saved together and must be restored together — a presence from one
  // moment paired with treatments from another is exactly the corruption this
  // phase exists to prevent. Debounced to the 800 ms cadence the chart's own
  // Firestore save used, so a drag across ten teeth is one emit, not ten.
  //
  // Loop termination is the dirty check in the SET_CHART_STATE handler, NOT a
  // suppress-next-emit flag. The distinction matters: healPresence() can modify an
  // inbound map, leaving the chart holding something the parent does not have. A
  // blanket suppression would strand that repair here forever, and the parent would
  // re-send the illegal map on every restore. Emitting after a restore is correct;
  // what must not happen is emitting when nothing actually changed, and the dirty
  // check already guarantees that — healing is idempotent, so the echo of a healed
  // map compares equal on the way back in and stops there.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      emit('CHART_STATE_CHANGED', { stage, presence, treatments: enrichedTreatments });
    }, 800);
    return () => clearTimeout(timer);
  }, [stage, presence, enrichedTreatments, loaded]);

  // Marquee drag-to-select
  const svgRef = useRef(null);
  const dragRef = useRef(null);        // { startClient, startPt, lockedArch, moved } during drag
  const suppressClickRef = useRef(false);
  const [marquee, setMarquee] = useState(null); // { rect, hits: Set } | null

  // Ctrl-release menu trigger
  const ctrlMultiSelectRef = useRef(false);   // a ctrl/⌘ multi-click happened this cycle
  const lastMultiClickRef  = useRef(null);    // {x, y} client coords of last ctrl-click
  const ctrlReleaseTimerRef = useRef(null);   // debounce timer id
  const selectionRef = useRef(selection);     // always current selection (avoids stale closures)
  selectionRef.current = selection;

  const { scale, centerX, gap, gapFrac, archDepth: defaultArchDepth } = ARCH_LAYOUT;
  const archDepth = t.archDepth ?? defaultArchDepth;

  const upper = useMemo(() => layoutArch(UPPER, centerX, scale, { gap, gapFrac, archDepth }), [archDepth]);
  const lower = useMemo(
    () => layoutArch(LOWER, centerX, scale, { gap, gapFrac, archDepth, wisdomImpacted: t.wisdomImpacted }),
    [archDepth, t.wisdomImpacted]
  );

  const scaledUpper = upper.map((x) => ({ ...x, w: x.w * scale, h: x.h * scale }));
  const scaledLower = lower.map((x) => ({ ...x, w: x.w * scale, h: x.h * scale }));
  const archWidth = scaledUpper.reduce((a, b) => a + b.w, 0);
  const allTeeth = [...scaledUpper, ...scaledLower];

  const archEdentulous = useMemo(() => ({
    upper: scaledUpper.every((x) => effectivePresence[x.id] === 'missing'),
    lower: scaledLower.every((x) => effectivePresence[x.id] === 'missing')
  }), [effectivePresence]);
  const fullyEdentulous = archEdentulous.upper && archEdentulous.lower;

  const treatedTeeth = useMemo(() => {
    const s = new Set();
    treatments.forEach((tx) => {
      if (tx.scope === 'tooth') tx.targets.forEach((id) => s.add(id));
    });
    return s;
  }, [treatments]);

  // Teeth whose canals are painted in the accent rather than the faint anatomical tint.
  // All three class ids collapse to one set: the paint is identical, only the billing differs.
  const rootCanalTeeth = useMemo(() => {
    const s = new Set();
    treatments.forEach((tx) => {
      if (tx.scope === 'tooth' && ROOT_CANAL_IDS.includes(tx.id)) tx.targets.forEach((id) => s.add(id));
    });
    return s;
  }, [treatments]);

  const selectedTeeth = useMemo(
    () => selection.map((tid) => allTeeth.find((x) => x.id === tid)).filter(Boolean),
    [selection, allTeeth]
  );

  const selectionStats = useMemo(() => {
    const missing = selectedTeeth.filter((tooth) => effectivePresence[tooth.id] === 'missing').length;
    const present = selectedTeeth.length - missing;
    return {
      present,
      missing,
      label: selectedTeeth.slice(0, 5).map((tooth) => tooth.fdi).join(', ')
    };
  }, [selectedTeeth, effectivePresence]);

  const openTreatmentForTeeth = useCallback((toothIds, anchor) => {
    const target = toothIds.map((tid) => allTeeth.find((x) => x.id === tid)).filter(Boolean);
    if (target.length === 0) return;
    setPopover({
      mode: 'tooth',
      target,
      anchor,
      multi: target.length > 1
    });
  }, [allTeeth]);

  const openTreatmentForSelection = useCallback(() => {
    openTreatmentForTeeth(selection, {
      x: window.innerWidth / 2,
      y: Math.max(120, window.innerHeight - 190)
    });
  }, [selection, openTreatmentForTeeth]);

  const openBaselineForTeeth = useCallback((toothIds, anchor) => {
    const target = toothIds.map((tid) => allTeeth.find((x) => x.id === tid)).filter(Boolean);
    if (target.length === 0) return;
    setPopover({ mode: 'baseline', target, anchor });
  }, [allTeeth]);

  // ---- Marquee drag-to-select ----
  const bboxes = useMemo(
    () => toothBBoxes(allTeeth, upperBiteY, lowerBiteY),
    [allTeeth]
  );

  function clientToSvg(evt) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(evt.clientX, evt.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  function handleSvgPointerDown(evt) {
    if (evt.button !== 0) return;
    if (stage === 'treatment') {
      dragRef.current = {
        mode: 'marquee',
        startClient: { x: evt.clientX, y: evt.clientY },
        startPt: clientToSvg(evt),
        lockedArch: null,
        moved: false,
      };
    } else if (stage === 'baseline') {
      dragRef.current = {
        mode: 'marquee',
        startClient: { x: evt.clientX, y: evt.clientY },
        startPt: clientToSvg(evt),
        lockedArch: null,
        moved: false,
      };
    }
  }

  function handleSvgPointerMove(evt) {
    if (!dragRef.current) return;
    const { startClient } = dragRef.current;
    const dx = evt.clientX - startClient.x;
    const dy = evt.clientY - startClient.y;
    if (!dragRef.current.moved && Math.hypot(dx, dy) < 4) return;

    if (dragRef.current.mode === 'marquee') {
      const { startPt } = dragRef.current;
      if (!dragRef.current.moved) {
        dragRef.current.moved = true;
        svgRef.current?.setPointerCapture(evt.pointerId);
      }
      const cur = clientToSvg(evt);
      const rect = {
        minX: Math.min(startPt.x, cur.x),
        maxX: Math.max(startPt.x, cur.x),
        minY: Math.min(startPt.y, cur.y),
        maxY: Math.max(startPt.y, cur.y),
      };
      const { lockedArch, hits } = computeMarquee({
        bboxes,
        rect,
        startPt,
        lockedArch: dragRef.current.lockedArch,
      });
      dragRef.current.lockedArch = lockedArch;
      setMarquee({ rect, hits: new Set(hits) });

    }
  }

  function handleSvgPointerUp(evt) {
    if (!dragRef.current) return;
    if (dragRef.current.mode === 'marquee' && dragRef.current.moved && marquee) {
      const hits = Array.from(marquee.hits);
      const additive = evt.ctrlKey || evt.metaKey;
      const newSel = additive ? Array.from(new Set([...selection, ...hits])) : hits;
      setSelection(newSel);
      suppressClickRef.current = true;
      if (newSel.length > 0) {
        if (stage === 'baseline') {
          openBaselineForTeeth(newSel, { x: evt.clientX, y: evt.clientY });
        } else {
          openTreatmentForTeeth(newSel, { x: evt.clientX, y: evt.clientY });
        }
      }
    }
    svgRef.current?.releasePointerCapture(evt.pointerId);
    dragRef.current = null;
    setMarquee(null);
  }

  function handleSvgKeyDown(evt) {
    // Cancel in-progress drag on Escape
    if (evt.key === 'Escape' && dragRef.current?.moved) {
      dragRef.current = null;
      setMarquee(null);
    }
  }

  // ---- Tooth click handler ----
  const handleToothSelect = useCallback((ref, evt, gesture) => {
    if (stage === 'baseline') {
      if (suppressClickRef.current) return;
      if (gesture === 'context') evt.preventDefault();
      const id = ref.id;
      const isMultiGesture = gesture === 'context' || evt.ctrlKey || evt.metaKey;
      if (isMultiGesture) {
        setPopover(null);
        lastMultiClickRef.current = { x: evt.clientX, y: evt.clientY };
        ctrlMultiSelectRef.current = true;
        setSelection((prev) => {
          const isSelected = prev.includes(id);
          return isSelected ? prev.filter((tid) => tid !== id) : [...prev, id];
        });
        return;
      }
      // Single-click: cycle healthy → missing → implant → healthy
      evt.stopPropagation();
      setSelection([]);
      const nextStatus = cyclePresence(presence[id]);
      if (nextStatus === undefined) {
        setPresence((p) => { const next = { ...p }; delete next[id]; return next; });
        return;
      }
      setPresence((p) => { const next = { ...p }; next[id] = nextStatus; return next; });
      setTreatments((prev) => prev.map((tx) => {
        if (tx.scope !== 'tooth') return tx;
        return { ...tx, targets: tx.targets.filter((t) => t !== id) };
      }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0));
      return;
    }

    // Swallow the click that fires at the end of a marquee drag.
    if (suppressClickRef.current) return;

    evt.stopPropagation();
    const id = ref.id;
    const isMultiGesture = gesture === 'context' || evt.ctrlKey || evt.metaKey;
    if (gesture === 'context') evt.preventDefault();

    if (isMultiGesture) {
      setPopover(null);
      lastMultiClickRef.current = { x: evt.clientX, y: evt.clientY };
      ctrlMultiSelectRef.current = true;
      setSelection((prev) => {
        const isSelected = prev.includes(id);
        return isSelected ? prev.filter((tid) => tid !== id) : [...prev, id];
      });
      return;
    }

    if (effectivePresence[id] === 'implant') return;
    setSelection([id]);
    openTreatmentForTeeth([id], { x: evt.clientX, y: evt.clientY });
  }, [stage, presence, effectivePresence, treatedTeeth, openTreatmentForTeeth, openBaselineForTeeth]);

  const handleAnatomySelect = useCallback((ref, evt) => {
    if (stage !== 'treatment') return;
    const side = ref.id === 'sinus-right' ? 'right' : 'left';
    setSelection([]);
    setPopover({
      mode: 'sinus',
      target: { id: ref.id, side },
      anchor: { x: evt.clientX, y: evt.clientY }
    });
  }, [stage]);

  const handleArchClick = useCallback((arch, evt) => {
    if (stage === 'baseline') {
      const teeth = arch === 'upper' ? scaledUpper : scaledLower;
      const allMissing = teeth.every((x) => presence[x.id] === 'missing');
      setPresence((p) => {
        const next = { ...p };
        teeth.forEach((x) => {
          if (allMissing) delete next[x.id];else
          next[x.id] = 'missing';
        });
        return next;
      });
      if (!allMissing) {
        const toothIds = teeth.map((x) => x.id);
        setTreatments((prev) => prev.map((tx) => {
          if (tx.scope !== 'tooth') return tx;
          return { ...tx, targets: tx.targets.filter((t) => !toothIds.includes(t)) };
        }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0));
      }
    } else {
      setSelection([]);
      setPopover({
        mode: 'arch',
        target: { arch, edentulous: archEdentulous[arch] },
        anchor: { x: evt.clientX, y: evt.clientY }
      });
    }
  }, [stage, presence, scaledUpper, scaledLower, archEdentulous]);

  // ---- Apply treatment ----
  const handleApplyTreatment = useCallback((txId, scope) => {
    const orthoIds = ['ortho-brackets', 'ortho-aligners'];
    if (scope === 'full-mouth' && orthoIds.includes(txId) && fullyEdentulous) {
      setPopover(null);
      setSelection([]);
      return;
    }
    setTreatments((prev) => {
      let next = [...prev];
      if (popover.mode === 'tooth') {
        const presentTeeth = popover.target.filter(t => effectivePresence[t.id] !== 'implant');
        const targets = presentTeeth.map((t) => t.id);
        // A no-op for RCT_TILE_ID, which is not a stored id and so conflicts with nothing.
        // The root canal branch below runs its own strip, per class, because the conflict
        // set is looked up by id and the three classes are three different ids.
        const exclusive = getConflictingTreatmentIds(txId);
        next = next.map((tx) => {
          if (tx.scope !== 'tooth' || !exclusive.includes(tx.id)) return tx;
          return { ...tx, targets: tx.targets.filter((id) => !targets.includes(id)) };
        }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);
        if (txId === RCT_TILE_ID) {
          // The one tooth treatment that fans out: ONE tile click becomes one entry per
          // tooth class in the selection. The transform is pure and lives in
          // core/root-canal-apply.js so vitest can reach it — this callback is mocked by
          // the component suite.
          next = applyRootCanal(next, presentTeeth);
        } else if (txId === 'bridge-span' || txId === 'implant-bridge-span') {
          if (!areContiguous(targets, allTeeth)) {
            return prev; // non-contiguous or cross-jaw selection — no-op
          }
          if (targets.length < 2) {
            return prev; // bridge requires ≥ 2 teeth
          }
          const targetsByJaw = popover.target.reduce((groups, tooth) => {
            (groups[tooth.jaw] = groups[tooth.jaw] || []).push(tooth.id);
            return groups;
          }, {});
          for (const [jaw, jawTargets] of Object.entries(targetsByJaw)) {
            if (jawTargets.length < 2) continue; // skip single-tooth jaw groups
            next.push({ id: txId, scope: 'tooth', targets: jawTargets });
          }
        } else if (SESSION_SPLIT_IDS.includes(txId)) {
          // Each apply = its own Medisave session. Move any re-selected teeth into the new group.
          next = next.map((tx) =>
            (tx.scope === 'tooth' && tx.id === txId)
              ? { ...tx, targets: tx.targets.filter((id) => !targets.includes(id)) }
              : tx
          ).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);
          next.push({ id: txId, scope: 'tooth', targets });
        } else {
          const existingIdx = next.findIndex((tx) => tx.id === txId && tx.scope === 'tooth');
          if (existingIdx >= 0) {
            const merged = new Set([...next[existingIdx].targets, ...targets]);
            next[existingIdx] = { ...next[existingIdx], targets: [...merged] };
          } else {
            next.push({ id: txId, scope: 'tooth', targets });
          }
        }
        // Prune span treatments that lost units due to conflict stripping
        next = next.filter((tx) => {
          if (tx.id !== 'bridge-span' && tx.id !== 'implant-bridge-span') return true;
          return tx.targets.length >= 2;
        });
      } else if (popover.mode === 'sinus') {
        const side = popover.target.side;
        next = addAreaEntry(next, txId, 'sinus', side);
      } else if (popover.mode === 'arch') {
        const arch = popover.target.arch;
        if (scope === 'full-mouth') {
          next = next.filter((tx) => !orthoIds.includes(tx.id));
          next.push({ id: txId, scope: 'full-mouth', targets: ['both'] });
        } else {
          next = addAreaEntry(next, txId, 'arch', arch);
        }
      }
      return next;
    });
    setPopover(null);
    setSelection([]);
  }, [popover, fullyEdentulous, allTeeth, effectivePresence]);

  const handleApplyBaseline = useCallback((status) => {
    if (!popover) return;
    const targets = Array.isArray(popover.target) ? popover.target : [popover.target];
    const toothIds = targets.map((t) => t.id);
    setPresence((p) => {
      const next = { ...p };
      toothIds.forEach((id) => { next[id] = status; });
      return next;
    });
    setTreatments((prev) => prev.map((tx) => {
      if (tx.scope !== 'tooth') return tx;
      return { ...tx, targets: tx.targets.filter((t) => !toothIds.includes(t)) };
    }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0));
    setPopover(null);
    setSelection([]);
  }, [popover]);

  // ---- Remove a single treatment (used by label cards) ----
  const removeTreatmentForTooth = (toothId, txId) => {
    const isSpan = txId === 'bridge-span' || txId === 'implant-bridge-span';
    if (isSpan) {
      // Remove the entire span that contains this tooth
      setTreatments((prev) => prev.filter((tx) =>
        !(tx.scope === 'tooth' && tx.id === txId && tx.targets.includes(toothId))
      ));
      return;
    }
    setTreatments((prev) => prev.map((tx) => {
      if (tx.scope !== 'tooth' || tx.id !== txId) return tx;
      return { ...tx, targets: tx.targets.filter((id) => id !== toothId) };
    }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length >= 1));
  };
  // Manual MediSave procedures are addressed by ref, never by (tooth, id): they all
  // share one id, so the per-tooth path would strip this tooth from every one of them.
  const removeManualEntry = (ref) =>
    setTreatments((prev) => prev.filter((tx) => txRef(tx) !== ref));

  const removeNonToothTreatment = (txId, target) => {
    setTreatments((prev) => prev.map((tx) => {
      if (tx.id !== txId) return tx;
      if (tx.scope === 'full-mouth') return null;
      return { ...tx, targets: tx.targets.filter((x) => x !== target) };
    }).filter(Boolean).filter((tx) => tx.scope === 'full-mouth' || tx.targets.length > 0));
  };

  // Remove an entire span treatment (bridge / implant-bridge) by dropping the tx record
  // whose id matches and whose targets overlap the given set — matches exactly one jaw-group.
  const removeSpanTreatment = (txId, targets) => {
    const targetSet = new Set(targets);
    setTreatments((prev) => prev.filter((tx) => {
      if (tx.scope !== 'tooth' || tx.id !== txId) return true;
      return !tx.targets.some((id) => targetSet.has(id));
    }));
  };

  // ---- Same-visit MediSave bundles (panel + button) ----

  // Apply another MediSave treatment to the SAME teeth as an existing one and put both
  // in one visit. Mirrors the SESSION_SPLIT branch of handleApplyTreatment — conflict
  // strip, then move any re-selected teeth out of a same-id entry — but takes its
  // targets from the clicked panel row instead of the current selection.
  const addToVisit = (txId, targets, ref, manual) => {
    setTreatments((prev) => {
      const host = prev.find((tx) => txRef(tx) === ref);
      if (!host) return prev;
      // `manual` carries the operator's typed name and chosen CPF table. Its uid is
      // derived from the list so it survives a restore, and it is what keeps two manual
      // procedures on one tooth distinguishable everywhere downstream.
      const added = manual
        ? { id: MANUAL_MV_ID, scope: 'tooth', targets: [...targets],
            uid: nextManualUid(prev), label: manual.label, table: manual.table }
        : { id: txId, scope: 'tooth', targets: [...targets] };
      const exclusive = getConflictingTreatmentIds(added.id);
      let next = prev.map((tx) => {
        if (tx.scope !== 'tooth' || !exclusive.includes(tx.id)) return tx;
        return { ...tx, targets: tx.targets.filter((id) => !targets.includes(id)) };
      }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);
      // Moving re-selected teeth out of a same-id entry is right for a catalogue
      // treatment — one tooth cannot hold two GBRs — and wrong for a manual one, where
      // the id is shared by every operator-named procedure and the second add would
      // quietly delete the first.
      if (!manual) {
        next = next.map((tx) =>
          (tx.scope === 'tooth' && tx.id === txId)
            ? { ...tx, targets: tx.targets.filter((id) => !targets.includes(id)) }
            : tx
        ).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);
      }
      next.push(added);
      // The host may have been rebuilt by the strip above; re-address it by ref.
      const hostRef = next.some((tx) => txRef(tx) === ref) ? ref : null;
      const addedRef = txRef(added);
      return hostRef ? joinSessions(next, [hostRef, addedRef]) : next;
    });
  };

  const leaveVisit = (ref) => setTreatments((prev) => leaveSession(prev, ref));

  const handleAdvance = () => {setStage('treatment');setSelection([]);setPopover(null);};
  const handleBack = () => {setStage('baseline');setSelection([]);setPopover(null);};
  const handleExportPlan = () => emit('NAVIGATE_SUMMARY', {});

  useEffect(() => {
    const onKeyDown = (evt) => {
      if (evt.key === 'Escape') {
        setSelection([]);
        setPopover(null);
      } else if (evt.key === 'Enter' && selection.length > 0 && !popover) {
        if (stage === 'baseline') {
          const anchor = lastMultiClickRef.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          openBaselineForTeeth(selection, anchor);
        } else {
          openTreatmentForSelection();
        }
      } else if ((evt.ctrlKey || evt.metaKey) && !evt.shiftKey && evt.key.toLowerCase() === 'z') {
        // Undo plan, Phase 2 (2026-09-09): forward to the parent rather than handle it
        // here — the chart has no undo stack of its own. Bail inside an editable so a
        // text field's own undo still works, and on key-repeat so holding the key down
        // doesn't flood the parent with requests (July plan case h).
        const active = document.activeElement;
        const isEditable = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        if (!isEditable && !evt.repeat) {
          evt.preventDefault();
          emit('UNDO_REQUEST', {});
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage, selection, popover, openTreatmentForSelection, openBaselineForTeeth]);

  // Ctrl-release → open treatment/baseline menu for accumulated multi-select (debounced ~250ms).
  // Uses selectionRef so the timer reads the *latest* selection, not a stale closure.
  useEffect(() => {
    const onKeyUp = (evt) => {
      if (evt.key !== 'Control' && evt.key !== 'Meta') return;
      if (!ctrlMultiSelectRef.current) return;
      if (selectionRef.current.length === 0) return;
      // Snapshot selection at keyup to detect if more clicks happen before the timer fires.
      const snapshotAtKeyup = selectionRef.current.slice();
      clearTimeout(ctrlReleaseTimerRef.current);
      ctrlReleaseTimerRef.current = setTimeout(() => {
        const latest = selectionRef.current;
        // Bail if selection changed (more ctrl-clicks), or popover already open.
        if (latest.length !== snapshotAtKeyup.length ||
            !latest.every((id, i) => id === snapshotAtKeyup[i])) return;
        ctrlMultiSelectRef.current = false;
        if (stage === 'baseline') {
          openBaselineForTeeth(latest, lastMultiClickRef.current);
        } else {
          openTreatmentForTeeth(latest, lastMultiClickRef.current);
        }
      }, 0);
    };
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keyup', onKeyUp);
      clearTimeout(ctrlReleaseTimerRef.current);
    };
  }, [stage, openTreatmentForTeeth, openBaselineForTeeth]);

  // Reset ctrl-multi flag when popover closes or Escape fires, to prevent stale re-fire.
  useEffect(() => {
    if (!popover) {
      ctrlMultiSelectRef.current = false;
      clearTimeout(ctrlReleaseTimerRef.current);
    }
  }, [popover]);

  // Listen for REMOVE_CHART_TREATMENT from parent summary table to strip treatment from chart state.
  useEffect(() => {
    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || msg.version !== 1 || msg.type !== 'REMOVE_CHART_TREATMENT') return;
      const { chartTxId } = msg.payload;
      setTreatments(prev => prev.filter(tx => chartTxKey(tx) !== chartTxId));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Listen for SET_TREATMENTS from parent — replaces all chart treatments atomically.
  // Echo-guard ordering (roadmap §6.2): parent MUST switch its working globals to the
  // target plan BEFORE posting this message, so the resulting CHART_TREATMENT_APPLIED_BATCH
  // echo lands while the parent globals already match that plan (idempotent via _chartTxId).
  useEffect(() => {
    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || msg.version !== 1 || msg.type !== 'SET_TREATMENTS') return;
      setTreatments(Array.isArray(msg.payload?.treatments) ? [...msg.payload.treatments] : []);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Listen for SET_CHART_STATE from parent (Phase 1.3) — replaces stage, presence and
  // treatments atomically. Supersedes SET_TREATMENTS, which is kept for one release so
  // the comparison-plan switching path is not disturbed in the same change.
  //
  // Two guards, for two different failure modes:
  //  - healPresence() repairs an illegal 'missing'-plus-extraction-target map on the
  //    way in, wherever the state came from (Phase 1.1a).
  //  - The dirty check skips the state write entirely when nothing actually changed.
  //    React bails out on identical primitives but NOT on a fresh object identity, so
  //    setPresence({...identical}) would still re-render and emit. That is the echo
  //    loop; this is where it terminates.
  useEffect(() => {
    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || msg.version !== 1 || msg.type !== 'SET_CHART_STATE') return;
      const p = msg.payload || {};
      const nextStage = p.stage === 'treatment' || p.stage === 'baseline' ? p.stage : 'baseline';
      const nextTreatments = Array.isArray(p.treatments) ? [...p.treatments] : [];
      const nextPresence = healPresence(p.presence, nextTreatments);

      if (nextStage === stage &&
          shallowEqualPresence(nextPresence, presence) &&
          treatmentsEqual(nextTreatments, treatments)) return;

      // Stash restoreId for the CHART_TREATMENT_APPLIED_BATCH this state change is
      // about to trigger, so the parent's echo guard can match it back to this restore.
      if (p.restoreId != null) pendingRestoreIdRef.current = p.restoreId;

      setStage(nextStage);
      setPresence(nextPresence);
      setTreatments(nextTreatments);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [stage, presence, treatments]);

  // Listen for SET_STAGE from parent — jumps directly to 'baseline' or 'treatment'
  // stage without requiring the user to click Advance. Mirrors handleAdvance() above.
  useEffect(() => {
    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || msg.version !== 1 || msg.type !== 'SET_STAGE') return;
      setStage(msg.payload?.stage === 'treatment' ? 'treatment' : 'baseline');
      setSelection([]); setPopover(null);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // M3 — respond to GET_TOOTH_RECTS with viewport centres of all treated teeth.
  useEffect(() => {
    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || msg.version !== 1 || msg.type !== 'GET_TOOTH_RECTS') return;
      const toothIds = new Set();
      treatments.forEach(tx => {
        if (tx.scope === 'tooth') tx.targets.forEach(id => toothIds.add(id));
      });
      const rects = [];
      toothIds.forEach(id => {
        const el = document.querySelector(`[data-tooth-id="${id}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          rects.push({ id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
        }
      });
      emit('TOOTH_RECTS', { rects });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [treatments]);

  // M4 — respond to GET_CHART_SNAPSHOT with a canvas→PNG data-URI @4× oversampling (Route B).
  // Serializer must-fixes (E1 spec):
  //   1. Crop to content: getBBox clamped to declared viewBox [0,0,1600,800] + 24u pad.
  //   2. Skip url() computed values so relative #id refs survive in the detached clone.
  //   3. Inline presentation-prop whitelist only (external CSS won't travel with the clone).
  useEffect(() => {
    const PRESENTATION_PROPS = [
      'fill', 'fill-opacity', 'fill-rule',
      'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset',
      'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity',
      'opacity', 'color',
      'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
      'text-anchor', 'dominant-baseline', 'letter-spacing',
      'display', 'visibility', 'mix-blend-mode',
    ];

    function inlineComputedStyles(src, dst) {
      const cs = window.getComputedStyle(src);
      for (const prop of PRESENTATION_PROPS) {
        const val = cs.getPropertyValue(prop);
        if (!val || val.includes('url(')) continue; // preserve relative url(#id) attrs
        dst.style.setProperty(prop, val);
      }
      for (let i = 0; i < src.children.length; i++) {
        if (dst.children[i]) inlineComputedStyles(src.children[i], dst.children[i]);
      }
    }

    const onMsg = (e) => {
      const msg = e.data;
      if (!msg || msg.version !== 1 || msg.type !== 'GET_CHART_SNAPSHOT') return;
      const svg = svgRef.current;
      if (!svg) { emit('CHART_SNAPSHOT', { dataUrl: null }); return; }

      /* Capture on PAPER, not on whatever the screen is showing.

         The anatomy is filled with the canvas colour so that only its outline reads.
         On a dark theme that fill follows the canvas down, and a snapshot taken
         as-seen laid dark ink over 51.2% of the page — in print and in the PDF,
         which embeds this same image. The parent sends the paper palette with the
         request; a parent that sends none (or the chart running standalone) captures
         as-seen, exactly as before.

         WHY IT CANNOT FLASH: set, read, restore all happen in ONE synchronous block.
         getComputedStyle forces a style recalc but not a paint, and the browser only
         paints between tasks — so no frame carrying these values is ever shown. That
         is also why this must not be made async; an await here would put a paper-
         coloured frame on screen.

         WHY THE SVG AND NOT :root: syncChartTheme() writes the live tokens onto
         .hero with !important, and a custom property set on an ancestor is shadowed
         by .hero's own declaration for everything inside it. Setting them inline on
         the SVG puts them below .hero, where the drawing actually reads them. */
      const paper = msg.payload && msg.payload.paper;
      const restore = [];
      if (paper) {
        for (const [k, v] of Object.entries(paper)) {
          if (!v) continue;
          restore.push([k, svg.style.getPropertyValue(k), svg.style.getPropertyPriority(k)]);
          svg.style.setProperty(k, v, 'important');
        }
      }
      const undoPaper = () => {
        for (const [k, prev, prio] of restore) {
          if (prev) svg.style.setProperty(k, prev, prio);
          else svg.style.removeProperty(k);
        }
      };

      try {
        // 1. Clone and inline computed styles — reads the paper values set above
        const clone = svg.cloneNode(true);
        inlineComputedStyles(svg, clone);
        undoPaper();   // every value we need is now baked into the clone

        // 2. Crop viewBox: getBBox clamped to [0,0,1600,800] to exclude out-of-viewBox labels
        const raw = svg.getBBox();
        const PAD = 24;
        const x0 = Math.max(raw.x, 0) - PAD;
        const y0 = Math.max(raw.y, 0) - PAD;
        const x1 = Math.min(raw.x + raw.width,  1600) + PAD;
        const y1 = Math.min(raw.y + raw.height,  800) + PAD;
        const vw = x1 - x0;
        const vh = y1 - y0;
        clone.setAttribute('viewBox', `${x0} ${y0} ${vw} ${vh}`);
        clone.setAttribute('width',  String(vw));
        clone.setAttribute('height', String(vh));
        clone.style.cssText = ''; // clear inline height:988px set by the live element

        // 3. Serialize → Blob URL → draw to canvas @4×
        const svgStr = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const SCALE = 4;
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(vw * SCALE);
        canvas.height = Math.round(vh * SCALE);
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(blobUrl);
          emit('CHART_SNAPSHOT', { dataUrl: canvas.toDataURL('image/png') });
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          emit('CHART_SNAPSHOT', { dataUrl: null });
        };
        img.src = blobUrl;
      } catch (err) {
        undoPaper();   // idempotent; a throw before the inline pass must not strand the paper palette
        console.error('[chart] snapshot error:', err);
        emit('CHART_SNAPSHOT', { dataUrl: null });
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []); // reads DOM at message-time; no reactive deps needed

  const handleBulkArch = (arch, missing) => {
    const teeth = arch === 'upper' ? scaledUpper : scaledLower;
    setPresence((p) => {
      const next = { ...p };
      teeth.forEach((x) => {
        if (missing) next[x.id] = 'missing';else
        delete next[x.id];
      });
      return next;
    });
  };

  // Theme variables
  const themeVars = t.theme === 'dark' ? darkTheme() : flatTheme();

  return (
    <div className="hero" style={themeVars}>
      <div className="ambient">
        <div className="ambient-grid" />
      </div>

      <div className="stage-hint">
        {stage === 'baseline' ? (
          <>
            <span className="wf-step">STAGE 1</span>
            <span className="wf-sep">|</span>
            <span className="wf-help">
              {Object.keys(presence).length > 0
                ? `${Object.keys(presence).length} ${Object.keys(presence).length === 1 ? 'tooth' : 'teeth'} marked`
                : 'Click on a tooth to mark.'}
            </span>
          </>
        ) : (
          <>
            <span className="wf-step">STAGE 2</span>
            <span className="wf-sep">|</span>
            <span className="wf-help">Left-click opens treatment. Drag/right-click/ctrl+click to multi select.</span>
          </>
        )}
      </div>

      <div className="stage">
        <svg
          ref={svgRef}
          className="arch-svg"
          viewBox="0 0 1600 800"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Dental chart"
          onClick={() => {
            if (suppressClickRef.current) { suppressClickRef.current = false; return; }
            setSelection([]);
            setPopover(null);
          }}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onKeyDown={(e) => {
            handleSvgKeyDown(e);
            const allIds = [...scaledUpper.map((t) => t.id), ...scaledLower.map((t) => t.id)];
            const upperIds = scaledUpper.map((t) => t.id);
            const lowerIds = scaledLower.map((t) => t.id);
            const focused = focusedToothId || allIds[0];
            const inUpper = upperIds.includes(focused);
            const arr = inUpper ? upperIds : lowerIds;
            const idx = arr.indexOf(focused);
            let nextId = null;
            if (e.key === 'ArrowRight') nextId = arr[idx + 1] ?? arr[idx];
            else if (e.key === 'ArrowLeft') nextId = arr[idx - 1] ?? arr[idx];
            else if (e.key === 'ArrowDown') nextId = inUpper ? (lowerIds[idx] ?? lowerIds[lowerIds.length - 1]) : null;
            else if (e.key === 'ArrowUp') nextId = !inUpper ? (upperIds[idx] ?? upperIds[upperIds.length - 1]) : null;
            if (nextId) {
              e.preventDefault();
              setFocusedToothId(nextId);
              document.querySelector(`[data-tooth-id="${nextId}"]`)?.focus();
            }
          }}
          style={{ height: "988px", touchAction: 'none' }}>
          
          {/* Anatomy: maxilla + mandible bone outlines, sinus zones inside maxilla, IDN, arch hit-areas */}
          <AnatomyBackground
            accent={t.accent}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={handleAnatomySelect}
            showSinus={t.showSinus}
            showIDN={t.showIDN}
            stage={stage}
            onArchClick={handleArchClick}
            upperTeeth={scaledUpper}
            lowerTeeth={scaledLower}
            upperBiteY={upperBiteY}
            lowerBiteY={lowerBiteY} />
          
        

          {/* Bite plane indicator */}
          <line
            x1={800 - archWidth / 2 - 30} y1={ARCH_LAYOUT.biteCenter}
            x2={800 + archWidth / 2 + 30} y2={ARCH_LAYOUT.biteCenter}
            stroke="var(--ink-faint)" strokeWidth="0.6" strokeDasharray="2 4"
            style={{ pointerEvents: 'none' }} />
          

          {/* Bone grafts — behind tooth outlines */}
          {stage === 'treatment' &&
          <BoneGraftLayer
            allTeeth={allTeeth}
            upperBiteY={upperBiteY}
            lowerBiteY={lowerBiteY}
            accent={t.accent} />}

          {/* Upper arch */}
          <g aria-label="Upper arch">
            {scaledUpper.map((tooth, i) => {
              const isFirst = !focusedToothId && i === 0;
              return (
                <g key={tooth.id} transform={`translate(0, ${upperBiteY})`}>
                  <Tooth
                    tooth={tooth}
                    jawFlip={false}
                    accent={t.accent}
                    isHovered={hoveredId === tooth.id || panelHoverIds.includes(tooth.id)}
                    isSelected={selection.includes(tooth.id)}
                    isInDrag={marquee?.hits.has(tooth.id) ?? false}
                    presence={effectivePresence[tooth.id]}
                    onHover={setHoveredId}
                    onSelect={handleToothSelect}
                    onFocus={() => setFocusedToothId(tooth.id)}
                    tabIndex={focusedToothId === tooth.id || isFirst ? 0 : -1}
                    showNumber={t.showNumbering} showCanals={t.showCanals}
                    stage={stage}
                    hasTreatment={treatedTeeth.has(tooth.id)}
                    hasRootCanal={rootCanalTeeth.has(tooth.id)} />
                </g>
              );
            })}
          </g>

          {/* Lower arch */}
          <g aria-label="Lower arch">
            {scaledLower.map((tooth) => (
              <g key={tooth.id} transform={`translate(0, ${lowerBiteY})`}>
                <Tooth
                  tooth={tooth}
                  jawFlip={true}
                  accent={t.accent}
                  isHovered={hoveredId === tooth.id || panelHoverIds.includes(tooth.id)}
                  isSelected={selection.includes(tooth.id)}
                  isInDrag={false}
                  presence={effectivePresence[tooth.id]}
                  onHover={setHoveredId}
                  onSelect={handleToothSelect}
                  onFocus={() => setFocusedToothId(tooth.id)}
                  tabIndex={focusedToothId === tooth.id ? 0 : -1}
                  showNumber={t.showNumbering} showCanals={t.showCanals}
                  stage={stage}
                  hasTreatment={treatedTeeth.has(tooth.id)}
                  hasRootCanal={rootCanalTeeth.has(tooth.id)} />
              </g>
            ))}
          </g>

          {/* Treatment overlays (Stage 2) */}
          {stage === 'treatment' &&
          <TreatmentLayer
            allTeeth={allTeeth}
            upperBiteY={upperBiteY}
            lowerBiteY={lowerBiteY}
            archWidth={archWidth}
            accent={t.accent} />

          }

          {/* Existing implants — both stages, monochrome */}
          <ExistingImplantLayer
            allTeeth={allTeeth}
            upperBiteY={upperBiteY}
            lowerBiteY={lowerBiteY}
            presence={presence} />

          {/* Marquee selection rect */}
          {marquee && (
            <rect
              x={marquee.rect.minX}
              y={marquee.rect.minY}
              width={marquee.rect.maxX - marquee.rect.minX}
              height={marquee.rect.maxY - marquee.rect.minY}
              fill={t.accent}
              fillOpacity="0.08"
              stroke={t.accent}
              strokeWidth="1"
              strokeDasharray="4 3"
              style={{ pointerEvents: 'none' }} />
          )}


        </svg>
      </div>

      {stage === 'baseline' ?
      <BaselineFooter
        accent={t.accent}
        archEdentulous={archEdentulous}
        onGreyArch={(arch) => handleBulkArch(arch, !archEdentulous[arch])}
        onAdvance={handleAdvance} /> :


      <TreatmentFooter
        accent={t.accent}
        treatments={treatments}
        onBack={handleBack}
        onClear={() => setTreatments([])}
        onExportPlan={handleExportPlan} />

      }

      <TreatmentPopover
        open={!!popover}
        anchor={popover ? popover.anchor : { x: 0, y: 0 }}
        mode={popover ? popover.mode : null}
        target={popover ? popover.target : null}
        archEdentulous={archEdentulous}
        allPresent={popover && popover.mode === 'tooth'
          ? popover.target.every(t => effectivePresence[t.id] !== 'missing' && effectivePresence[t.id] !== 'implant' && effectivePresence[t.id] !== 'root-stump')
          : false}
        allMissing={popover && popover.mode === 'tooth'
          ? popover.target.every(t => effectivePresence[t.id] === 'missing')
          : false}
        allExtractable={popover && popover.mode === 'tooth'
          ? popover.target.every(t => effectivePresence[t.id] !== 'missing' && effectivePresence[t.id] !== 'implant')
          : false}
        allRootStump={popover && popover.mode === 'tooth'
          ? popover.target.every(t => effectivePresence[t.id] === 'root-stump')
          : false}
        hasBridgeAbutment={popover && popover.mode === 'tooth'
          ? popover.target.some(t =>
              (effectivePresence[t.id] !== 'missing' && effectivePresence[t.id] !== 'implant' && effectivePresence[t.id] !== 'root-stump') ||
              treatments.some(x => x.id === 'implant-only' && x.targets.includes(t.id)))
          : false}
        hasBridgeGap={popover && popover.mode === 'tooth'
          ? popover.target.some(t =>
              effectivePresence[t.id] === 'missing' &&
              !treatments.some(x => (x.id === 'implant-only' || x.id === 'implant-crown') && x.targets.includes(t.id)))
          : false}
        fullyEdentulous={fullyEdentulous}
        onApply={handleApplyTreatment}
        onApplyBaseline={handleApplyBaseline}
        onClose={() => {setPopover(null);setSelection([]);}} />
      


      <TweaksPanel
        open={openPanel === 'tweaks'}
        onOpen={() => setOpenPanel('tweaks')}
        onClose={() => setOpenPanel(null)}
      >
        <TweakToggle label="#38/48 Impaction" value={t.wisdomImpacted} onChange={(v) => setTweak('wisdomImpacted', v)} />
        <TweakToggle label="Root Canals" value={t.showCanals} onChange={(v) => setTweak('showCanals', v)} />
        <TweakToggle label="FDI Numbers" value={t.showNumbering} onChange={(v) => setTweak('showNumbering', v)} />
        <TweakToggle label="Sinus Zones" value={t.showSinus} onChange={(v) => setTweak('showSinus', v)} />
        <TweakToggle label="ID Nerve" value={t.showIDN} onChange={(v) => setTweak('showIDN', v)} />
      </TweaksPanel>
      {stage === 'treatment' && (
        <TreatmentPanel
          open={openPanel === 'treatment'}
          onClose={() => setOpenPanel(null)}
          treatments={sessionedTreatments}
          allTeeth={allTeeth}
          accent={t.accent}
          txLabel={TX_LABEL}
          onRemoveTooth={removeTreatmentForTooth}
          onRemoveSpan={removeSpanTreatment}
          onRemoveOther={removeNonToothTreatment}
          onRemoveManual={removeManualEntry}
          onHoverTargets={setPanelHoverIds}
          onAddToVisit={addToVisit}
          onLeaveVisit={leaveVisit}
        />
      )}
      <PanelDock
        showTreatments={stage === 'treatment'}
        openPanel={openPanel}
        onToggle={(which) => setOpenPanel((p) => (p === which ? null : which))}
      />
    </div>);

}

// ====================================================================
// Footers
// ====================================================================
function BaselineFooter({ accent, archEdentulous, onGreyArch, onAdvance }) {
  return (
    <Dock>
      <DockItem
        icon={<ArchIcon direction="down" restore={archEdentulous.upper} />}
        label={archEdentulous.upper ? 'Restore Upper' : 'Upper Edentulous'}
        active={archEdentulous.upper}
        onClick={() => onGreyArch('upper')} />
      <DockItem
        icon={<ArchIcon direction="up" restore={archEdentulous.lower} />}
        label={archEdentulous.lower ? 'Restore Lower' : 'Lower Edentulous'}
        active={archEdentulous.lower}
        onClick={() => onGreyArch('lower')} />
      <DockDivider />
      <DockItem
        icon={<StageForwardIcon />}
        label="Stage 2"
        primary
        style={{ '--dock-accent': accent }}
        onClick={onAdvance} />
    </Dock>);

}

function SelectionActionBar({ accent, count, stats, onApply, onClear }) {
  const detail = stats && count > 0
    ? `${stats.label}${count > 5 ? ', +' + (count - 5) : ''} - ${stats.present} present / ${stats.missing} missing`
    : '';
  return (
    <div className="selection-action-bar" role="status" aria-live="polite">
      <div className="selection-copy">
        <span className="selection-count">{count}</span>
        <span>{count === 1 ? 'tooth selected' : 'teeth selected'}</span>
        {detail && <span className="selection-detail">{detail}</span>}
      </div>
      <div className="selection-actions">
        <button className="btn-ghost" onClick={onClear}>Clear</button>
        <button className="btn-primary" style={{ background: accent }} onClick={onApply}>
          Apply treatment <span className="arrow">-&gt;</span>
        </button>
      </div>
    </div>);

}

function TreatmentFooter({ accent, treatments, onBack, onClear, onExportPlan }) {
  return (
    <Dock>
      <DockItem
        icon={<StageBackIcon />}
        label="Stage 1"
        primary
        style={{ '--dock-accent': accent }}
        onClick={onBack} />
      <DockDivider />
      {treatments.length > 0 &&
      <DockItem
        icon={<ClearIcon />}
        label="Clear Plan"
        onClick={onClear} />
      }
      <DockItem
        icon={<SummaryIcon />}
        label="Summary"
        primary
        style={{ '--dock-accent': accent }}
        onClick={onExportPlan} />
    </Dock>);

}

// ====================================================================
// Themes
// ====================================================================
function flatTheme() {
  return {
    '--bg-0': '#fafaf8',
    '--bg-1': '#f3f3ef',
    '--ink': '#1a1f2e',
    '--ink-muted': 'rgba(26,31,46,0.62)',
    '--ink-faint': 'rgba(26,31,46,0.32)',
    '--tooth-fill': '#ffffff',
    '--tooth-stroke': '#1a1f2e',
    '--tooth-hover-fill': 'rgba(42,111,219,0.06)',
    '--tooth-missing-stroke': 'rgba(26,31,46,0.5)',
    '--anatomy-stroke': 'rgba(26,31,46,0.45)',
    '--card-bg': '#ffffff',
    '--card-border': 'rgba(26,31,46,0.12)',
    '--card-shadow': '0 8px 30px rgba(20,30,50,0.08)',
    '--dock-bg': 'rgba(255,255,255,0.72)'
  };
}
function darkTheme() {
  return {
    '--bg-0': '#0e1322',
    '--bg-1': '#181f33',
    '--ink': '#eef2f8',
    '--ink-muted': 'rgba(238,242,248,0.62)',
    '--ink-faint': 'rgba(238,242,248,0.32)',
    '--tooth-fill': 'rgba(20,28,46,0.4)',
    '--tooth-stroke': '#dde4f0',
    '--tooth-hover-fill': 'rgba(125,217,224,0.10)',
    '--tooth-missing-stroke': 'rgba(238,242,248,0.42)',
    '--anatomy-stroke': 'rgba(238,242,248,0.45)',
    '--card-bg': 'rgba(20,28,46,0.92)',
    '--card-border': 'rgba(238,242,248,0.14)',
    '--card-shadow': '0 12px 40px rgba(0,0,0,0.5)',
    '--dock-bg': 'rgba(20,28,46,0.72)'
  };
}

/**
 * One layout at every width.
 *
 * This used to be `isTablet ? <TabletChart /> : <DentalHeroInner />` against a
 * `(max-width: 1180px)` query, and that made the chart UNUSABLE on every iPad
 * (see docs/plans/2026-08-28-phase-a-ipad-findings.md). Two things went wrong at
 * once:
 *
 *   1. TabletChart was rendered with NO props, so its onSelect/onHover fell back
 *      to no-ops — every tooth tap did nothing.
 *   2. All parent-bridge wiring lives in DentalHeroInner: CHART_READY,
 *      CHART_STATE_CHANGED, the SET_CHART_STATE listener, NAVIGATE_SUMMARY, the
 *      dock, the treatment panel and the popover. None of it exists on the
 *      tablet path, so the parent never received CHART_READY and never hid
 *      #chart-loading-overlay. The dentist sat on a permanent "Loading…" screen.
 *
 * 1180px swept in every iPad in portrait and the iPad 10.2" in both
 * orientations — the most common chairside device there is.
 *
 * DentalHeroInner was measured at 375, 600, 768, 810, 834, 1080 and 1194px
 * before this change: 32 teeth, dock on screen, all three bridge messages, and
 * no horizontal overflow at every one. It is responsive; the branch was not
 * buying anything.
 *
 * If a purpose-built phone or tablet layout is wanted later, build it with
 * handlers and bridge wiring from the start — do not restore TabletChart, which
 * had neither. It is in git history at b05a719~1 if the geometry is useful.
 */
function DentalHero() {
  const params = new URLSearchParams(window.location.search);
  const patientId = params.get('patient') || undefined;
  const seed = params.get('seed') || undefined;   // dev-only, see core/dev-seed.js
  return (
    <ChartStateProvider patientId={patientId} seed={seed}>
      <UIStateProvider>
        <DentalHeroInner />
      </UIStateProvider>
    </ChartStateProvider>
  );
}

export default DentalHero;
