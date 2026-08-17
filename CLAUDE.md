# v3hero — Claude Code Context

Interactive SVG dental chart. Vite + React 18 + Vitest + Playwright.

## Commands

```bash
npm run dev    # app on localhost
npm run lab    # ShapeLab editor
npm run e2e    # Playwright tests
npm run lint   # ESLint
npm run build  # rebuild dist/ — REQUIRED for the v3 app iframe to see source edits
npm run stroke-table   # print the 8 overlay stroke/geometry tunables, read from source
```

**Stroke tuning:** use the `chart-stroke-tuning` skill. Never hand-maintain a table of these
values — `npm run stroke-table` reads them from the named constants, and `?seed=cb`
(`core/dev-seed.js`) puts all eight on one screen without needing Firestore.

**Build gotcha:** the parent v3 app embeds this chart via `<iframe src="./chart/dist/...">` (built bundle), NOT the source. Running the v3 app's `npm run serve` does **not** rebuild the chart — edits to `teeth-data.jsx`/`dental-arch.jsx` won't appear until you run `npm run build` here (or `npm run build -- --watch` in a side terminal). Then hard-refresh the browser (Ctrl+Shift+R) — the iframe caches the old bundle. `dist/` is gitignored, so a fresh clone must build before the iframe works.

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
| `core/conflict-rules.js` | Treatment-ID groupings — **single source of truth for `EXTRACTION_IDS`**; chart-context + treatments import it |
| `core/dev-seed.js` | Dev-only `?seed=` scenes for visual tuning; inert in the built bundle |
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
- Maxilla (two sub-paths): mirror each sub-path independently; keep the `M(L-cervical)` endpoint y at cervical level (≈ same y as sub-path 1's R-cervical end) or a diagonal bridge appears between scallop and L-side outline. Mandible is a single sub-path, no jump anchor.

### Crown transplant technique
- To apply a ShapeLab-edited crown across tooth types: transplant into JS keeping cervical neck anchors **symbolic** (`${nw*0.50}`, `${ny}`) — never hardcode the neck coordinate

### Straddle fix in tooth-split.js
- Straddle check: `(p0.y − cervicalY) * (p3.y − cervicalY) ≤ 0 && p0.y !== p3.y`
- Strict `<`/`>` fails for premolar/molar outlines where the neck anchor sits exactly at `cervicalY`

### Lab-parity drift (known, harmless)
- Tooth JSONs in `shapes-data/anatomy/teeth/` carry a legacy floating cervical arc; app derives a corrected one from `tooth-split.js`
- Do NOT attempt to re-sync the tooth JSON `cervical` paths — app ignores them

### Bridge connector geometry
- Vertical anchor: use the `IBS_CONTACT_HEIGHT` fraction (0=gingival, 1=occlusal), never `proximalExtreme`'s y — on implant crowns the widest point is the gingival flare, so anchoring there puts the connector in the gingival third. `proximalExtreme` is valid for **x only** (lateral extent). Regular crown: `contactY = -crownDepth * (1 - IBS_CONTACT_HEIGHT)`; implant crown: `contactY = -crownH * IBS_CONTACT_HEIGHT` (same constant = same anatomical position).
- Between teeth with different `yOffset`/`tilt`, per-tooth global y-mapping gives `pA.y ≠ pB.y` → slanted connector. Average to a shared `midY = (pA.y + pB.y) / 2` and apply delta symmetrically for all four corners.

### Proportional interproximal gap
- `ARCH_LAYOUT.gapFrac = 0.08` (fraction of tooth width) in `core/arch-math.js`, not absolute pixels — a fixed gap reads ~2× wider between narrow incisors than wide molars. `layoutArch` computes `gaps[i] = w * gapFrac` and accounts for it in `totalW`. ShapeLab passes explicit `gap` (gapFrac stays null there).

### tablet-chart.jsx yOffset
- Translate y is `55 + yOffset` — **unsigned**, same direction for both rows; `scale(1, flipY)` alone handles tooth orientation. Negating yOffset for the lower row moves molarU-style crowns to the upper half of the lower SVG (teeth look upside down).

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

### Extraction treatment conventions
- `autoMissing` array in `dental-arch.jsx` `handleApplyTreatment` controls which treatment IDs mark the tooth as `'missing'` (dashed) on apply — add any new extraction-type IDs here
- `EXTRACTION_IDS = ['extraction', 'simple-surgical-extraction', 'complex-surgical-extraction']` is re-declared inline in `TreatmentLayer`; if adding more extraction types, update both this and `autoMissing`
- `EXTRACTION_GROUP` in `core/conflict-rules.js` enforces mutual exclusion (only one extraction type per tooth)

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

## Footer Dock (app/dock.jsx)

- Stage 1/2 footers are a fixed, floating glass dock (`.dock` in `styles.css`), not in-flow — bottom-right corner, right-anchored at `right:40px` (same margin as `PanelDock`'s `DOCK_RIGHT`), growing leftward. Height (`--dock-item-size` + padding) is tuned to `69px` to match the parent app's `.app-header` (`--header-h` in `v3/css/main.css`/theme files) — verify against the live parent, not the theme file alone (see gotcha below). Sits `12px` above `PanelDock` (bottom-right Tweaks/Treatments pills, `bottom:86px`) with no overlap; `.stage` no longer reserves extra bottom padding for it (dock is cornered, not centered) — padding is symmetric (`70px 40px` desktop / `56px 16px` phone).
- All dock items are transparent-bg with an ink-colored glyph (`.dock-item.primary` neutralized in CSS — no accent fill on Stage-nav/Summary buttons anymore). `.dock-item.active` still gets a faint accent tint for the edentulous toggle-on state.
- `ArchIcon` (edentulous glyph) is a plain arc only — no gum line, no teeth ticks. Upper/lower Edentulous and Restore states render the same arc; state is conveyed by the `active` tint + tooltip label only.
- Icon-only buttons, `aria-label` is the accessible name — tests must use `getByRole('button', { name: '<label>' })`, never text/class selectors.
- **Gotcha — verify layout numbers against the live app, not grep alone.** Both `.brand`/`StagePill` (chart) and the theme file's `--header-h:69px` looked authoritative from source but are dead/conditional: `.brand`/`<StagePill>` are never mounted in any JSX; `--header-h:69px` only applies when `data-theme="titan-editorial"` is set on `<html>`, which is true in `v3/index.html` (69px, confirmed live) but NOT in the root `Quotation App/index.html` (v2 build, unrelated — computes to a plain `:root` fallback of 52px there). When tuning against a parent-app number, load `v3/index.html` specifically and read `getBoundingClientRect()`/computed `--header-h`, don't trust a theme file or a different app entry point.
- `--dock-bg` token lives in both `flatTheme()`/`darkTheme()` (`dental-arch.jsx`) and the CSS `:root` fallback; CSS reads it as `var(--dock-bg, var(--card-bg))`. Not yet bridged through the parent app's `CHART_TOKEN_MAP` (`v3/js/main.js`) — add it there if the dock ever needs to react to a parent theme switch beyond the flat/dark toggle.
- z-index: dock = 40, popover = 50/60, `PanelDock` (bottom-right Tweaks/Treatments toggle, same corner now) = `2147483645`. Dock sits below `PanelDock` with a fixed 12px gap by design, not by z-index — if either's height/position changes, recheck the gap math (dock `bottom` + dock `height` must stay ≤ `PanelDock`'s `bottom` minus the desired gap).
- `SelectionActionBar` in `dental-arch.jsx` is defined but never rendered/tested anywhere — dead code as of 2026-07-19, not a dock collision risk. Don't assume it's live without checking.

## Full Project Context

Read memory file `project_quotation_app_chart_redesign.md` before starting any session.
