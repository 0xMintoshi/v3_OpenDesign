import { describe, it, expect } from 'vitest';
import { shapeToPath } from './shapes.jsx';

describe('shapeToPath', () => {
  it('converts M segment', () => {
    const shape = { segments: [{ type: 'M', x: 0.5, y: -0.5 }] };
    expect(shapeToPath(shape, 40, 100)).toBe('M 20.00 -50.00');
  });

  it('converts C segment', () => {
    const shape = { segments: [
      { type: 'M', x: 0.48, y: 0 },
      { type: 'C', x1: 0.52, y1: -0.16, x2: 0.52, y2: -0.34, x: 0.42, y: -0.40 },
      { type: 'Z' },
    ]};
    const d = shapeToPath(shape, 38, 88);
    expect(d).toContain('M 18.24 0.00');
    expect(d).toContain('C 19.76 -14.08 19.76 -29.92 15.96 -35.20');
    expect(d).toContain('Z');
  });

  it('converts Q segment', () => {
    const shape = { segments: [
      { type: 'M', x: 0.42, y: -0.40 },
      { type: 'Q', x1: 0.00, y1: -0.47, x: -0.42, y: -0.40 },
    ]};
    const d = shapeToPath(shape, 38, 88);
    expect(d).toContain('Q 0.00 -41.36 -15.96 -35.20');
  });

  it('converts Z segment', () => {
    const shape = { segments: [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }] };
    expect(shapeToPath(shape, 10, 10)).toContain('Z');
  });
});
