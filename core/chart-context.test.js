import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChartStateProvider, useChartState } from './chart-context.jsx';

vi.mock('./chart-service.js', () => ({
  loadChart: vi.fn(),
  saveChart: vi.fn(),
}));

import { loadChart, saveChart } from './chart-service.js';

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

  it('loads chart from backend on mount when patientId provided', async () => {
    loadChart.mockResolvedValue({ stage: 'treatment', presence: { '11': 'missing' }, treatments: [] });

    function Consumer() {
      const { stage } = useChartState();
      return React.createElement('div', { 'data-testid': 'stage' }, stage);
    }

    let result;
    await act(async () => {
      result = renderHook(() => useChartState(), {
        wrapper: ({ children }) => React.createElement(ChartStateProvider, { patientId: 'p1' }, children),
      });
    });

    expect(loadChart).toHaveBeenCalledWith('p1');
    expect(result.result.current.stage).toBe('treatment');
  });

  it('does not call loadChart when patientId is absent', async () => {
    await act(async () => {
      renderHook(() => useChartState(), { wrapper: ChartStateProvider });
    });
    expect(loadChart).not.toHaveBeenCalled();
  });
});
