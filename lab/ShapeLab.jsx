import React, { useState } from 'react';
import { toothPaths } from '../teeth-data.jsx';
import { shapeToPath } from '../visuals/shapes.jsx';
import crownShape from '../shapes-data/crown-molar-upper.json';

const W = 38, H = 88;
const CX = 200, CY = 130; // bite-edge origin in canvas coords

export default function ShapeLab() {
  const [shape, setShape] = useState(crownShape);

  const { outline, cervical } = toothPaths('molarU', W, H);
  const crownPath = shapeToPath(shape, W, H);

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, fontFamily: 'monospace', background: '#f5f5f5', minHeight: '100vh' }}>
      <div>
        <h2 style={{ margin: '0 0 8px' }}>Shape Lab — {shape.label}</h2>
        <svg width={400} height={380} style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 8 }}>
          <g transform={`translate(${CX}, ${CY})`}>
            <path d={outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={1} opacity={0.5} />
            <path d={cervical} fill="none"    stroke="#99b" strokeWidth={0.8} opacity={0.5} />
            <path d={crownPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
          </g>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px' }}>Shape JSON</h3>
        <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 500 }}>
          {JSON.stringify(shape, null, 2)}
        </pre>
      </div>
    </div>
  );
}
