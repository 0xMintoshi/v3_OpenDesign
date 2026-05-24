# Phase 2 — Generalize Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the repo into a clean layered directory structure (`core/ layout/ visuals/ app/`), enforce import boundaries with ESLint, and populate `shapes-data/` with crown shapes for the remaining key tooth types.

**Architecture:** Four layers with strict one-way dependency flow: `core` (pure math/utilities) → `layout` (tooth geometry, anatomy) → `visuals` (React rendering components) → `app` (full app: dental-arch, treatments, tweaks). ESLint `eslint-plugin-boundaries` enforces this at the module level. The `lab/` and `shapes-data/` directories are unchanged in role; only import paths update as their dependencies move.

**Tech Stack:** React 18, Vite 5, Vitest 2, ESLint 9, eslint-plugin-boundaries 5.x, plain JSX/JS (TypeScript explicitly deferred — see Task 1).

---

## TypeScript Decision

**Decision: Skip for Phase 2.** The migration + boundary tooling is already a significant surface area. TS would require touching every file twice (move + annotate). Deferred to a dedicated phase after Phase 4 when the shape registry stabilizes. Revisit when `shapes-data/` JSON types are stable enough to model.

---

## File Map

| From | To | Action |
|------|----|--------|
| `visuals/shapes.jsx` | `core/shapes.js` + `visuals/shapes.jsx` (re-export shim) | Split: pure fn → core; shim stays for backwards-compat |
| `visuals/shapes.test.js` | `core/shapes.test.js` | Move + update import |
| `teeth-data.jsx` | `layout/teeth-data.jsx` | Move |
| `anatomy.jsx` | `layout/anatomy.jsx` | Move |
| `treatments.jsx` (CrownOverlay only) | `visuals/CrownOverlay.jsx` | Extract component |
| `dental-arch.jsx` | `app/dental-arch.jsx` | Move |
| `treatments.jsx` | `app/treatments.jsx` | Move (post-extraction) |
| `tweaks-panel.jsx` | `app/tweaks-panel.jsx` | Move |
| `src/main.jsx` | `src/main.jsx` | Update import path only |
| `.eslintrc.js` (new) | `.eslintrc.js` | Create with boundary rules |
| `shapes-data/crown-molar-lower.json` (new) | — | Add |
| `shapes-data/crown-premolar-upper.json` (new) | — | Add |
| `shapes-data/crown-incisor-upper.json` (new) | — | Add |

**Import boundaries enforced:**
- `core` → no imports from `layout`, `visuals`, `app`, `lab`
- `layout` → may import from `core` only
- `visuals` → may import from `core`, `layout`, `shapes-data`
- `app` → may import from `core`, `layout`, `visuals`, `shapes-data`
- `lab` → may import from `core`, `layout`, `visuals`, `shapes-data` (not `app`)

---

## Task 1: Document TypeScript decision + update ROADMAP

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update Phase 2 entry in ROADMAP.md to note TS decision**

In `ROADMAP.md`, replace the Phase 2 block:

```markdown
## Phase 2 — Generalize Structure
**Status:** In progress
**Start:** 2026-05-24 | **Completion:** —
**Plan:** [`docs/plans/2026-05-24-phase-2-generalize-structure.md`](docs/plans/2026-05-24-phase-2-generalize-structure.md)

Reshape repo into `core/ layout/ visuals/ app/ shapes-data/ lab/ legacy/`. Add ESLint import-boundary rule (`core` + `layout` may not import from `visuals` + `app`). Migrate remaining tooth crown shapes.

**TypeScript decision:** Deferred beyond Phase 2. Surface area too large alongside the directory restructure. Revisit after Phase 4 when shape registry stabilizes.
```

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md docs/plans/2026-05-24-phase-2-generalize-structure.md
git commit -m "docs: open Phase 2 — generalize structure"
```

---

## Task 2: Create `core/shapes.js` (extract pure utility from visuals/)

**Files:**
- Create: `core/shapes.js`
- Modify: `visuals/shapes.jsx` (becomes re-export shim)
- Create: `core/shapes.test.js` (moved from `visuals/shapes.test.js`)
- Delete: `visuals/shapes.test.js`

- [ ] **Step 1: Write the failing test at the new path**

Create `core/shapes.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { shapeToPath } from './shapes.js';

describe('shapeToPath', () => {
  it('renders M segment', () => {
    const shape = { segments: [{ type: 'M', x: 0.5, y: 0 }] };
    expect(shapeToPath(shape, 100, 200)).toBe('M 50.00 0.00');
  });

  it('renders C segment', () => {
    const shape = {
      segments: [
        { type: 'C', x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4, x: 0.5, y: 0.6 },
      ],
    };
    expect(shapeToPath(shape, 100, 100)).toBe('C 10.00 20.00 30.00 40.00 50.00 60.00');
  });

  it('renders Q segment', () => {
    const shape = { segments: [{ type: 'Q', x1: 0.5, y1: -0.47, x: -0.42, y: -0.4 }] };
    expect(shapeToPath(shape, 38, 88)).toBe('Q 19.00 -41.36 -15.96 -35.20');
  });

  it('renders Z segment', () => {
    const shape = { segments: [{ type: 'Z' }] };
    expect(shapeToPath(shape, 38, 88)).toBe('Z');
  });

  it('builds a round-trip path for the molar crown JSON', async () => {
    const json = await import('../shapes-data/crown-molar-upper.json');
    const d = shapeToPath(json.default ?? json, 38, 88);
    expect(d).toContain('M');
    expect(d).toContain('Z');
  });
});
```

- [ ] **Step 2: Run test — expect fail (module not found)**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
npx vitest run core/shapes.test.js
```

Expected: FAIL — `Cannot find module './shapes.js'`

- [ ] **Step 3: Create `core/shapes.js`**

```js
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

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run core/shapes.test.js
```

Expected: 5 tests PASS.

- [ ] **Step 5: Turn `visuals/shapes.jsx` into a re-export shim**

Replace the entire content of `visuals/shapes.jsx`:

```js
// Re-export from core — kept for backwards compatibility with existing importers.
export { shapeToPath } from '../core/shapes.js';
```

- [ ] **Step 6: Delete old test file and run full test suite**

```bash
rm visuals/shapes.test.js
npx vitest run
```

Expected: all tests pass (3 e2e + the new core unit tests).

- [ ] **Step 7: Commit**

```bash
git add core/shapes.js core/shapes.test.js visuals/shapes.jsx
git rm visuals/shapes.test.js
git commit -m "refactor: extract shapeToPath to core/shapes.js; visuals/shapes is now a shim"
```

---

## Task 3: Create `layout/` — move teeth-data and anatomy

**Files:**
- Create: `layout/teeth-data.jsx` (moved from root)
- Create: `layout/anatomy.jsx` (moved from root)
- Modify: `dental-arch.jsx` (update import paths)
- Modify: `lab/ShapeLab.jsx` (update import path)
- Delete: `teeth-data.jsx`, `anatomy.jsx` (root copies)

- [ ] **Step 1: Create `layout/` directory and move files**

```bash
mkdir layout
cp teeth-data.jsx layout/teeth-data.jsx
cp anatomy.jsx layout/anatomy.jsx
```

- [ ] **Step 2: Update imports in `dental-arch.jsx`**

In `dental-arch.jsx` line 2–3, change:

```js
import { TOOTH_TYPES, QUADRANT, UPPER, LOWER, layoutArch, toothPaths } from './teeth-data.jsx';
import { maxillaPath, mandiblePath, nasalCavityPath, nasalSeptumPath, maxillarySinusPath, idnCanalPath, idnSchematicPath, mentalForamenCenters, ramusDetailPath } from './anatomy.jsx';
```

to:

```js
import { TOOTH_TYPES, QUADRANT, UPPER, LOWER, layoutArch, toothPaths } from './layout/teeth-data.jsx';
import { maxillaPath, mandiblePath, nasalCavityPath, nasalSeptumPath, maxillarySinusPath, idnCanalPath, idnSchematicPath, mentalForamenCenters, ramusDetailPath } from './layout/anatomy.jsx';
```

- [ ] **Step 3: Update import in `lab/ShapeLab.jsx`**

In `lab/ShapeLab.jsx` line 2, change:

```js
import { toothPaths } from '../teeth-data.jsx';
```

to:

```js
import { toothPaths } from '../layout/teeth-data.jsx';
```

- [ ] **Step 4: Verify dev server still loads**

```bash
npx vitest run
```

And navigate to `http://localhost:5176/` and `http://localhost:5176/lab.html` — both should render without console errors.

- [ ] **Step 5: Delete root copies**

```bash
git rm teeth-data.jsx anatomy.jsx
```

- [ ] **Step 6: Commit**

```bash
git add layout/teeth-data.jsx layout/anatomy.jsx dental-arch.jsx lab/ShapeLab.jsx
git commit -m "refactor: move teeth-data and anatomy to layout/"
```

---

## Task 4: Extract `CrownOverlay` to `visuals/CrownOverlay.jsx`

**Files:**
- Create: `visuals/CrownOverlay.jsx`
- Modify: `treatments.jsx` (remove CrownOverlay definition + its imports; add import from visuals)

The `CrownOverlay` function (currently lines 254–267 in `treatments.jsx`) uses `shapeToPath` and `crownMolarUpper`. It has no dependency on anything in `treatments.jsx` itself — safe to extract.

- [ ] **Step 1: Create `visuals/CrownOverlay.jsx`**

```jsx
import React from 'react';
import crownMolarUpper from '../shapes-data/crown-molar-upper.json';
import { shapeToPath } from './shapes.jsx';

export function CrownOverlay({ tooth, biteY, accent }) {
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

- [ ] **Step 2: Update `treatments.jsx` — remove the extracted code, add import**

At the top of `treatments.jsx`, replace:

```js
import crownMolarUpper from './shapes-data/crown-molar-upper.json';
import { shapeToPath } from './visuals/shapes.jsx';
```

with:

```js
import { CrownOverlay } from './visuals/CrownOverlay.jsx';
```

Then delete the `CrownOverlay` function body (lines 254–267).

- [ ] **Step 3: Run full test suite and verify browser**

```bash
npx vitest run
```

Navigate to the main app, add a `crown` treatment — the overlay should still render correctly.

- [ ] **Step 4: Commit**

```bash
git add visuals/CrownOverlay.jsx treatments.jsx
git commit -m "refactor: extract CrownOverlay to visuals/CrownOverlay.jsx"
```

---

## Task 5: Move app files to `app/`

**Files:**
- Create: `app/dental-arch.jsx` (moved from root)
- Create: `app/treatments.jsx` (moved from root)
- Create: `app/tweaks-panel.jsx` (moved from root)
- Modify: `src/main.jsx`
- Delete: root copies of the three files

The internal imports between the three app files use relative `./` paths, which will change when they're co-located in `app/`. The imports to `layout/`, `visuals/`, and `shapes-data/` shift by one `../` level.

- [ ] **Step 1: Copy files to `app/`**

```bash
mkdir app
cp dental-arch.jsx app/dental-arch.jsx
cp treatments.jsx app/treatments.jsx
cp tweaks-panel.jsx app/tweaks-panel.jsx
```

- [ ] **Step 2: Fix imports in `app/dental-arch.jsx`**

The current imports in `dental-arch.jsx` that need path updates (one `../` added):

| Old import | New import |
|------------|------------|
| `'./layout/teeth-data.jsx'` | `'../layout/teeth-data.jsx'` |
| `'./layout/anatomy.jsx'` | `'../layout/anatomy.jsx'` |
| `'./treatments.jsx'` | `'./treatments.jsx'` (same dir — no change) |
| `'./tweaks-panel.jsx'` | `'./tweaks-panel.jsx'` (same dir — no change) |

- [ ] **Step 3: Fix imports in `app/treatments.jsx`**

| Old import | New import |
|------------|------------|
| `'./visuals/CrownOverlay.jsx'` | `'../visuals/CrownOverlay.jsx'` |

- [ ] **Step 4: Fix imports in `app/tweaks-panel.jsx`**

Scan `tweaks-panel.jsx` for any relative imports and prefix with `../` as needed. (If it has no project imports besides React, no change needed.)

- [ ] **Step 5: Update `src/main.jsx`**

Change:

```js
import DentalHero from '../dental-arch.jsx';
```

to:

```js
import DentalHero from '../app/dental-arch.jsx';
```

- [ ] **Step 6: Delete root copies**

```bash
git rm dental-arch.jsx treatments.jsx tweaks-panel.jsx
```

- [ ] **Step 7: Run full test suite and verify both pages in browser**

```bash
npx vitest run
```

- Main app at `/` — full interaction: Stage 1 → Stage 2, add crown treatment, verify overlay.
- Lab at `/lab.html` — drag a control point, export JSON.

- [ ] **Step 8: Commit**

```bash
git add app/dental-arch.jsx app/treatments.jsx app/tweaks-panel.jsx src/main.jsx
git commit -m "refactor: move dental-arch, treatments, tweaks-panel to app/"
```

---

## Task 6: Set up ESLint with import boundary rules

**Files:**
- Create: `.eslintrc.js`
- Modify: `package.json` (add lint script + devDeps)

- [ ] **Step 1: Install ESLint and boundaries plugin**

```bash
npm install --save-dev eslint@^9 eslint-plugin-boundaries@^5 @eslint/js
```

- [ ] **Step 2: Create `.eslintrc.js`**

```js
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';

export default [
  js.configs.recommended,
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core',        pattern: 'core/**' },
        { type: 'layout',      pattern: 'layout/**' },
        { type: 'visuals',     pattern: 'visuals/**' },
        { type: 'app',         pattern: 'app/**' },
        { type: 'lab',         pattern: 'lab/**' },
        { type: 'shapes-data', pattern: 'shapes-data/**' },
      ],
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'core',        allow: [] },
          { from: 'layout',      allow: ['core'] },
          { from: 'visuals',     allow: ['core', 'layout', 'shapes-data'] },
          { from: 'app',         allow: ['core', 'layout', 'visuals', 'shapes-data'] },
          { from: 'lab',         allow: ['core', 'layout', 'visuals', 'shapes-data'] },
          { from: 'shapes-data', allow: [] },
        ],
      }],
    },
  },
];
```

- [ ] **Step 3: Add lint script to `package.json`**

In the `"scripts"` section, add:

```json
"lint": "eslint 'core/**/*.js' 'layout/**/*.jsx' 'visuals/**/*.jsx' 'app/**/*.jsx' 'lab/**/*.jsx'"
```

- [ ] **Step 4: Run lint and fix any violations**

```bash
npm run lint
```

Expected: 0 errors. If any boundary violations appear, fix the offending import (wrong direction). All known violations were eliminated by the moves in Tasks 2–5.

- [ ] **Step 5: Commit**

```bash
git add .eslintrc.js package.json package-lock.json
git commit -m "chore: add ESLint with import boundary rules (core→layout→visuals→app)"
```

---

## Task 7: Add crown shape JSONs for remaining tooth types

**Files:**
- Create: `shapes-data/crown-molar-lower.json`
- Create: `shapes-data/crown-premolar-upper.json`
- Create: `shapes-data/crown-incisor-upper.json`

Crown shape format: normalized coords where `x = rawX/w`, `y = rawY/h`. Origin at bite edge (y=0). Crown extends from y=0 (occlusal) to y≈−0.40 (cervical). All shapes are symmetric on the x-axis.

Tooth dimensions (from `layout/teeth-data.jsx`):
- Lower molar (`molarL`): w=36, h=86
- Upper premolar (`premolar1`): w=26, h=84
- Upper incisor/central (`central`): w=28, h=88

- [ ] **Step 1: Create `shapes-data/crown-molar-lower.json`**

Lower molars are slightly wider than their height ratio; cervical at y≈−0.38. Same elliptical crown language as upper molar.

```json
{
  "id": "crown-molar-lower",
  "label": "Lower Molar Crown Overlay",
  "version": 1,
  "toothType": "molarL",
  "note": "Cervical line at y ≈ -0.38. x = rawX/w, y = rawY/h.",
  "segments": [
    { "type": "M",  "x":  0.47, "y":  0.00 },
    { "type": "C",  "x1": 0.51, "y1": -0.14, "x2": 0.51, "y2": -0.32, "x":  0.41, "y": -0.38 },
    { "type": "Q",  "x1": 0.00, "y1": -0.44, "x": -0.41, "y": -0.38 },
    { "type": "C",  "x1":-0.51, "y1": -0.32, "x2":-0.51, "y2": -0.14, "x": -0.47, "y":  0.00 },
    { "type": "Q",  "x1": 0.00, "y1":  0.06, "x":  0.47, "y":  0.00 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 2: Create `shapes-data/crown-premolar-upper.json`**

Upper premolars are narrower, oval. Cervical at y≈−0.38.

```json
{
  "id": "crown-premolar-upper",
  "label": "Upper Premolar Crown Overlay",
  "version": 1,
  "toothType": "premolar1",
  "note": "Cervical line at y ≈ -0.38. x = rawX/w, y = rawY/h.",
  "segments": [
    { "type": "M",  "x":  0.44, "y":  0.00 },
    { "type": "C",  "x1": 0.48, "y1": -0.12, "x2": 0.48, "y2": -0.30, "x":  0.38, "y": -0.38 },
    { "type": "Q",  "x1": 0.00, "y1": -0.44, "x": -0.38, "y": -0.38 },
    { "type": "C",  "x1":-0.48, "y1": -0.30, "x2":-0.48, "y2": -0.12, "x": -0.44, "y":  0.00 },
    { "type": "Q",  "x1": 0.00, "y1":  0.06, "x":  0.44, "y":  0.00 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 3: Create `shapes-data/crown-incisor-upper.json`**

Upper central incisors: wider labiolingually than mesiodistally, flat occlusal edge, squared-off crown. Cervical at y≈−0.35.

```json
{
  "id": "crown-incisor-upper",
  "label": "Upper Incisor Crown Overlay",
  "version": 1,
  "toothType": "central",
  "note": "Cervical line at y ≈ -0.35. x = rawX/w, y = rawY/h. Flat occlusal edge.",
  "segments": [
    { "type": "M",  "x": -0.44, "y":  0.00 },
    { "type": "L",  "x":  0.44, "y":  0.00 },
    { "type": "C",  "x1": 0.48, "y1": -0.10, "x2": 0.48, "y2": -0.28, "x":  0.40, "y": -0.35 },
    { "type": "Q",  "x1": 0.00, "y1": -0.40, "x": -0.40, "y": -0.35 },
    { "type": "C",  "x1":-0.48, "y1": -0.28, "x2":-0.48, "y2": -0.10, "x": -0.44, "y":  0.00 },
    { "type": "Z" }
  ]
}
```

- [ ] **Step 4: Load each shape in the lab to verify rendering**

In `lab/ShapeLab.jsx`, temporarily change `initialShape` to each new JSON file one at a time and verify the shape renders cleanly in the browser at `http://localhost:5176/lab.html`. Look for: closed outline, reasonable proportions within the tooth ghost, no inverted segments. Revert to `crown-molar-upper.json` after verification.

- [ ] **Step 5: Commit**

```bash
git add shapes-data/crown-molar-lower.json shapes-data/crown-premolar-upper.json shapes-data/crown-incisor-upper.json
git commit -m "feat: add crown shape JSONs for lower molar, upper premolar, upper incisor"
```

---

## Task 8: Final verification + update ROADMAP

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run the full Playwright e2e suite**

```bash
npx playwright test --reporter=line
```

Expected: 3 tests PASS.

- [ ] **Step 2: Run Vitest unit tests**

```bash
npx vitest run
```

Expected: all pass (5 core/shapes tests + any vitest tests from scripts/).

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 errors.

- [ ] **Step 4: Manual browser check**

- `/` — main app: Stage 1 interactions, add crown treatment, verify CrownOverlay renders.
- `/lab.html` — drag a control point, JSON panel updates, export works.

- [ ] **Step 5: Mark Phase 2 complete in ROADMAP.md**

Update the Phase 2 block:

```markdown
## Phase 2 — Generalize Structure
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-2-generalize-structure.md`](docs/plans/2026-05-24-phase-2-generalize-structure.md)
```

- [ ] **Step 6: Final commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark Phase 2 complete"
```

---

## Self-Review

**Spec coverage check against ROADMAP Phase 2:**
- ✅ "Reshape repo into `core/ layout/ visuals/ app/ shapes-data/ lab/ legacy/`" — Tasks 2–5. `legacy/` not created (nothing yet requires backwards-compat shims; will create on demand).
- ✅ "Add ESLint import-boundary rule" — Task 6.
- ✅ "Migrate remaining tooth crown shapes" — Task 7 adds lower molar, upper premolar, upper incisor.
- ✅ "TypeScript decision deferred to this phase" — Documented in Task 1 as explicitly skipped.

**Placeholder scan:** No TBDs, no "handle edge cases" vagueness, all code blocks complete.

**Type consistency:** `shapeToPath(shape, w, h)` signature consistent across Task 2 (core/shapes.js definition), Task 4 (visuals/CrownOverlay.jsx usage), Task 7 (lab verification).
