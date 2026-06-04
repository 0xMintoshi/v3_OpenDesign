# v3hero — Claude Code Context

Interactive SVG dental chart. Vite + React 18 + Vitest + Playwright.

## Commands

```bash
npm run dev    # app on localhost
npm run lab    # ShapeLab editor
npm run e2e    # Playwright tests
npm run lint   # ESLint
```

## Key Files

| File | Purpose |
|------|---------|
| `app/dental-arch.jsx` | **Main chart component** — all desktop tooth visual changes go here |
| `layout/tablet-chart.jsx` | Tablet/narrow screen only — do NOT edit for desktop changes |
| `layout/teeth-data.jsx` | **JS source of truth** for all tooth outlines; `toothPaths()` returns `{ outline, cervical, crown, root }` |
| `core/arch-math.js` | Shared arch helpers: `chRatioFor`, `scallopRL`, `scallopLR`, `ARCH_LAYOUT`, `upperBiteY`, `lowerBiteY`, `CERVICAL`, `crownDepth()` |
| `core/tooth-split.js` | Splits outline at cervical boundary via bisection + de Casteljau |
| `core/treatment-registry.js` | Treatment type definitions |
| `treatment-overlays/` | Per-treatment overlay components |
| `shapes-data/anatomy/` | Arch + teeth template JSONs (ShapeLab-only) |
| `shapes-data/treatments/` | Treatment shape JSONs |

## Architecture Rules

- `lab/` cannot import from `app/` — boundary is enforced
- Both `app/` and `lab/` import shared helpers from `core/arch-math.js`
- Anatomy structures (arches, sinuses, IDN) edit as control-point JSONs in ShapeLab — Tweaks panel is display-toggle only, never geometry parameters

## Tooth Outlines — Source of Truth

**`layout/teeth-data.jsx` is the source of truth**, not the JSON files.

- `shapes-data/anatomy/teeth/*.json` — ShapeLab-only; app ignores hand-edited cervicals
- After editing in ShapeLab: transplant `outline.segments` into the relevant `*Outline()` function in `teeth-data.jsx`, then run `node scripts/extract-tooth-shapes.mjs` to regenerate JSON for ShapeLab parity
- `toothPaths()` is memoised and returns `{ outline, cervical, crown, root }` — destructure it; never `.map()` the return value

## Locked Conventions

### bonePath() — upper arch orientation
- Sub-path 1 ends at SVG-left / patient's R (near `first`)
- Sub-path 2 starts at SVG-right / patient's L (near `last`)
- Upper bridge uses `scallopLR` (first→last), **NOT** `scallopRL`
- Wrong direction → two horizontal sweeps at cervical level
- Arch→scallop join: use plain `L first.x first.y` — Q with mismatched-y control bulges; mandible Q is ok

### Denture — never re-add `layers` key
- `complete-denture-upper.json` must NOT have a `layers` key
- The overlay checks `Array.isArray(shape.layers)` BEFORE `renderMode`, so any `layers` key forces the stroked/double-line branch in both app and ShapeLab
- Upper is fill-only `filled-line-art`, matching lower — keep it that way

### Mirror workflow
- `mirrorSegments.js` is **deleted** — do NOT suggest re-adding it
- To mirror a shape: edit one side in ShapeLab → download JSON → paste it and ask Claude to mirror in code

### Crown transplant technique
- To apply a ShapeLab-edited crown across tooth types: transplant into JS keeping cervical neck anchors **symbolic** (`${nw*0.50}`, `${ny}`) — never hardcode the neck coordinate

### Straddle fix in tooth-split.js
- Straddle check: `(p0.y − cervicalY) * (p3.y − cervicalY) ≤ 0 && p0.y !== p3.y`
- Strict `<`/`>` fails for premolar/molar outlines where the neck anchor sits exactly at `cervicalY`

### Lab-parity drift (known, harmless)
- Tooth JSONs in `shapes-data/anatomy/teeth/` carry a legacy floating cervical arc; app derives a corrected one from `tooth-split.js`
- Do NOT attempt to re-sync the tooth JSON `cervical` paths — app ignores them

### t.id vs t.fdi
- `t.id` is a string (`"upper-18"`)
- `t.fdi` is an integer (`18`)
- Always use `t.fdi` for FDI number comparisons

### Overlay transforms
- Any overlay positioned over a tooth must apply `toothYAdjust()` from `core/marquee-select.js` or it drifts on incisors/canines

### Treatment z-order (paint order in dental-arch.jsx)
- BoneGraftLayer → Tooth groups → TreatmentLayer
- BoneGraftLayer must render **before** Tooth groups, not inside TreatmentLayer

### Label clamping
- `clampCy` must NOT apply to out-of-viewBox labels (sinus, arch, lower-back-row labels live outside 0–800); clamping freezes them silently

## ShapeLab Workflow

- `H` key or "Hide Dots" button — hides control points while keeping outline visible
- Dots scale inversely with zoom (`r / zoom`) so they stay constant visual size
- ShapeLab → app pipeline: edit JSON in ShapeLab → save → app picks up on HMR

## IDN Format

Open path (no `Z`), fields: `archType: "idn"`, `side: "right"/"left"`, `foramen: {x, y}` at last point (normalized 0–1 to 1600×800 viewBox). Mirror: `x_left = 1 - x_right`. Foramen circle derives from `segments[]`, not the hardcoded `foramen` property.

## Denture Simplification Script

`scripts/simplify-shape.mjs` — RDP-thin → fit cubics → winding check (shoelace; reverse if flipped) → emit M/C/Z. Winding is critical — nonzero SVG fill breaks silently if reversed. `CompleteDentureOverlay.jsx` uses `fillRule={shape.fillRule ?? 'evenodd'}`.

## Per-Tooth Vertical Shift

`app/dental-arch.jsx` `Tooth` component — `incisorShift` and `canineShift` control vertical position per jaw. `toothBaseTransform` accepts optional `yAdjust` param.

## ClearAligner Smoothing

`smoothClosedRing()` uses quadratic B-spline only — not Catmull-Rom (tension is a footgun, spikes every knot).

## Full Project Context

Read memory file `project_quotation_app_chart_redesign.md` before starting any session.
