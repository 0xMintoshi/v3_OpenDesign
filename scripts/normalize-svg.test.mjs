import { describe, it, expect } from 'vitest';
import { parseSVGPath, normalizePath } from './normalize-svg.mjs';

describe('parseSVGPath', () => {
  it('parses M', () => {
    expect(parseSVGPath('M 19 0')).toEqual([{ type: 'M', x: 19, y: 0 }]);
  });
  it('parses C', () => {
    const segs = parseSVGPath('M 0 0 C 10 -5 20 -10 30 -15');
    expect(segs[1]).toEqual({ type: 'C', x1: 10, y1: -5, x2: 20, y2: -10, x: 30, y: -15 });
  });
  it('parses Q', () => {
    const segs = parseSVGPath('M 0 0 Q 5 -3 10 0');
    expect(segs[1]).toEqual({ type: 'Q', x1: 5, y1: -3, x: 10, y: 0 });
  });
  it('parses Z', () => {
    expect(parseSVGPath('M 0 0 Z')[1]).toEqual({ type: 'Z' });
  });
});

describe('normalizePath', () => {
  it('divides M by w and h', () => {
    expect(normalizePath([{ type: 'M', x: 19, y: 0 }], 38, 88))
      .toEqual([{ type: 'M', x: 0.5, y: 0 }]);
  });
  it('normalizes C', () => {
    const result = normalizePath(
      [{ type: 'C', x1: 19.76, y1: -14.08, x2: 19.76, y2: -29.92, x: 15.96, y: -35.2 }],
      38, 88
    );
    expect(result[0].x1).toBeCloseTo(0.52, 2);
    expect(result[0].y1).toBeCloseTo(-0.16, 2);
  });
  it('passes Z through', () => {
    expect(normalizePath([{ type: 'Z' }], 38, 88)).toEqual([{ type: 'Z' }]);
  });
});
