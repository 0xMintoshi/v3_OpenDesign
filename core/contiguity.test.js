import { describe, it, expect } from 'vitest';
import { areContiguous } from './contiguity.js';

function makeTooth(id, cx, jaw, presence = 'present') {
  return { id, cx, jaw, presence };
}

const upperTeeth = [
  makeTooth('u1', 100, 'upper'),
  makeTooth('u2', 200, 'upper'),
  makeTooth('u3', 300, 'upper'),
  makeTooth('u4', 400, 'upper'),
  makeTooth('u5', 500, 'upper'),
];

describe('areContiguous', () => {
  it('single tooth is contiguous', () => {
    expect(areContiguous(['u1'], upperTeeth)).toBe(true);
  });

  it('two adjacent missing teeth are contiguous', () => {
    const teeth = upperTeeth.map(t =>
      t.id === 'u2' || t.id === 'u3' ? { ...t, presence: 'missing' } : t
    );
    expect(areContiguous(['u2', 'u3'], teeth)).toBe(true);
  });

  it('three adjacent missing teeth are contiguous', () => {
    const teeth = upperTeeth.map(t =>
      ['u2', 'u3', 'u4'].includes(t.id) ? { ...t, presence: 'missing' } : t
    );
    expect(areContiguous(['u2', 'u3', 'u4'], teeth)).toBe(true);
  });

  it('two missing teeth with a present tooth between them are not contiguous', () => {
    const teeth = upperTeeth.map(t =>
      t.id === 'u1' || t.id === 'u3' ? { ...t, presence: 'missing' } : t
    );
    expect(areContiguous(['u1', 'u3'], teeth)).toBe(false);
  });

  it('gap filled by extracted tooth is still contiguous', () => {
    const teeth = upperTeeth.map(t => {
      if (t.id === 'u1' || t.id === 'u3') return { ...t, presence: 'missing' };
      if (t.id === 'u2') return { ...t, presence: 'extracted' };
      return t;
    });
    expect(areContiguous(['u1', 'u3'], teeth)).toBe(true);
  });

  it('teeth on different jaws are not contiguous', () => {
    const lowerTeeth = [makeTooth('l1', 100, 'lower', 'missing')];
    const all = [
      makeTooth('u1', 100, 'upper', 'missing'),
      ...lowerTeeth,
    ];
    expect(areContiguous(['u1', 'l1'], all)).toBe(false);
  });

  it('empty selection is contiguous', () => {
    expect(areContiguous([], upperTeeth)).toBe(true);
  });
});
