import { test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShapeEditor } from './useShapeEditor.js';

function makeShape(segments) {
  return { id: 'test', segments };
}

function getSegs(result) {
  return result.current[0].segments;
}

test('undo restores previous segments', () => {
  const segs = [
    { type: 'M', x: 0.0, y: 0.0 },
    { type: 'L', x: 1.0, y: 0.0 },
    { type: 'Z' },
  ];
  const { result } = renderHook(() => useShapeEditor(makeShape(segs), 100, 100));

  // Delete the L segment
  act(() => result.current[2].deletePoint(1));
  expect(getSegs(result).filter(s => s.type === 'L').length).toBe(0);

  // Undo restores it
  act(() => result.current[2].undo());
  expect(getSegs(result).filter(s => s.type === 'L').length).toBe(1);
});
