import { describe, it, expect } from 'vitest';
import { shapeToPath, shapeRangeToPath } from './shapes.js';

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
    const json = await import('../shapes-data/treatments/crown-molar-upper.json');
    const d = shapeToPath(json.default ?? json, 38, 88);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });
});

describe('shapeRangeToPath', () => {
  const shape = {
    segments: [
      { type: 'M', x: 0.1, y: 0.2 },
      { type: 'L', x: 0.3, y: 0.4 },
      { type: 'Q', x1: 0.5, y1: 0.6, x: 0.7, y: 0.8 },
      { type: 'Z' },
    ],
  };

  it('full range equals shapeToPath minus Z', () => {
    const full = shapeRangeToPath(shape, 100, 100, 0, 2);
    expect(full).toBe('M 10.00 20.00 L 30.00 40.00 Q 50.00 60.00 70.00 80.00');
  });

  it('mid-range suppresses leading M', () => {
    const mid = shapeRangeToPath(shape, 100, 100, 1, 2);
    expect(mid).toMatch(/^L /);
    expect(mid).not.toContain('M');
  });

  it('single-seg range from idx 0 includes M', () => {
    const s = shapeRangeToPath(shape, 100, 100, 0, 0);
    expect(s).toBe('M 10.00 20.00');
  });
});

describe('arch shape round-trips', () => {
  it('arch-maxilla produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/anatomy/arch-maxilla.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    // M moved to seam-top: 0.5*1600=800, 0.1*800=80
    expect(d).toMatch(/^M 800\.\d+ 80\.\d+/);
  });

  it('arch-mandible produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/anatomy/arch-mandible.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    // M moved to seam-top: 0.5*1600=800, 0.525*800=420
    expect(d).toMatch(/^M 800\.\d+ 420\.\d+/);
  });

  it('arch-sinus-right produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/anatomy/arch-sinus-right.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    // 0.175*1600=280.0, 0.350*800=280.0
    expect(d).toMatch(/^M 280\.\d+ 280\.\d+/);
  });

  it('arch-sinus-left produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/anatomy/arch-sinus-left.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    // 0.825*1600=1320.0, 0.350*800=280.0
    expect(d).toMatch(/^M 1320\.\d+ 280\.\d+/);
  });
});

describe('phase-4 shape round-trips', () => {
  it('bridge-span produces valid path at 76×88', async () => {
    const json = await import('../shapes-data/treatments/bridge-span.json');
    const d = shapeToPath(json.default ?? json, 76, 88);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });

  it('partial-denture-upper produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/treatments/partial-denture-upper.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });

  it('partial-denture-lower produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/treatments/partial-denture-lower.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });
});
