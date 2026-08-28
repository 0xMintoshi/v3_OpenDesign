/**
 * Phase 1.5 regression suite — the parent is the single source of truth for chart state.
 *
 * This phase can silently corrupt clinical data (a presence map from one moment paired
 * with treatments from another renders a mouth that never existed), so the proof is
 * automated rather than a click-through. Unlike dental-arch.test.jsx, this file uses the
 * REAL ChartStateProvider: mocking it away would test the mock, not the round trip.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import DentalHero from './dental-arch.jsx';
import { ChartStateProvider } from '../core/chart-context.jsx';
import { UIStateProvider } from '../core/ui-context.jsx';
import { healPresence } from '../core/conflict-rules.js';
import { shallowEqualPresence, treatmentsEqual } from './dental-arch.jsx';

vi.mock('../layout/use-is-tablet.js', () => ({ useIsTablet: () => false }));

/* Capture outbound messages. emit() is a no-op outside an iframe, so the bridge is
   mocked rather than relying on window.parent. */
const emitted = [];
vi.mock('../core/iframe-bridge.js', () => ({
  emit: (type, payload) => { emitted.push({ type, payload }); },
}));

const DEBOUNCE_MS = 800;

function renderChart() {
  return render(
    <ChartStateProvider>
      <UIStateProvider><DentalHero /></UIStateProvider>
    </ChartStateProvider>,
  );
}

/** Deliver a SET_CHART_STATE exactly as the parent posts it. */
async function postChartState(payload) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { version: 1, type: 'SET_CHART_STATE', payload },
    }));
  });
}

/** Advance past the outbound debounce so any pending emit has fired. */
async function flushDebounce() {
  await act(async () => { vi.advanceTimersByTime(DEBOUNCE_MS + 50); });
}

function lastStateEmit() {
  const hits = emitted.filter((m) => m.type === 'CHART_STATE_CHANGED');
  return hits.length ? hits[hits.length - 1] : null;
}

beforeEach(() => {
  emitted.length = 0;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

/* Explicit unmount is load-bearing here, not hygiene. RTL's auto-cleanup is not
   registered in this project (renders accumulate across tests — see the sibling
   suites' use of container.querySelector over getByTestId). A chart left mounted
   keeps its window 'message' listener, so it answers the NEXT test's
   SET_CHART_STATE and inflates the emit count — which is exactly the number the
   termination test asserts on. */
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('round trip — all three fields survive restore', () => {
  it('returns stage, presence AND treatments unchanged', async () => {
    const presence = { 'upper-16': 'missing', 'upper-26': 'missing' };
    const treatments = [{ id: 'crown', scope: 'tooth', targets: ['upper-11'] }];

    renderChart();
    await postChartState({ stage: 'treatment', presence, treatments });
    await flushDebounce();

    const out = lastStateEmit();
    expect(out).not.toBeNull();
    // Named explicitly: `presence` is the field that regressed, and an assertion
    // that merely says "state survives" would not have caught it.
    expect(out.payload.presence).toEqual(presence);
    expect(out.payload.stage).toBe('treatment');
    expect(out.payload.treatments).toEqual(treatments);
  });

  it('an empty presence map overwrites a populated one rather than being ignored', async () => {
    renderChart();
    await postChartState({
      stage: 'baseline', presence: { 'upper-16': 'missing' }, treatments: [],
    });
    await flushDebounce();
    expect(lastStateEmit().payload.presence).toEqual({ 'upper-16': 'missing' });

    await postChartState({ stage: 'baseline', presence: {}, treatments: [] });
    await flushDebounce();
    expect(lastStateEmit().payload.presence).toEqual({});
  });
});

describe('termination — the echo guard bounds emits per restore', () => {
  /* chart emits -> parent saves -> parent restores -> chart sets state -> chart
     emits ... The loop is invisible in manual use until it drains a battery, so
     the bound is asserted rather than eyeballed. */
  it('one restore produces at most one outbound state emit', async () => {
    renderChart();
    await flushDebounce();
    emitted.length = 0;

    await postChartState({
      stage: 'treatment',
      presence: { 'upper-16': 'missing' },
      treatments: [{ id: 'crown', scope: 'tooth', targets: ['upper-11'] }],
    });
    await flushDebounce();
    await flushDebounce();   // a looping implementation keeps emitting here

    // Exactly one, not "at most one": the restore must produce a confirming emit
    // (healing may have altered it), and it must not produce a second.
    const count = emitted.filter((m) => m.type === 'CHART_STATE_CHANGED').length;
    expect(count).toBe(1);
  });

  it('re-posting identical state emits nothing at all', async () => {
    const payload = {
      stage: 'treatment',
      presence: { 'upper-16': 'missing' },
      treatments: [{ id: 'crown', scope: 'tooth', targets: ['upper-11'] }],
    };

    renderChart();
    await postChartState(payload);
    await flushDebounce();
    emitted.length = 0;

    await postChartState(payload);          // byte-identical, fresh object identities
    await flushDebounce();

    expect(emitted.filter((m) => m.type === 'CHART_STATE_CHANGED')).toHaveLength(0);
  });
});

describe('healing — illegal presence is repaired on the way in', () => {
  it('drops a tooth stored missing that is also an extraction target', async () => {
    renderChart();
    await postChartState({
      stage: 'treatment',
      presence: { 'upper-16': 'missing', 'upper-26': 'missing' },
      treatments: [{ id: 'extraction', scope: 'tooth', targets: ['upper-16'] }],
    });
    await flushDebounce();

    const out = lastStateEmit().payload.presence;
    expect(out['upper-16']).toBeUndefined();   // illegal combination, healed
    expect(out['upper-26']).toBe('missing');   // legitimately missing, untouched
  });

  /* Regression: an early cut of the echo guard suppressed the emit after ANY
     restore. Healing then had nowhere to go — the chart held the repaired map, the
     parent kept the illegal one, and re-sent it on every restore. The repair must
     travel back so it is what gets persisted. */
  it('emits the healed map back so the repair is what gets saved', async () => {
    renderChart();
    await flushDebounce();
    emitted.length = 0;

    await postChartState({
      stage: 'treatment',
      presence: { 'upper-16': 'missing' },
      treatments: [{ id: 'extraction', scope: 'tooth', targets: ['upper-16'] }],
    });
    await flushDebounce();

    const out = lastStateEmit();
    expect(out).not.toBeNull();
    expect(out.payload.presence).toEqual({});
  });

  /* And the healed echo must then settle: re-posting what the chart just sent back
     is a no-op, or the two sides ping-pong forever. */
  it('settles after one healing round trip', async () => {
    renderChart();
    await postChartState({
      stage: 'treatment',
      presence: { 'upper-16': 'missing' },
      treatments: [{ id: 'extraction', scope: 'tooth', targets: ['upper-16'] }],
    });
    await flushDebounce();
    const healed = lastStateEmit().payload;
    emitted.length = 0;

    await postChartState(healed);      // parent saves the healed copy and re-restores
    await flushDebounce();

    expect(emitted.filter((m) => m.type === 'CHART_STATE_CHANGED')).toHaveLength(0);
  });
});

describe('healPresence() unit contract', () => {
  it('is idempotent — safe to run on every inbound restore', () => {
    const presence = { 'upper-16': 'missing', 'upper-26': 'missing' };
    const treatments = [{ id: 'extraction', scope: 'tooth', targets: ['upper-16'] }];
    const once = healPresence(presence, treatments);
    expect(healPresence(once, treatments)).toEqual(once);
  });

  it('leaves an implant on an extracted tooth alone — only "missing" is illegal', () => {
    const out = healPresence(
      { 'upper-16': 'implant' },
      [{ id: 'extraction', scope: 'tooth', targets: ['upper-16'] }],
    );
    expect(out['upper-16']).toBe('implant');
  });

  it('ignores arch-scope treatments when collecting extraction targets', () => {
    const out = healPresence(
      { 'upper-16': 'missing' },
      [{ id: 'extraction', scope: 'arch', targets: ['upper-16'] }],
    );
    expect(out['upper-16']).toBe('missing');
  });

  it('tolerates null presence and null treatments', () => {
    expect(healPresence(null, null)).toEqual({});
  });
});

describe('dirty-check helpers', () => {
  it('shallowEqualPresence compares by value, not identity', () => {
    expect(shallowEqualPresence({ a: 'missing' }, { a: 'missing' })).toBe(true);
    expect(shallowEqualPresence({ a: 'missing' }, { a: 'implant' })).toBe(false);
    expect(shallowEqualPresence({ a: 'missing' }, {})).toBe(false);
    expect(shallowEqualPresence({}, {})).toBe(true);
  });

  it('treatmentsEqual ignores target order — a reorder is not a change', () => {
    const a = [{ id: 'bridge-span', scope: 'tooth', targets: ['upper-11', 'upper-12'] }];
    const b = [{ id: 'bridge-span', scope: 'tooth', targets: ['upper-12', 'upper-11'] }];
    expect(treatmentsEqual(a, b)).toBe(true);
  });

  it('treatmentsEqual distinguishes different treatments on the same tooth', () => {
    expect(treatmentsEqual(
      [{ id: 'crown', scope: 'tooth', targets: ['upper-11'] }],
      [{ id: 'veneer', scope: 'tooth', targets: ['upper-11'] }],
    )).toBe(false);
  });
});
