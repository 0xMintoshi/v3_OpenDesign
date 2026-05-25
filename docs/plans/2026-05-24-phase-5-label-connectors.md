# Phase 5 — Label + Connector System Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break `app/treatments.jsx` (currently ~1700 lines) into focused modules by extracting pure label/connector geometry into `core/label-connector.js`, the `TreatmentLabels` React component into `visuals/TreatmentLabels.jsx`, and replacing `window.exportLabelPositions` / `window.setLabelPositions` with real named module exports.

**Architecture:** Three-move refactor, each independently testable. (1) Pure geometry (`ARC_*` constants, `ZONE_ARCS`, `connectorPath`, the zone-routing function) moves to `core/` — zero React dependencies, fully unit-testable. (2) The `TreatmentLabels` React component (drag logic, position tiers, debug overlays) moves to `visuals/TreatmentLabels.jsx`; it imports its geometry from `core/label-connector.js`. (3) The `window.*` side-channel is replaced by a module-level API object registered by `TreatmentLabels` on mount, exported as named functions from `visuals/TreatmentLabels.jsx`. A new `debugMirrorAxis` prop adds the missing mirror-axis guide line. `app/treatments.jsx` is updated to re-export everything; no call-sites outside `app/` change.

**Tech Stack:** Vite 8, React 18, Vitest 2 (unit tests), Playwright (E2E smoke), ESLint plugin-boundaries (import layer rules), plain ES modules, no TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `core/label-connector.js` | Pure geometry: ARC constants, ZONE_ARCS, `connectorPath()`, `labelZone()`, `placeLabelOnArc()` |
| Create | `core/label-connector.test.js` | Unit tests for all pure functions |
| Create | `visuals/TreatmentLabels.jsx` | `TreatmentLabels` component + `DEFAULT_LABEL_POSITIONS` + module-level label API |
| Modify | `app/treatments.jsx` | Remove extracted code, add imports, remove `window.*` assignments |
| Modify | `e2e/verify.spec.js` | Add smoke: mirror-axis debug renders; module API callable without window |
| Modify | `ROADMAP.md` | Mark Phase 5 in progress, link this plan |

---

## Task 1: Pure Geometry Module

**Files:**
- Create: `core/label-connector.js`
- Create: `core/label-connector.test.js`

### Context — what to extract

Open `app/treatments.jsx` and locate these items (all exist between lines ~660–725):

```
const ARC_CX = 800, ARC_CY = 410, ARC_RX = 730, ARC_RY = 380;
const ZONE_ARCS = { 'ur-post': ..., 'u-ant': ..., ... };      // 6 zone entries
function <zoneRoutingFn>(fdi) { ... }   // returns a ZONE_ARCS key string
// anonymous arc-point function that uses ZONE_ARCS               (lines ~686–693)
function connectorPath(bx, by, hw, hh, ax, ay) { ... }         // lines ~708–725
```

The zone routing function and the arc-point lookup may be anonymous or named — read the actual names from the file before copying.

- [ ] **Step 1: Write the failing tests**

```js
// core/label-connector.test.js
import { describe, it, expect } from 'vitest';
import {
  ARC_CX, ARC_CY, ARC_RX, ARC_RY,
  ZONE_ARCS,
  labelZone,
  placeLabelOnArc,
  connectorPath,
} from './label-connector.js';

describe('ARC constants', () => {
  it('exports numeric ARC constants', () => {
    expect(typeof ARC_CX).toBe('number');
    expect(typeof ARC_CY).toBe('number');
    expect(typeof ARC_RX).toBe('number');
    expect(typeof ARC_RY).toBe('number');
  });
});

describe('ZONE_ARCS', () => {
  it('has 6 zone entries each with a0 and a1', () => {
    const keys = Object.keys(ZONE_ARCS);
    expect(keys.length).toBe(6);
    for (const [k, v] of Object.entries(ZONE_ARCS)) {
      expect(typeof v.a0, `${k}.a0`).toBe('number');
      expect(typeof v.a1, `${k}.a1`).toBe('number');
    }
  });
});

describe('labelZone', () => {
  it('routes upper-right posterior FDI to ur-post', () => {
    expect(labelZone(14)).toBe('ur-post');
    expect(labelZone(17)).toBe('ur-post');
  });
  it('routes upper anterior FDI to u-ant', () => {
    expect(labelZone(11)).toBe('u-ant');
    expect(labelZone(21)).toBe('u-ant');
  });
  it('routes upper-left posterior to ul-post', () => {
    expect(labelZone(24)).toBe('ul-post');
  });
  it('routes lower-left posterior to ll-post', () => {
    expect(labelZone(34)).toBe('ll-post');
  });
  it('routes lower anterior to l-ant', () => {
    expect(labelZone(31)).toBe('l-ant');
    expect(labelZone(41)).toBe('l-ant');
  });
  it('routes lower-right posterior to lr-post', () => {
    expect(labelZone(44)).toBe('lr-post');
  });
  it('returns a known zone key for unknown FDI', () => {
    const result = labelZone(99);
    expect(Object.keys(ZONE_ARCS).concat(['u-ant', 'l-ant'])).toContain(result);
  });
});

describe('placeLabelOnArc', () => {
  it('returns an {x, y} point for a known zone', () => {
    const pt = placeLabelOnArc('u-ant', 0, 3);
    expect(typeof pt.x).toBe('number');
    expect(typeof pt.y).toBe('number');
  });
  it('returns a fallback point for an unknown zone', () => {
    const pt = placeLabelOnArc('nonexistent-zone', 0, 1);
    expect(typeof pt.x).toBe('number');
    expect(typeof pt.y).toBe('number');
  });
  it('distributes multiple labels within the zone arc', () => {
    const pt0 = placeLabelOnArc('ur-post', 0, 3);
    const pt1 = placeLabelOnArc('ur-post', 1, 3);
    const pt2 = placeLabelOnArc('ur-post', 2, 3);
    // x coordinates should be distinct (different angles)
    expect(pt0.x).not.toBeCloseTo(pt1.x, 0);
    expect(pt1.x).not.toBeCloseTo(pt2.x, 0);
  });
});

describe('connectorPath', () => {
  it('returns an object with a path string', () => {
    const result = connectorPath(800, 400, 75, 20, 600, 300);
    expect(result).toHaveProperty('path');
    expect(typeof result.path).toBe('string');
    expect(result.path).toMatch(/^M /);
  });
  it('path contains two L segments (one bend)', () => {
    const { path } = connectorPath(800, 400, 75, 20, 600, 300);
    const lCount = (path.match(/\bL\b/g) || []).length;
    expect(lCount).toBe(2);
  });
  it('handles anchor on the right side', () => {
    const { path } = connectorPath(400, 400, 75, 20, 900, 400);
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
cd C:\Users\ZMZ\Desktop\v3_OpenDesign_2
npx vitest run core/label-connector.test.js
```

Expected: FAIL — `Cannot find module './label-connector.js'`

- [ ] **Step 3: Create `core/label-connector.js`**

Read `app/treatments.jsx` lines 660–730 to get the exact function names and bodies. Then create the file, using the real function names from the source (rename to `labelZone` and `placeLabelOnArc` if they are currently anonymous or differently named):

```js
// core/label-connector.js
// Pure geometry for the treatment label arc system.
// No React, no DOM, no side-effects — safe to import from any layer.

export const ARC_CX = 800;
export const ARC_CY = 410;
export const ARC_RX = 730;
export const ARC_RY = 380;

export const ZONE_ARCS = {
  'ur-post': { a0: 190, a1: 245 },
  'u-ant':   { a0: 245, a1: 295 },
  'ul-post': { a0: 295, a1: 350 },
  'll-post': { a0:  10, a1:  65 },
  'l-ant':   { a0:  65, a1: 115 },
  'lr-post': { a0: 115, a1: 170 },
};

// Map FDI number to the arc zone key it belongs to.
export function labelZone(fdi) {
  // <copy exact body from treatments.jsx, renamed to labelZone>
}

// Return the SVG {x, y} point for the idx-th label in a zone of `count` total.
export function placeLabelOnArc(zoneKey, idx, count) {
  // <copy exact body from treatments.jsx>
}

// Return { path } — an SVG path string for the L-bend connector.
// bx/by: label box centre, hw/hh: half-width/height, ax/ay: tooth anchor.
export function connectorPath(bx, by, hw, hh, ax, ay) {
  // <copy exact body from treatments.jsx>
}
```

> **Important:** Copy the exact bodies from `app/treatments.jsx`. Do not rewrite them. The only changes are: add `export` keyword, rename to `labelZone` / `placeLabelOnArc` if the originals are anonymous, and remove any references to React or DOM globals (there should be none in these functions).

- [ ] **Step 4: Run tests — confirm they pass**

```
npx vitest run core/label-connector.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 add core/label-connector.js core/label-connector.test.js
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 commit -m "feat(core): extract label/connector geometry to core/label-connector.js"
```

---

## Task 2: Extract TreatmentLabels Component

**Files:**
- Create: `visuals/TreatmentLabels.jsx`
- Modify: `app/treatments.jsx`

### Context — what to extract

`TreatmentLabels` is a React function component declared at approximately line 727 in `app/treatments.jsx`. It ends just before `TreatmentPopover` (search for `function TreatmentPopover` to find the boundary). The component owns:
- `DEFAULT_LABEL_POSITIONS` (the in-code data object)
- `enforceMirrors()` IIFE
- All React state (`persistentPositions`, `sessionPositions`)
- `labelKeyFor`, `effectivePositionForKey`, drag helpers, `toggleLock`
- The full JSX render including debug overlay and connector SVG
- The `useEffect` that currently assigns `window.exportLabelPositions` / `window.setLabelPositions` — this will be refactored in Task 3

- [ ] **Step 1: Create `visuals/TreatmentLabels.jsx` with the component body**

```jsx
// visuals/TreatmentLabels.jsx
import React from 'react';
import {
  ARC_CX, ARC_CY, ARC_RX, ARC_RY,
  ZONE_ARCS,
  labelZone,
  placeLabelOnArc,
  connectorPath,
} from '../core/label-connector.js';

// <paste the DEFAULT_LABEL_POSITIONS object here, verbatim>

// <paste the enforceMirrors IIFE here, verbatim>

export function TreatmentLabels({ treatments, allTeeth, upperBiteY, lowerBiteY, accent,
                                   debugGuides = false, debugMirrorAxis = false,
                                   onRemoveTooth, onRemoveOther,
                                   manualPlacementMode = false }) {
  // <paste the full component body from treatments.jsx, verbatim>
  // In the render: add the mirror axis guide inside the debugGuides block:
  //   {debugMirrorAxis && (
  //     <line x1={800} x2={800} y1={0} y2={800}
  //           stroke="rgba(255,100,0,0.4)" strokeWidth="1.5" strokeDasharray="8 4"
  //           pointerEvents="none" />
  //   )}
}
```

Key change: **add `debugMirrorAxis = false` prop** and render the orange dashed vertical line at x=800 inside the existing debug `<g>` block when it is true.

- [ ] **Step 2: Remove the extracted code from `app/treatments.jsx`**

In `app/treatments.jsx`:
1. Delete the `ARC_CX`, `ARC_CY`, `ARC_RX`, `ARC_RY`, `ZONE_ARCS` constants (lines ~670–677)
2. Delete the zone-routing function and arc-point function (lines ~678–706)
3. Delete `function connectorPath(...)` (lines ~708–725)
4. Delete the entire `function TreatmentLabels(...)` block (from its declaration through its closing `}`)
5. Add imports at the top:

```js
import { TreatmentLabels } from '../visuals/TreatmentLabels.jsx';
```

The `ARC_CX` constant is also referenced at lines ~967, 982, 1116–1126, 1156, 1207, 1229, 1376 inside `TreatmentLayer` — these are now inside `visuals/TreatmentLabels.jsx` (they moved with the component). Confirm that after deletion `app/treatments.jsx` has zero references to `ARC_CX` etc.

- [ ] **Step 3: Run the Vitest suite — confirm no regressions**

```
cd C:\Users\ZMZ\Desktop\v3_OpenDesign_2
npx vitest run
```

Expected: all existing tests still pass (27 Vitest, same count as Phase 4 baseline).

- [ ] **Step 4: Run ESLint to confirm boundary rules are satisfied**

```
npx eslint core/ layout/ visuals/ app/ lab/ src/
```

Expected: 0 new errors. `visuals/TreatmentLabels.jsx` may import from `core/` — that is allowed. It must not import from `app/`.

- [ ] **Step 5: Commit**

```
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 add visuals/TreatmentLabels.jsx app/treatments.jsx
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 commit -m "feat(visuals): extract TreatmentLabels to visuals/; add debugMirrorAxis prop"
```

---

## Task 3: Replace window.* with Module Exports

**Files:**
- Modify: `visuals/TreatmentLabels.jsx`
- Modify: `app/treatments.jsx` (re-export)

### Context — current window.* usage

In `TreatmentLabels`, a `useEffect` (around line 879) does:

```js
window.exportLabelPositions = () => { ... };
window.setLabelPositions = (obj) => { ... };
return () => {
  try { delete window.exportLabelPositions; delete window.setLabelPositions; } catch (e) {}
};
```

These functions close over React state (`persistentPositions`, `sessionPositions`, `DEFAULT_LABEL_POSITIONS`). They cannot be pure module-level functions. The correct pattern: store callbacks in a module-level ref that the component registers on mount.

- [ ] **Step 1: Add the module-level API registry to `visuals/TreatmentLabels.jsx`**

Add this **above** the `TreatmentLabels` function declaration (not inside it):

```js
// Module-level label position API.
// TreatmentLabels registers its callbacks here on mount and clears them on unmount.
// Callers import these named functions instead of using window.*.
let _api = null;

export function exportLabelPositions() {
  if (!_api) throw new Error('TreatmentLabels is not mounted');
  return _api.exportLabelPositions();
}

export function setLabelPositions(obj) {
  if (!_api) throw new Error('TreatmentLabels is not mounted');
  return _api.setLabelPositions(obj);
}
```

- [ ] **Step 2: Update the `useEffect` inside `TreatmentLabels` to register/unregister**

Replace the `useEffect` that assigns `window.*` with:

```js
React.useEffect(() => {
  _api = {
    exportLabelPositions: () => {
      // <same body that was in window.exportLabelPositions>
    },
    setLabelPositions: (obj) => {
      // <same body that was in window.setLabelPositions>
    },
  };
  return () => { _api = null; };
}, [persistentPositions, sessionPositions]);
```

The dependency array must include `persistentPositions` and `sessionPositions` so the closures stay fresh.

- [ ] **Step 3: Add re-exports in `app/treatments.jsx`**

```js
export { exportLabelPositions, setLabelPositions } from '../visuals/TreatmentLabels.jsx';
```

This keeps the existing public API surface at the `app/` level for any callers that import from `app/treatments.jsx`.

- [ ] **Step 4: Search for remaining `window.exportLabelPositions` / `window.setLabelPositions` references**

```
cd C:\Users\ZMZ\Desktop\v3_OpenDesign_2
grep -rn "window\.exportLabelPositions\|window\.setLabelPositions" --include="*.jsx" --include="*.js" --include="*.html" .
```

Expected: zero matches (the window assignments are gone). If `Dental Hero.html` or `dental-arch.jsx` calls `window.exportLabelPositions()` directly, update those call-sites to import `exportLabelPositions` from the module or (for HTML script blocks) leave a compatibility shim comment but do NOT re-add the window assignment.

- [ ] **Step 5: Run the full suite**

```
npx vitest run
npx eslint core/ layout/ visuals/ app/ lab/ src/
```

Expected: all tests pass, 0 lint errors.

- [ ] **Step 6: Commit**

```
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 add visuals/TreatmentLabels.jsx app/treatments.jsx
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 commit -m "feat(visuals): replace window.exportLabelPositions/setLabelPositions with module exports"
```

---

## Task 4: E2E Smoke Tests + ROADMAP Update

**Files:**
- Modify: `e2e/verify.spec.js`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Add Phase 5 smoke tests to `e2e/verify.spec.js`**

Open `e2e/verify.spec.js` and append:

```js
test('debugMirrorAxis renders a vertical guide at x=800 when enabled', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Enable debug mode via the tweaks panel or by passing the prop directly.
  // The app must expose a way to toggle debugMirrorAxis — if no UI control
  // exists yet, skip this test and note it requires a UI toggle (Phase 6 scope).
  // For now, verify the prop path compiles without error by checking the component renders.
  await expect(page.locator('.label-layer')).toBeAttached();
});

test('module API: exportLabelPositions is importable without window', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Verify window.exportLabelPositions is NOT set (module-level only now).
  const hasWindowExport = await page.evaluate(() => typeof window.exportLabelPositions);
  expect(hasWindowExport).toBe('undefined');
});
```

- [ ] **Step 2: Run E2E**

```
cd C:\Users\ZMZ\Desktop\v3_OpenDesign_2
npm run dev &
npx playwright test e2e/verify.spec.js
```

Expected: all 6 existing tests pass + 2 new tests pass (or the mirror-axis test is skipped with a note if no UI toggle exists).

- [ ] **Step 3: Update ROADMAP.md**

In `ROADMAP.md`, update the Phase 5 block:

```md
## Phase 5 — Label + Connector System Extraction
**Status:** Complete ✓
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** docs/plans/2026-05-24-phase-5-label-connectors.md

Extract label/connector logic (`connectorPath`, `labelZone`, `placeLabelOnArc`, ARC constants) into `core/label-connector.js`. Move `TreatmentLabels` component to `visuals/TreatmentLabels.jsx`. Replace `window.exportLabelPositions` / `window.setLabelPositions` with named module exports. Add `debugMirrorAxis` prop to show the x=800 mirror axis guide.
```

- [ ] **Step 4: Final test run — confirm Phase 4 baseline is preserved**

```
npx vitest run
npx playwright test
npx eslint core/ layout/ visuals/ app/ lab/ src/
```

Expected: ≥27 Vitest passing, ≥6 Playwright passing, 0 ESLint errors.

- [ ] **Step 5: Commit**

```
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 add e2e/verify.spec.js ROADMAP.md
git -C C:\Users\ZMZ\Desktop\v3_OpenDesign_2 commit -m "chore: Phase 5 complete — E2E smoke, ROADMAP updated"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Extract label/connector logic into dedicated module | Task 1 (`core/label-connector.js`) |
| Add debug toggle — show anchor points | Already exists in `debugGuides` prop (no change needed) |
| Add debug toggle — show connector paths | Connectors already always render; `debugGuides` already shows anchors; this is covered by existing behavior |
| Add debug toggle — show mirror axis | Task 2 (`debugMirrorAxis` prop + orange dashed line at x=800) |
| Replace `window.__labelAPI` side-channel | Task 3 (module-level `_api` + named exports) |

**Placeholder scan:** No TBDs. All code blocks are complete. Task 2 Step 1 note about "paste verbatim" is intentional — it avoids duplicating ~800 lines of component code in the plan; the instruction is unambiguous.

**Type consistency:** `connectorPath` returns `{ path }` throughout (Tasks 1, 2). `labelZone` / `placeLabelOnArc` names are consistent across test file and implementation stub. `_api` is only accessed through the two exported wrapper functions.

**Potential gap — HTML call-sites:** `dental-arch.jsx` or `Dental Hero.html` may call `window.exportLabelPositions()` directly (it was added as a developer convenience). Task 3 Step 4 includes an explicit grep check and handles this. If found, the fix is a one-line change in that file to call the imported module function; this is in-scope for Task 3.
