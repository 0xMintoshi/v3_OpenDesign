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
      const segs = prev.segments;
      const hasCentered = segs.some(s => s.x !== undefined && s.x < 0);
      const center = hasCentered ? 0 : 0.5;
      const mx = x => round(2 * center - x);

      const isAnchor = s => s.type !== 'M' && s.type !== 'Z' && s.x !== undefined;
      const isSource = s => isAnchor(s) && (sourceSide === 'right' ? s.x >= center : s.x <= center);
      const isDest   = s => isAnchor(s) && (sourceSide === 'right' ? s.x <  center : s.x >  center);

      const sourceIdx = segs.map((s, i) => isSource(s) ? i : -1).filter(i => i >= 0);
      if (!sourceIdx.length) return prev;

      // Mirror x-fields of each source segment.
      const mirrored = sourceIdx.map(i => {
        const s = segs[i];
        const n = { type: s.type, x: mx(s.x), y: s.y };
        if (s.x1 !== undefined) { n.x1 = mx(s.x1); n.y1 = s.y1; }
        if (s.x2 !== undefined) { n.x2 = mx(s.x2); n.y2 = s.y2; }
        return n;
      });

      // Reverse for consistent winding, then fix C handles: x1↔x2 swap after reversal
      // (near-start and near-end handles exchange roles when traversal direction flips).
      const out = [...mirrored].reverse().map(s =>
        s.type === 'C'
          ? { ...s, x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1 }
          : s
      );

      const destIdx = segs.map((s, i) => isDest(s) ? i : -1).filter(i => i >= 0);
      let next;
      if (!destIdx.length) {
        // No existing dest side — insert after the last source segment.
        const lastSrc = sourceIdx[sourceIdx.length - 1];
        next = [...segs.slice(0, lastSrc + 1), ...out, ...segs.slice(lastSrc + 1)];
      } else {
        const first = destIdx[0], last = destIdx[destIdx.length - 1];
        // Check if source indices are interleaved within the dest range (non-contiguous dest).
        // If so, a single block splice would drop the source anchors — must do per-slot replacement.
        const interleaved = sourceIdx.some(i => i > first && i < last);
        if (!interleaved) {
          next = [...segs.slice(0, first), ...out, ...segs.slice(last + 1)];
        } else {
          // Iterate segs: keep M/Z/source as-is, replace dest slots with `out` one-by-one.
          const destSet = new Set(destIdx);
          let cursor = 0;
          let lastInsertPos = -1;
          next = [];
          for (let i = 0; i < segs.length; i++) {
            if (destSet.has(i)) {
              if (cursor < out.length) { next.push(out[cursor++]); lastInsertPos = next.length - 1; }
              // else: dest slot shrinks away (fewer out than dest)
            } else {
              next.push(segs[i]);
            }
          }
          // Append any remaining `out` segments after the last filled dest slot.
          if (cursor < out.length) {
            const pos = lastInsertPos >= 0 ? lastInsertPos + 1 : next.length - 1;
            next.splice(pos, 0, ...out.slice(cursor));
          }
        }
      }

      snapshot(segs);
      return { ...prev, segments: next };
    });
  }, []);

  return [shape, setShape, { onPointerDown, onPointerMove, onPointerUp, insertPoint, deletePoint, isDragging, undo, mirrorAcrossX }];
}

function round(n) { return Math.round(n * 1000) / 1000; }
