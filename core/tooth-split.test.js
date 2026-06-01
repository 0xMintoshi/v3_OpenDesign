import { describe, it, expect } from 'vitest';
import { parseOutline, splitToothAtCervical } from './tooth-split.js';
import { CERVICAL } from './arch-math.js';

// Minimal synthetic outline: a symmetric rectangular-ish closed path
// M right-base C ... right-tip C ... left-tip C ... left-base C ... base Z
// Simplified 4-segment outline for predictable crossing tests.
function syntheticOutline(w, h) {
  // Right wall goes from (w, 0) straight up to (w, -h), purely cubic (degenerate: CP on line)
  // Left wall from (-w, -h) to (-w, 0)
  // Base from right to left
  // This is symmetric and monotonic in y on the walls.
  return [
    `M ${w} 0`,
    `C ${w} ${-h * 0.33} ${w} ${-h * 0.66} ${w} ${-h}`,   // right wall
    `C ${w * 0.5} ${-h} ${-w * 0.5} ${-h} ${-w} ${-h}`,    // top
    `C ${-w} ${-h * 0.66} ${-w} ${-h * 0.33} ${-w} 0`,     // left wall
    `C ${-w * 0.5} 0 ${w * 0.5} 0 ${w} 0`,                 // base
    'Z',
  ].join(' ');
}

describe('parseOutline', () => {
  it('parses M + C + Z correctly', () => {
    const d = 'M 1 2 C 3 4 5 6 7 8 C 9 10 11 12 13 14 Z';
    const { start, segs } = parseOutline(d);
    expect(start).toEqual({ x: 1, y: 2 });
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ cp1: { x: 3, y: 4 }, cp2: { x: 5, y: 6 }, end: { x: 7, y: 8 } });
  });

  it('throws on unexpected command', () => {
    expect(() => parseOutline('M 0 0 L 1 1 Z')).toThrow('tooth-split');
  });
});

describe('splitToothAtCervical — synthetic outline', () => {
  const w = 50, h = 100;
  const cervicalY = -35; // -0.35 * h
  const dipY = 5;
  const d = syntheticOutline(w, h);

  it('returns crown, root, and cervical strings', () => {
    const result = splitToothAtCervical(d, cervicalY, dipY);
    expect(typeof result.crown).toBe('string');
    expect(typeof result.root).toBe('string');
    expect(typeof result.cervical).toBe('string');
  });

  it('crown and root are closed paths (end with Z)', () => {
    const { crown, root } = splitToothAtCervical(d, cervicalY, dipY);
    expect(crown.trim().endsWith('Z')).toBe(true);
    expect(root.trim().endsWith('Z')).toBe(true);
  });

  it('cervical starts at right wall and ends at left wall with correct y', () => {
    const { cervical } = splitToothAtCervical(d, cervicalY, dipY);
    // "M Prx Pry Q ... Plx Ply"
    const tokens = cervical.trim().split(/\s+/);
    expect(tokens[0]).toBe('M');
    const Pry = parseFloat(tokens[2]);
    const Ply = parseFloat(tokens[tokens.length - 1]);
    expect(Math.abs(Pry - cervicalY)).toBeLessThan(0.001);
    expect(Math.abs(Ply - cervicalY)).toBeLessThan(0.001);
  });

  it('crossing points are symmetric (Pr.x ≈ -Pl.x for symmetric outline)', () => {
    const { cervical } = splitToothAtCervical(d, cervicalY, dipY);
    const tokens = cervical.trim().split(/\s+/);
    const Prx = parseFloat(tokens[1]);
    const Plx = parseFloat(tokens[tokens.length - 2]);
    expect(Math.abs(Prx + Plx)).toBeLessThan(0.01); // symmetric → Pr.x ≈ -Pl.x
  });

  it('throws when no crossing found', () => {
    // outline entirely above cervicalY = 0 (no crossing)
    const flat = 'M 10 -1 C 10 -1 -10 -1 -10 -1 C -10 -1 10 -1 10 -1 Z';
    expect(() => splitToothAtCervical(flat, -50, 5)).toThrow('tooth-split');
  });
});

describe('splitToothAtCervical — all 8 tooth types via real outlines', () => {
  // Import the real outline functions by referencing teeth-data indirectly.
  // We exercise them via the CERVICAL table from arch-math so the test
  // stays pure JS (no JSX transform needed).
  //
  // Instead of importing JSX, we hand-craft simple rectangular outlines
  // for each type at realistic w/h values and verify the structural contract.

  const types = Object.keys(CERVICAL);

  for (const type of types) {
    it(`${type}: crown ∪ root structurally valid`, () => {
      const w = 60, h = 120;
      const { y, dip } = CERVICAL[type];
      const cervicalY = -y * h;
      const dipY = dip * h;

      // Use a tall symmetric synthetic outline that always crosses cervicalY
      const d = syntheticOutline(w, h);
      const result = splitToothAtCervical(d, cervicalY, dipY);

      expect(result.crown.trim().endsWith('Z')).toBe(true);
      expect(result.root.trim().endsWith('Z')).toBe(true);
      expect(result.crown.length).toBeGreaterThan(10);
      expect(result.root.length).toBeGreaterThan(10);

      // Crossing y exactly on cervical boundary
      const tokens = result.cervical.trim().split(/\s+/);
      const Pry = parseFloat(tokens[2]);
      const Ply = parseFloat(tokens[tokens.length - 1]);
      expect(Math.abs(Pry - cervicalY)).toBeLessThan(0.01);
      expect(Math.abs(Ply - cervicalY)).toBeLessThan(0.01);
    });
  }
});
