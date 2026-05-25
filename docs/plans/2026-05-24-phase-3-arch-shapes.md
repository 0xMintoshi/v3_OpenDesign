# Phase 3 — Arch + Anatomy as Control-Point Shapes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert hardcoded maxilla, mandible, and sinus SVG paths in `layout/anatomy.jsx` into normalized control-point JSON shapes editable via drag handles in the lab.

**Architecture:** Extract the four anatomy path strings (maxilla, mandible, sinus-right, sinus-left) into `shapes-data/arch-*.json` using the same normalized segment format as tooth crowns. Update `anatomy.jsx` to call `shapeToPath(json, 1600, 800)` — round-tripping back to original absolute coords in the 1600×800 viewBox. Extend `ShapeLab` with a shape selector + dynamic canvas sizing so any arch shape can be loaded and edited by dragging control points.

**Tech Stack:** React 18, Vite, Vitest (unit), Playwright (e2e), plain ES modules. No TypeScript (deferred to post-Phase 4). Run from repo root: `npm run dev`, `npm run lab`, `npm test`, `npm run e2e`, `npm run lint`.

---

## File Map

| Action  | Path                                      | Responsibility                                          |
|---------|-------------------------------------------|---------------------------------------------------------|
| Create  | `shapes-data/arch-maxilla.json`           | Normalized control-point data for the maxilla arch      |
| Create  | `shapes-data/arch-mandible.json`          | Normalized control-point data for the mandible arch     |
| Create  | `shapes-data/arch-sinus-right.json`       | Normalized control-point data for right maxillary sinus |
| Create  | `shapes-data/arch-sinus-left.json`        | Normalized control-point data for left maxillary sinus  |
| Modify  | `layout/anatomy.jsx`                      | Import arch JSONs; use `shapeToPath` instead of strings |
| Modify  | `core/shapes.test.js`                     | Add round-trip tests for all four arch shapes           |
| Modify  | `lab/ShapeLab.jsx`                        | Shape selector + dynamic W/H + skip tooth reference     |

---

## Background: Coordinate System

`anatomy.jsx` uses a **1600×800 viewBox**. All arch path coords are in that space.

The normalized format stores `x = rawX / W`, `y = rawY / H`. For arch shapes: **W = 1600, H = 800**.

`shapeToPath(shape, 1600, 800)` multiplies back → reproduces the original absolute coords exactly.

In the **lab canvas**, arch shapes are displayed at **W_DISPLAY = 800, H_DISPLAY = 400** (half scale, fits viewport). The drag delta calculation uses the display dimensions: moving 1 pixel = `1 / W_DISPLAY` normalized units. This is the same `w`/`h` passed to `useShapeEditor`.

---

## Task 1: Create arch-maxilla.json

**Files:**
- Create: `shapes-data/arch-maxilla.json`

Source path (from `anatomy.jsx` `maxillaPath()`), converted to normalized segments (x/1600, y/800):

- [ ] **Step 1: Create the file**

```json
{
  "id": "arch-maxilla",
  "label": "Maxilla (Upper Jaw)",
  "version": 1,
  "archType": "maxilla",
  "note": "Coords normalized to 1600×800 viewBox. x = rawX/1600, y = rawY/800.",
  "segments": [
    { "type": "M",  "x": 0.094, "y": 0.450 },
    { "type": "L",  "x": 0.081, "y": 0.300 },
    { "type": "Q",  "x1": 0.088, "y1": 0.163, "x": 0.150, "y": 0.113 },
    { "type": "Q",  "x1": 0.238, "y1": 0.075, "x": 0.338, "y": 0.088 },
    { "type": "Q",  "x1": 0.438, "y1": 0.100, "x": 0.500, "y": 0.100 },
    { "type": "Q",  "x1": 0.563, "y1": 0.100, "x": 0.663, "y": 0.088 },
    { "type": "Q",  "x1": 0.763, "y1": 0.075, "x": 0.850, "y": 0.113 },
    { "type": "Q",  "x1": 0.913, "y1": 0.163, "x": 0.919, "y": 0.300 },
    { "type": "L",  "x": 0.906, "y": 0.450 },
    { "type": "L",  "x": 0.863, "y": 0.450 },
    { "type": "Q",  "x1": 0.688, "y1": 0.438, "x": 0.500, "y": 0.438 },
    { "type": "Q",  "x1": 0.313, "y1": 0.438, "x": 0.138, "y": 0.450 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 2: Sanity-check the math** — verify that `0.094 * 1600 = 150.4 ≈ 150` (original M x), `0.450 * 800 = 360` (original M y). Open a Node repl or just check the first two points mentally.

- [ ] **Step 3: Commit**

```bash
git add shapes-data/arch-maxilla.json
git commit -m "feat(shapes-data): add arch-maxilla control-point JSON"
```

---

## Task 2: Create arch-mandible.json

**Files:**
- Create: `shapes-data/arch-mandible.json`

Source: `mandiblePath()` in `anatomy.jsx`. Original coords → normalized:

- [ ] **Step 1: Create the file**

```json
{
  "id": "arch-mandible",
  "label": "Mandible (Lower Jaw)",
  "version": 1,
  "archType": "mandible",
  "note": "Coords normalized to 1600×800 viewBox. x = rawX/1600, y = rawY/800.",
  "segments": [
    { "type": "M",  "x": 0.094, "y": 0.513 },
    { "type": "L",  "x": 0.106, "y": 0.638 },
    { "type": "Q",  "x1": 0.109, "y1": 0.775, "x": 0.147, "y": 0.869 },
    { "type": "Q",  "x1": 0.194, "y1": 0.931, "x": 0.256, "y": 0.938 },
    { "type": "Q",  "x1": 0.375, "y1": 0.956, "x": 0.500, "y": 0.963 },
    { "type": "Q",  "x1": 0.625, "y1": 0.956, "x": 0.744, "y": 0.938 },
    { "type": "Q",  "x1": 0.806, "y1": 0.931, "x": 0.853, "y": 0.869 },
    { "type": "Q",  "x1": 0.891, "y1": 0.775, "x": 0.894, "y": 0.638 },
    { "type": "L",  "x": 0.906, "y": 0.513 },
    { "type": "L",  "x": 0.863, "y": 0.513 },
    { "type": "Q",  "x1": 0.688, "y1": 0.525, "x": 0.500, "y": 0.525 },
    { "type": "Q",  "x1": 0.313, "y1": 0.525, "x": 0.138, "y": 0.513 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 2: Verify first point** — `0.094 * 1600 = 150` ✓, `0.513 * 800 = 410` ✓ (original M is `150 410`).

- [ ] **Step 3: Commit**

```bash
git add shapes-data/arch-mandible.json
git commit -m "feat(shapes-data): add arch-mandible control-point JSON"
```

---

## Task 3: Create arch-sinus-right.json and arch-sinus-left.json

**Files:**
- Create: `shapes-data/arch-sinus-right.json`
- Create: `shapes-data/arch-sinus-left.json`

Source: `maxillarySinusPath('right')` and `maxillarySinusPath('left')` in `anatomy.jsx`.

- [ ] **Step 1: Create arch-sinus-right.json**

```json
{
  "id": "arch-sinus-right",
  "label": "Maxillary Sinus (Patient Right)",
  "version": 1,
  "archType": "sinus",
  "side": "right",
  "note": "Coords normalized to 1600×800 viewBox. x = rawX/1600, y = rawY/800.",
  "segments": [
    { "type": "M",  "x": 0.175, "y": 0.350 },
    { "type": "Q",  "x1": 0.138, "y1": 0.250, "x": 0.175, "y": 0.175 },
    { "type": "Q",  "x1": 0.225, "y1": 0.138, "x": 0.300, "y": 0.150 },
    { "type": "Q",  "x1": 0.363, "y1": 0.163, "x": 0.388, "y": 0.250 },
    { "type": "Q",  "x1": 0.400, "y1": 0.350, "x": 0.338, "y": 0.375 },
    { "type": "Q",  "x1": 0.238, "y1": 0.381, "x": 0.175, "y": 0.350 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 2: Create arch-sinus-left.json**

```json
{
  "id": "arch-sinus-left",
  "label": "Maxillary Sinus (Patient Left)",
  "version": 1,
  "archType": "sinus",
  "side": "left",
  "note": "Coords normalized to 1600×800 viewBox. x = rawX/1600, y = rawY/800.",
  "segments": [
    { "type": "M",  "x": 0.825, "y": 0.350 },
    { "type": "Q",  "x1": 0.863, "y1": 0.250, "x": 0.825, "y": 0.175 },
    { "type": "Q",  "x1": 0.775, "y1": 0.138, "x": 0.700, "y": 0.150 },
    { "type": "Q",  "x1": 0.638, "y1": 0.163, "x": 0.613, "y": 0.250 },
    { "type": "Q",  "x1": 0.600, "y1": 0.350, "x": 0.663, "y": 0.375 },
    { "type": "Q",  "x1": 0.763, "y1": 0.381, "x": 0.825, "y": 0.350 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 3: Verify sinus-right first point** — `0.175 * 1600 = 280` ✓, `0.350 * 800 = 280` ✓ (original `M 280 280`).

- [ ] **Step 4: Commit**

```bash
git add shapes-data/arch-sinus-right.json shapes-data/arch-sinus-left.json
git commit -m "feat(shapes-data): add arch sinus control-point JSONs (right + left)"
```

---

## Task 4: Add arch round-trip tests to core/shapes.test.js

**Files:**
- Modify: `core/shapes.test.js`

The test verifies that each arch JSON produces an SVG path string containing `M` and `Z` when rendered at 1600×800. It also spot-checks that the first M coordinate round-trips correctly (within floating-point tolerance).

- [ ] **Step 1: Write the failing tests** — append to `core/shapes.test.js`:

```js
describe('arch shape round-trips', () => {
  it('arch-maxilla produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/arch-maxilla.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    // First M should be near (150, 360)
    expect(d).toMatch(/^M 150\.\d+ 360\.\d+/);
  });

  it('arch-mandible produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/arch-mandible.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    expect(d).toMatch(/^M 150\.\d+ 410\.\d+/);
  });

  it('arch-sinus-right produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/arch-sinus-right.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    expect(d).toMatch(/^M 280\.\d+ 280\.\d+/);
  });

  it('arch-sinus-left produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/arch-sinus-left.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
    expect(d).toMatch(/^M 1320\.\d+ 280\.\d+/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (files don't exist yet)**

```bash
npm test
```

Expected: 4 new tests FAIL with import errors (JSONs created in Tasks 1-3 above, so if done in order they'll actually pass — that's fine).

- [ ] **Step 3: Run tests again after Tasks 1–3 are complete**

```bash
npm test
```

Expected: all 4 new tests PASS, existing 5 tests still PASS. Total: 9/9 green.

- [ ] **Step 4: Commit**

```bash
git add core/shapes.test.js
git commit -m "test(core): add arch shape round-trip tests"
```

---

## Task 5: Update anatomy.jsx to use shapeToPath + arch JSONs

**Files:**
- Modify: `layout/anatomy.jsx`

Replace all four hardcoded path functions (`maxillaPath`, `mandiblePath`, `maxillarySinusPath`) with functions that import JSON and call `shapeToPath(json, 1600, 800)`. The exported API stays identical so consuming code (`app/dental-arch.jsx`) doesn't change.

`idnCanalPath`, `idnSchematicPath`, `nasalCavityPath`, `nasalSeptumPath`, `mentalForamenCenters`, `ramusDetailPath` are **not** arch control-point shapes — leave them as hardcoded strings for now (Phase 4 or Phase 5 will handle them).

- [ ] **Step 1: Replace the file contents**

```jsx
// Anatomical paths — maxilla, mandible, nasal cavity, IDN canal.
// Maxilla, mandible, and sinus zones are control-point shapes from shapes-data/.
// All others remain as hardcoded strings in the 1600×800 viewBox.

import { shapeToPath } from '../core/shapes.js';
import archMaxilla   from '../shapes-data/arch-maxilla.json';
import archMandible  from '../shapes-data/arch-mandible.json';
import archSinusR    from '../shapes-data/arch-sinus-right.json';
import archSinusL    from '../shapes-data/arch-sinus-left.json';

const VW = 1600, VH = 800;

// ---------- Maxilla (upper jaw bone) ----------
function maxillaPath() {
  return shapeToPath(archMaxilla, VW, VH);
}

// ---------- Mandible (lower jaw bone) ----------
function mandiblePath() {
  return shapeToPath(archMandible, VW, VH);
}

// ---------- Nasal cavity (between maxillary sinuses) ----------
function nasalCavityPath() {
  return `M 800 110
          Q 740 130, 730 200
          Q 725 260, 760 290
          Q 780 310, 800 312
          Q 820 310, 840 290
          Q 875 260, 870 200
          Q 860 130, 800 110
          Z`;
}

// Inner nasal septum
function nasalSeptumPath() {
  return `M 800 130 L 798 295 L 802 295 Z`;
}

// ---------- Maxillary sinuses (interactive) ----------
function maxillarySinusPath(side) {
  return shapeToPath(side === 'right' ? archSinusR : archSinusL, VW, VH);
}

// ---------- IDN / Inferior alveolar nerve canal ----------
function idnCanalPath(side) {
  if (side === 'right') {
    return `M 220 530 Q 280 600, 420 640 Q 540 660, 620 640`;
  } else {
    return `M 1380 530 Q 1320 600, 1180 640 Q 1060 660, 980 640`;
  }
}

function idnSchematicPath(side) {
  if (side === 'right') {
    return `M 180 600 Q 280 670, 460 700 Q 600 712, 700 700`;
  } else {
    return `M 1420 600 Q 1320 670, 1140 700 Q 1000 712, 900 700`;
  }
}

function mentalForamenCenters() {
  return [
    { cx: 700, cy: 700, side: 'right' },
    { cx: 900, cy: 700, side: 'left' },
  ];
}

function ramusDetailPath(side) {
  if (side === 'right') {
    return `M 175 480 Q 165 440, 180 410 L 195 415 L 200 460 Z`;
  } else {
    return `M 1425 480 Q 1435 440, 1420 410 L 1405 415 L 1400 460 Z`;
  }
}

Object.assign(window, {
  maxillaPath, mandiblePath,
  nasalCavityPath, nasalSeptumPath,
  maxillarySinusPath, idnCanalPath, idnSchematicPath,
  mentalForamenCenters, ramusDetailPath,
});

export {
  maxillaPath, mandiblePath,
  nasalCavityPath, nasalSeptumPath,
  maxillarySinusPath, idnCanalPath, idnSchematicPath,
  mentalForamenCenters, ramusDetailPath,
};
```

- [ ] **Step 2: Run lint to confirm no boundary violations**

```bash
npm run lint
```

Expected: 0 errors. `layout` imports from `core` — allowed by boundary rule `{ from: 'layout', allow: ['core'] }`. Imports from `shapes-data/` are not bounded, so allowed.

- [ ] **Step 3: Start dev server and visually confirm anatomy still renders**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. The maxilla and mandible outlines should look identical to before (round-trip is lossless to 2 decimal places). Check left/right sinuses visible.

- [ ] **Step 4: Commit**

```bash
git add layout/anatomy.jsx
git commit -m "feat(layout): anatomy paths now driven by control-point JSON shapes"
```

---

## Task 6: Extend ShapeLab with shape selector + variable canvas

**Files:**
- Modify: `lab/ShapeLab.jsx`

Add a shape dropdown at the top of the lab. When an arch shape is selected, use display dimensions W=800, H=400 (half of 1600×800). When a tooth shape is selected, keep W=38, H=88. Skip the tooth reference ghost (outline/cervical) when editing arch shapes.

The shape catalog is defined inline in `ShapeLab.jsx` — no new module needed yet (Phase 4 will formalize a registry).

- [ ] **Step 1: Rewrite ShapeLab.jsx**

```jsx
import React, { useRef, useState, useEffect } from 'react';
import { toothPaths } from '../layout/teeth-data.jsx';
import { shapeToPath } from '../visuals/shapes.jsx';
import { useShapeEditor } from './useShapeEditor.js';
import { ControlPoint } from './ControlPoint.jsx';

// Shape catalog: id → { label, loader, w, h, toothRef? }
// w/h are the display pixel dimensions in the lab canvas.
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
};

const DEFAULT_SHAPE_ID = 'crown-molar-upper';

// Stub shape while JSON is loading.
const LOADING_SHAPE = { id: 'loading', label: 'Loading…', segments: [] };

export default function ShapeLab() {
  const svgRef = useRef(null);
  const [selectedId, setSelectedId] = useState(DEFAULT_SHAPE_ID);
  const [initialShape, setInitialShape] = useState(null);

  const meta = SHAPES[selectedId];
  const W = meta.w;
  const H = meta.h;

  // Canvas pixel dimensions: tooth shapes get a small canvas, arch shapes get full width.
  const CANVAS_W = meta.toothRef ? 400 : Math.min(W + 40, 1000);
  const CANVAS_H = meta.toothRef ? 380 : H + 40;
  const CX = meta.toothRef ? 200 : 20;   // left offset from canvas edge to shape origin
  const CY = meta.toothRef ? 130 : 20;   // top offset

  useEffect(() => {
    setInitialShape(null); // show loading while importing
    meta.loader().then(m => setInitialShape(m.default ?? m));
  }, [selectedId]);

  const [shape, setShape, { onPointerDown, onPointerMove, onPointerUp }] =
    useShapeEditor(initialShape ?? LOADING_SHAPE, W, H);

  // Re-seed editor when a new shape loads.
  useEffect(() => {
    if (initialShape) setShape(initialShape);
  }, [initialShape]);

  // Ghost tooth reference (tooth shapes only).
  const toothRef = meta.toothRef ? toothPaths(meta.toothRef, W, H) : null;
  const crownPath = shape.segments.length ? shapeToPath(shape, W, H) : '';

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

  // Absolute SVG canvas coord from normalized coord.
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
            {crownPath && (
              <path
                d={crownPath}
                fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round"
                transform={`translate(${CX}, ${CY})`}
              />
            )}
            {/* Bezier handle lines */}
            {handleLines()}
            {/* Control point handles */}
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
          {meta.toothRef ? (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Inkscape: draw at {W}×{H} px → Save Plain SVG<br/>
              node scripts/normalize-svg.mjs shape.svg {W} {H} {selectedId}
            </p>
          ) : (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Arch shape — viewBox 1600×800. Edit by dragging control points.<br/>
              Download JSON and replace shapes-data/{selectedId}.json to persist edits.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors. `lab` imports from `core`, `layout`, `visuals` — all allowed.

- [ ] **Step 3: Start the lab and test manually**

```bash
npm run lab
```

Open `http://localhost:5173/lab.html`. Steps to verify:
1. Default view shows "Upper Molar Crown" with tooth ghost — drag handles work.
2. Select "Maxilla (Upper Jaw)" from dropdown → canvas expands, maxilla shape renders, handles appear.
3. Drag a handle on the maxilla shape → arch curvature changes live.
4. Select "Mandible (Lower Jaw)" → mandible renders, draggable.
5. Select sinus shapes → both render and are draggable.
6. "Download JSON" on a modified arch shape → JSON file downloads with updated coords.

- [ ] **Step 4: Commit**

```bash
git add lab/ShapeLab.jsx
git commit -m "feat(lab): shape selector + variable canvas for arch shapes"
```

---

## Task 7: E2E smoke test — arch shapes render in main app

**Files:**
- Modify: `e2e/verify.spec.js`

Add a test that opens the main app and confirms anatomy SVG paths are present in the DOM. This guards against anatomy.jsx import errors breaking the app.

- [ ] **Step 1: Append to e2e/verify.spec.js**

Read the current contents of `e2e/verify.spec.js` first, then append:

```js
test('anatomy arch paths render in main app', async ({ page }) => {
  await page.goto('/');
  // The main app SVG should contain path elements.
  // anatomy.jsx is consumed by app/dental-arch.jsx which renders inside the root SVG.
  const paths = page.locator('svg path');
  await expect(paths.first()).toBeVisible({ timeout: 5000 });

  // The page should not show a JS error banner (Vite shows one on import failure).
  const errorOverlay = page.locator('vite-error-overlay');
  await expect(errorOverlay).not.toBeAttached();
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npm run e2e
```

Expected: existing 3 tests pass + new test passes. Total: 4/4 green.

- [ ] **Step 3: Commit**

```bash
git add e2e/verify.spec.js
git commit -m "test(e2e): verify anatomy arch paths render in main app"
```

---

## Task 8: Update ROADMAP.md

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Mark Phase 3 complete**

In `ROADMAP.md`, update the Phase 3 block:

```markdown
## Phase 3 — Arch + Anatomy as Control-Point Shapes
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-3-arch-shapes.md`](docs/plans/2026-05-24-phase-3-arch-shapes.md)

Maxilla, mandible, and sinus zones authored as normalized control-point JSON in `shapes-data/`.
Anatomy paths driven by `shapeToPath` — no more hardcoded strings for arch shapes.
Lab shape selector added: pick any arch or tooth shape, drag control points to edit curvature.
Exit criteria met: arch curvature adjustable by dragging points, not raw slider.
```

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md docs/plans/2026-05-24-phase-3-arch-shapes.md
git commit -m "docs: mark Phase 3 complete in ROADMAP"
```

---

## Exit Criteria Checklist

Before calling Phase 3 done, verify all of these:

- [ ] `npm test` — all tests green (≥ 9 Vitest tests passing)
- [ ] `npm run e2e` — all E2E tests pass (≥ 4 passing)
- [ ] `npm run lint` — 0 errors, 0 boundary violations
- [ ] Lab manual check: selecting "Maxilla (Upper Jaw)" renders the arch with draggable control points
- [ ] Lab manual check: dragging a midpoint on the maxilla changes its curvature live in the SVG
- [ ] Lab manual check: "Download JSON" produces a valid JSON file with updated coords
- [ ] Main app (`npm run dev`): anatomy shapes still render identically to before (no visual regression)
