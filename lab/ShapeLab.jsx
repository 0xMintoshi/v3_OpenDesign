import React, { useRef, useState, useEffect } from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { shapeToPath } from '../visuals/shapes.jsx';
import { useShapeEditor } from './useShapeEditor.js';
import { ControlPoint } from './ControlPoint.jsx';

// Shape catalog: id → { label, loader, w, h, toothRef? }
// w/h are the display pixel dimensions of the shape in the lab canvas.
// toothRef: if set, draws a ghost tooth outline behind the shape.
const SHAPES = {
  'crown-molar-upper': {
    label: 'Upper Molar Crown',
    loader: () => import('../shapes-data/crown-molar-upper.json'),
    w: 38, h: 88,
    toothRef: 'molarU',
  },
  'arch-maxilla': {
    label: 'Maxilla (Upper Jaw)',
    loader: () => import('../shapes-data/arch-maxilla.json'),
    w: 800, h: 400,
    toothRef: null,
  },
  'arch-mandible': {
    label: 'Mandible (Lower Jaw)',
    loader: () => import('../shapes-data/arch-mandible.json'),
    w: 800, h: 400,
    toothRef: null,
  },
  'arch-sinus-right': {
    label: 'Sinus (Patient Right)',
    loader: () => import('../shapes-data/arch-sinus-right.json'),
    w: 800, h: 400,
    toothRef: null,
  },
  'arch-sinus-left': {
    label: 'Sinus (Patient Left)',
    loader: () => import('../shapes-data/arch-sinus-left.json'),
    w: 800, h: 400,
    toothRef: null,
  },
  'bridge-span': {
    label: 'Bridge Span (pontic)',
    loader: () => import('../shapes-data/bridge-span.json'),
    w: 76, h: 88,
    toothRef: null,
  },
  'partial-denture-upper': {
    label: 'Partial Denture (Upper)',
    loader: () => import('../shapes-data/partial-denture-upper.json'),
    w: 800, h: 400,
    toothRef: null,
  },
  'partial-denture-lower': {
    label: 'Partial Denture (Lower)',
    loader: () => import('../shapes-data/partial-denture-lower.json'),
    w: 800, h: 400,
    toothRef: null,
  },
};

const DEFAULT_SHAPE_ID = 'crown-molar-upper';
const LOADING_SHAPE = { id: 'loading', label: 'Loading…', segments: [] };

export default function ShapeLab() {
  const svgRef = useRef(null);
  const [selectedId, setSelectedId] = useState(DEFAULT_SHAPE_ID);
  const [initialShape, setInitialShape] = useState(null);

  const meta = SHAPES[selectedId];
  const W = meta.w;
  const H = meta.h;

  // Canvas pixel dimensions: tooth shapes get a small fixed canvas; arch shapes fill available width.
  const isArch = !meta.toothRef;
  const CANVAS_W = isArch ? Math.min(W + 40, 1000) : 400;
  const CANVAS_H = isArch ? H + 40 : 380;
  const CX = isArch ? 20 : 200;
  const CY = isArch ? 20 : 130;

  useEffect(() => {
    setInitialShape(null);
    meta.loader().then(m => setInitialShape(m.default ?? m));
  }, [selectedId]);

  const [shape, setShape, { onPointerDown, onPointerMove, onPointerUp }] =
    useShapeEditor(initialShape ?? LOADING_SHAPE, W, H);

  useEffect(() => {
    if (initialShape) setShape(initialShape);
  }, [initialShape]);

  const toothRef = meta.toothRef ? toothPaths(meta.toothRef, W, H) : null;
  const shapePath = shape.segments.length ? shapeToPath(shape, W, H) : '';

  function svgCoords(e) {
    const r = svgRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function handleDown(segIdx, xField, yField) {
    return (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const [sx, sy] = svgCoords(e);
      onPointerDown(segIdx, xField, yField, sx, sy);
    };
  }

  // Normalized coord → absolute SVG canvas coord.
  function toSVG(nx, ny) { return [CX + nx * W, CY + ny * H]; }

  function segHandles(seg) {
    if (seg.type === 'Z') return [];
    const h = [{ xField: 'x', yField: 'y', isAnchor: true }];
    if (seg.x1 !== undefined) h.push({ xField: 'x1', yField: 'y1', isAnchor: false });
    if (seg.x2 !== undefined) h.push({ xField: 'x2', yField: 'y2', isAnchor: false });
    return h;
  }

  function handleLines() {
    return shape.segments.flatMap((seg, idx) => {
      if (!seg.x1) return [];
      const [ax, ay] = toSVG(seg.x, seg.y);
      const lines = [];
      if (seg.x1 !== undefined) {
        const [hx, hy] = toSVG(seg.x1, seg.y1);
        lines.push(<line key={`${idx}-h1`} x1={ax} y1={ay} x2={hx} y2={hy} stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 2" />);
      }
      if (seg.x2 !== undefined) {
        const [hx, hy] = toSVG(seg.x2, seg.y2);
        lines.push(<line key={`${idx}-h2`} x1={ax} y1={ay} x2={hx} y2={hy} stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 2" />);
      }
      return lines;
    });
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(shape, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${shape.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try { setShape(JSON.parse(evt.target.result)); }
      catch { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, fontFamily: 'monospace', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Shape Lab</h2>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ padding: '4px 8px', fontSize: 14 }}
        >
          {Object.entries(SHAPES).map(([id, s]) => (
            <option key={id} value={id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <svg
            ref={svgRef}
            width={CANVAS_W} height={CANVAS_H}
            style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 8, display: 'block' }}
            onPointerMove={(e) => { const [sx, sy] = svgCoords(e); onPointerMove(sx, sy); }}
            onPointerUp={onPointerUp}
          >
            {/* Ghost tooth reference (crown shapes only) */}
            {toothRef && (
              <g transform={`translate(${CX}, ${CY})`}>
                <path d={toothRef.outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={1} opacity={0.5} />
                <path d={toothRef.cervical} fill="none"    stroke="#99b" strokeWidth={0.8} opacity={0.5} />
              </g>
            )}
            {/* Shape path */}
            {shapePath && (
              <path
                d={shapePath}
                fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round"
                transform={`translate(${CX}, ${CY})`}
              />
            )}
            {/* Bezier handle lines */}
            {handleLines()}
            {/* Draggable control point handles */}
            {shape.segments.flatMap((seg, idx) =>
              segHandles(seg).map(({ xField, yField, isAnchor }) => {
                const [sx, sy] = toSVG(seg[xField], seg[yField]);
                return (
                  <ControlPoint
                    key={`${idx}-${xField}`}
                    svgX={sx} svgY={sy} isAnchor={isAnchor}
                    onPointerDown={handleDown(idx, xField, yField)}
                  />
                );
              })
            )}
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ margin: '0 0 8px' }}>Shape JSON — {shape.label}</h3>
          <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 420 }}>
            {JSON.stringify(shape, null, 2)}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(shape, null, 2))}
                    style={{ padding: '6px 14px', cursor: 'pointer' }}>Copy JSON</button>
            <button onClick={downloadJSON}
                    style={{ padding: '6px 14px', cursor: 'pointer' }}>Download JSON</button>
            <label style={{ fontSize: 12, color: '#555' }}>
              Load: <input type="file" accept=".json" onChange={importFile} />
            </label>
          </div>
          {isArch ? (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Arch shape — viewBox 1600×800, displayed at {W}×{H}px.<br/>
              Drag control points to edit. Download JSON and replace<br/>
              shapes-data/{selectedId}.json to persist edits.
            </p>
          ) : (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Inkscape: draw at {W}×{H} px → Save Plain SVG<br/>
              node scripts/normalize-svg.mjs shape.svg {W} {H} {selectedId}<br/>
              &gt; shapes-data/{selectedId}.json — then load here to fine-tune.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
