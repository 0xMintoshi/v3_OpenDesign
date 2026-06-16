# Clear Aligner Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a clear aligner tray overlay on the dental arch — one continuous merged outline hugging all crown shapes, plus a faint frosted fill inside.

**Architecture:** Arch-scoped overlay component (`ClearAlignerOverlay.jsx`) that iterates over all teeth in a jaw, renders each crown path, and uses an SVG `feMorphology dilate` filter to merge adjacent shapes into a single continuous silhouette. Two render passes: (1) per-tooth faint fill for the frosted interior, (2) filtered group for the merged outer outline ring.

**Tech Stack:** React 18, SVG filters (`feMorphology`, `feComposite`, `feFlood`), existing `toothPaths()` from `layout/teeth-data.jsx`, existing transform pattern from `CrownOverlay.jsx`.

---

## Visual Design Intent

A clear aligner tray covers all crowns across the arch as one transparent plastic shell:
- **Outer outline**: A single continuous line following crown anatomy per tooth, ~4–5px outside each crown edge. Adjacent teeth are close enough that the dilated shapes merge, eliminating interproximal notches in the outline.
- **Frosted fill**: Very faint semi-transparent fill (opacity ~0.08–0.10) inside all crowns — the "frosted plastic" look.
- **Colour**: Default to a cool light-blue tone (`#b8d0ea`) or `accent` prop from the treatment system.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `treatment-overlays/ClearAlignerOverlay.jsx` | **Create** | SVG filter + per-tooth crown rendering |
| `treatment-overlays/ClearAlignerOverlay.test.jsx` | **Create** | Vitest unit tests |
| `core/treatment-registry.js` | **Modify** | Change `ortho-aligners` scope from `full-mouth` → `arch` |
| `app/treatments.jsx` | **Modify** | Wire `ClearAlignerOverlay` for `ortho-aligners` treatment |

---

## Task 1: Change `ortho-aligners` scope in registry

**Files:**
- Modify: `core/treatment-registry.js`

- [ ] **Step 1: Open and inspect the current `ortho-aligners` entry**

```bash
grep -n "ortho-aligners" C:/Users/ZMZ/Desktop/v3_OpenDesign_2/core/treatment-registry.js
```

- [ ] **Step 2: Change scope from `full-mouth` to `arch`**

Find the line that looks like:
```js
'ortho-aligners': { scope: 'full-mouth', category: 'full-mouth', label: 'Clear Aligners', shapeId: null },
```

Replace with:
```js
'ortho-aligners': { scope: 'arch', category: 'arch', label: 'Clear Aligners', shapeId: null },
```

- [ ] **Step 3: Verify no other references break**

```bash
grep -rn "full-mouth" C:/Users/ZMZ/Desktop/v3_OpenDesign_2/core/ C:/Users/ZMZ/Desktop/v3_OpenDesign_2/app/
```

Expected: No remaining `full-mouth` references (or only UI label strings, not scope checks).

- [ ] **Step 4: Commit**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
git add core/treatment-registry.js
git commit -m "feat: change ortho-aligners scope to arch"
```

---

## Task 2: Create `ClearAlignerOverlay.jsx`

**Files:**
- Create: `treatment-overlays/ClearAlignerOverlay.jsx`

- [ ] **Step 1: Create the component file**

```jsx
import { toothPaths } from '../layout/teeth-data.jsx';

const DILATE_RADIUS = 5;     // px — bridges inter-tooth gap (~3.5px) + ~1.5px outer border
const FILL_OPACITY  = 0.09;  // frosted interior opacity

function toothYAdjust(tooth) {
  const { type, h, jaw } = tooth;
  const incisorShift = type === 'incisor' ? h * 0.03 : 0;
  const canineShift  = type === 'canine'  ? h * -0.02 : 0;
  const delta = incisorShift + canineShift;
  return jaw === 'upper' ? -delta : delta;
}

export function ClearAlignerOverlay({ jaw, teeth, biteY, accent = '#b8d0ea' }) {
  if (!teeth || teeth.length === 0) return null;

  const filterId = `aligner-merge-${jaw}`;
  const flipY    = jaw === 'upper' ? 1 : -1;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <filter
          id={filterId}
          x="-3%"  y="-8%"
          width="106%" height="120%"
          colorInterpolationFilters="sRGB"
        >
          {/* Expand each crown outward to bridge inter-tooth gaps */}
          <feMorphology in="SourceGraphic" operator="dilate" radius={DILATE_RADIUS} result="dilated"/>
          {/* Subtract original shapes → outer rim only */}
          <feComposite in="dilated" in2="SourceGraphic" operator="out" result="rim"/>
          {/* Paint the rim with the accent colour */}
          <feFlood floodColor={accent} floodOpacity="1" result="col"/>
          <feComposite in="col" in2="rim" operator="in"/>
        </filter>
      </defs>

      {/* Layer 1: Frosted fill — faint transparent fill per crown */}
      {teeth.map(tooth => {
        const paths    = toothPaths(tooth.type, tooth.w, tooth.h);
        const yAdjust  = toothYAdjust(tooth);
        const transform = `translate(${tooth.cx}, ${biteY + (tooth.yOffset ?? 0) * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tooth.tilt ?? 0})`;
        return (
          <g key={`fill-${tooth.id}`} transform={transform}>
            <path d={paths.crown} fill={accent} fillOpacity={FILL_OPACITY} stroke="none"/>
          </g>
        );
      })}

      {/* Layer 2: Merged outline — all crowns filled opaque, filter extracts outer rim */}
      <g filter={`url(#${filterId})`}>
        {teeth.map(tooth => {
          const paths    = toothPaths(tooth.type, tooth.w, tooth.h);
          const yAdjust  = toothYAdjust(tooth);
          const transform = `translate(${tooth.cx}, ${biteY + (tooth.yOffset ?? 0) * flipY + yAdjust}) scale(1, ${flipY}) rotate(${tooth.tilt ?? 0})`;
          return (
            <g key={`outline-${tooth.id}`} transform={transform}>
              <path d={paths.crown} fill="black" stroke="none"/>
            </g>
          );
        })}
      </g>
    </g>
  );
}
```

- [ ] **Step 2: Verify it parses (no build errors)**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
npm run build 2>&1 | tail -20
```

Expected: No errors. (If dev server is running, HMR will update live instead.)

---

## Task 3: Write unit tests for `ClearAlignerOverlay`

**Files:**
- Create: `treatment-overlays/ClearAlignerOverlay.test.jsx`

- [ ] **Step 1: Create test file**

```jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ClearAlignerOverlay } from './ClearAlignerOverlay.jsx';

const MOCK_TEETH = [
  { id: 11, type: 'incisor',  jaw: 'upper', cx: 750, w: 44, h: 90, yOffset: 0, tilt: 0 },
  { id: 12, type: 'incisor',  jaw: 'upper', cx: 806, w: 44, h: 90, yOffset: 0, tilt: 0 },
  { id: 13, type: 'canine',   jaw: 'upper', cx: 862, w: 50, h: 96, yOffset: 1, tilt: -0.5 },
];

describe('ClearAlignerOverlay', () => {
  it('renders nothing when teeth array is empty', () => {
    const { container } = render(
      <svg><ClearAlignerOverlay jaw="upper" teeth={[]} biteY={385}/></svg>
    );
    expect(container.querySelector('g')).toBeNull();
  });

  it('renders an feMorphology filter element', () => {
    const { container } = render(
      <svg><ClearAlignerOverlay jaw="upper" teeth={MOCK_TEETH} biteY={385}/></svg>
    );
    const morph = container.querySelector('feMorphology');
    expect(morph).not.toBeNull();
    expect(morph.getAttribute('operator')).toBe('dilate');
  });

  it('uses jaw-specific filter id to avoid collision between upper and lower', () => {
    const { container: upper } = render(
      <svg><ClearAlignerOverlay jaw="upper" teeth={MOCK_TEETH} biteY={385}/></svg>
    );
    const { container: lower } = render(
      <svg><ClearAlignerOverlay jaw="lower" teeth={MOCK_TEETH} biteY={435}/></svg>
    );
    const upperId = upper.querySelector('filter').getAttribute('id');
    const lowerId = lower.querySelector('filter').getAttribute('id');
    expect(upperId).not.toBe(lowerId);
  });

  it('renders two crown paths per tooth (fill + outline layer)', () => {
    const { container } = render(
      <svg><ClearAlignerOverlay jaw="upper" teeth={MOCK_TEETH} biteY={385}/></svg>
    );
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(MOCK_TEETH.length * 2);
  });

  it('fill paths use low fillOpacity', () => {
    const { container } = render(
      <svg><ClearAlignerOverlay jaw="upper" teeth={MOCK_TEETH} biteY={385}/></svg>
    );
    const fillPaths = Array.from(container.querySelectorAll('path'))
      .filter(p => parseFloat(p.getAttribute('fill-opacity') ?? '1') < 0.5);
    expect(fillPaths.length).toBe(MOCK_TEETH.length);
  });

  it('accepts a custom accent colour', () => {
    const { container } = render(
      <svg><ClearAlignerOverlay jaw="upper" teeth={MOCK_TEETH} biteY={385} accent="#ff0000"/></svg>
    );
    const flood = container.querySelector('feFlood');
    expect(flood.getAttribute('flood-color')).toBe('#ff0000');
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
npx vitest run treatment-overlays/ClearAlignerOverlay.test.jsx
```

Expected: 6 passing tests.

- [ ] **Step 3: Commit**

```bash
git add treatment-overlays/ClearAlignerOverlay.jsx treatment-overlays/ClearAlignerOverlay.test.jsx
git commit -m "feat: add ClearAlignerOverlay with SVG feMorphology merged outline"
```

---

## Task 4: Wire into `app/treatments.jsx`

**Files:**
- Modify: `app/treatments.jsx`

- [ ] **Step 1: Confirm that `teeth` and `biteY` are in scope at the arch-overlay render site**

`CompleteDentureOverlay` and `PartialDentureOverlay` use pre-drawn JSON shapes and receive only `{ jaw, accent }` — they never needed per-tooth layout data. `ClearAlignerOverlay` is the first arch overlay that does. Before writing any wiring code, read the file to establish what is available:

```bash
cat -n C:/Users/ZMZ/Desktop/v3_OpenDesign_2/app/treatments.jsx
```

Look for:
- Where the component is called from (is it called once per jaw, passing a `teeth` array? Or is it called once for the whole mouth?)
- Whether `teeth` (the positioned layout array from `layoutArch()`) and `biteY` are already props or locals at the arch-overlay render site
- If not, trace back to the caller — likely `dental-arch.jsx` — and confirm those values are available to thread through

**Two possible outcomes:**

**A) `teeth` and `biteY` are already in scope** (most likely — the arch was just rendered):
→ Proceed directly to Step 2.

**B) `teeth` or `biteY` are not in scope at the arch-overlay site**:
→ Add them as props to whatever component wraps the arch overlays, passing them down from the call site in `dental-arch.jsx`. Add the prop to the component signature and the JSX call site before Step 2.

- [ ] **Step 2: Import `ClearAlignerOverlay`**

Near the top of `treatments.jsx`, alongside the other overlay imports:
```jsx
import { ClearAlignerOverlay } from '../treatment-overlays/ClearAlignerOverlay.jsx';
```

- [ ] **Step 3: Add the render case**

Find where `complete-denture` or `partial-denture-upper` is rendered (the `arch`-scope block). Add a parallel case for `ortho-aligners`, using the variable names confirmed in Step 1:

```jsx
{/* Clear Aligners */}
{archTreatments.includes('ortho-aligners') && (
  <ClearAlignerOverlay
    jaw={jaw}
    teeth={teeth}
    biteY={biteY}
    accent={ACCENT_COLOURS['ortho-aligners'] ?? '#b8d0ea'}
  />
)}
```

> **Note:** Substitute the real variable names you found in Step 1 for `archTreatments`, `jaw`, `teeth`, `biteY`, `ACCENT_COLOURS`.

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
npx vitest run
```

Expected: All prior tests pass + 6 new aligner tests pass. Zero new failures.

- [ ] **Step 5: Commit**

```bash
git add app/treatments.jsx
git commit -m "feat: wire ClearAlignerOverlay into treatments render"
```

---

## Task 5: Visual verification in browser

- [ ] **Step 1: Start dev server**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
npm run dev
```

Open `http://localhost:5173` in browser.

- [ ] **Step 2: Apply clear aligner treatment to the upper arch**

In the app UI, select all upper teeth (or use the arch-select gesture), apply the `Clear Aligners` treatment.

- [ ] **Step 3: Verify visuals**

Check all of the following:
- [ ] A single continuous outline hugs the outer edge of each crown
- [ ] The outline bridges inter-tooth gaps (no individual tooth silhouettes visible in the interproximal spaces)
- [ ] The frosted fill gives a faint tray-over-teeth appearance
- [ ] No double outlines or per-tooth isolated outlines visible
- [ ] The lower arch works identically (apply to lower, same merged look)
- [ ] The outline does not bleed below the cervical boundary of the crowns

- [ ] **Step 4: Tune constants if needed**

In `ClearAlignerOverlay.jsx`, the tuning constants are at the top of the file:
- `DILATE_RADIUS` — increase if gaps between teeth still show a notch; decrease if outline looks too thick
- `FILL_OPACITY` — increase for more visible frosted look; decrease for more subtle

- [ ] **Step 5: Final commit**

```bash
git add treatment-overlays/ClearAlignerOverlay.jsx
git commit -m "chore: tune aligner overlay constants after visual review"
```

---

## Verification Summary

| Check | How |
|-------|-----|
| Tests pass | `npx vitest run` — 6 new tests green, 0 regressions |
| Merged outline visible | Apply to upper arch in dev browser — single contiguous line |
| Frosted fill visible | Faint tint inside crown area in browser |
| No regression on crown/bridge overlays | Apply crown and bridge treatments — unchanged |
| Lower arch parity | Apply to lower — same visual quality |
