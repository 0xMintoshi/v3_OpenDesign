// Pure math utilities for bezier curve operations used by the shape editor.

const SAMPLES = 24;
export const HOVER_THRESHOLD_PX = 10;

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function sampleCubic(P0, P1, P2, P3, t) {
  const A = lerp(P0, P1, t);
  const B = lerp(P1, P2, t);
  const D = lerp(P2, P3, t);
  const E = lerp(A, B, t);
  const F = lerp(B, D, t);
  return lerp(E, F, t);
}

export function sampleQuad(P0, P1, P2, t) {
  const A = lerp(P0, P1, t);
  const B = lerp(P1, P2, t);
  return lerp(A, B, t);
}

// Split a C/Q/L segment at parameter t.
// Returns [firstHalf, secondHalf] in normalized coords, same type as input.
// prev: the segment whose endpoint is the start of this segment.
export function splitSegment(prev, seg, t) {
  const P0 = { x: prev.x, y: prev.y };

  if (seg.type === 'C') {
    const P1 = { x: seg.x1, y: seg.y1 };
    const P2 = { x: seg.x2, y: seg.y2 };
    const P3 = { x: seg.x,  y: seg.y  };
    const A = lerp(P0, P1, t);
    const B = lerp(P1, P2, t);
    const D = lerp(P2, P3, t);
    const E = lerp(A, B, t);
    const F = lerp(B, D, t);
    const G = lerp(E, F, t);
    return [
      { type: 'C', x1: r(A.x), y1: r(A.y), x2: r(E.x), y2: r(E.y), x: r(G.x), y: r(G.y) },
      { type: 'C', x1: r(F.x), y1: r(F.y), x2: r(D.x), y2: r(D.y), x: r(P3.x), y: r(P3.y) },
    ];
  }

  if (seg.type === 'Q') {
    const P1 = { x: seg.x1, y: seg.y1 };
    const P2 = { x: seg.x,  y: seg.y  };
    const A = lerp(P0, P1, t);
    const B = lerp(P1, P2, t);
    const G = lerp(A, B, t);
    return [
      { type: 'Q', x1: r(A.x), y1: r(A.y), x: r(G.x), y: r(G.y) },
      { type: 'Q', x1: r(B.x), y1: r(B.y), x: r(P2.x), y: r(P2.y) },
    ];
  }

  if (seg.type === 'L') {
    const P1 = { x: seg.x, y: seg.y };
    const G = lerp(P0, P1, t);
    return [
      { type: 'L', x: r(G.x), y: r(G.y) },
      { type: 'L', x: r(P1.x), y: r(P1.y) },
    ];
  }

  return [seg]; // M / Z — no split
}

// Returns new segments array with the segment at segIdx split at t.
export function splitSegmentAt(segments, segIdx, t) {
  const seg = segments[segIdx];
  const prev = segments[segIdx - 1];
  if (!prev || seg.type === 'M' || seg.type === 'Z') return segments;
  const [first, second] = splitSegment(prev, seg, t);
  return [...segments.slice(0, segIdx), first, second, ...segments.slice(segIdx + 1)];
}

// Find the closest point on any drawable segment to (sx, sy) in screen space.
// Returns { segIdx, t, px, py } or null if farther than HOVER_THRESHOLD_PX.
// Segments are normalized; pass W, H, CX, CY to convert to screen coords.
export function nearestOnSegments(segments, sx, sy, W, H, CX, CY) {
  function toScreen(nx, ny) { return { x: CX + nx * W, y: CY + ny * H }; }

  let bestDist = HOVER_THRESHOLD_PX;
  let best = null;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === 'Z' || seg.type === 'M') continue;
    const prev = segments[i - 1];
    if (!prev || prev.type === 'Z') continue;

    const P0 = toScreen(prev.x, prev.y);
    const P3 = toScreen(seg.x, seg.y);

    for (let k = 0; k <= SAMPLES; k++) {
      const t = k / SAMPLES;
      let pt;
      if (seg.type === 'C') {
        pt = sampleCubic(P0, toScreen(seg.x1, seg.y1), toScreen(seg.x2, seg.y2), P3, t);
      } else if (seg.type === 'Q') {
        pt = sampleQuad(P0, toScreen(seg.x1, seg.y1), P3, t);
      } else if (seg.type === 'L') {
        pt = lerp(P0, P3, t);
      } else {
        continue;
      }

      const dist = Math.hypot(pt.x - sx, pt.y - sy);
      if (dist < bestDist) {
        bestDist = dist;
        best = { segIdx: i, t, px: pt.x, py: pt.y };
      }
    }
  }

  return best;
}

function r(n) { return Math.round(n * 1000) / 1000; }
