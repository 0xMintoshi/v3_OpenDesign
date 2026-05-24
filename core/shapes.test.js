import { describe, it, expect } from 'vitest';
import { shapeToPath } from './shapes.js';

describe('shapeToPath', () => {
  it('renders M segment', () => {
    const shape = { segments: [{ type: 'M', x: 0.5, y: 0 }] };
    expect(shapeToPath(shape, 100, 200)).toBe('M 50.00 0.00');
  });

  it('renders C segment', () => {
    const shape = {
      segments: [
        { type: 'C', x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4, x: 0.5, y: 0.6 },
      ],
    };
    expect(shapeToPath(shape, 100, 100)).toBe('C 10.00 20.00 30.00 40.00 50.00 60.00');
  });

  it('renders Q segment', () => {
    const shape = { segments: [{ type: 'Q', x1: 0.5, y1: -0.47, x: -0.42, y: -0.4 }] };
    expect(shapeToPath(shape, 38, 88)).toBe('Q 19.00 -41.36 -15.96 -35.20');
  });

  it('renders Z segment', () => {
    const shape = { segments: [{ type: 'Z' }] };
    expect(shapeToPath(shape, 38, 88)).toBe('Z');
  });

  it('builds a round-trip path for the molar crown JSON', async () => {
    const json = await import('../shapes-data/crown-molar-upper.json');
    const d = shapeToPath(json.default ?? json, 38, 88);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });
});
