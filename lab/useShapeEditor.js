import { useState, useCallback, useRef } from 'react';
import { splitSegmentAt } from './bezier-utils.js';

const HISTORY_LIMIT = 50;

// Returns [shape, setShape, handlers].
// handlers.onPointerDown(segIdx, xField, yField, svgX, svgY)
// handlers.onPointerMove(svgX, svgY)
// handlers.onPointerUp()
// handlers.insertPoint(segIdx, t)
// handlers.deletePoint(segIdx)
// handlers.isDragging()
// handlers.undo()         — revert last committed state
// handlers.mirrorRight()  — mirror right half onto left half (symmetric cleanup)
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

  const mirrorRight = useCallback(() => {
    setShapeRaw(prev => {
      const segs = prev.segments;
      // Determine coordinate convention: centered (tooth) uses x near 0, arch uses x in [0,1].
      const hasCentered = segs.some(s => s.x !== undefined && s.x < 0);
      const center = hasCentered ? 0 : 0.5;
      const mx = x => round(2 * center - x);

      // Segments whose anchor sits at x >= center = right half (source for mirror).
      const rightSegs = segs.filter(s => s.type !== 'M' && s.type !== 'Z' && s.x !== undefined && s.x >= center);

      if (!rightSegs.length) return prev;

      // Build mirrored left-side segments (reversed so winding stays consistent).
      const mirrored = [...rightSegs].reverse().map(s => {
        const n = { type: s.type, x: mx(s.x), y: s.y };
        if (s.x1 !== undefined) { n.x1 = mx(s.x1); n.y1 = s.y1; }
        if (s.x2 !== undefined) { n.x2 = mx(s.x2); n.y2 = s.y2; }
        return n;
      });

      // Replace segments with anchor x < center (left half) with mirrored set.
      // Keep M, Z, and right-half segments in place; swap left-half segments.
      const leftIndices = segs.reduce((acc, s, i) => {
        if (s.type !== 'M' && s.type !== 'Z' && s.x !== undefined && s.x < center) acc.push(i);
        return acc;
      }, []);

      const next = [...segs];
      leftIndices.forEach((origIdx, i) => {
        if (i < mirrored.length) next[origIdx] = mirrored[i];
      });
      // If mirrored has more segments than left-half slots, insert extras after last left-half index.
      if (mirrored.length > leftIndices.length) {
        const insertAfter = leftIndices[leftIndices.length - 1] ?? next.length - 1;
        next.splice(insertAfter + 1, 0, ...mirrored.slice(leftIndices.length));
      }

      snapshot(segs);
      return { ...prev, segments: next };
    });
  }, []);

  return [shape, setShape, { onPointerDown, onPointerMove, onPointerUp, insertPoint, deletePoint, isDragging, undo, mirrorRight }];
}

function round(n) { return Math.round(n * 1000) / 1000; }
