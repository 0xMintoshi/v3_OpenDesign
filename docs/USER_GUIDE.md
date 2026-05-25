# v3hero User Guide

## 1. What v3hero is

v3hero is an interactive SVG dental chart for treatment planning. Built on Vite + React 18, it renders a full-mouth FDI chart where treatments are applied per tooth, arch, or sinus zone and persist to Firestore. It is standalone right now; the next move is embedding it into the live Quotation App.

---

## 2. The two-layer architecture

Every chart renders two independent layers stacked on top of each other.

**Anatomy layer** — the foundation on which every treatment overlay renders. Teeth outlines (crowns + roots), arch curves, and sinus zones. All anatomy shape JSONs live in `shapes-data/anatomy/`. The positional reference frame — arch curve math, per-FDI dimensions, upper/lower scaling, angulation — stays parametric in `layout/teeth-data.jsx` and is not touched during cosmetic iterations. Future skin updates only touch the JSONs.

**Treatment layer** — SVG overlays rendered on top of anatomy when a treatment is active. Each entry in `core/treatment-registry.js` has a `scope` (tooth / sinus / arch / full-mouth) and an optional `shapeId`. Treatments with `shapeId: null` work as state + label only (e.g. Extraction, GBR). Treatments with a `shapeId` also draw an SVG overlay sourced from `shapes-data/treatments/`.

The ESLint boundary rule enforces this split: `layout/` (anatomy rendering) cannot import from `treatment-overlays/` or `app/`.

---

## 3. The 8 architectural pieces

### Treatment registry — `core/treatment-registry.js`
Pure data file; no React, no imports from other layers. Maps 16 treatment IDs to `{ scope, category, label, shapeId }`. This is the single source of truth for what treatments exist and what shape (if any) each draws.

The `scope` field defines the **unit of attachment** — at most one instance of that treatment per scope unit.

| Scope | Max instances per chart |
|-------|------------------------|
| `tooth` | up to 32 (one per FDI position) |
| `sinus` | 2 (left + right) |
| `arch` | 2 (upper + lower) |
| `full-mouth` | 1 |

| Scope | Examples |
|-------|---------|
| `tooth` | Extraction, Crown, Implant + Crown, GBR, Bridge |
| `sinus` | Complex Sinus Lift |
| `arch` | Alveolectomy, Complete Denture, Partial Denture |
| `full-mouth` | Brackets + Archwire, Clear Aligners |

> Partial denture and complete denture are `arch`-scoped (one appliance per arch — upper-complete + lower-partial is a valid combination), not `tooth` (which would mean 32 partials) or `full-mouth` (which would conflate upper and lower into one toggle).

### Shape data — `shapes-data/anatomy/` + `shapes-data/treatments/`

Normalized control-point JSONs. All coordinates are stored as fractions of the shape's bounding box (0–1), so shapes scale cleanly to any viewport.

**Anatomy set:**
- `shapes-data/anatomy/arch-maxilla.json` — upper jaw arch curve
- `shapes-data/anatomy/arch-mandible.json` — lower jaw arch curve
- `shapes-data/anatomy/arch-sinus-left.json` — left maxillary sinus zone
- `shapes-data/anatomy/arch-sinus-right.json` — right maxillary sinus zone
- `shapes-data/anatomy/teeth/` — tooth shape templates (8 files, two-path schema)

**Tooth template files** (`shapes-data/anatomy/teeth/`):

| File | Covers FDI positions |
|------|---------------------|
| `incisor.json` | 11, 12, 21, 22, 31, 32, 41, 42 |
| `canine.json` | 13, 23, 33, 43 |
| `premolar.json` | 14, 24, 34, 44 (single root) |
| `premolar1.json` | 15, 25, 35, 45 (bifurcated root) |
| `molarU.json` | 16, 17, 26, 27 (upper molar, 3 roots) |
| `molarL.json` | 36, 37, 46, 47 (lower molar, 2 roots) |
| `wisdomU.json` | 18, 28 (upper wisdom) |
| `wisdomL.json` | 38, 48 (lower wisdom) |

Each tooth template uses a **two-path schema**:
```json
{
  "id": "molarU",
  "label": "Upper Molar",
  "outline":  { "segments": [...] },
  "cervical": { "segments": [...] }
}
```
`outline` is the closed crown + root silhouette; `cervical` is an open arc separating crown from root. Left-side FDI positions (21–28, 31–38) are rendered via `transform="scale(-1,1)"` at runtime — there are no duplicate left-side JSONs. Editing `molarU.json` propagates to FDI 16, 17, 26, and 27 simultaneously (left side via mirror); this makes cosmetic re-skins tractable.

The parametric layout code (per-FDI dimensions, arch curve, angulation) stays in `layout/teeth-data.jsx` by design — this is the do-not-touch reference frame for positional correctness.

**Treatment set (7 files):**
- `crown-molar-upper.json`
- `crown-molar-lower.json`
- `crown-premolar-upper.json`
- `crown-incisor-upper.json`
- `bridge-span.json`
- `partial-denture-upper.json`
- `partial-denture-lower.json`

### Treatment overlays — `treatment-overlays/`

React components that render treatment SVG shapes on top of the anatomy layer. Key files: `CrownOverlay`, `BridgeSpanOverlay`, `PartialDentureOverlay`, `TreatmentLabels`. Each overlay receives normalized tooth/arch coordinates and scales its shape JSON into SVG path commands via `shapeToPath()`.

### Label + connector module — `core/label-connector.js`

Computes label positions and connector line endpoints for treatment annotations. Uses real ES module exports — no `window` side-channel.

### State separation

Two context files with distinct responsibilities:
- `core/chart-context.jsx` — clinical state (which treatments are applied to which teeth, Firestore sync)
- `core/ui-context.jsx` — ephemeral UI state (selected tooth, hover, panel open/closed)

Never put UI state into chart-context or clinical state into ui-context.

### Backend — `core/chart-service.js` + `core/firebase.js`

Firestore persistence. Tooth state is keyed by stable FDI string IDs (`"11"` through `"48"`). `chart-service.js` owns all read/write logic; components call service functions, not Firestore directly.

### Theming — `core/themes.js` + `core/use-clinic-theme.js`

Per-clinic runtime themes. `themes.js` defines the token map; `use-clinic-theme.js` applies the active theme to CSS variables on mount. Swap themes without touching component code.

### Quality bar (Phase 9)

- WCAG 2.1 AA color contrast on all interactive elements
- Bundle size metrics tracked
- Tablet layout (≥768px breakpoint)
- 111 Vitest unit tests + 30 Playwright e2e tests + 0 ESLint errors introduced

---

## 4. How to run it

```bash
npm install          # first time only

npm run dev          # app → http://localhost:5173
npm run lab          # Shape Lab → http://localhost:5173/lab.html
npm run test         # Vitest unit tests (run once)
npm run test:watch   # Vitest in watch mode
npm run e2e          # Playwright end-to-end tests
npm run lint         # ESLint — must be clean before committing
npm run trace -- <image-path>   # CLI trace wrapper (see §6)
```

All commands are defined in `package.json`. There is no separate build step needed for development.

---

## 5. The Shape Lab — step by step

The Lab (`npm run lab`) is a standalone shape editor for authoring and refining the control-point JSONs. It operates independently of the main chart.

### Opening and picking a shape

The dropdown at the top of the Lab groups shapes into three `<optgroup>` sections:

- **Base Anatomy — Arches & Sinuses** — the 4 arch/sinus shapes
- **Base Anatomy — Teeth (templates)** — the 8 tooth template shapes
- **Treatments** — the 7 treatment shapes

Select any shape to load it into the canvas.

### Canvas controls

| Action | How |
|--------|-----|
| Move a point | Drag any blue square (anchor) or circle (Bézier handle) |
| Add a point | Hover the shape edge → green phantom dot appears → click it |
| Delete a point | Right-click an anchor, **or** click an anchor to select it (turns gold) then press Delete / Backspace |
| Select anchor | Click it — turns gold; press Delete to remove |
| Undo | Ctrl+Z (or Cmd+Z on Mac) — reverts the last committed change |

### Composite anatomy view (arch/sinus shapes)

When editing one of the 4 arch/sinus shapes, the other 3 anatomy shapes are rendered as faint ghost paths in the same canvas. Only the selected shape's control points are interactive. This lets you see how the shapes relate spatially while editing.

### Tooth template editing

When a tooth template is selected:
- A **path selector** (Outline / Cervical tabs) appears in the right panel
- **Outline** (default) — edits the closed crown + root silhouette
- **Cervical** — edits the open arc separating crown from root
- The inactive path is shown as a faint dashed ghost so you can see both paths while editing either one
- Switching tabs preserves both paths — the full shape (both paths) is downloaded together

### Anatomy context behind treatment overlays

When a treatment shape is selected, relevant anatomy shapes appear as faint ghosts behind the editable overlay:

| Treatment shape | Ghost context |
|----|----|
| `crown-*` | 1 tooth outline (unchanged from before) |
| `bridge-span` | 3 adjacent tooth outlines |
| `partial-denture-upper` | Maxilla arch + all upper teeth |
| `partial-denture-lower` | Mandible arch + all lower teeth |

### Right panel

Shows the live shape JSON. Three buttons:
- **Mirror right →** — mirrors the right half of the shape onto the left half; one Ctrl-Z undoes it
- **Copy JSON** — copies to clipboard
- **Download JSON** — saves `<shape-id>.json` to your downloads folder

There is no auto-save. Changes only persist when you download and replace the source file (see §6).

---

## 6. Practical workflows

### Clinical use (day-to-day)

```
npm run dev
```

Open `http://localhost:5173`, select a patient, apply treatments. Firestore auto-persists on every change. No manual save step.

### Refining an existing shape (80% case)

1. `npm run lab`
2. Pick the shape from the dropdown
3. Drag control points until it looks right
4. **Download JSON**
5. Replace the source file in `shapes-data/anatomy/` or `shapes-data/treatments/` with the downloaded file
6. Restart `npm run lab` and re-select the shape to confirm it loads correctly

> **Tooth templates propagate to all FDI positions that use them.** Editing `molarU.json` and downloading updates positions 16, 17, 26, and 27 simultaneously (left side via SVG mirror at render time). This makes cosmetic re-skins tractable — you edit one file, not four.

### New shape from an image

1. Prepare your reference image (PNG/JPG, ideally ≤1024px)
2. Open Import Image → choose Clean trace or AI-assisted mode per §5
3. Trace, confirm, hand-refine in the canvas
4. Download JSON → place in `shapes-data/treatments/<new-id>.json`
5. Add the shape to `TREATMENT_SHAPES` in `lab/ShapeLab.jsx` (or the appropriate anatomy catalog if it's a base shape)
6. Add the treatment entry to `core/treatment-registry.js` with the new `shapeId`

### New shape from Inkscape

```bash
# Draw shape in Inkscape at the target pixel dimensions (e.g. 38×88 for a crown)
# File → Save Plain SVG → shape.svg

node scripts/normalize-svg.mjs shape.svg <W> <H> <shape-id>
# → writes shapes-data/treatments/<shape-id>.json

npm run lab   # load it to verify and fine-tune
```

The `normalize-svg.mjs` script reads the first `<path>` element, converts absolute coordinates to normalized fractions of the W×H bounding box, and writes the JSON format the Lab and overlays expect.

### New treatment type (no shape yet)

Add to the registry first with `shapeId: null`:

```js
// core/treatment-registry.js
'my-new-treatment': { scope: 'tooth', category: 'tooth', label: 'My Treatment', shapeId: null },
```

Verify the treatment applies correctly in the chart (state + label only). Author the shape separately once the workflow is confirmed, then update `shapeId`.

### CLI trace wrapper

```bash
npm run trace -- path/to/image.png
```

Runs `scripts/trace-image.mjs` — a Node.js wrapper around potrace-wasm that traces an image from the command line and prints the normalized segment JSON to stdout. Useful for batch processing reference images outside the browser.

---

## 7. What's not yet wired

- **Not integrated into the live Quotation App.** v3hero is standalone. Embedding it is the next major milestone.
- **Part B3 deferred** — tooth rendering in the chart still uses parametric generators in `layout/teeth-data.jsx`. The tooth template JSONs in `shapes-data/anatomy/teeth/` are Lab-authorable and ready; wiring them into the chart render path is the next architectural step when a skin-swap feature is needed.
