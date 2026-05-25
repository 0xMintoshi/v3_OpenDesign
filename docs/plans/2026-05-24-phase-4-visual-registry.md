# Phase 4 — Visual Registry + Overlay Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc if/else overlay dispatch in `TreatmentLayer` with a formal visual registry keyed by treatment ID, add three new overlay shapes (bridge-span, partial-denture-upper, partial-denture-lower) authored as normalized control-point JSON, and expose all shapes in ShapeLab.

**Architecture:** A pure-data registry (`core/visual-registry.js`) maps each treatment ID to `{ scope, category, label, shapeId }` — no React, no imports from other layers, so it stays within the import boundary. New shape JSON files live in `shapes-data/`. New overlay components (`BridgeSpanOverlay`, `PartialDentureOverlay`) live in `visuals/` and import only from `core/` and `shapes-data/`. `TreatmentLayer` in `app/treatments.jsx` is refactored to dispatch via registry lookup instead of if/else chains. `ShapeLab` adds the three new shapes to its inline `SHAPES` catalog.

**Tech Stack:** Vite 5, React 18, Vitest (unit), Playwright (E2E), ESLint plugin-boundaries (import layer enforcement), plain ES modules, no TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `core/visual-registry.js` | Pure-data registry: id → {scope, category, label, shapeId} |
| Create | `core/visual-registry.test.js` | Unit tests: completeness, field validity, no unknown scopes |
| Create | `shapes-data/bridge-span.json` | Normalized control-point shape for single-unit bridge connector |
| Create | `shapes-data/partial-denture-upper.json` | Normalized control-point shape for upper partial denture arch band |
| Create | `shapes-data/partial-denture-lower.json` | Normalized control-point shape for lower partial denture arch band |
| Modify | `core/shapes.test.js` | Round-trip tests for 3 new shape JSON files |
| Create | `visuals/BridgeSpanOverlay.jsx` | Bridge connector overlay using shapeToPath + bridge-span.json |
| Create | `visuals/PartialDentureOverlay.jsx` | Partial denture band overlay using shapeToPath |
| Modify | `app/treatments.jsx` | Add bridge-span + partial-denture to catalog; refactor TreatmentLayer dispatch via registry |
| Modify | `lab/ShapeLab.jsx` | Add 3 new shapes to SHAPES catalog |
| Modify | `e2e/verify.spec.js` | Smoke test: new shapes load in lab; bridge-span treatment renders |
| Modify | `ROADMAP.md` | Mark Phase 4 complete, fill in start/completion dates |

---

## Task 1: Visual Registry — Pure Data Module

**Files:**
- Create: `core/visual-registry.js`
- Create: `core/visual-registry.test.js`

- [ ] **Step 1: Write the failing test**

```js
// core/visual-registry.test.js
import { describe, it, expect } from 'vitest';
import { VISUAL_REGISTRY, registryFor } from './visual-registry.js';

const VALID_SCOPES = new Set(['tooth', 'sinus', 'arch', 'full-mouth']);
const VALID_CATEGORIES = new Set(['tooth', 'span', 'arch', 'full-mouth', 'sinus']);

describe('VISUAL_REGISTRY', () => {
  it('has at least 10 entries', () => {
    expect(Object.keys(VISUAL_REGISTRY).length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has required fields', () => {
    for (const [id, entry] of Object.entries(VISUAL_REGISTRY)) {
      expect(entry, `${id} missing scope`).toHaveProperty('scope');
      expect(entry, `${id} missing category`).toHaveProperty('category');
      expect(entry, `${id} missing label`).toHaveProperty('label');
      expect(VALID_SCOPES.has(entry.scope), `${id} bad scope: ${entry.scope}`).toBe(true);
      expect(VALID_CATEGORIES.has(entry.category), `${id} bad category: ${entry.category}`).toBe(true);
    }
  });

  it('registryFor returns entry for known id', () => {
    const entry = registryFor('crown');
    expect(entry).toBeDefined();
    expect(entry.scope).toBe('tooth');
    expect(entry.category).toBe('tooth');
  });

  it('registryFor returns null for unknown id', () => {
    expect(registryFor('nonexistent-id-xyz')).toBeNull();
  });

  it('bridge-span entry exists with scope tooth and category span', () => {
    const entry = registryFor('bridge-span');
    expect(entry).toBeDefined();
    expect(entry.scope).toBe('tooth');
    expect(entry.category).toBe('span');
    expect(entry.shapeId).toBe('bridge-span');
  });

  it('partial-denture-upper exists with scope arch', () => {
    const entry = registryFor('partial-denture-upper');
    expect(entry).toBeDefined();
    expect(entry.scope).toBe('arch');
    expect(entry.category).toBe('arch');
  });

  it('partial-denture-lower exists with scope arch', () => {
    const entry = registryFor('partial-denture-lower');
    expect(entry).toBeDefined();
    expect(entry.scope).toBe('arch');
    expect(entry.category).toBe('arch');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
cd C:\Users\ZMZ\Desktop\v3_OpenDesign_2
npm test -- core/visual-registry.test.js
```

Expected: FAIL — `Cannot find module './visual-registry.js'`

- [ ] **Step 3: Create the registry module**

```js
// core/visual-registry.js
// Pure data — no React, no imports from other layers (core boundary rule).
export const VISUAL_REGISTRY = {
  // ── tooth-scoped ──────────────────────────────────────────────────────────
  extraction:          { scope: 'tooth',      category: 'tooth',      label: 'Extraction',              shapeId: null },
  'implant-crown':     { scope: 'tooth',      category: 'tooth',      label: 'Implant + Crown',          shapeId: 'crown-molar-upper' },
  'implant-only':      { scope: 'tooth',      category: 'tooth',      label: 'Implant Only',             shapeId: null },
  crown:               { scope: 'tooth',      category: 'tooth',      label: 'Crown',                    shapeId: 'crown-molar-upper' },
  'socket-preservation': { scope: 'tooth',   category: 'tooth',      label: 'Socket Preservation',      shapeId: null },
  'bone-graft':        { scope: 'tooth',      category: 'tooth',      label: 'Simultaneous Bone Graft',  shapeId: null },
  gbr:                 { scope: 'tooth',      category: 'tooth',      label: 'GBR',                      shapeId: null },
  // ── span-scoped (multi-tooth, same tooth state model) ─────────────────────
  'bridge-span':       { scope: 'tooth',      category: 'span',       label: 'Bridge',                   shapeId: 'bridge-span' },
  // ── sinus-scoped ──────────────────────────────────────────────────────────
  'sinus-lift':        { scope: 'sinus',      category: 'sinus',      label: 'Complex Sinus Lift',       shapeId: null },
  // ── arch-scoped ───────────────────────────────────────────────────────────
  alveolectomy:        { scope: 'arch',       category: 'arch',       label: 'Alveolectomy',             shapeId: null },
  'complete-denture':  { scope: 'arch',       category: 'arch',       label: 'Complete Denture',         shapeId: null },
  'partial-denture-upper': { scope: 'arch',   category: 'arch',       label: 'Partial Denture (Upper)',  shapeId: 'partial-denture-upper' },
  'partial-denture-lower': { scope: 'arch',   category: 'arch',       label: 'Partial Denture (Lower)',  shapeId: 'partial-denture-lower' },
  // ── full-mouth-scoped ─────────────────────────────────────────────────────
  ortho:               { scope: 'full-mouth', category: 'full-mouth', label: 'Ortho Brackets',           shapeId: null },
  aligners:            { scope: 'full-mouth', category: 'full-mouth', label: 'Clear Aligners',           shapeId: null },
};

/** @returns {object|null} */
export function registryFor(id) {
  return VISUAL_REGISTRY[id] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm test -- core/visual-registry.test.js
```

Expected: PASS — all 7 tests green

- [ ] **Step 5: Commit**

```
git add core/visual-registry.js core/visual-registry.test.js
git commit -m "feat(core): add visual-registry — pure-data treatment ID → scope/category/shapeId map"
```

---

## Task 2: New Shape JSON — bridge-span

**Files:**
- Create: `shapes-data/bridge-span.json`
- Modify: `core/shapes.test.js`

The bridge-span shape represents a single-pontic connector: a flattened arch band that spans between two abutment teeth. Normalized to a 1×1 box; at render time w = total span width, h = tooth height.

- [ ] **Step 1: Add failing round-trip test**

Append to the end of `core/shapes.test.js`:

```js
describe('phase-4 shape round-trips', () => {
  it('bridge-span produces valid path at 76×88', async () => {
    const json = await import('../shapes-data/bridge-span.json');
    const d = shapeToPath(json.default ?? json, 76, 88);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });

  it('partial-denture-upper produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/partial-denture-upper.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });

  it('partial-denture-lower produces valid path at 1600×800', async () => {
    const json = await import('../shapes-data/partial-denture-lower.json');
    const d = shapeToPath(json.default ?? json, 1600, 800);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```
npm test -- core/shapes.test.js
```

Expected: FAIL — `Cannot find module '../shapes-data/bridge-span.json'`

- [ ] **Step 3: Author bridge-span.json**

A simple pontic band: flat arch shape, symmetrical, spanning full normalized width. The shape is a rounded rectangle-ish band with slight cervical curve at top and incisal curve at bottom.

```json
{
  "id": "bridge-span",
  "label": "Bridge Span",
  "segments": [
    { "type": "M", "x": 0.05, "y": 0.20 },
    { "type": "C", "x1": 0.05, "y1": 0.05, "x2": 0.20, "y2": 0.00, "x": 0.50, "y": 0.00 },
    { "type": "C", "x1": 0.80, "y1": 0.00, "x2": 0.95, "y2": 0.05, "x": 0.95, "y": 0.20 },
    { "type": "L", "x": 0.95, "y": 0.75 },
    { "type": "C", "x1": 0.95, "y1": 0.92, "x2": 0.80, "y2": 1.00, "x": 0.50, "y": 1.00 },
    { "type": "C", "x1": 0.20, "y1": 1.00, "x2": 0.05, "y2": 0.92, "x": 0.05, "y": 0.75 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 4: Author partial-denture-upper.json**

An arch-spanning partial band — mirrors the maxilla arch outline but narrower/inset. Normalized so x∈[0,1] maps to full arch width, y∈[0,1] maps to arch height.

```json
{
  "id": "partial-denture-upper",
  "label": "Partial Denture (Upper)",
  "segments": [
    { "type": "M", "x": 0.094, "y": 0.480 },
    { "type": "C", "x1": 0.094, "y1": 0.380, "x2": 0.180, "y2": 0.260, "x": 0.320, "y": 0.200 },
    { "type": "C", "x1": 0.420, "y1": 0.150, "x2": 0.580, "y2": 0.150, "x": 0.680, "y": 0.200 },
    { "type": "C", "x1": 0.820, "y1": 0.260, "x2": 0.906, "y2": 0.380, "x": 0.906, "y": 0.480 },
    { "type": "L", "x": 0.906, "y": 0.540 },
    { "type": "C", "x1": 0.906, "y1": 0.440, "x2": 0.820, "y2": 0.320, "x": 0.680, "y": 0.260 },
    { "type": "C", "x1": 0.580, "y1": 0.210, "x2": 0.420, "y2": 0.210, "x": 0.320, "y": 0.260 },
    { "type": "C", "x1": 0.180, "y1": 0.320, "x2": 0.094, "y2": 0.440, "x": 0.094, "y": 0.540 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 5: Author partial-denture-lower.json**

```json
{
  "id": "partial-denture-lower",
  "label": "Partial Denture (Lower)",
  "segments": [
    { "type": "M", "x": 0.094, "y": 0.520 },
    { "type": "C", "x1": 0.094, "y1": 0.620, "x2": 0.180, "y2": 0.740, "x": 0.320, "y": 0.800 },
    { "type": "C", "x1": 0.420, "y1": 0.850, "x2": 0.580, "y2": 0.850, "x": 0.680, "y": 0.800 },
    { "type": "C", "x1": 0.820, "y1": 0.740, "x2": 0.906, "y2": 0.620, "x": 0.906, "y": 0.520 },
    { "type": "L", "x": 0.906, "y": 0.460 },
    { "type": "C", "x1": 0.906, "y1": 0.560, "x2": 0.820, "y2": 0.680, "x": 0.680, "y": 0.740 },
    { "type": "C", "x1": 0.580, "y1": 0.790, "x2": 0.420, "y2": 0.790, "x": 0.320, "y": 0.740 },
    { "type": "C", "x1": 0.180, "y1": 0.680, "x2": 0.094, "y2": 0.560, "x": 0.094, "y": 0.460 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 6: Run tests to verify all pass**

```
npm test -- core/shapes.test.js
```

Expected: PASS — 12 tests green (9 original + 3 new)

- [ ] **Step 7: Commit**

```
git add shapes-data/bridge-span.json shapes-data/partial-denture-upper.json shapes-data/partial-denture-lower.json core/shapes.test.js
git commit -m "feat(shapes-data): add bridge-span, partial-denture-upper, partial-denture-lower normalized shapes"
```

---

## Task 3: BridgeSpanOverlay Component

**Files:**
- Create: `visuals/BridgeSpanOverlay.jsx`

- [ ] **Step 1: Write the component**

```jsx
// visuals/BridgeSpanOverlay.jsx
import React from 'react';
import bridgeSpan from '../shapes-data/bridge-span.json';
import { shapeToPath } from '../core/shapes.js';

/**
 * Renders a bridge pontic band spanning between abutment teeth.
 * @param {{ teeth: Array<{cx:number,w:number,h:number,jaw:string}>, biteY: number, accent: string }} props
 * teeth — ordered array of tooth objects for the spanned range (abutments + pontics)
 */
export function BridgeSpanOverlay({ teeth, biteY, accent }) {
  if (!teeth || teeth.length < 2) return null;
  const xs = teeth.map(t => t.cx);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const firstTooth = teeth[0];
  const spanW = maxX - minX + firstTooth.w;
  const h = firstTooth.h;
  const flipY = firstTooth.jaw === 'upper' ? 1 : -1;
  const d = shapeToPath(bridgeSpan, spanW, h);
  const originX = minX - firstTooth.w / 2;

  return (
    <g
      transform={`translate(${originX}, ${biteY}) scale(1, ${flipY})`}
      style={{ pointerEvents: 'none' }}
    >
      <path
        d={d}
        fill="var(--tooth-fill)"
        stroke={accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </g>
  );
}
```

- [ ] **Step 2: Verify lint passes (no import boundary violations)**

```
npm run lint
```

Expected: 0 errors. `visuals/` is allowed to import from `core/` and `shapes-data/`.

- [ ] **Step 3: Commit**

```
git add visuals/BridgeSpanOverlay.jsx
git commit -m "feat(visuals): add BridgeSpanOverlay — bridge pontic band spanning multi-tooth range"
```

---

## Task 4: PartialDentureOverlay Component

**Files:**
- Create: `visuals/PartialDentureOverlay.jsx`

- [ ] **Step 1: Write the component**

```jsx
// visuals/PartialDentureOverlay.jsx
import React from 'react';
import partialUpper from '../shapes-data/partial-denture-upper.json';
import partialLower from '../shapes-data/partial-denture-lower.json';
import { shapeToPath } from '../core/shapes.js';

/**
 * Renders a partial denture arch band overlay.
 * @param {{ jaw: 'upper'|'lower', svgW: number, svgH: number, accent: string }} props
 */
export function PartialDentureOverlay({ jaw, svgW, svgH, accent }) {
  const shape = jaw === 'upper' ? partialUpper : partialLower;
  const d = shapeToPath(shape, svgW, svgH);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path
        d={d}
        fill="var(--tooth-fill)"
        stroke={accent}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.70"
      />
    </g>
  );
}
```

- [ ] **Step 2: Verify lint**

```
npm run lint
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```
git add visuals/PartialDentureOverlay.jsx
git commit -m "feat(visuals): add PartialDentureOverlay — arch-band shape driven by partial-denture JSON"
```

---

## Task 5: Refactor TreatmentLayer + Extend Catalog in treatments.jsx

**Files:**
- Modify: `app/treatments.jsx`

This is the largest change. Two goals:
1. Add bridge-span and partial-denture entries to the treatment catalog arrays.
2. Refactor `TreatmentLayer` to dispatch overlays via `registryFor(id).category` lookup instead of if/else chains.

- [ ] **Step 1: Read the current treatments.jsx to get exact line locations**

Open `app/treatments.jsx` in the editor. Locate:
- `TX_GROUPS` array (tooth-scoped treatments)
- `ARCH_GROUPS` array (arch/full-mouth treatments)
- `TreatmentLayer` function and its if/else dispatch block

- [ ] **Step 2: Add bridge-span to TX_GROUPS**

In `TX_GROUPS`, after the last tooth-scoped entry, add:

```js
{ id: 'bridge-span', label: 'Bridge', color: '#e0a800', accent: '#c08000' },
```

- [ ] **Step 3: Add partial-denture entries to ARCH_GROUPS**

In `ARCH_GROUPS`, after `complete-denture`, add:

```js
{ id: 'partial-denture-upper', label: 'Partial Denture (Upper)', scope: 'arch', color: '#6f42c1', accent: '#5a32a3' },
{ id: 'partial-denture-lower', label: 'Partial Denture (Lower)', scope: 'arch', color: '#6f42c1', accent: '#5a32a3' },
```

- [ ] **Step 4: Add imports at top of treatments.jsx**

Add these imports after the existing overlay component imports:

```js
import { registryFor } from '../core/visual-registry.js';
import { BridgeSpanOverlay } from '../visuals/BridgeSpanOverlay.jsx';
import { PartialDentureOverlay } from '../visuals/PartialDentureOverlay.jsx';
```

- [ ] **Step 5: Refactor TreatmentLayer dispatch**

Replace the if/else chain in `TreatmentLayer` with registry-driven dispatch. The current pattern dispatches based on `tx.id`. Replace the entire dispatch block with:

```jsx
function TreatmentLayer({ treatments, teeth, svgW, svgH }) {
  return treatments.flatMap((tx) => {
    const entry = registryFor(tx.id);
    const category = entry?.category ?? 'tooth';
    const accent = (TX_GROUPS.find(g => g.id === tx.id) ?? ARCH_GROUPS.find(g => g.id === tx.id))?.accent ?? '#666';

    if (category === 'span') {
      const spannedTeeth = (tx.targets ?? []).map(fdi => teeth.find(t => t.fdi === fdi)).filter(Boolean);
      return [<BridgeSpanOverlay key={tx.id + tx.targets?.join(',')} teeth={spannedTeeth} biteY={spannedTeeth[0]?.biteY ?? 0} accent={accent} />];
    }

    if (category === 'arch' && tx.id.startsWith('partial-denture')) {
      const jaw = tx.id.includes('upper') ? 'upper' : 'lower';
      return [<PartialDentureOverlay key={tx.id} jaw={jaw} svgW={svgW} svgH={svgH} accent={accent} />];
    }

    // Delegate remaining categories to existing per-tooth overlay logic
    return (tx.targets ?? []).map((fdi) => {
      const tooth = teeth.find(t => t.fdi === fdi);
      if (!tooth) return null;
      return renderToothOverlay(tx, tooth, accent);
    }).filter(Boolean);
  });
}
```

Extract the existing per-tooth if/else logic into a helper `renderToothOverlay(tx, tooth, accent)`:

```jsx
function renderToothOverlay(tx, tooth, accent) {
  const key = `${tx.id}-${tooth.fdi}`;
  if (tx.id === 'implant-crown' || tx.id === 'crown') {
    return <CrownOverlay key={key} tooth={tooth} biteY={tooth.biteY} accent={accent} />;
  }
  if (tx.id === 'implant-only') {
    return <ImplantOverlay key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'bone-graft' || tx.id === 'socket-preservation') {
    return <BoneGraftOverlay key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'extraction') {
    return <ExtractionOverlay key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'gbr') {
    return <BoneGraftOverlay key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'sinus-lift') {
    return <SinusLiftOverlay key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'alveolectomy') {
    return <AlveolectomyBand key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'complete-denture') {
    return <CompleteDentureBand key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'ortho') {
    return <OrthoBrackets key={key} tooth={tooth} accent={accent} />;
  }
  if (tx.id === 'aligners') {
    return <OrthoAligners key={key} tooth={tooth} accent={accent} />;
  }
  return null;
}
```

- [ ] **Step 6: Run full test suite**

```
npm test
```

Expected: All existing tests pass. No new failures. Count: ≥16 green.

- [ ] **Step 7: Run lint**

```
npm run lint
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```
git add app/treatments.jsx
git commit -m "feat(app): refactor TreatmentLayer to registry dispatch; add bridge-span + partial-denture to catalog"
```

---

## Task 6: Update ShapeLab Catalog

**Files:**
- Modify: `lab/ShapeLab.jsx`

- [ ] **Step 1: Read current SHAPES in ShapeLab.jsx**

Open `lab/ShapeLab.jsx`. Locate the `SHAPES` constant (currently 5 entries: crown-molar-upper, arch-maxilla, arch-mandible, arch-sinus-right, arch-sinus-left).

- [ ] **Step 2: Add 3 new entries to SHAPES**

Add these three entries to the `SHAPES` object (the key is the display label; value is the dynamic import thunk):

```js
'bridge-span': () => import('../shapes-data/bridge-span.json'),
'partial-denture-upper': () => import('../shapes-data/partial-denture-upper.json'),
'partial-denture-lower': () => import('../shapes-data/partial-denture-lower.json'),
```

- [ ] **Step 3: Boot lab and verify shapes appear in selector**

```
npm run lab
```

Open browser to `http://localhost:5173/lab.html`. Open the shape selector dropdown. Confirm bridge-span, partial-denture-upper, partial-denture-lower appear. Select each one and verify a shape renders in the lab canvas.

- [ ] **Step 4: Commit**

```
git add lab/ShapeLab.jsx
git commit -m "feat(lab): add bridge-span, partial-denture-upper/lower to ShapeLab shape catalog"
```

---

## Task 7: E2E Smoke Tests

**Files:**
- Modify: `e2e/verify.spec.js`

- [ ] **Step 1: Read current verify.spec.js**

Open `e2e/verify.spec.js`. There are currently 4 tests. Add 2 new tests at the end.

- [ ] **Step 2: Add new Playwright tests**

```js
test('lab loads bridge-span shape via selector', async ({ page }) => {
  await page.goto('/lab.html');
  await page.waitForSelector('svg');
  const select = page.locator('select');
  await select.selectOption('bridge-span');
  await page.waitForTimeout(300);
  const paths = await page.locator('path').count();
  expect(paths).toBeGreaterThan(0);
});

test('lab loads partial-denture-upper shape via selector', async ({ page }) => {
  await page.goto('/lab.html');
  await page.waitForSelector('svg');
  const select = page.locator('select');
  await select.selectOption('partial-denture-upper');
  await page.waitForTimeout(300);
  const paths = await page.locator('path').count();
  expect(paths).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run E2E suite**

```
npm run e2e
```

Expected: 6 tests pass (4 original + 2 new).

- [ ] **Step 4: Commit**

```
git add e2e/verify.spec.js
git commit -m "test(e2e): smoke tests for bridge-span and partial-denture-upper in ShapeLab"
```

---

## Task 8: Update ROADMAP.md

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Mark Phase 4 complete**

In `ROADMAP.md`, update the Phase 4 block:

```markdown
## Phase 4 — Visual Registry + Overlay Categories
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-4-visual-registry.md`](docs/plans/2026-05-24-phase-4-visual-registry.md)

Split treatment overlays into tooth / span / arch / full-mouth categories with a formal registry (`core/visual-registry.js`). Authored bridge-span, partial-denture-upper, and partial-denture-lower shapes as normalized control-point JSON. `TreatmentLayer` dispatch now driven by registry category lookup. ShapeLab exposes all 8 shapes.
```

- [ ] **Step 2: Commit**

```
git add ROADMAP.md
git commit -m "docs(ROADMAP): mark Phase 4 complete"
```

---

## Self-Review

### 1. Spec Coverage

ROADMAP Phase 4 goal: "Split treatment overlays into tooth / span / arch / full-mouth categories with a formal registry. Author denture, bridge-span, and partial-denture shapes in Inkscape using the control-point workflow from Phase 1."

| Requirement | Task |
|-------------|------|
| Formal registry with categories | Task 1 — `core/visual-registry.js` |
| tooth / span / arch / full-mouth split | Task 1 — category field in registry; Task 5 — TreatmentLayer dispatch |
| bridge-span shape authored | Task 2 |
| partial-denture shapes (upper + lower) authored | Task 2 |
| denture shape — complete-denture already exists; partial-denture new | Task 2, 4, 5 |
| Control-point workflow (same as Phase 1) | Shapes authored as normalized JSON segments — same format as crown-molar-upper.json ✓ |
| ShapeLab exposes new shapes | Task 6 |

All requirements covered.

### 2. Placeholder Scan

- No "TBD", "TODO", or "implement later" phrases.
- All steps include complete code.
- Commands include expected output.
- No "similar to Task N" cross-references.

### 3. Type Consistency

- `shapeToPath(shape, w, h)` — signature used consistently across Tasks 2, 3, 4.
- `registryFor(id)` — defined in Task 1, imported in Task 5. Return value `entry?.category` used in Task 5 conditional — matches `category` field defined in Task 1.
- `BridgeSpanOverlay` props `{ teeth, biteY, accent }` — defined in Task 3, called in Task 5 with `{ teeth: spannedTeeth, biteY: spannedTeeth[0]?.biteY, accent }`.
- `PartialDentureOverlay` props `{ jaw, svgW, svgH, accent }` — defined in Task 4, called in Task 5.
- `SHAPES` in ShapeLab — dynamic import thunks, same pattern as existing entries.

All consistent.
