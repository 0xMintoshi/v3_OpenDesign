import { describe, it, expect } from 'vitest';
import {
  assignLabelSlots, FAN_POSITIONS, TOOTH_SLOTS,
  upperBandY, lowerBandY, UPPER_CLEAR, LOWER_CLEAR,
} from './label-slots.js';

const UPPER_BITE_Y = 385;
const LOWER_BITE_Y = 435;

function tooth(fdi, cx) {
  const jaw = fdi < 30 ? 'upper' : 'lower';
  const key = `tooth-${jaw}-${fdi}`;
  const anchorY = jaw === 'upper' ? UPPER_BITE_Y - 30 : LOWER_BITE_Y + 30;
  return { key, kind: 'tooth', fdi, anchor: { x: cx, y: anchorY }, jaw, items: ['tx1'] };
}

describe('safe-band y helpers', () => {
  it('upperBandY is above the sinus floor (< upperBiteY − 60)', () => {
    expect(upperBandY(UPPER_BITE_Y)).toBeLessThan(UPPER_BITE_Y - 60);
  });

  it('lowerBandY is below the IDN deepest point (> 667)', () => {
    expect(lowerBandY(LOWER_BITE_Y)).toBeGreaterThan(667);
  });
});

describe('assignLabelSlots', () => {
  it('upper tooth labels land in the safe band (above sinus floor)', () => {
    const labels = [tooth(11, 760), tooth(16, 360), tooth(18, 140)];
    const result = assignLabelSlots(labels, UPPER_BITE_Y, LOWER_BITE_Y, FAN_POSITIONS);
    labels.forEach(l => {
      const { cy } = result.get(l.key);
      expect(cy).toBeLessThan(UPPER_BITE_Y - 60);
    });
  });

  it('lower tooth labels land in the safe band (below IDN)', () => {
    const labels = [tooth(41, 720), tooth(46, 355), tooth(48, 155)];
    const result = assignLabelSlots(labels, UPPER_BITE_Y, LOWER_BITE_Y, FAN_POSITIONS);
    labels.forEach(l => {
      const { cy } = result.get(l.key);
      expect(cy).toBeGreaterThan(667);
    });
  });

  it('all 16 upper teeth have distinct positions', () => {
    const fdis = [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28];
    const labels = fdis.map(fdi => tooth(fdi, 800));
    const result = assignLabelSlots(labels, UPPER_BITE_Y, LOWER_BITE_Y, FAN_POSITIONS);
    const positions = new Set(
      labels.map(l => { const p = result.get(l.key); return `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`; })
    );
    expect(positions.size).toBe(16);
  });

  it('special labels (sinus, arch) use fan position, not the band', () => {
    const sinus = { key: 'sinus-right', kind: 'sinus', anchor: { x: 460, y: 200 }, jaw: 'upper', items: ['tx1'] };
    const result = assignLabelSlots([sinus], UPPER_BITE_Y, LOWER_BITE_Y, FAN_POSITIONS);
    const pos = result.get('sinus-right');
    expect(pos.cx).toBeCloseTo(FAN_POSITIONS['sinus-right'].cx, 1);
    expect(pos.cy).toBeCloseTo(FAN_POSITIONS['sinus-right'].cy, 1);
  });

  it('11 and 21 are mirror-symmetric about x=800', () => {
    const labels = [tooth(11, 720.5), tooth(21, 879.5)];
    const result = assignLabelSlots(labels, UPPER_BITE_Y, LOWER_BITE_Y, FAN_POSITIONS);
    const p11 = result.get('tooth-upper-11');
    const p21 = result.get('tooth-upper-21');
    expect(p11.cx + p21.cx).toBeCloseTo(1600, 1);
    expect(p11.cy).toBeCloseTo(p21.cy, 1);
  });

  it('tooth 18 is at U_WISDOM_Y (pulled down, distinct from row 0)', () => {
    const p18 = TOOTH_SLOTS[18];
    const p17 = TOOTH_SLOTS[17];
    expect(p18.cy).toBeGreaterThan(p17.cy);
  });

  it('lower pair (41, 42) shares the same cx column', () => {
    expect(TOOTH_SLOTS[41].cx).toBeCloseTo(TOOTH_SLOTS[42].cx, 1);
  });

  it('lower pair (41, 42) stacks vertically — 42 below 41', () => {
    expect(TOOTH_SLOTS[42].cy).toBeGreaterThan(TOOTH_SLOTS[41].cy);
  });
});
