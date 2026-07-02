import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { UIStateProvider, useUIState } from './ui-context.jsx';

describe('UIStateContext', () => {
  it('provides initial ephemeral UI state', () => {
    const { result } = renderHook(() => useUIState(), {
      wrapper: UIStateProvider,
    });
    expect(result.current.hoveredId).toBeNull();
    expect(result.current.selection).toEqual([]);
    expect(result.current.popover).toBeNull();
    expect(result.current.exportJson).toBeNull();
    expect(typeof result.current.setHoveredId).toBe('function');
    expect(typeof result.current.setSelection).toBe('function');
    expect(typeof result.current.setPopover).toBe('function');
    expect(typeof result.current.setExportJson).toBe('function');
  });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useUIState())).toThrow(
      'useUIState must be used within UIStateProvider',
    );
  });
});
