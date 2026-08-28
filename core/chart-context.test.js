import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EXTRACTION_IDS } from './conflict-rules.js';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChartStateProvider, useChartState } from './chart-context.jsx';

/* Phase 1.5 deleted chart-service.js and firebase.js, so there is nothing left to
   mock here. The tests that asserted the load/save round trip are gone with the
   module; what replaces them is the contract below — the provider must reach the
   network for nothing at all. */

describe('ChartStateContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('provides initial clinical state', () => {
    const { result } = renderHook(() => useChartState(), {
      wrapper: ChartStateProvider,
    });
    expect(result.current.stage).toBe('baseline');
    expect(result.current.presence).toEqual({});
    expect(result.current.treatments).toEqual([]);
    expect(typeof result.current.setStage).toBe('function');
    expect(typeof result.current.setPresence).toBe('function');
    expect(typeof result.current.setTreatments).toBe('function');
  });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useChartState())).toThrow(
      'useChartState must be used within ChartStateProvider',
    );
  });

  /* Phase 1.5 — the parent's copy is the ONLY copy. A second persistence path is
     what permits a partial restore (one plan's treatments over another plan's
     presence), so "the chart reaches the network for nothing" is the contract.
     Asserted against fetch/XHR rather than a module mock, because the module is
     gone: this version keeps failing if someone reintroduces persistence through
     any route, not just through chart-service.js. */
  it('performs no network I/O of its own, even when a patientId is supplied', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {});

    let result;
    await act(async () => {
      result = renderHook(() => useChartState(), {
        wrapper: ({ children }) => React.createElement(ChartStateProvider, { patientId: 'p1' }, children),
      });
    });
    await new Promise((r) => setTimeout(r, 900));   // past the old 800 ms save debounce

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    // State stays at the mount default — it arrives via SET_CHART_STATE instead.
    expect(result.result.current.stage).toBe('baseline');

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });

  it('ignores patientId entirely — it is accepted but inert', async () => {
    let withId, withoutId;
    await act(async () => {
      withId = renderHook(() => useChartState(), {
        wrapper: ({ children }) => React.createElement(ChartStateProvider, { patientId: 'p1' }, children),
      });
      withoutId = renderHook(() => useChartState(), { wrapper: ChartStateProvider });
    });
    expect(withId.result.current.stage).toBe(withoutId.result.current.stage);
    expect(withId.result.current.presence).toEqual(withoutId.result.current.presence);
    expect(withId.result.current.loaded).toBe(withoutId.result.current.loaded);
  });

  it('reports loaded on mount so outbound emits are not gated forever', async () => {
    let result;
    await act(async () => {
      result = renderHook(() => useChartState(), {
        wrapper: ({ children }) => React.createElement(ChartStateProvider, { patientId: 'p1' }, children),
      });
    });
    expect(result.result.current.loaded).toBe(true);
  });
});

// ---- effectivePresence derivation + plan isolation ----

describe('effectivePresence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('equals presence when stage is baseline', () => {
    const { result } = renderHook(() => useChartState(), {
      wrapper: ChartStateProvider,
    });
    // stage starts 'baseline'; both maps should be identical object
    expect(result.current.effectivePresence).toBe(result.current.presence);
  });

  it('marks extraction targets missing in treatment stage', async () => {
    const { result } = renderHook(() => useChartState(), {
      wrapper: ChartStateProvider,
    });

    await act(async () => {
      result.current.setStage('treatment');
      result.current.setTreatments([
        { id: 'extraction', scope: 'tooth', targets: ['11'] },
      ]);
    });

    expect(result.current.effectivePresence['11']).toBe('missing');
    // raw presence must be untouched
    expect(result.current.presence['11']).toBeUndefined();
  });

  it('swapping treatments changes effectivePresence but leaves presence byte-identical', async () => {
    const { result } = renderHook(() => useChartState(), {
      wrapper: ChartStateProvider,
    });

    await act(async () => {
      result.current.setStage('treatment');
      result.current.setTreatments([
        { id: 'extraction', scope: 'tooth', targets: ['11'] },
      ]);
    });

    const presenceBefore = result.current.presence;

    await act(async () => {
      // Simulate SET_TREATMENTS plan switch — replace treatments entirely
      result.current.setTreatments([
        { id: 'extraction', scope: 'tooth', targets: ['21'] },
      ]);
    });

    // presence object must be the exact same reference
    expect(result.current.presence).toBe(presenceBefore);
    // effectivePresence reflects the new plan
    expect(result.current.effectivePresence['11']).toBeUndefined();
    expect(result.current.effectivePresence['21']).toBe('missing');
  });

  // Pinned contract: parameterising over EXTRACTION_IDS alone would silently stop
  // testing an ID that got dropped from the constant, so assert the set itself.
  it('EXTRACTION_IDS covers all four extraction types', () => {
    expect([...EXTRACTION_IDS].sort()).toEqual([
      'complex-surgical-extraction',
      'extraction',
      'root-stump-extraction',
      'simple-surgical-extraction',
    ]);
  });

  // Regression: the extraction-ID list used to be duplicated in three files and
  // root-stump-extraction was missing from one of them. All four IDs must drive
  // effectivePresence, sourced from conflict-rules.js.
  it.each(EXTRACTION_IDS)('%s marks its target missing in treatment stage', async (txId) => {
    const { result } = renderHook(() => useChartState(), {
      wrapper: ChartStateProvider,
    });

    await act(async () => {
      result.current.setStage('treatment');
      result.current.setTreatments([
        { id: txId, scope: 'tooth', targets: ['11'] },
      ]);
    });

    expect(result.current.effectivePresence['11']).toBe('missing');
  });

  it('non-extraction treatments do not mark a tooth missing', async () => {
    const { result } = renderHook(() => useChartState(), {
      wrapper: ChartStateProvider,
    });

    await act(async () => {
      result.current.setStage('treatment');
      result.current.setTreatments([
        { id: 'crown', scope: 'tooth', targets: ['11'] },
      ]);
    });

    expect(result.current.effectivePresence['11']).toBeUndefined();
  });
});
