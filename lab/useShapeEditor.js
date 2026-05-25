import { useState, useCallback, useRef } from 'react';
import { splitSegmentAt } from './bezier-utils.js';
import { mirrorSegments } from './mirrorSegments.js';

const HISTORY_LIMIT = 50;

// Returns [shape, setShape, handlers].
// handlers.onPointerDown(segIdx, xField, yField, svgX, svgY)
// handlers.onPointerMove(svgX, svgY)
// handlers.onPointerUp()
// handlers.insertPoint(segIdx, t)
// handlers.deletePoint(segIdx)
// handlers.isDragging()
// handlers.undo()         — revert last committed state
// handlers.mirrorAcrossX(sourceSide)  — mirror 'left'|'right' half onto the other
export function useShapeEditor(initial, w, h) {
  const [shape, setShapeRaw] = useState(initial);
  const drag = useRef(null);
  const history = useRef([]);  // stack of prior segments arrays
  const didDrag = useRef(false);

  // Snapshot before mutation so undo restores the state before the change.
  function snapshot(segs) {
    history.current = [...history.current.slice(-(HISTORY_LIMIT - 1)), segs];
  }

  // External setShape (file import, trace replace) — commits to history.
  const setShape = useCallback((updater) => {
    setShapeRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      snapshot(prev.segments);
      return next;
    });
  }, []);

  const onPointerDown = useCallback((segIdx, xField, yField, svgX, svgY) => {
    drag.current = { segIdx, xField, yField, svgX, svgY,
      startX: shape.segments[segIdx][xField],
      startY: shape.segments[segIdx][yField],
    };
    didDrag.current = false;
  }, [shape.segments]);

  const onPointerMove = useCallback((svgX, svgY) => {
    if (!drag.current) return;
    const { segIdx, xField, yField, svgX: sx0, svgY: sy0, startX, startY } = drag.current;
    // Snapshot once at the start of a drag gesture (before first move).
    if (!didDrag.current) {
      setShapeRaw(prev => {
        snapshot(prev.segments);
        return prev;
      });
      didDrag.current = true;
    }
    const newX = round(startX + (svgX - sx0) / w);
    const newY = round(startY + (svgY - sy0) / h);
    setShapeRaw(prev => ({
      ...prev,
      segments: prev.segments.map((s, i) =>
        i === segIdx ? { ...s, [xField]: newX, [yField]: newY } : s
      ),
    }));
  }, [w, h]);

  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  const isDragging = useCallback(() => drag.current !== null, []);

  const insertPoint = useCallback((segIdx, t) => {
    setShapeRaw(prev => {
      snapshot(prev.segments);
      return { ...prev, segments: splitSegmentAt(prev.segments, segIdx, t) };
    });
  }, []);

  const deletePoint = useCallback((segIdx) => {
    setShapeRaw(prev => {
      const segs = prev.segments;
      if (segs[segIdx]?.type === 'M' || segs[segIdx]?.type === 'Z') return prev;
      snapshot(segs);
      return { ...prev, segments: segs.filter((_, i) => i !== segIdx) };
    });
  }, []);

  const undo = useCallback(() => {
    if (!history.current.length) return;
    const prev = history.current[history.current.length - 1];
    history.current = history.current.slice(0, -1);
    setShapeRaw(s => ({ ...s, segments: prev }));
  }, []);

  const mirrorAcrossX = useCallback((sourceSide /* 'left' | 'right' */) => {
    setShapeRaw(prev => {
      // snapshot BEFORE mutation so undo restores pre-mirror state
      snapshot(prev.segments);
      const segs = prev.segments;
      const centerX = prev.centerX ?? (segs.some(s => s.x !== undefined && s.x < 0) ? 0 : 0.5);
      return { ...prev, segments: mirrorSegments(segs, sourceSide, centerX) };
    });
  }, []);

  return [shape, setShape, { onPointerDown, onPointerMove, onPointerUp, insertPoint, deletePoint, isDragging, undo, mirrorAcrossX }];
}

function round(n) { return Math.round(n * 1000) / 1000; }
