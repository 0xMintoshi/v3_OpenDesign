# Phase 1 — Vertical Slice (Lab + One Molar Crown) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the control-point editing workflow end-to-end — normalized shape JSON → in-app lab (drag to edit) → export JSON → rendered as a `crown` treatment overlay on an upper molar.

**Architecture:** Shape data lives in `shapes-data/` as normalized JSON (all coordinates divided by tooth `w`/`h`). A renderer in `visuals/shapes.jsx` converts that JSON + `{w, h}` back to an SVG `d` string. The lab (`lab/`) is a second Vite entry at `/lab.html` — it loads a shape JSON, draws the tooth ghost for scale context, exposes draggable Bezier handles, and exports the edited JSON. The `crown` treatment in `treatments.jsx` uses this same renderer, so a JSON edit immediately changes how the overlay looks in the main app.

**Tech Stack:** React 18, Vite 5, Vitest 2, plain pointer-capture drag (no D3), Node.js ESM for the normalize script.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `shapes-data/crown-molar-upper.json` | Create | Normalized CP data — upper molar crown overlay |
| `visuals/shapes.jsx` | Create | `shapeToPath(shape, w, h)` → SVG `d` string |
| `visuals/shapes.test.js` | Create | Vitest unit tests for shapeToPath |
| `scripts/normalize-svg.mjs` | Create | CLI: Inkscape Plain SVG → normalized JSON |
| `scripts/normalize-svg.test.mjs` | Create | Vitest tests for SVG path parser + normalizer |
| `lab.html` | Create | Second Vite entry point |
| `lab/index.jsx` | Create | createRoot mount for lab app |
| `lab/ShapeLab.jsx` | Create | Editor: tooth ghost + shape path + draggable handles + export panel |
| `lab/useShapeEditor.js` | Create | Pointer-capture drag state; updates normalized coords |
| `lab/ControlPoint.jsx` | Create | Single draggable SVG circle handle |
| `vite.config.js` | Modify | Add multi-page `rollupOptions.input` for lab entry |
| `package.json` | Modify | Add vitest devDep; add `test`, `test:watch`, `lab` scripts |
| `treatments.jsx` | Modify | Add `crown` to TX_GROUPS (Restoration group); add `CrownOverlay` component; add `crown` case to `TreatmentLayer` render loop (lines 593–605) |

Note: `dental-arch.jsx` does **not** need modification — overlays are entirely handled inside `TreatmentLayer` in `treatments.jsx`.

---

## Task 1 — Tooling setup

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `lab.html`

- [ ] **Step 1: Add vitest and scripts to package.json**

  Open `package.json`. In `devDependencies` add:
  ```json
  "vitest": "^2.0.0"
  ```
  In `scripts` add:
  ```json
  "test": "vitest run",
  "test:watch": "vitest",
  "lab": "vite --open /lab.html"
  ```

- [ ] **Step 2: Install**
  ```bash
  cd C:\Users\ZMZ\Desktop\v3_OpenDesign_2
  npm install
  ```
  Expected: exits 0, `node_modules/vitest` present.

- [ ] **Step 3: Update vite.config.js**

  Replace `vite.config.js` entirely:
  ```js
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import { resolve } from 'path';

  export default defineConfig({
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          lab:  resolve(__dirname, 'lab.html'),
        },
      },
    },
  });
  ```

- [ ] **Step 4: Create lab.html**

  Create `lab.html` at repo root:
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shape Lab</title>
  </head>
  <body>
    <div id="lab-root"></div>
    <script type="module" src="/lab/index.jsx"></script>
  </body>
  </html>
  ```

- [ ] **Step 5: Verify dev server**
  ```bash
  npm run dev
  ```
  Open http://localhost:5173/lab.html — expect blank page, no console errors.  
  Open http://localhost:5173/ — expect dental hero still works.

- [ ] **Step 6: Commit**
  ```bash
  git add vite.config.js package.json package-lock.json lab.html
  git commit -m "feat: add vitest + lab.html as second Vite entry"
  ```

---

## Task 2 — Shape data format

**Files:**
- Create: `shapes-data/crown-molar-upper.json`

The canonical normalized format: `x = rawX / w`, `y = rawY / h`. Origin at bite edge (y=0). Crown region: y ∈ [−0.40, 0]. All x values symmetric around 0.

This initial JSON is derived from the `molarUOutline` crown portion in `teeth-data.jsx` (the left/right outer walls from bite edge to cervical at `ch = h * 0.40`), plus the cervical arc and occlusal groove close.

- [ ] **Step 1: Create shapes-data directory and initial JSON**

  Create `shapes-data/crown-molar-upper.json`:
  ```json
  {
    "id": "crown-molar-upper",
    "label": "Upper Molar Crown Overlay",
    "version": 1,
    "toothType": "molarU",
    "note": "Cervical line at y ≈ -0.40. x = rawX/w, y = rawY/h.",
    "segments": [
      { "type": "M",  "x":  0.48, "y":  0.00 },
      { "type": "C",  "x1": 0.52, "y1": -0.16, "x2": 0.52, "y2": -0.34, "x":  0.42, "y": -0.40 },
      { "type": "Q",  "x1": 0.00, "y1": -0.47, "x": -0.42, "y": -0.40 },
      { "type": "C",  "x1":-0.52, "y1": -0.34, "x2":-0.52, "y2": -0.16, "x": -0.48, "y":  0.00 },
      { "type": "Q",  "x1": 0.00, "y1":  0.07, "x":  0.48, "y":  0.00 },
      { "type": "Z" }
    ]
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add shapes-data/crown-molar-upper.json
  git commit -m "feat: add initial normalized crown-molar-upper shape data"
  ```

---

## Task 3 — `visuals/shapes.jsx` renderer

**Files:**
- Create: `visuals/shapes.jsx`
- Create: `visuals/shapes.test.js`

- [ ] **Step 1: Write failing tests**

  Create `visuals/shapes.test.js`:
  ```js
  import { describe, it, expect } from 'vitest';
  import { shapeToPath } from './shapes.jsx';

  describe('shapeToPath', () => {
    it('converts M segment', () => {
      const shape = { segments: [{ type: 'M', x: 0.5, y: -0.5 }] };
      expect(shapeToPath(shape, 40, 100)).toBe('M 20.00 -50.00');
    });

    it('converts C segment', () => {
      const shape = { segments: [
        { type: 'M', x: 0.48, y: 0 },
        { type: 'C', x1: 0.52, y1: -0.16, x2: 0.52, y2: -0.34, x: 0.42, y: -0.40 },
        { type: 'Z' },
      ]};
      const d = shapeToPath(shape, 38, 88);
      expect(d).toContain('M 18.24 0.00');
      expect(d).toContain('C 19.76 -14.08 19.76 -29.92 15.96 -35.20');
      expect(d).toContain('Z');
    });

    it('converts Q segment', () => {
      const shape = { segments: [
        { type: 'M', x: 0.42, y: -0.40 },
        { type: 'Q', x1: 0.00, y1: -0.47, x: -0.42, y: -0.40 },
      ]};
      const d = shapeToPath(shape, 38, 88);
      expect(d).toContain('Q 0.00 -41.36 -15.96 -35.20');
    });

    it('converts Z segment', () => {
      const shape = { segments: [{ type: 'M', x: 0, y: 0 }, { type: 'Z' }] };
      expect(shapeToPath(shape, 10, 10)).toContain('Z');
    });
  });
  ```

- [ ] **Step 2: Run test to confirm failure**
  ```bash
  npm test
  ```
  Expected: FAIL — `Cannot find module './shapes.jsx'`

- [ ] **Step 3: Implement visuals/shapes.jsx**

  Create `visuals/shapes.jsx`:
  ```jsx
  // Converts normalized shape JSON to SVG path d string.
  // Segment coords: x = rawX/w, y = rawY/h. At render: actual = norm * w or h.
  export function shapeToPath(shape, w, h) {
    return shape.segments.map(seg => {
      switch (seg.type) {
        case 'M': return `M ${f(seg.x * w)} ${f(seg.y * h)}`;
        case 'L': return `L ${f(seg.x * w)} ${f(seg.y * h)}`;
        case 'C': return `C ${f(seg.x1*w)} ${f(seg.y1*h)} ${f(seg.x2*w)} ${f(seg.y2*h)} ${f(seg.x*w)} ${f(seg.y*h)}`;
        case 'Q': return `Q ${f(seg.x1*w)} ${f(seg.y1*h)} ${f(seg.x*w)} ${f(seg.y*h)}`;
        case 'Z': return 'Z';
        default:  return '';
      }
    }).filter(Boolean).join(' ');
  }

  function f(n) { return n.toFixed(2); }
  ```

- [ ] **Step 4: Run tests to confirm pass**
  ```bash
  npm test
  ```
  Expected: 4/4 PASS

- [ ] **Step 5: Commit**
  ```bash
  git add visuals/shapes.jsx visuals/shapes.test.js
  git commit -m "feat: add visuals/shapes.jsx renderer + tests"
  ```

---

## Task 4 — Normalize script

**Files:**
- Create: `scripts/normalize-svg.mjs`
- Create: `scripts/normalize-svg.test.mjs`

Inkscape workflow: draw crown at `w×h` px, save as Plain SVG, run this script, get normalized JSON.

- [ ] **Step 1: Write failing tests**

  Create `scripts/normalize-svg.test.mjs`:
  ```js
  import { describe, it, expect } from 'vitest';
  import { parseSVGPath, normalizePath } from './normalize-svg.mjs';

  describe('parseSVGPath', () => {
    it('parses M', () => {
      expect(parseSVGPath('M 19 0')).toEqual([{ type: 'M', x: 19, y: 0 }]);
    });
    it('parses C', () => {
      const segs = parseSVGPath('M 0 0 C 10 -5 20 -10 30 -15');
      expect(segs[1]).toEqual({ type: 'C', x1: 10, y1: -5, x2: 20, y2: -10, x: 30, y: -15 });
    });
    it('parses Q', () => {
      const segs = parseSVGPath('M 0 0 Q 5 -3 10 0');
      expect(segs[1]).toEqual({ type: 'Q', x1: 5, y1: -3, x: 10, y: 0 });
    });
    it('parses Z', () => {
      expect(parseSVGPath('M 0 0 Z')[1]).toEqual({ type: 'Z' });
    });
  });

  describe('normalizePath', () => {
    it('divides M by w and h', () => {
      expect(normalizePath([{ type: 'M', x: 19, y: 0 }], 38, 88))
        .toEqual([{ type: 'M', x: 0.5, y: 0 }]);
    });
    it('normalizes C', () => {
      const result = normalizePath(
        [{ type: 'C', x1: 19.76, y1: -14.08, x2: 19.76, y2: -29.92, x: 15.96, y: -35.2 }],
        38, 88
      );
      expect(result[0].x1).toBeCloseTo(0.52, 2);
      expect(result[0].y1).toBeCloseTo(-0.16, 2);
    });
    it('passes Z through', () => {
      expect(normalizePath([{ type: 'Z' }], 38, 88)).toEqual([{ type: 'Z' }]);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm failure**
  ```bash
  npm test
  ```
  Expected: FAIL — `Cannot find module './normalize-svg.mjs'`

- [ ] **Step 3: Implement scripts/normalize-svg.mjs**

  Create `scripts/normalize-svg.mjs`:
  ```js
  import { readFileSync } from 'fs';

  // Parse absolute-coord SVG path d string into segment objects.
  // Handles M, L, C, Q, Z. Inkscape Plain SVG exports absolute coords by default.
  export function parseSVGPath(d) {
    const segments = [];
    for (const match of d.matchAll(/([MLCQZ])\s*([\d\s,.-]*)/gi)) {
      const cmd = match[1].toUpperCase();
      const nums = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (cmd === 'M') {
        segments.push({ type: 'M', x: nums[0], y: nums[1] });
      } else if (cmd === 'L') {
        segments.push({ type: 'L', x: nums[0], y: nums[1] });
      } else if (cmd === 'C') {
        for (let i = 0; i + 5 < nums.length; i += 6)
          segments.push({ type: 'C', x1: nums[i], y1: nums[i+1], x2: nums[i+2], y2: nums[i+3], x: nums[i+4], y: nums[i+5] });
      } else if (cmd === 'Q') {
        for (let i = 0; i + 3 < nums.length; i += 4)
          segments.push({ type: 'Q', x1: nums[i], y1: nums[i+1], x: nums[i+2], y: nums[i+3] });
      } else if (cmd === 'Z') {
        segments.push({ type: 'Z' });
      }
    }
    return segments;
  }

  // Divide all x coords by w, all y coords by h. Rounds to 3 decimal places.
  export function normalizePath(segments, w, h) {
    return segments.map(seg => {
      if (seg.type === 'Z') return seg;
      const n = { type: seg.type };
      if (seg.x  !== undefined) { n.x  = r(seg.x  / w); n.y  = r(seg.y  / h); }
      if (seg.x1 !== undefined) { n.x1 = r(seg.x1 / w); n.y1 = r(seg.y1 / h); }
      if (seg.x2 !== undefined) { n.x2 = r(seg.x2 / w); n.y2 = r(seg.y2 / h); }
      return n;
    });
  }

  function r(n) { return Math.round(n * 1000) / 1000; }

  // CLI: node scripts/normalize-svg.mjs <svgfile> <width> <height> [<shape-id>]
  if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
    const [,, file, w, h, id] = process.argv;
    if (!file || !w || !h) {
      console.error('Usage: node scripts/normalize-svg.mjs <svgfile> <width> <height> [<shape-id>]');
      process.exit(1);
    }
    const svg = readFileSync(file, 'utf-8');
    const dMatch = svg.match(/ d="([^"]+)"/);
    if (!dMatch) { console.error('No path d="..." found in SVG.'); process.exit(1); }
    const segments = normalizePath(parseSVGPath(dMatch[1]), Number(w), Number(h));
    console.log(JSON.stringify({
      id: id ?? 'shape',
      label: id ?? 'Shape',
      version: 1,
      segments,
    }, null, 2));
  }
  ```

- [ ] **Step 4: Run tests**
  ```bash
  npm test
  ```
  Expected: all 11 tests PASS (4 shapes + 7 normalize)

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/normalize-svg.mjs scripts/normalize-svg.test.mjs
  git commit -m "feat: add normalize-svg CLI + unit tests"
  ```

---

## Task 5 — Lab skeleton (static, no drag)

**Files:**
- Create: `lab/index.jsx`
- Create: `lab/ShapeLab.jsx`

Shows tooth ghost + crown shape path. No interaction yet.

- [ ] **Step 1: Create lab/index.jsx**

  Create `lab/index.jsx`:
  ```jsx
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import ShapeLab from './ShapeLab.jsx';

  createRoot(document.getElementById('lab-root')).render(<ShapeLab />);
  ```

- [ ] **Step 2: Create lab/ShapeLab.jsx**

  Create `lab/ShapeLab.jsx`:
  ```jsx
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
  ```

- [ ] **Step 3: Open lab and verify static render**
  ```bash
  npm run dev
  ```
  Open http://localhost:5173/lab.html.  
  Expected: blue molar ghost on left half of canvas; crown outline visible as blue stroked path over crown region; JSON displayed on right.

- [ ] **Step 4: Commit**
  ```bash
  git add lab/index.jsx lab/ShapeLab.jsx
  git commit -m "feat: add lab skeleton with tooth ghost + shape overlay"
  ```

---

## Task 6 — Drag editing

**Files:**
- Create: `lab/useShapeEditor.js`
- Create: `lab/ControlPoint.jsx`
- Modify: `lab/ShapeLab.jsx`

Each segment's anchor and Bezier handles become draggable circles. Dragging updates normalized coordinates in real time.

- [ ] **Step 1: Create lab/useShapeEditor.js**

  Create `lab/useShapeEditor.js`:
  ```js
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
  ```

- [ ] **Step 2: Create lab/ControlPoint.jsx**

  Create `lab/ControlPoint.jsx`:
  ```jsx
  import React from 'react';

  // Draggable SVG handle. isAnchor=true: on-curve point (larger). false: off-curve Bezier handle.
  export function ControlPoint({ svgX, svgY, isAnchor, onPointerDown }) {
    return (
      <circle
        cx={svgX} cy={svgY} r={isAnchor ? 5 : 3.5}
        fill={isAnchor ? '#fff' : 'rgba(59,130,246,0.4)'}
        stroke="#3b82f6" strokeWidth={1.5}
        style={{ cursor: 'crosshair', touchAction: 'none' }}
        onPointerDown={onPointerDown}
      />
    );
  }
  ```

- [ ] **Step 3: Replace lab/ShapeLab.jsx with drag-enabled version**

  Replace `lab/ShapeLab.jsx` entirely:
  ```jsx
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
  ```

- [ ] **Step 4: Verify drag in browser**
  ```bash
  npm run dev
  ```
  Open http://localhost:5173/lab.html. Check:
  - White circles visible on shape anchor points; smaller blue circles on Bezier handles
  - Dashed lines connect handles to anchors
  - Dragging any circle reshapes the crown path in real time
  - JSON panel updates as you drag
  - "Copy JSON" and "Download JSON" buttons work
  - Loading a `.json` file updates the shape

- [ ] **Step 5: Commit**
  ```bash
  git add lab/useShapeEditor.js lab/ControlPoint.jsx lab/ShapeLab.jsx
  git commit -m "feat: add drag control point editing + export to shape lab"
  ```

---

## Task 7 — Crown treatment overlay

**Files:**
- Modify: `treatments.jsx` (three changes)

The `crown` treatment is added to the treatment catalog, a `CrownOverlay` renderer is added, and the `TreatmentLayer` render loop (currently at lines 593–605) gets a `crown` case.

- [ ] **Step 1: Add imports at top of treatments.jsx**

  After `import React from 'react';` at line 1, add:
  ```js
  import crownMolarUpper from './shapes-data/crown-molar-upper.json';
  import { shapeToPath } from './visuals/shapes.jsx';
  ```

- [ ] **Step 2: Add Restoration group to TX_GROUPS**

  In `TX_GROUPS` (currently has Extraction, Implant, Bone graft groups), insert a new group after the Implant group and before Bone graft:
  ```js
  {
    label: 'Restoration',
    scope: 'tooth',
    items: [
      { id: 'crown', label: 'Crown', hint: 'full-coverage crown · existing tooth', requires: 'present-tooth' },
    ],
  },
  ```

- [ ] **Step 3: Add CrownOverlay component**

  Add this function anywhere after `ImplantOverlay` and before the `TreatmentLayer` section comment (around line 138):
  ```jsx
  function CrownOverlay({ tooth, biteY, accent }) {
    const { cx, w, h, jaw } = tooth;
    const flipY = jaw === 'upper' ? 1 : -1;
    const d = shapeToPath(crownMolarUpper, w, h);
    return (
      <g transform={`translate(${cx}, ${biteY}) scale(1, ${flipY})`} style={{ pointerEvents: 'none' }}>
        <path d={d} fill="var(--tooth-fill)" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
        <path
          d={`M ${-w*0.26} 0 Q 0 ${h*0.04} ${w*0.26} 0`}
          stroke={accent} strokeWidth="0.9" fill="none" opacity="0.55"
        />
      </g>
    );
  }
  ```

- [ ] **Step 4: Add crown case to TreatmentLayer render loop**

  In `treatments.jsx`, find the per-tooth render block (around lines 593–605). The current `list.map` block ends with `return null;` for unrecognized IDs. Add a `crown` case before that fallback:
  ```js
  // Current code (lines 593–604):
  {list.map((tx, i) => {
    if (tx.id === 'extraction') return null;
    if (tx.id === 'implant-only' || tx.id === 'implant-crown') {
      return <FittedImplantOverlay key={i} tooth={tooth} biteY={biteY}
                                   withCrown={tx.id === 'implant-crown'} accent={accent} />;
    }
    if (tx.id === 'gbr' || tx.id === 'socket-preservation' || tx.id === 'simultaneous-graft') {
      return <BoneGraftOverlay key={i} x={tooth.cx} y={biteY}
                               w={tooth.w} h={tooth.h} jaw={tooth.jaw}
                               variant={tx.id} accent={accent} />;
    }
    return null;
  })}
  ```
  Add the crown case after the GBR block and before `return null;`:
  ```js
  if (tx.id === 'crown') {
    return <CrownOverlay key={i} tooth={tooth} biteY={biteY} accent={accent} />;
  }
  ```

- [ ] **Step 5: Verify in main app**
  ```bash
  npm run dev
  ```
  Open http://localhost:5173/. Advance to treatment stage. Click an existing upper molar (e.g., FDI 16 — upper right first molar). The treatment popover should show a "Restoration" group with "Crown". Select it. Check:
  - Crown overlay appears on FDI 16 (tooth-fill background, accent stroke)
  - Occlusal groove line visible
  - Try on a lower molar (e.g., FDI 46) — crown should flip correctly with jaw orientation
  - Crown does not appear on edentulous (missing) slots — `requires: 'present-tooth'` should enforce this

- [ ] **Step 6: Commit**
  ```bash
  git add treatments.jsx
  git commit -m "feat: add crown treatment with shape-JSON overlay renderer"
  ```

---

## Task 8 — End-to-end verification

Proves all five workflow steps together: Inkscape → normalize → lab edit → export → main app render.

- [ ] **Step 1: Test the normalize script**

  If you have Inkscape, draw a simple crown at 38×88 px and save as Plain SVG to `uploads/test-crown.svg`. Otherwise, create a minimal test SVG:
  ```bash
  echo '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="88"><path d="M 18.24 0 C 19.76 -14.08 19.76 -29.92 15.96 -35.2 Q 0 -41.36 -15.96 -35.2 C -19.76 -29.92 -19.76 -14.08 -18.24 0 Q 0 6.16 18.24 0 Z" /></svg>' > uploads/test-crown.svg
  node scripts/normalize-svg.mjs uploads/test-crown.svg 38 88 test-crown
  ```
  Expected output: valid JSON with normalized segments (x values near ±0.48, y values in [−0.47, 0.07]).

- [ ] **Step 2: Load into lab and edit**

  Save the JSON output from Step 1 to a file. In the lab (http://localhost:5173/lab.html), use "Load" to import it. Drag 2–3 control points to adjust the crown shape. Verify the crown path updates live. Click "Download JSON".

- [ ] **Step 3: Promote edited shape**

  Copy the downloaded JSON content into `shapes-data/crown-molar-upper.json`. Reload the main app. Apply "Crown" treatment to FDI 16 — the overlay should reflect the edited shape.

- [ ] **Step 4: Update ROADMAP.md**

  In `ROADMAP.md`, update the Phase 1 block:
  ```markdown
  ## Phase 1 — Vertical Slice (Lab + One Molar Crown)
  **Status:** Complete
  **Start:** 2026-05-24 | **Completion:** 2026-05-24
  **Plan:** [`docs/plans/2026-05-24-phase-1-vertical-slice.md`](docs/plans/2026-05-24-phase-1-vertical-slice.md)
  ```

- [ ] **Step 5: Final commit**
  ```bash
  git add shapes-data/crown-molar-upper.json ROADMAP.md
  git commit -m "feat: complete Phase 1 — shape lab + molar crown overlay end-to-end"
  ```

---

## Self-Review

**Spec coverage (ROADMAP Phase 1):**
- Minimal in-app visual lab ✓ Tasks 5–6
- Control-point drag editing ✓ Task 6 (`useShapeEditor`, `ControlPoint`)
- One molar crown end-to-end ✓ Tasks 2, 7, 8
- Inkscape import → normalize ✓ Task 4 (`normalize-svg.mjs`)
- Export JSON ✓ Task 6 (Download + Copy buttons)
- Render via `visuals/shapes` ✓ Tasks 3, 7
- Exit criterion "editing faster than today" ✓ drag handle vs tweaking float coefficients in source
- Exit criterion "output matches hand-drawn quality" ✓ Task 8 Step 3 (visual verify in main app)

**Placeholder scan:** No TBD/TODO items. Every step has exact code, exact commands, and expected output.

**Type consistency:**
- `shapeToPath(shape, w, h)` — same signature in `visuals/shapes.jsx`, `lab/ShapeLab.jsx`, `treatments.jsx`
- `useShapeEditor(initial, w, h)` → `[shape, setShape, {onPointerDown, onPointerMove, onPointerUp}]` — consistent in `ShapeLab.jsx`
- `ControlPoint` props: `svgX, svgY, isAnchor, onPointerDown` — consistent in `ShapeLab.jsx`
- `CrownOverlay` props: `tooth, biteY, accent` — matches the `FittedImplantOverlay` pattern already in `TreatmentLayer`
- Shape JSON field: `segments[]` with `type`, `x/y`, optional `x1/y1/x2/y2` — consistent across all files
