import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { ChartStateProvider } from '../core/chart-context.jsx';
import { DentalHero } from './dental-arch.jsx';

// Minimal wrapper providing required context
function Wrapper({ children }) {
  return <ChartStateProvider>{children}</ChartStateProvider>;
}

// Helper to get the DentalHero instance and call applyTreatment via internal state
// We test conflict + pruning logic through the exported applyTreatment callback indirectly
// by verifying the treatment registry + conflict-rules logic in isolation.
// The wiring tests are integration-level; see conflict-rules.test.js and contiguity.test.js
// for pure-logic unit coverage.

import { getConflictingTreatmentIds } from '../core/conflict-rules.js';
import { areContiguous } from '../core/contiguity.js';
import { cyclePresence } from './dental-arch.jsx';

describe('cyclePresence', () => {
  it('cycles healthy → missing → implant → healthy', () => {
    expect(cyclePresence(undefined)).toBe('missing');
    expect(cyclePresence('missing')).toBe('implant');
    expect(cyclePresence('implant')).toBe(undefined);
  });
});

describe('conflict rules — implant-bridge-span strips natural treatments', () => {
  it('applying implant-bridge-span conflicts with crown and bridge-span', () => {
    const conflicts = getConflictingTreatmentIds('implant-bridge-span');
    expect(conflicts).toContain('crown');
    expect(conflicts).toContain('bridge-span');
    expect(conflicts).toContain('implant-only');
    expect(conflicts).toContain('implant-crown');
  });

  it('applying crown conflicts with implant-bridge-span', () => {
    const conflicts = getConflictingTreatmentIds('crown');
    expect(conflicts).toContain('implant-bridge-span');
  });
});

describe('conflict rules — bridge-span preserves implant-only', () => {
  it('bridge-span does NOT strip implant-only (bridge can sit on placed implant)', () => {
    const conflicts = getConflictingTreatmentIds('bridge-span');
    expect(conflicts).not.toContain('implant-only');
  });

  it('bridge-span still strips crown, implant-crown, implant-bridge-span', () => {
    const conflicts = getConflictingTreatmentIds('bridge-span');
    expect(conflicts).toContain('crown');
    expect(conflicts).toContain('implant-crown');
    expect(conflicts).toContain('implant-bridge-span');
  });

  it('implant-only still strips bridge-span (place implant first, then bridge)', () => {
    const conflicts = getConflictingTreatmentIds('implant-only');
    expect(conflicts).toContain('bridge-span');
  });
});

describe('bridge-span eligibility helpers', () => {
  // Simulate the hasBridgeAbutment / hasBridgeGap logic from dental-arch.jsx
  function hasBridgeAbutment(targets, presence, treatments) {
    return targets.some(t =>
      presence[t] !== 'missing' ||
      treatments.some(x => x.id === 'implant-only' && x.targets.includes(t))
    );
  }
  function hasBridgeGap(targets, presence, treatments) {
    return targets.some(t =>
      presence[t] === 'missing' &&
      !treatments.some(x => (x.id === 'implant-only' || x.id === 'implant-crown') && x.targets.includes(t))
    );
  }

  it('two natural teeth — no gap → bridge NOT eligible', () => {
    const presence = { u1: undefined, u2: undefined };
    const treatments = [];
    expect(hasBridgeAbutment(['u1', 'u2'], presence, treatments)).toBe(true);
    expect(hasBridgeGap(['u1', 'u2'], presence, treatments)).toBe(false);
  });

  it('natural tooth + edentulous gap → bridge eligible', () => {
    const presence = { u1: undefined, u2: 'missing' };
    const treatments = [];
    expect(hasBridgeAbutment(['u1', 'u2'], presence, treatments)).toBe(true);
    expect(hasBridgeGap(['u1', 'u2'], presence, treatments)).toBe(true);
  });

  it('implant-only tooth + edentulous gap → bridge eligible', () => {
    const presence = { u1: 'missing', u2: 'missing' };
    const treatments = [{ id: 'implant-only', scope: 'tooth', targets: ['u1'] }];
    expect(hasBridgeAbutment(['u1', 'u2'], presence, treatments)).toBe(true);
    expect(hasBridgeGap(['u1', 'u2'], presence, treatments)).toBe(true);
  });

  it('all edentulous, no implants → not eligible (no abutment)', () => {
    const presence = { u1: 'missing', u2: 'missing' };
    const treatments = [];
    expect(hasBridgeAbutment(['u1', 'u2'], presence, treatments)).toBe(false);
  });

  it('implant-only + implant-only — no plain gap → not eligible', () => {
    const presence = { u1: 'missing', u2: 'missing' };
    const treatments = [
      { id: 'implant-only', scope: 'tooth', targets: ['u1'] },
      { id: 'implant-only', scope: 'tooth', targets: ['u2'] },
    ];
    expect(hasBridgeAbutment(['u1', 'u2'], presence, treatments)).toBe(true);
    expect(hasBridgeGap(['u1', 'u2'], presence, treatments)).toBe(false);
  });
});

describe('contiguity guard — implant-bridge-span', () => {
  const teeth = [
    { id: 'u1', cx: 100, jaw: 'upper', presence: 'missing' },
    { id: 'u2', cx: 200, jaw: 'upper', presence: 'missing' },
    { id: 'u3', cx: 300, jaw: 'upper', presence: 'present' },
    { id: 'u4', cx: 400, jaw: 'upper', presence: 'missing' },
  ];

  it('contiguous missing teeth → allowed', () => {
    expect(areContiguous(['u1', 'u2'], teeth)).toBe(true);
  });

  it('non-contiguous (present tooth between) → blocked', () => {
    expect(areContiguous(['u2', 'u4'], teeth)).toBe(false);
  });

  it('single tooth → contiguous', () => {
    expect(areContiguous(['u1'], teeth)).toBe(true);
  });
});

describe('span pruning — spans with < 2 targets dropped', () => {
  // Simulate the filter logic used in dental-arch.jsx
  function pruneSpans(treatments) {
    return treatments.filter((tx) => {
      if (tx.id !== 'bridge-span' && tx.id !== 'implant-bridge-span') return true;
      return tx.targets.length >= 2;
    });
  }

  it('span with 2 targets survives', () => {
    const txs = [{ id: 'implant-bridge-span', scope: 'tooth', targets: ['u1', 'u2'] }];
    expect(pruneSpans(txs)).toHaveLength(1);
  });

  it('span with 1 target is dropped', () => {
    const txs = [{ id: 'implant-bridge-span', scope: 'tooth', targets: ['u1'] }];
    expect(pruneSpans(txs)).toHaveLength(0);
  });

  it('bridge-span with 1 target is also dropped', () => {
    const txs = [{ id: 'bridge-span', scope: 'tooth', targets: ['u1'] }];
    expect(pruneSpans(txs)).toHaveLength(0);
  });

  it('non-span treatments are unaffected', () => {
    const txs = [
      { id: 'crown', scope: 'tooth', targets: ['u1'] },
      { id: 'implant-bridge-span', scope: 'tooth', targets: ['u1'] },
    ];
    const result = pruneSpans(txs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('crown');
  });
});
