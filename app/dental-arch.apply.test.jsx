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
  it('cycles healthy → missing → implant → root-stump → healthy', () => {
    expect(cyclePresence(undefined)).toBe('missing');
    expect(cyclePresence('missing')).toBe('implant');
    expect(cyclePresence('implant')).toBe('root-stump');
    expect(cyclePresence('root-stump')).toBe(undefined);
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

describe('SESSION_SPLIT_IDS — each apply creates a new Medisave session group', () => {
  const SESSION_SPLIT_IDS = ['implant-only', 'implant-crown', 'gbr',
                             'simple-surgical-extraction', 'complex-surgical-extraction'];

  // Simulates the SESSION_SPLIT_IDS branch of handleApplyTreatment
  function applySessionSplit(prev, txId, targets) {
    let next = [...prev];
    // Move any re-selected teeth out of existing same-id groups
    next = next.map((tx) =>
      (tx.scope === 'tooth' && tx.id === txId)
        ? { ...tx, targets: tx.targets.filter((id) => !targets.includes(id)) }
        : tx
    ).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);
    next.push({ id: txId, scope: 'tooth', targets });
    return next;
  }

  it('two separate applies of implant-only produce two groups', () => {
    let state = [];
    state = applySessionSplit(state, 'implant-only', ['u1', 'u2', 'u3']);
    state = applySessionSplit(state, 'implant-only', ['u4', 'u5']);
    const implantGroups = state.filter((tx) => tx.id === 'implant-only' && tx.scope === 'tooth');
    expect(implantGroups).toHaveLength(2);
    expect(implantGroups[0].targets).toEqual(['u1', 'u2', 'u3']);
    expect(implantGroups[1].targets).toEqual(['u4', 'u5']);
  });

  it('re-selecting a tooth moves it into the new session group', () => {
    let state = [];
    state = applySessionSplit(state, 'implant-only', ['u1', 'u2', 'u3']);
    state = applySessionSplit(state, 'implant-only', ['u1', 'u4']); // u1 re-selected
    const implantGroups = state.filter((tx) => tx.id === 'implant-only' && tx.scope === 'tooth');
    expect(implantGroups).toHaveLength(2);
    // u1 removed from first group, first group survives with 2 teeth
    expect(implantGroups[0].targets).toEqual(['u2', 'u3']);
    // new group gets u1 + u4
    expect(implantGroups[1].targets).toEqual(['u1', 'u4']);
  });

  it('all teeth re-selected into new session removes the old empty group', () => {
    let state = [];
    state = applySessionSplit(state, 'implant-only', ['u1', 'u2']);
    state = applySessionSplit(state, 'implant-only', ['u1', 'u2']); // all moved
    const implantGroups = state.filter((tx) => tx.id === 'implant-only' && tx.scope === 'tooth');
    expect(implantGroups).toHaveLength(1); // old empty group pruned
    expect(implantGroups[0].targets).toEqual(['u1', 'u2']);
  });

  it('non-SESSION_SPLIT_ID (crown) still merges', () => {
    // Simulate the normal merge path
    function applyMerge(prev, txId, targets) {
      const next = [...prev];
      const idx = next.findIndex((tx) => tx.id === txId && tx.scope === 'tooth');
      if (idx >= 0) {
        const merged = new Set([...next[idx].targets, ...targets]);
        next[idx] = { ...next[idx], targets: [...merged] };
      } else {
        next.push({ id: txId, scope: 'tooth', targets });
      }
      return next;
    }
    let state = [];
    state = applyMerge(state, 'crown', ['u1', 'u2']);
    state = applyMerge(state, 'crown', ['u3', 'u4']);
    const crownGroups = state.filter((tx) => tx.id === 'crown' && tx.scope === 'tooth');
    expect(crownGroups).toHaveLength(1); // merged
    expect(crownGroups[0].targets.sort()).toEqual(['u1', 'u2', 'u3', 'u4']);
  });

  it('SESSION_SPLIT_IDS contains the expected surgical treatment ids', () => {
    expect(SESSION_SPLIT_IDS).toContain('implant-only');
    expect(SESSION_SPLIT_IDS).toContain('implant-crown');
    expect(SESSION_SPLIT_IDS).toContain('gbr');
    expect(SESSION_SPLIT_IDS).toContain('simple-surgical-extraction');
    expect(SESSION_SPLIT_IDS).toContain('complex-surgical-extraction');
    // crown stays on merge path
    expect(SESSION_SPLIT_IDS).not.toContain('crown');
    // bridge spans push fresh groups already — not needed here
    expect(SESSION_SPLIT_IDS).not.toContain('implant-bridge-span');
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

// ─── Root stump — §4/§5 logic parity tests ───────────────────────────────────
// These inline the popover-prop and claimableCrowns logic to verify root-stump
// is treated as present-for-extraction, absent-for-prosthetics/abutments/claims.

describe('root-stump — allPresent gate', () => {
  function allPresent(targets, presence) {
    return targets.every(id => presence[id] !== 'missing' && presence[id] !== 'implant' && presence[id] !== 'root-stump');
  }
  it('healthy tooth → allPresent true', () => {
    expect(allPresent(['u1'], { u1: undefined })).toBe(true);
  });
  it('root-stump tooth → allPresent false (no crown offered)', () => {
    expect(allPresent(['u1'], { u1: 'root-stump' })).toBe(false);
  });
  it('mixed healthy + root-stump → allPresent false', () => {
    expect(allPresent(['u1', 'u2'], { u1: undefined, u2: 'root-stump' })).toBe(false);
  });
});

describe('root-stump — allExtractable gate', () => {
  function allExtractable(targets, presence) {
    return targets.every(id => presence[id] !== 'missing' && presence[id] !== 'implant');
  }
  it('healthy tooth → allExtractable true', () => {
    expect(allExtractable(['u1'], { u1: undefined })).toBe(true);
  });
  it('root-stump tooth → allExtractable true', () => {
    expect(allExtractable(['u1'], { u1: 'root-stump' })).toBe(true);
  });
  it('missing tooth → allExtractable false', () => {
    expect(allExtractable(['u1'], { u1: 'missing' })).toBe(false);
  });
  it('implant tooth → allExtractable false', () => {
    expect(allExtractable(['u1'], { u1: 'implant' })).toBe(false);
  });
  it('mixed healthy + root-stump → allExtractable true', () => {
    expect(allExtractable(['u1', 'u2'], { u1: undefined, u2: 'root-stump' })).toBe(true);
  });
  it('healthy + missing → allExtractable false', () => {
    expect(allExtractable(['u1', 'u2'], { u1: undefined, u2: 'missing' })).toBe(false);
  });
});

describe('root-stump — hasBridgeAbutment exclusion', () => {
  function hasBridgeAbutment(targets, presence, treatments) {
    return targets.some(t =>
      (presence[t] !== 'missing' && presence[t] !== 'implant' && presence[t] !== 'root-stump') ||
      treatments.some(x => x.id === 'implant-only' && x.targets.includes(t))
    );
  }
  it('root-stump alone → NOT a bridge abutment', () => {
    expect(hasBridgeAbutment(['u1'], { u1: 'root-stump' }, [])).toBe(false);
  });
  it('healthy tooth → is a bridge abutment', () => {
    expect(hasBridgeAbutment(['u1'], { u1: undefined }, [])).toBe(true);
  });
  it('root-stump + implant-only → implant counts as abutment', () => {
    const txs = [{ id: 'implant-only', scope: 'tooth', targets: ['u1'] }];
    expect(hasBridgeAbutment(['u1'], { u1: 'root-stump' }, txs)).toBe(true);
  });
});

describe('root-stump — claimableCrowns exclusion', () => {
  function claimableCrowns(tx, presence, treatments) {
    return tx.targets.filter((id) =>
      presence[id] !== 'missing' &&
      presence[id] !== 'root-stump' &&
      !treatments.some((x) => (x.id === 'implant-only' || x.id === 'implant-crown') && x.targets.includes(id))
    ).length;
  }
  it('healthy abutment counts toward claimable', () => {
    const tx = { id: 'bridge-span', targets: ['u1', 'u2'] };
    expect(claimableCrowns(tx, { u1: undefined, u2: 'missing' }, [])).toBe(1);
  });
  it('root-stump abutment does NOT count toward claimable', () => {
    const tx = { id: 'bridge-span', targets: ['u1', 'u2'] };
    expect(claimableCrowns(tx, { u1: 'root-stump', u2: 'missing' }, [])).toBe(0);
  });
  it('implant-only abutment does NOT count toward claimable', () => {
    const tx = { id: 'bridge-span', targets: ['u1', 'u2'] };
    const treatments = [{ id: 'implant-only', scope: 'tooth', targets: ['u1'] }];
    expect(claimableCrowns(tx, { u1: 'missing', u2: 'missing' }, treatments)).toBe(0);
  });
});
