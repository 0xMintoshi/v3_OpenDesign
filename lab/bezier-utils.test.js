import { describe, it, expect } from 'vitest';
import { lerp, sampleCubic, sampleQuad, splitSegment, splitSegmentAt, nearestOnSegments } from './bezier-utils.js';

describe('lerp', () => {
  it('returns start at t=0', () => {
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0)).toEqual({ x: 0, y: 0 });
  });
  it('returns end at t=1', () => {
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 1)).toEqual({ x: 10, y: 20 });
  });
  it('returns midpoint at t=0.5', () => {
    expect(lerp({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 10 });
  });
});

describe('sampleCubic', () => {
  it('returns P0 at t=0', () => {
    const P0 = { x: 1, y: 2 };
    const P1 = { x: 3, y: 4 };
    const P2 = { x: 5, y: 6 };
    const P3 = { x: 7, y: 8 };
    const pt = sampleCubic(P0, P1, P2, P3, 0);
    expect(pt.x).toBeCloseTo(1);
    expect(pt.y).toBeCloseTo(2);
  });
  it('returns P3 at t=1', () => {
    const P0 = { x: 1, y: 2 };
    const P1 = { x: 3, y: 4 };
    const P2 = { x: 5, y: 6 };
    const P3 = { x: 7, y: 8 };
    const pt = sampleCubic(P0, P1, P2, P3, 1);
    expect(pt.x).toBeCloseTo(7);
    expect(pt.y).toBeCloseTo(8);
  });
});

describe('sampleQuad', () => {
  it('returns P0 at t=0 and P2 at t=1', () => {
    const P0 = { x: 0, y: 0 };
    const P1 = { x: 5, y: 10 };
    const P2 = { x: 10, y: 0 };
    expect(sampleQuad(P0, P1, P2, 0)).toEqual({ x: 0, y: 0 });
    const end = sampleQuad(P0, P1, P2, 1);
    expect(end.x).toBeCloseTo(10);
    expect(end.y).toBeCloseTo(0);
  });
});

// Simple linear path: M(0,0) → L(1,0)
const LINEAR_SEGS = [
  { type: 'M', x: 0, y: 0 },
  { type: 'L', x: 1, y: 0 },
  { type: 'Z' },
];

describe('splitSegment — L type', () => {
  it('splits a line at t=0.5 into two equal halves', () => {
    const prev = { type: 'M', x: 0, y: 0 };
    const seg  = { type: 'L', x: 1, y: 0 };
    const [first, second] = splitSegment(prev, seg, 0.5);
    expect(first.type).toBe('L');
    expect(first.x).toBeCloseTo(0.5);
    expect(first.y).toBeCloseTo(0);
    expect(second.type).toBe('L');
    expect(second.x).toBeCloseTo(1);
    expect(second.y).toBeCloseTo(0);
  });
});

describe('splitSegmentAt', () => {
  it('increases segment count by 1', () => {
    const result = splitSegmentAt(LINEAR_SEGS, 1, 0.5);
    // M + L + L + Z
    expect(result.length).toBe(LINEAR_SEGS.length + 1);
  });

  it('preserves M as first and Z as last', () => {
    const result = splitSegmentAt(LINEAR_SEGS, 1, 0.5);
    expect(result[0].type).toBe('M');
    expect(result[result.length - 1].type).toBe('Z');
  });

  it('new midpoint is on the original segment', () => {
    const result = splitSegmentAt(LINEAR_SEGS, 1, 0.5);
    // First new segment ends at midpoint (0.5, 0)
    expect(result[1].x).toBeCloseTo(0.5);
    expect(result[1].y).toBeCloseTo(0);
    // Second new segment ends at original endpoint
    expect(result[2].x).toBeCloseTo(1);
    expect(result[2].y).toBeCloseTo(0);
  });

  it('does not modify M or Z segments', () => {
    const before = LINEAR_SEGS.length;
    expect(splitSegmentAt(LINEAR_SEGS, 0, 0.5).length).toBe(before); // M
    expect(splitSegmentAt(LINEAR_SEGS, 2, 0.5).length).toBe(before); // Z
  });

  it('cubic split: endpoint preserved', () => {
    const segs = [
      { type: 'M', x: 0, y: 0 },
      { type: 'C', x1: 0.25, y1: 0.5, x2: 0.75, y2: 0.5, x: 1, y: 0 },
      { type: 'Z' },
    ];
    const result = splitSegmentAt(segs, 1, 0.5);
    expect(result.length).toBe(4);
    // Both halves should be cubic
    expect(result[1].type).toBe('C');
    expect(result[2].type).toBe('C');
    // Final endpoint of second half must equal original endpoint
    expect(result[2].x).toBeCloseTo(1);
    expect(result[2].y).toBeCloseTo(0);
  });

  it('quad split: endpoint preserved', () => {
    const segs = [
      { type: 'M', x: 0, y: 0 },
      { type: 'Q', x1: 0.5, y1: 1, x: 1, y: 0 },
      { type: 'Z' },
    ];
    const result = splitSegmentAt(segs, 1, 0.5);
    expect(result.length).toBe(4);
    expect(result[1].type).toBe('Q');
    expect(result[2].type).toBe('Q');
    expect(result[2].x).toBeCloseTo(1);
    expect(result[2].y).toBeCloseTo(0);
  });
});

describe('nearestOnSegments', () => {
  // Simple L path: M(0,0) → L(1,0) in normalized coords.
  // Canvas: W=100, H=100, CX=0, CY=0 → screen coords match normalized * 100.
  const SEGS = [
    { type: 'M', x: 0, y: 0 },
    { type: 'L', x: 1, y: 0 },
    { type: 'Z' },
  ];
  const W = 100, H = 100, CX = 0, CY = 0;

  it('finds a point on the path when cursor is close', () => {
    // Cursor at (50, 3) — 3px above midpoint of the line
    const hit = nearestOnSegments(SEGS, 50, 3, W, H, CX, CY);
    expect(hit).not.toBeNull();
    expect(hit.segIdx).toBe(1);
    expect(hit.px).toBeCloseTo(50, 0);
    expect(hit.py).toBeCloseTo(0, 0);
  });

  it('returns null when cursor is far from path', () => {
    const hit = nearestOnSegments(SEGS, 50, 50, W, H, CX, CY);
    expect(hit).toBeNull();
  });

  it('does not hit M or Z segments', () => {
    // Cursor right on the M point — that's on the line segment starting from M, not M itself
    const hit = nearestOnSegments(SEGS, 0, 0, W, H, CX, CY);
    // Could hit the line at t=0 (start), segIdx should be 1 (the L segment), not 0 (M)
    if (hit) expect(hit.segIdx).toBe(1);
  });
});
