import { describe, it, expect } from 'vitest';
import { parseD, parseSvgPath, normalizeSegments, fitToBoundingBox } from './trace-pipeline.js';

describe('parseD', () => {
  it('parses M L Z', () => {
    const segs = parseD('M 10 20 L 30 40 Z');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ type: 'M', x: 10, y: 20 });
    expect(segs[1]).toEqual({ type: 'L', x: 30, y: 40 });
    expect(segs[2]).toEqual({ type: 'Z' });
  });

  it('parses cubic bezier C', () => {
    const segs = parseD('M 0 0 C 1 2 3 4 5 6 Z');
    expect(segs[1]).toEqual({ type: 'C', x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 });
  });

  it('handles multiple C coords in one command', () => {
    const segs = parseD('M 0 0 C 1 2 3 4 5 6 7 8 9 10 11 12 Z');
    expect(segs.filter(s => s.type === 'C')).toHaveLength(2);
  });

  it('returns null for empty string via parseSvgPath when no d attr', () => {
    expect(parseSvgPath('<svg></svg>')).toBeNull();
  });

  it('parseSvgPath extracts d attribute', () => {
    const svg = '<svg><path d="M 0 0 L 1 1 Z"/></svg>';
    const segs = parseSvgPath(svg);
    expect(segs).toHaveLength(3);
    expect(segs[0].type).toBe('M');
  });
});

describe('normalizeSegments', () => {
  it('divides coords by imgW and imgH', () => {
    const segs = [
      { type: 'M', x: 100, y: 200 },
      { type: 'L', x: 200, y: 400 },
      { type: 'Z' },
    ];
    const norm = normalizeSegments(segs, 200, 400);
    expect(norm[0]).toEqual({ type: 'M', x: 0.5, y: 0.5 });
    expect(norm[1]).toEqual({ type: 'L', x: 1, y: 1 });
    expect(norm[2]).toEqual({ type: 'Z' });
  });

  it('normalizes cubic control points', () => {
    const segs = [
      { type: 'C', x1: 50, y1: 100, x2: 150, y2: 100, x: 200, y: 0 },
    ];
    const norm = normalizeSegments(segs, 200, 200);
    expect(norm[0].x1).toBeCloseTo(0.25);
    expect(norm[0].y1).toBeCloseTo(0.5);
    expect(norm[0].x2).toBeCloseTo(0.75);
    expect(norm[0].x).toBeCloseTo(1);
  });

  it('passes Z through unchanged', () => {
    const norm = normalizeSegments([{ type: 'Z' }], 100, 100);
    expect(norm[0]).toEqual({ type: 'Z' });
  });
});

describe('fitToBoundingBox', () => {
  it('fits a translated shape back to 0..1 range', () => {
    // Shape offset to [0.5, 0.5]...[1, 1] — should map to [0, 0]...[1, 1] centered
    const segs = [
      { type: 'M', x: 0.5, y: 0.5 },
      { type: 'L', x: 1,   y: 0.5 },
      { type: 'L', x: 1,   y: 1   },
      { type: 'L', x: 0.5, y: 1   },
      { type: 'Z' },
    ];
    const fitted = fitToBoundingBox(segs);
    const xs = fitted.filter(s => s.x !== undefined).map(s => s.x);
    const ys = fitted.filter(s => s.y !== undefined).map(s => s.y);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(1);
    expect(Math.min(...ys)).toBeCloseTo(0);
    expect(Math.max(...ys)).toBeCloseTo(1);
  });

  it('preserves Z segments', () => {
    const fitted = fitToBoundingBox([{ type: 'M', x: 0, y: 0 }, { type: 'Z' }]);
    expect(fitted[1]).toEqual({ type: 'Z' });
  });
});
