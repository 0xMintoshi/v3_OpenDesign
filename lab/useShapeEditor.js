import { useState, useCallback, useRef } from 'react';
import { splitSegmentAt } from './bezier-utils.js';

// Returns [shape, setShape, handlers].
// handlers.onPointerDown(segIdx, xField, yField, svgX, svgY) — call on pointerdown of a handle.
// handlers.onPointerMove(svgX, svgY)                         — call on pointermove of SVG canvas.
// handlers.onPointerUp()                                     — call on pointerup of SVG canvas.
// handlers.insertPoint(segIdx, t)                            — split segment at t, inserting a new anchor.
// handlers.deletePoint(segIdx)                               — remove anchor at segIdx (not M or Z).
// handlers.isDragging()                                      — returns true while a drag is active.
export function useShapeEditor(initial, w, h) {
  const [shape, setShape] = useState(initial);
  const drag = useRef(null);

  const onPointerDown = useCallback((segIdx, xField, yField, svgX, svgY) => {
    drag.current = { segIdx, xField, yField, svgX, svgY,
      startX: shape.segments[segIdx][xField],
      startY: shape.segments[segIdx][yField],
    };
  }, [shape.segments]);

  const onPointerMove = useCallback((svgX, svgY) => {
    if (!drag.current) return;
    const { segIdx, xField, yField, svgX: sx0, svgY: sy0, startX, startY } = drag.current;
    const newX = round(startX + (svgX - sx0) / w);
    const newY = round(startY + (svgY - sy0) / h);
    setShape(prev => ({
      ...prev,
      segments: prev.segments.map((s, i) =>
        i === segIdx ? { ...s, [xField]: newX, [yField]: newY } : s
      ),
    }));
  }, [w, h]);

  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  const isDragging = useCallback(() => drag.current !== null, []);

  const insertPoint = useCallback((segIdx, t) => {
    setShape(prev => ({
      ...prev,
      segments: splitSegmentAt(prev.segments, segIdx, t),
    }));
  }, []);

  const deletePoint = useCallback((segIdx) => {
    setShape(prev => {
      const segs = prev.segments;
      if (segs[segIdx]?.type === 'M' || segs[segIdx]?.type === 'Z') return prev;
      return { ...prev, segments: segs.filter((_, i) => i !== segIdx) };
    });
  }, []);

  return [shape, setShape, { onPointerDown, onPointerMove, onPointerUp, insertPoint, deletePoint, isDragging }];
}

function round(n) { return Math.round(n * 1000) / 1000; }
