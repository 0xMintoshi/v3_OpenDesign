import { useState, useCallback, useRef } from 'react';

// Returns [shape, setShape, handlers].
// handlers.onPointerDown(segIdx, xField, yField, svgX, svgY) — call on pointerdown of a handle.
// handlers.onPointerMove(svgX, svgY)                         — call on pointermove of SVG canvas.
// handlers.onPointerUp()                                     — call on pointerup of SVG canvas.
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

  return [shape, setShape, { onPointerDown, onPointerMove, onPointerUp }];
}

function round(n) { return Math.round(n * 1000) / 1000; }
