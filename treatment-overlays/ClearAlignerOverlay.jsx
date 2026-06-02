import React from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { crownDepth } from '../core/arch-math.js';
import { proximalExtreme, crownXAtY } from '../core/tooth-split.js';
import { toothYAdjust } from '../core/marquee-select.js';

// ── Tuning (adjust values only) ──────────────────────────────────────────────
const STROKE_WIDTH     = 3;
const FILL_OPACITY     = 0.90;   // translucent glass interior
const OCC_OUT          = 6;      // local units pushed beyond biting edge (outward)
const CERV_OUT         = 6;      // local units pushed beyond gumline (apical)
const END_OUT          = 8;     // distal end-cap x extension
const OCC_DEPTH_FRAC   = 0.8;   // crown-depth fraction that defines "occlusal zone"
const OCC_BINS         = 5;       // x-bins for occlusal envelope sampling
const CERV_START_FRAC  = 1;      // start of cervical sampling zone (fraction of crownDepth)
const CERV_BINS        = 15;     // x-bins for cervical envelope sampling
const WALK_STEPS       = 30;     // Bézier evaluation steps per segment
const CERV_EMBRASURE_LIFT = 3;  // how far to raise the cervical bridge into the embrasure (less apical)
const OCC_EMBRASURE_LIFT  = 10;  // how far to pull the occlusal bridge back toward the crown
const END_CAP_SAMPLES     =8; // y-levels to sample when rounding the distal end-cap corner
// ─────────────────────────────────────────────────────────────────────────────

// rotate(tilt) → scale(1,flipY) → translate(cx, biteY + yOffset*flipY + yAdjust)
function toGlobal(tooth, biteY, flipY, lx, ly) {
  const tilt = ((tooth.tilt || 0) * Math.PI) / 180;
  const rx = lx * Math.cos(tilt) - ly * Math.sin(tilt);
  const ry = lx * Math.sin(tilt) + ly * Math.cos(tilt);
  return {
    x: tooth.cx + rx,
    y: biteY + (tooth.yOffset || 0) * flipY + toothYAdjust(tooth) + ry * flipY,
  };
}

// Walk a crown d-string (M C Q Z), calling cb({x,y}) for each sampled point
function walkCrown(crownD, cb) {
  const toks = crownD.trim().split(/[\s,]+/).filter(Boolean);
  let i = 0, p0 = null;
  const ev3 = (a, b, c, d, t) => {
    const u = 1 - t;
    return { x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x,
             y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y };
  };
  const ev2 = (a, b, c, t) => {
    const u = 1 - t;
    return { x: u*u*a.x + 2*u*t*b.x + t*t*c.x, y: u*u*a.y + 2*u*t*b.y + t*t*c.y };
  };
  while (i < toks.length) {
    const cmd = toks[i++];
    if (cmd === 'M') {
      p0 = { x: +toks[i++], y: +toks[i++] };
      cb(p0);
    } else if (cmd === 'C') {
      const cp1 = { x: +toks[i++], y: +toks[i++] };
      const cp2 = { x: +toks[i++], y: +toks[i++] };
      const p3  = { x: +toks[i++], y: +toks[i++] };
      for (let k = 1; k <= WALK_STEPS; k++) cb(ev3(p0, cp1, cp2, p3, k / WALK_STEPS));
      p0 = p3;
    } else if (cmd === 'Q') {
      const cp = { x: +toks[i++], y: +toks[i++] };
      const p3 = { x: +toks[i++], y: +toks[i++] };
      for (let k = 1; k <= WALK_STEPS; k++) cb(ev2(p0, cp, p3, k / WALK_STEPS));
      p0 = p3;
    } else if (cmd === 'Z' || cmd === 'z') break;
  }
}

// Dense x-bin sampling — returns [{x, y}] sorted left→right
// reducer(bin, pt) updates bin.y; initY is the starting bin.y
function binCrown(crownD, filterFn, nBins, initY, reducer) {
  const pts = [];
  walkCrown(crownD, (pt) => { if (filterFn(pt)) pts.push(pt); });
  if (!pts.length) return [];

  const xs = pts.map(p => p.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const range = xMax - xMin + 1e-9;
  const bins = Array.from({ length: nBins }, () => ({ x: 0, y: initY, count: 0 }));
  for (const pt of pts) {
    const bi = Math.min(nBins - 1, Math.floor((pt.x - xMin) / range * nBins));
    reducer(bins[bi], pt);
    bins[bi].count++;
  }
  return bins
    .filter(b => b.count > 0 && b.y !== initY)
    .map((b, bi) => ({
      x: b.x || (xMin + (bi + 0.5) * range / nBins),
      y: b.y,
    }));
}

// Occlusal profile: max-y per x-bin in the occlusal zone (cusp tips = most coronal)
function occlusProfile(crownD, depth) {
  const cutoff = -depth * OCC_DEPTH_FRAC;
  return binCrown(
    crownD,
    (pt) => pt.y >= cutoff,
    OCC_BINS,
    -Infinity,
    (bin, pt) => { if (pt.y > bin.y) { bin.y = pt.y; bin.x = pt.x; } },
  ).map(({ x, y }) => ({ x, y: y + OCC_OUT }));
}

// Cervical profile: min-y per x-bin in the cervical zone (deepest apical extent)
function cervProfile(crownD, depth) {
  const cutoff = -depth * CERV_START_FRAC;
  return binCrown(
    crownD,
    (pt) => pt.y <= cutoff,
    CERV_BINS,
    Infinity,
    (bin, pt) => { if (pt.y < bin.y) { bin.y = pt.y; bin.x = pt.x; } },
  ).map(({ x, y }) => ({ x, y: y - CERV_OUT }));
}

// Closed quadratic B-spline (midpoint method). Approximating — every arc stays
// inside its control triangle, so it cannot overshoot → spikes are impossible.
// No tension parameter. C1-continuous all the way around the ring.
function smoothClosedRing(pts) {
  const n = pts.length;
  if (n < 3) return '';
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M ${m0.x.toFixed(2)} ${m0.y.toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p  = pts[i];
    const m  = mid(p, pts[(i + 1) % n]);
    d += `Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${m.x.toFixed(2)} ${m.y.toFixed(2)} `;
  }
  return d + 'Z';
}

// Distal end-cap for the terminal teeth (18 / 28 / 38 / 48). Produces a single
// convex arc that bows out from the occlusal-distal corner, round past the
// crown's widest point (fbExtreme), and back into the cervical-distal corner —
// so the occlusal edge → cap → cervical edge reads as one rounded distal wrap.
//
// Two design rules make the corners actually *round* rather than square:
//   1. We return ONLY the interior bulge points. The two corner points already
//      live in occPts / cervPts; re-emitting them would duplicate ring knots and
//      flatten the tangents (→ square corner). Leaving them to the body curves
//      lets the closed Catmull-Rom sweep smoothly around the corner.
//   2. The bulge is anchored to the envelope corners (occEnd, cervEnd) and only
//      the MIDDLE pushes out to fbExtreme+END_OUT. A straight wall that juts to
//      full extension at the corners meets the occlusal/cervical edge at ~90°;
//      a mid-peaked bow has no corner to square off.
// We also pin y to the real envelope endpoints so a short distal cusp can't make
// the cap poke past the body curve (that overshoot used to render as a spike).
// side = -1 for left end cap, +1 for right end cap. Returns interior pts occ→cerv.
// crownD is the local crown path — used to trace the real distal wall contour.
function buildEndCap(occEnd, cervEnd, fbExtreme, side, crownD) {
  const pts = [];
  for (let i = 1; i < END_CAP_SAMPLES; i++) {            // interior only
    const frac = i / END_CAP_SAMPLES;
    const y    = occEnd.y + (cervEnd.y - occEnd.y) * frac;
    const xLin = occEnd.x + (cervEnd.x - occEnd.x) * frac;
    // Try to get the real wall x from the crown outline at this y; fall back to linear
    const wallX = crownD ? (crownXAtY(crownD, y, side) ?? xLin) : xLin;
    const bow   = END_OUT * side * Math.sin(Math.PI * frac); // offset tapers to 0 at corners
    pts.push({ x: wallX + bow, y });
  }
  return pts;
}

export function buildTrayPath(teeth, biteY, jaw) {
  const flipY = jaw === 'upper' ? 1 : -1;
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);

  const cols = sorted.map((tooth) => {
    const { type, w, h } = tooth;
    const crownD = toothPaths(type, w, h).crown;
    const depth  = crownDepth(type, h);
    const toG    = (lx, ly) => toGlobal(tooth, biteY, flipY, lx, ly);
    const toGpt  = ({ x, y }) => toG(x, y);

    const fbL = proximalExtreme(crownD, -1)?.x ?? -w / 2;
    const fbR = proximalExtreme(crownD, +1)?.x ?? +w / 2;

    // Local envelopes (left→right) — endpoints anchor the end caps below.
    const occLocal  = occlusProfile(crownD, depth);
    const cervLocal = cervProfile(crownD, depth);
    const occEndL  = occLocal[0]                   ?? { x: fbL, y: OCC_OUT };
    const occEndR  = occLocal[occLocal.length - 1] ?? { x: fbR, y: OCC_OUT };
    const cervEndL = cervLocal[0]                  ?? { x: fbL, y: -(depth + CERV_OUT) };
    const cervEndR = cervLocal[cervLocal.length-1] ?? { x: fbR, y: -(depth + CERV_OUT) };

    return {
      occPts:    occLocal.map(toGpt),
      cervPts:   cervLocal.map(toGpt),
      occLeft:   toG(fbL, OCC_OUT),
      occRight:  toG(fbR, OCC_OUT),
      cervLeft:  toG(fbL, -(depth + CERV_OUT)),
      cervRight: toG(fbR, -(depth + CERV_OUT)),
      // Rounded distal end caps, pinned to the envelope endpoints (local → global)
      leftCap:  buildEndCap(occEndL, cervEndL, fbL, -1, crownD).map(toGpt),
      rightCap: buildEndCap(occEndR, cervEndR, fbR, +1, crownD).map(toGpt),
    };
  });

  const n = cols.length;
  if (!n) return '';

  // ── Assemble one ordered ring of points (clockwise from the occlusal edge) ──
  // A closed quadratic B-spline rounds every junction smoothly: occlusal scallops,
  // cervical embrasure dips, and distal end-cap folds. Convex-hull-bounded →
  // cannot overshoot, no spikes possible regardless of control-point layout.
  const ring = [];

  // Occlusal edge, left → right (tooth bodies + dipped embrasure bridges)
  for (let i = 0; i < n; i++) {
    ring.push(...cols[i].occPts);
    if (i < n - 1) {
      const r = cols[i].occRight, nl = cols[i + 1].occLeft;
      const mx = (r.x + nl.x) / 2, my = (r.y + nl.y) / 2;
      ring.push({ x: mx, y: my - OCC_EMBRASURE_LIFT * flipY });
    }
  }

  // Right distal end-cap wall, occlusal → cervical
  ring.push(...cols[n - 1].rightCap);

  // Cervical edge, right → left (tooth bodies + raised embrasure bridges)
  for (let i = n - 1; i >= 0; i--) {
    ring.push(...[...cols[i].cervPts].reverse());
    if (i > 0) {
      const cl = cols[i].cervLeft, pr = cols[i - 1].cervRight;
      const mx = (cl.x + pr.x) / 2, my = (cl.y + pr.y) / 2;
      ring.push({ x: mx, y: my + CERV_EMBRASURE_LIFT * flipY });
    }
  }

  // Left distal end-cap wall, cervical → occlusal (closes back to the start)
  ring.push(...[...cols[0].leftCap].reverse());

  return smoothClosedRing(ring);
}

export function ClearAlignerOverlay({ upper, lower, upperBiteY, lowerBiteY, accent }) {
  const uid = React.useId();
  const gradId = `algn-grad-${uid}`;
  const upperD = upper?.length ? buildTrayPath(upper, upperBiteY, 'upper') : '';
  const lowerD = lower?.length ? buildTrayPath(lower, lowerBiteY, 'lower') : '';

  const sharedProps = {
    fill: `url(#${gradId})`,
    fillOpacity: FILL_OPACITY,
    stroke: accent,
    strokeWidth: STROKE_WIDTH,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  };

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%"  stopColor={accent}  stopOpacity="0.12" />
          <stop offset="100%" stopColor={accent}  stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {upperD && <path d={upperD} {...sharedProps} />}
      {lowerD && <path d={lowerD} {...sharedProps} />}
    </g>
  );
}
