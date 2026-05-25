import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ChartStateProvider, useChartState } from './chart-context.jsx';

describe('ChartStateContext', () => {
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
});
