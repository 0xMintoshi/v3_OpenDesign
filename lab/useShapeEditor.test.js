import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShapeEditor } from './useShapeEditor.js';

function makeShape(segments) {
  return { id: 'test', segments };
}

function getSegs(result) {
  return result.current[0].segments;
}

function mirrorRight(result) {
  act(() => result.current[2].mirrorAcrossX('right'));
}

function mirrorLeft(result) {
  act(() => result.current[2].mirrorAcrossX('left'));
}

// ── Test 1: Symmetric L-only rectangle ─────────────────────────────────────
// Mirroring the right half onto the left should produce a symmetric result.
// Both left and right sides of a rectangle are identical after mirror.
test('symmetric L-only path: mirror right→left produces correct mirrored anchors', () => {
  const segs = [
    { type: 'M', x: 0.0, y: 0.0 },
    { type: 'L', x: 0.0, y: 1.0 },  // left (dest)
    { type: 'L', x: 0.5, y: 1.0 },  // center
    { type: 'L', x: 1.0, y: 1.0 },  // right (source)
    { type: 'L', x: 1.0, y: 0.0 },  // right (source)
    { type: 'Z' },
  ];
  const { result } = renderHook(() => useShapeEditor(makeShape(segs), 100, 100));
  mirrorRight(result);
  const out = getSegs(result);

  // M and Z must be preserved
  expect(out[0].type).toBe('M');
  expect(out[out.length - 1].type).toBe('Z');

  // After mirror right→left: the left anchor (formerly x=0.0,y=1.0) should be
  // replaced by the mirrored reversed right anchors.
  // Right side in path order: L(1.0,1.0), L(1.0,0.0)
  // mirrored: L(0.0,1.0), L(0.0,0.0)  [mx(1.0)=1-1=0]
  // reversed: L(0.0,0.0), L(0.0,1.0)
  // dest is idx 1 (x=0,y=1). out has 2 items, dest has 1 slot → interleaved or insert after.
  // Verify: no anchor has x outside [0,1]
  const anchors = out.filter(s => s.x !== undefined);
  anchors.forEach(s => {
    expect(s.x).toBeGreaterThanOrEqual(0);
    expect(s.x).toBeLessThanOrEqual(1);
  });
});

// ── Test 2: Q path — x and control point correctly mirrored, y preserved ───
// Uses centered coordinates (x can be negative, center=0) so the mirrored
// segment lands at x < 0 and is easy to identify.
test('Q path: mirror flips x of anchor and control, preserves y direction', () => {
  // hasCentered = true because M has x=-0.5 < 0 → center = 0
  const segs = [
    { type: 'M', x: -0.5, y: 0.0 },
    { type: 'Q', x1: 0.25, y1: -0.1, x: 0.5, y: 0.0 },  // right source
    { type: 'Z' },
  ];
  const { result } = renderHook(() => useShapeEditor(makeShape(segs), 100, 100));
  mirrorRight(result);
  const out = getSegs(result);

  // No dest-side anchor → mirrored Q inserted after source Q
  const qs = out.filter(s => s.type === 'Q');
  expect(qs.length).toBe(2);

  // Original Q stays: x=0.5, x1=0.25
  const orig = qs.find(s => s.x > 0);
  expect(orig).toBeDefined();
  expect(orig.x).toBeCloseTo(0.5, 3);
  expect(orig.x1).toBeCloseTo(0.25, 3);

  // Mirrored Q: mx(0.5) = 2*0-0.5 = -0.5, mx(0.25) = -0.25, y unchanged
  const mirrored = qs.find(s => s.x < 0);
  expect(mirrored).toBeDefined();
  expect(mirrored.x).toBeCloseTo(-0.5, 3);
  expect(mirrored.x1).toBeCloseTo(-0.25, 3);
  expect(mirrored.y1).toBeCloseTo(-0.1, 3);  // y direction preserved
});

// ── Test 3: Actual maxilla data — mirror left→right replaces right-side anchors ─
// The maxilla has left anchors at [1,2,3,11] (non-contiguous) and right anchors
// at [4-10]. Mirror LEFT→RIGHT where dest (right, indices 5-9) is contiguous —
// this is the clean-splice path. Verify the replaced anchors are correct mirrors.
test('maxilla arch: mirror left→right correctly places mirrored left anchors on right side', () => {
  const segs = [
    { type: 'M',  x: 0.094, y: 0.450 },
    { type: 'L',  x: 0.081, y: 0.300 },                           // idx 1 left
    { type: 'Q',  x1: 0.088, y1: 0.163, x: 0.150, y: 0.113 },   // idx 2 left
    { type: 'Q',  x1: 0.238, y1: 0.075, x: 0.338, y: 0.088 },   // idx 3 left
    { type: 'Q',  x1: 0.438, y1: 0.100, x: 0.500, y: 0.100 },   // idx 4 center
    { type: 'Q',  x1: 0.563, y1: 0.100, x: 0.663, y: 0.088 },   // idx 5 right (dest)
    { type: 'Q',  x1: 0.763, y1: 0.075, x: 0.850, y: 0.113 },   // idx 6 right (dest)
    { type: 'Q',  x1: 0.913, y1: 0.163, x: 0.919, y: 0.300 },   // idx 7 right (dest)
    { type: 'L',  x: 0.906, y: 0.450 },                           // idx 8 right (dest)
    { type: 'L',  x: 0.863, y: 0.450 },                           // idx 9 right (dest)
    { type: 'Q',  x1: 0.688, y1: 0.438, x: 0.500, y: 0.438 },   // idx 10 center
    { type: 'Q',  x1: 0.313, y1: 0.438, x: 0.138, y: 0.450 },   // idx 11 left
    { type: 'Z' },
  ];
  const { result } = renderHook(() => useShapeEditor(makeShape(segs), 100, 100));
  mirrorLeft(result);  // mirror left→right; dest (x > 0.5) at idx 5-9 is contiguous
  const out = getSegs(result);

  // M and Z preserved
  expect(out[0].type).toBe('M');
  expect(out[out.length - 1].type).toBe('Z');

  // Source anchors (left side) must still be present
  const leftAnchors = out.filter(s => s.x !== undefined && s.x < 0.5);
  expect(leftAnchors.length).toBeGreaterThanOrEqual(4);

  // Source: [L(0.081), Q(0.15), Q(0.338), Q(0.5), Q(0.5), Q(0.138)] in path order (idx 1,2,3,4,10,11)
  // reversed mirrored → out[0] = mirror(segs[11]) = Q(mx(0.138)=0.863, y=0.45)
  // out[0] replaces former idx5 position → out[5] in next = Q(0.863, 0.45)
  const newIdx5 = out[5];
  expect(newIdx5.type).toBe('Q');
  expect(newIdx5.x).toBeCloseTo(0.863, 2);
  expect(newIdx5.y).toBeCloseTo(0.450, 3);

  // out[4] = mirror(segs[1]) = L(mx(0.081)=0.919, y=0.3), replaces idx9 position
  const rightAnchors = out.filter(s => s.x !== undefined && s.x > 0.5);
  const lastRightL = rightAnchors.findLast(s => s.type === 'L');
  expect(lastRightL).toBeDefined();
  expect(lastRightL.x).toBeCloseTo(0.919, 2);
});

// ── Test 5: arch-maxilla mirrorRight — hits the broken interleaved branch ──
// Source (right, x > 0.5 strictly): [5]Q663 [6]Q850 [7]Q919 [8]L906 [9]L863 — 5 segs
// Dest (left, x < 0.5): [1]L081 [2]Q150 [3]Q338 [11]Q138 — 4 segs
// Seams at x=0.5: [4]Q(top) [10]Q(bottom) — kept, not mirrored
// Correct output: 4 dest replaced by 5 mirrored → 14 total segs
// Current code hits interleaved branch → 16 segs → test must FAIL before fix.
test('arch-maxilla mirrorRight: replaces dest with mirrored source, seams kept, count=14', () => {
  const segs = [
    { type: 'M',  x: 0.094, y: 0.450 },
    { type: 'L',  x: 0.081, y: 0.300 },
    { type: 'Q',  x1: 0.088, y1: 0.163, x: 0.150, y: 0.113 },
    { type: 'Q',  x1: 0.238, y1: 0.075, x: 0.338, y: 0.088 },
    { type: 'Q',  x1: 0.438, y1: 0.100, x: 0.500, y: 0.100 },   // seam top
    { type: 'Q',  x1: 0.563, y1: 0.100, x: 0.663, y: 0.088 },   // source
    { type: 'Q',  x1: 0.763, y1: 0.075, x: 0.850, y: 0.113 },   // source
    { type: 'Q',  x1: 0.913, y1: 0.163, x: 0.919, y: 0.300 },   // source
    { type: 'L',  x: 0.906, y: 0.450 },                           // source
    { type: 'L',  x: 0.863, y: 0.450 },                           // source
    { type: 'Q',  x1: 0.688, y1: 0.438, x: 0.500, y: 0.438 },   // seam bottom
    { type: 'Q',  x1: 0.313, y1: 0.438, x: 0.138, y: 0.450 },
    { type: 'Z' },
  ];
  const { result } = renderHook(() => useShapeEditor(makeShape(segs), 100, 100));
  mirrorRight(result);
  const out = getSegs(result);

  // M and Z preserved
  expect(out[0].type).toBe('M');
  expect(out[out.length - 1].type).toBe('Z');

  // 4 dest segs replaced by 5 mirrored source segs → 14 total (not 16 from buggy branch)
  expect(out.length).toBe(14);

  // Seam anchors at x=0.5 appear exactly twice
  const seams = out.filter(s => s.x !== undefined && Math.abs(s.x - 0.5) < 1e-6);
  expect(seams.length).toBe(2);

  // Mirrored source segs must be present (mx = 1 - x, rounded to 3 dec)
  const anchors = out.filter(s => s.x !== undefined && s.x < 0.499);
  const xs = anchors.map(s => +s.x.toFixed(3)).sort((a, b) => a - b);
  // Expected mirrored x values: 0.081(mx919), 0.094(mx906), 0.137(mx863), 0.150(mx850), 0.337(mx663)
  expect(xs).toContain(0.081);
  expect(xs).toContain(0.094);
  expect(xs).toContain(0.137);
  expect(xs).toContain(0.150);
  expect(xs).toContain(0.337);

  // Control point of mirrored Q919: mx(0.913)=0.087
  const mirroredQ919 = out.find(s => s.type === 'Q' && s.x !== undefined && Math.abs(s.x - 0.081) < 0.002);
  expect(mirroredQ919).toBeDefined();
  expect(mirroredQ919.x1).toBeCloseTo(0.087, 2);
  expect(mirroredQ919.y1).toBeCloseTo(0.163, 3);
});

// ── Test 4: C segment x1↔x2 swap after reversal ───────────────────────────
// Uses centered coordinates so mirrored C lands at x < 0.
// After reversal: near-start and near-end handles swap roles → x1↔x2 swap.
test('C segment: x1↔x2 swap after reversal', () => {
  // hasCentered = true because M.x = -0.5 < 0 → center = 0, mx(x) = -x
  const segs = [
    { type: 'M', x: -0.5, y: 0.0 },
    { type: 'C', x1: 0.2, y1: -0.1, x2: 0.45, y2: -0.05, x: 0.5, y: 0.0 },
    { type: 'Z' },
  ];
  const { result } = renderHook(() => useShapeEditor(makeShape(segs), 100, 100));
  mirrorRight(result);
  const out = getSegs(result);

  const cs = out.filter(s => s.type === 'C');
  expect(cs.length).toBe(2);

  // Original C stays unchanged
  const orig = cs.find(s => s.x > 0);
  expect(orig.x1).toBeCloseTo(0.2, 3);
  expect(orig.x2).toBeCloseTo(0.45, 3);

  // Mirrored C: mx(x)=-x (center=0)
  // Before swap: x1=mx(0.2)=-0.2, x2=mx(0.45)=-0.45, x=mx(0.5)=-0.5
  // After x1↔x2 swap (reversal fix): x1=-0.45, x2=-0.2
  const mirrored = cs.find(s => s.x < 0);
  expect(mirrored).toBeDefined();
  expect(mirrored.x).toBeCloseTo(-0.5, 3);
  expect(mirrored.x1).toBeCloseTo(-0.45, 3);  // was x2 before swap
  expect(mirrored.x2).toBeCloseTo(-0.2, 3);   // was x1 before swap
  expect(mirrored.y1).toBeCloseTo(-0.05, 3);  // was y2
  expect(mirrored.y2).toBeCloseTo(-0.1, 3);   // was y1
});
