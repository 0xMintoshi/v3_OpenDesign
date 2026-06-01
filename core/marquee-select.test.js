import { describe, it, expect } from 'vitest';
import { toothYAdjust, toothBBoxes, rectsIntersect, computeMarquee } from './marquee-select.js';

const upper = (id, cx, w, h, yOffset = 0, type = 'molarU') => ({
  id, jaw: 'upper', cx, w, h, yOffset, type,
});
const lower = (id, cx, w, h, yOffset = 0, type = 'molarL') => ({
  id, jaw: 'lower', cx, w, h, yOffset, type,
});

describe('toothYAdjust', () => {
  it('returns 0 for non-incisor non-canine teeth', () => {
    expect(toothYAdjust(upper('x', 0, 10, 30, 0, 'molarU'))).toBeCloseTo(0);
  });
  it('shifts incisor up for upper jaw', () => {
    const adj = toothYAdjust(upper('x', 0, 10, 30, 0, 'incisor'));
    expect(adj).toBeCloseTo(-(30 * 0.03));
  });
  it('shifts incisor down for lower jaw', () => {
    const adj = toothYAdjust(lower('x', 0, 10, 30, 0, 'incisor'));
    expect(adj).toBeCloseTo(30 * 0.03);
  });
  it('shifts canine in opposite direction', () => {
    const adjU = toothYAdjust(upper('x', 0, 10, 30, 0, 'canine'));
    expect(adjU).toBeCloseTo(-(30 * -0.02)); // upper negates
  });
});

describe('toothBBoxes', () => {
  it('builds correct bbox for an upper molar at cx=800', () => {
    const t = upper('u1', 800, 20, 40, 0, 'molarU');
    const boxes = toothBBoxes([t], 385, 435);
    const b = boxes.get('u1');
    expect(b.minX).toBeCloseTo(790);
    expect(b.maxX).toBeCloseTo(810);
    expect(b.jaw).toBe('upper');
    // upper: minY = biteY - h = 385 - 40 = 345
    expect(b.minY).toBeCloseTo(345);
    expect(b.maxY).toBeCloseTo(385 + 40 * 0.10);
  });

  it('builds correct bbox for a lower molar at cx=800', () => {
    const t = lower('l1', 800, 20, 40, 0, 'molarL');
    const boxes = toothBBoxes([t], 385, 435);
    const b = boxes.get('l1');
    expect(b.minY).toBeCloseTo(435 - 40 * 0.10);
    expect(b.maxY).toBeCloseTo(435 + 40);
  });
});

describe('rectsIntersect', () => {
  const r = (minX, maxX, minY, maxY) => ({ minX, maxX, minY, maxY });
  it('detects overlap', () => {
    expect(rectsIntersect(r(0, 10, 0, 10), r(5, 15, 5, 15))).toBe(true);
  });
  it('detects adjacency as intersecting', () => {
    expect(rectsIntersect(r(0, 10, 0, 10), r(10, 20, 0, 10))).toBe(true);
  });
  it('detects no overlap', () => {
    expect(rectsIntersect(r(0, 10, 0, 10), r(11, 20, 0, 10))).toBe(false);
  });
});

describe('computeMarquee', () => {
  const teeth = [
    upper('u1', 400, 20, 40),
    upper('u2', 500, 20, 40),
    lower('l1', 400, 20, 40),
    lower('l2', 500, 20, 40),
  ];
  const bboxes = toothBBoxes(teeth, 385, 435);
  const bigRect = { minX: 380, maxX: 520, minY: 300, maxY: 480 };

  it('locks to upper when start point is closer to upper teeth', () => {
    const { lockedArch, hits } = computeMarquee({
      bboxes,
      rect: bigRect,
      startPt: { x: 400, y: 345 }, // near upper arch
      lockedArch: null,
    });
    expect(lockedArch).toBe('upper');
    expect(hits).toContain('u1');
    expect(hits).toContain('u2');
    expect(hits).not.toContain('l1');
    expect(hits).not.toContain('l2');
  });

  it('locks to lower when start point is closer to lower teeth', () => {
    const { lockedArch } = computeMarquee({
      bboxes,
      rect: bigRect,
      startPt: { x: 400, y: 460 }, // near lower arch
      lockedArch: null,
    });
    expect(lockedArch).toBe('lower');
  });

  it('preserves existing lockedArch', () => {
    const { lockedArch, hits } = computeMarquee({
      bboxes,
      rect: bigRect,
      startPt: { x: 400, y: 460 },
      lockedArch: 'upper', // already locked
    });
    expect(lockedArch).toBe('upper');
    expect(hits).not.toContain('l1');
  });

  it('returns empty hits when rect does not intersect any tooth', () => {
    const emptyRect = { minX: 1500, maxX: 1510, minY: 0, maxY: 10 };
    const { lockedArch, hits } = computeMarquee({
      bboxes,
      rect: emptyRect,
      startPt: { x: 1505, y: 5 },
      lockedArch: null,
    });
    expect(lockedArch).toBeNull();
    expect(hits).toHaveLength(0);
  });
});
