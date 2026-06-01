// Splits a tooth outline d-string into crown and root shapes at the cervical boundary.
// The outline must be M x y (C cp1x cp1y cp2x cp2y ex ey)* Z — all-cubic, no other commands.

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function evalCubicY(p0, cp1, cp2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p3.y;
}

function evalCubic(p0, cp1, cp2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t2 * t * p3.y,
  };
}

function bisectCubicY(p0, cp1, cp2, p3, targetY, tol = 1e-7) {
  let lo = 0, hi = 1;
  const f = (t) => evalCubicY(p0, cp1, cp2, p3, t) - targetY;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < tol) return mid;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function deCasteljauSplit(p0, cp1, cp2, p3, t) {
  const p01   = lerp(p0,  cp1, t);
  const p12   = lerp(cp1, cp2, t);
  const p23   = lerp(cp2, p3,  t);
  const p012  = lerp(p01, p12, t);
  const p123  = lerp(p12, p23, t);
  const p0123 = lerp(p012, p123, t);
  return {
    before: { cp1: p01,  cp2: p012, end: p0123 },
    after:  { cp1: p123, cp2: p23,  end: p3    },
    point:  p0123,
  };
}

export function parseOutline(d) {
  // Returns { start: {x,y}, segs: [{cp1,cp2,end}, ...] }
  const tokens = d.trim().split(/[\s,]+/).filter(Boolean);
  let i = 0;
  let start = null;
  const segs = [];

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      start = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
    } else if (cmd === 'C') {
      const cp1 = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      const cp2 = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      const end = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      segs.push({ cp1, cp2, end });
    } else if (cmd === 'Z' || cmd === 'z') {
      break;
    } else {
      throw new Error(`tooth-split: unexpected SVG command "${cmd}"`);
    }
  }

  if (!start) throw new Error('tooth-split: missing M command');
  return { start, segs };
}

const fmt = (n) => parseFloat(n.toFixed(5)).toString();
const pt  = (p) => `${fmt(p.x)} ${fmt(p.y)}`;
const seg = (s) => `C ${pt(s.cp1)} ${pt(s.cp2)} ${pt(s.end)}`;

// outlineD  — the tooth outline d-string (M … C … Z)
// cervicalY — y coordinate of the boundary (negative in tooth-local coords, e.g. -0.34*h)
// dipY      — how far the boundary curve dips apically (positive number, e.g. 0.055*h)
export function splitToothAtCervical(outlineD, cervicalY, dipY) {
  const { start, segs } = parseOutline(outlineD);

  // Build array with explicit start points for each segment
  const segments = segs.map((s, i) => ({
    p0:  i === 0 ? start : segs[i - 1].end,
    cp1: s.cp1,
    cp2: s.cp2,
    p3:  s.end,
  }));

  // A segment crosses cervicalY if its endpoints are on opposite sides OR one is exactly on it.
  // Use sign-of-product: negative = opposite sides, zero = one endpoint exactly on boundary.
  const straddles = (s) =>
    (s.p0.y - cervicalY) * (s.p3.y - cervicalY) <= 0 && s.p0.y !== s.p3.y;

  let firstIdx = -1, lastIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (straddles(segments[i])) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
  }

  if (firstIdx === -1) throw new Error('tooth-split: no cervical crossing found');
  if (firstIdx === lastIdx) throw new Error('tooth-split: only one crossing found (expected two)');

  const rSeg = segments[firstIdx];
  const tR   = bisectCubicY(rSeg.p0, rSeg.cp1, rSeg.cp2, rSeg.p3, cervicalY);
  const rSpl = deCasteljauSplit(rSeg.p0, rSeg.cp1, rSeg.cp2, rSeg.p3, tR);
  const Pr   = rSpl.point; // right-wall crossing (first, bite side → apical)

  const lSeg = segments[lastIdx];
  const tL   = bisectCubicY(lSeg.p0, lSeg.cp1, lSeg.cp2, lSeg.p3, cervicalY);
  const lSpl = deCasteljauSplit(lSeg.p0, lSeg.cp1, lSeg.cp2, lSeg.p3, tL);
  const Pl   = lSpl.point; // left-wall crossing (last, apical → bite side)

  // Shared boundary curve: quadratic Bézier dipping apically (more negative y)
  const midX = (Pr.x + Pl.x) / 2;
  const cpY  = cervicalY - dipY; // apical dip

  const boundaryFwd = `Q ${fmt(midX)} ${fmt(cpY)} ${pt(Pl)}`; // Pr → Pl
  const boundaryRev = `Q ${fmt(midX)} ${fmt(cpY)} ${pt(Pr)}`; // Pl → Pr

  // ── Crown: bite-side right wall → boundary → bite-side left wall → Z ──
  let crownD = `M ${pt(start)} `;
  for (let i = 0; i < firstIdx; i++) crownD += seg(segs[i]) + ' ';
  crownD += `C ${pt(rSpl.before.cp1)} ${pt(rSpl.before.cp2)} ${pt(Pr)} `;
  crownD += `${boundaryFwd} `;
  crownD += `C ${pt(lSpl.after.cp1)} ${pt(lSpl.after.cp2)} ${pt(lSpl.after.end)} `;
  for (let i = lastIdx + 1; i < segs.length; i++) crownD += seg(segs[i]) + ' ';
  crownD += 'Z';

  // ── Root: apical side of both walls + reverse boundary ──
  let rootD = `M ${pt(Pr)} `;
  rootD += `C ${pt(rSpl.after.cp1)} ${pt(rSpl.after.cp2)} ${pt(rSpl.after.end)} `;
  for (let i = firstIdx + 1; i < lastIdx; i++) rootD += seg(segs[i]) + ' ';
  rootD += `C ${pt(lSpl.before.cp1)} ${pt(lSpl.before.cp2)} ${pt(Pl)} `;
  rootD += `${boundaryRev} Z`;

  // Corrected cervical line for display (endpoints exactly on the wall)
  const cervical = `M ${pt(Pr)} ${boundaryFwd}`;

  return { crown: crownD, root: rootD, cervical };
}

function evalQuadratic(p0, cp, p3, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p3.x,
    y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p3.y,
  };
}

// Walk the crown d-string and return the extreme-x point on one proximal side.
// side = +1 → max x (right edge of tooth);  side = -1 → min x (left edge).
// Coords are tooth-local (same space as the outline function output).
// Handles M, C, Q, Z — crown paths include a Q from the cervical boundary.
export function proximalExtreme(crownD, side, steps = 24) {
  const tokens = crownD.trim().split(/[\s,]+/).filter(Boolean);
  let i = 0;
  let p0 = null;
  let best = null;
  let bestScore = -Infinity;

  const sample = (pt) => {
    const score = side * pt.x;
    if (score > bestScore) { bestScore = score; best = { x: pt.x, y: pt.y }; }
  };

  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      p0 = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      sample(p0);
    } else if (cmd === 'C') {
      const cp1 = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      const cp2 = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      const p3  = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      for (let k = 1; k <= steps; k++) sample(evalCubic(p0, cp1, cp2, p3, k / steps));
      p0 = p3;
    } else if (cmd === 'Q') {
      const cp = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      const p3 = { x: parseFloat(tokens[i++]), y: parseFloat(tokens[i++]) };
      for (let k = 1; k <= steps; k++) sample(evalQuadratic(p0, cp, p3, k / steps));
      p0 = p3;
    } else if (cmd === 'Z' || cmd === 'z') {
      break;
    }
  }

  return best;
}
