import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useIsTablet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns false when viewport is wider than 1180px', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    const { useIsTablet } = await import('./use-is-tablet.js');
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia matches tablet breakpoint', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    const { useIsTablet } = await import('./use-is-tablet.js');
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });
});
