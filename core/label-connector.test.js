import { describe, it, expect } from 'vitest';
import {
  ARC_CX, ARC_CY, ARC_RX, ARC_RY,
  ZONE_ARCS,
  ANTERIOR_ZONES, POSTERIOR_LEFT, POSTERIOR_RIGHT,
  arcPoint,
  fdiToZone,
  connectorPath,
} from './label-connector.js';

describe('ARC constants', () => {
  it('exports numeric ARC constants', () => {
    expect(typeof ARC_CX).toBe('number');
    expect(typeof ARC_CY).toBe('number');
    expect(typeof ARC_RX).toBe('number');
    expect(typeof ARC_RY).toBe('number');
  });
  it('has the expected values', () => {
    expect(ARC_CX).toBe(800);
    expect(ARC_CY).toBe(410);
  });
});

describe('ZONE_ARCS', () => {
  it('has 6 zone entries each with a0 and a1', () => {
    const keys = Object.keys(ZONE_ARCS);
    expect(keys.length).toBe(6);
    for (const [k, v] of Object.entries(ZONE_ARCS)) {
      expect(typeof v.a0, `${k}.a0`).toBe('number');
      expect(typeof v.a1, `${k}.a1`).toBe('number');
    }
  });
  it('contains all 6 expected zone keys', () => {
    const keys = Object.keys(ZONE_ARCS);
    for (const k of ['ur-post', 'u-ant', 'ul-post', 'll-post', 'l-ant', 'lr-post']) {
      expect(keys).toContain(k);
    }
  });
});

describe('zone Sets', () => {
  it('ANTERIOR_ZONES contains u-ant and l-ant', () => {
    expect(ANTERIOR_ZONES.has('u-ant')).toBe(true);
    expect(ANTERIOR_ZONES.has('l-ant')).toBe(true);
  });
  it('POSTERIOR_LEFT and POSTERIOR_RIGHT are non-empty Sets', () => {
    expect(POSTERIOR_LEFT.size).toBeGreaterThan(0);
    expect(POSTERIOR_RIGHT.size).toBeGreaterThan(0);
  });
});

describe('fdiToZone', () => {
  it('routes upper-right posterior FDI to ur-post', () => {
    expect(fdiToZone(14)).toBe('ur-post');
    expect(fdiToZone(17)).toBe('ur-post');
  });
  it('routes upper anterior FDI to u-ant', () => {
    expect(fdiToZone(11)).toBe('u-ant');
    expect(fdiToZone(21)).toBe('u-ant');
    expect(fdiToZone(13)).toBe('u-ant');
  });
  it('routes upper-left posterior to ul-post', () => {
    expect(fdiToZone(24)).toBe('ul-post');
    expect(fdiToZone(28)).toBe('ul-post');
  });
  it('routes lower-left posterior to ll-post', () => {
    expect(fdiToZone(34)).toBe('ll-post');
    expect(fdiToZone(38)).toBe('ll-post');
  });
  it('routes lower anterior to l-ant', () => {
    expect(fdiToZone(31)).toBe('l-ant');
    expect(fdiToZone(41)).toBe('l-ant');
  });
  it('routes lower-right posterior to lr-post', () => {
    expect(fdiToZone(44)).toBe('lr-post');
    expect(fdiToZone(48)).toBe('lr-post');
  });
  it('returns a fallback zone string for unknown FDI', () => {
    const result = fdiToZone(99);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('arcPoint', () => {
  it('returns {x, y} for a known zone at t=0.5', () => {
    const pt = arcPoint('u-ant', 0.5);
    expect(typeof pt.x).toBe('number');
    expect(typeof pt.y).toBe('number');
  });
  it('returns a fallback {x, y} for an unknown zone', () => {
    const pt = arcPoint('nonexistent-zone', 0.5);
    expect(typeof pt.x).toBe('number');
    expect(typeof pt.y).toBe('number');
  });
  it('t=0 and t=1 produce different points within a zone', () => {
    const pt0 = arcPoint('ur-post', 0);
    const pt1 = arcPoint('ur-post', 1);
    expect(pt0.x).not.toBeCloseTo(pt1.x, 0);
  });
  it('point lies on the ellipse (within rounding)', () => {
    const pt = arcPoint('u-ant', 0.5);
    const nx = (pt.x - ARC_CX) / ARC_RX;
    const ny = (pt.y - ARC_CY) / ARC_RY;
    expect(nx * nx + ny * ny).toBeCloseTo(1, 5);
  });
});

describe('connectorPath', () => {
  it('returns an object with a path string', () => {
    const result = connectorPath(800, 400, 75, 20, 600, 300);
    expect(result).toHaveProperty('path');
    expect(typeof result.path).toBe('string');
    expect(result.path).toMatch(/^M /);
  });
  it('path contains exactly two L segments (one bend)', () => {
    const { path } = connectorPath(800, 400, 75, 20, 600, 300);
    const lCount = (path.match(/\bL\b/g) || []).length;
    expect(lCount).toBe(2);
  });
  it('returns ex and ey exit-point numbers', () => {
    const result = connectorPath(800, 400, 75, 20, 600, 300);
    expect(typeof result.ex).toBe('number');
    expect(typeof result.ey).toBe('number');
  });
  it('handles anchor directly to the right (vertical side exit)', () => {
    const { path } = connectorPath(400, 400, 75, 20, 900, 400);
    expect(typeof path).toBe('string');
    expect(path).toMatch(/^M /);
  });
  it('handles anchor directly below (horizontal side exit)', () => {
    const { path } = connectorPath(800, 200, 30, 200, 800, 700);
    expect(typeof path).toBe('string');
    expect(path).toMatch(/^M /);
  });
});
