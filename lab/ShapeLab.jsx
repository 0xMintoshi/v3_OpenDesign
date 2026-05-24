import React, { useRef } from 'react';
import { toothPaths } from '../teeth-data.jsx';
import { shapeToPath } from '../visuals/shapes.jsx';
import initialShape from '../shapes-data/crown-molar-upper.json';
import { useShapeEditor } from './useShapeEditor.js';
import { ControlPoint } from './ControlPoint.jsx';

const W = 38, H = 88;
const CX = 200, CY = 130;

// Normalized coord → absolute SVG canvas coord.
function toSVG(nx, ny) { return [CX + nx * W, CY + ny * H]; }

// Extract draggable handles from one segment.
// Returns array of { xField, yField, isAnchor }.
function segHandles(seg) {
  if (seg.type === 'Z') return [];
  const h = [{ xField: 'x', yField: 'y', isAnchor: true }];
  if (seg.x1 !== undefined) h.push({ xField: 'x1', yField: 'y1', isAnchor: false });
  if (seg.x2 !== undefined) h.push({ xField: 'x2', yField: 'y2', isAnchor: false });
  return h;
}

export default function ShapeLab() {
  const svgRef = useRef(null);
  const [shape, setShape, { onPointerDown, onPointerMove, onPointerUp }] =
    useShapeEditor(initialShape, W, H);

  const { outline, cervical } = toothPaths('molarU', W, H);
  const crownPath = shapeToPath(shape, W, H);

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

  // Dashed lines from bezier handles to their anchor.
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
    <div style={{ display: 'flex', gap: 24, padding: 24, fontFamily: 'monospace', background: '#f5f5f5', minHeight: '100vh' }}>
      <div>
        <h2 style={{ margin: '0 0 8px' }}>Shape Lab — {shape.label}</h2>
        <svg
          ref={svgRef} width={400} height={380}
          style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 8 }}
          onPointerMove={(e) => { const [sx, sy] = svgCoords(e); onPointerMove(sx, sy); }}
          onPointerUp={onPointerUp}
        >
          <g transform={`translate(${CX}, ${CY})`}>
            <path d={outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={1} opacity={0.5} />
            <path d={cervical} fill="none"    stroke="#99b" strokeWidth={0.8} opacity={0.5} />
            <path d={crownPath} fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
          </g>
          {/* Handle lines and control points are in absolute SVG coords (toSVG includes CX/CY) */}
          {handleLines()}
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

      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px' }}>Shape JSON</h3>
        <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 380 }}>
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
        <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
          Inkscape workflow: draw crown at {W}×{H} px → Save Plain SVG<br/>
          node scripts/normalize-svg.mjs crown.svg {W} {H} crown-molar-upper<br/>
          &gt; shapes-data/crown-molar-upper.json — then load here to fine-tune.
        </p>
      </div>
    </div>
  );
}
