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
| `layout/teeth-data.jsx` | **JS source of truth** for all tooth outlines; `toothPaths()` returns `{ outline, cervical, crown, root, canal }` |
| `layout/canal-data.js` | **Source of truth for root canal shapes** — normalized path strings, one per tooth type |
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
- `toothPaths()` is memoised and returns `{ outline, cervical, crown, root, canal }` — destructure it; never `.map()` the return value

### Root canals
- Geometry lives in `layout/canal-data.js` as normalized strings, **not** in `teeth-data.jsx` — canals are hand-refined in ShapeLab, which speaks normalized coordinates. Only `M`/`L`/`C`/`Z` are accepted; the scaler throws on anything else.
- Multi-canal teeth are several closed subpaths in one string. Root only: `CrownOverlay` paints over the crown, and root canal plus crown is the commonest pairing.
- Round trip: edit the **Canal** tab in ShapeLab → Download JSON → `node scripts/canal-from-lab.mjs <file>` rewrites that one entry in `canal-data.js` → `node scripts/extract-tooth-shapes.mjs` → `npm run build`.
- `extract-tooth-shapes.mjs` now **keeps any on-disk outline that has diverged from its generator** and warns; `canine.json` was hand-edited in the lab and a plain rerun used to revert it silently. Pass `--force` to overwrite deliberately.

### ShapeLab scale anchor
- `SCALE_ANCHOR` is `0` for tooth templates and `0.5` for everything else. Tooth space is centred on the origin (x spans −0.5..0.5, y runs 0 at the biting edge to −1 at the apex); treatment and arch shapes run 0..1. Scaling a tooth about 0.5 pushes it outward, which made **Narrower widen a canal**. Fixed 2026-09-09 — do not collapse it back to a literal 0.5.

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

### Popover tooth-number display convention
- `abbreviateTeeth(targets)` in `treatments.jsx` builds the subtitle under the panel eyebrow.
- Rule: >5 teeth AND contiguous on arch → `#first–last` (e.g. `#42–34`); otherwise up to 6 FDIs space-separated with `+N` overflow.
- `FDI_ARCH_ORDER` defines arch sequence (Q1→Q2 upper, Q4→Q3 lower). Both Stage 1 and Stage 2 use this helper — do not revert to inline string logic.

### Treatment panel card grouping (core/treatment-panel-order.js)
- **One card per (entry, jaw) for every bundleable MediSave treatment.** One apply on three teeth
  is one entry, one summary row and ONE claim, so it is one card. Gated on
  `isBundleable(tx.id) && tx.targets.length > 1`. The `> 1` gate is load-bearing: a single-tooth
  treatment must keep falling through to the ordinary tooth card so it still sits beside that
  tooth's other treatments, or the commonest case doubles the panel's height.
- `simultaneous-graft` is NOT on `MEDISAVE_BUNDLE_IDS`, so `isBundleable` does not catch it. It is
  listed in `AREA_IDS` to keep the collapse it already had. Check that set when adding an area
  treatment.
- **This replaced `COLLAPSE_IDS` + one card per contiguous run** (2026-09-12). Neither definition
  of "contiguous" in this codebase is the claim boundary: `splitRuns` here bridges missing and
  extracted teeth, while `countToothAreas` in the parent breaks on any positional gap. They
  already disagreed; the entry is now the claim, so the disagreement is a display detail rather
  than a money bug. `splitRuns` survives only as a heading formatter.
- **A printed range must never span teeth that were not selected.** Two separate rules do this.
  Non-contiguous targets print as a list (`#43, #41`), never a dash. And a run that crosses the
  midline is split at the quadrant, because FDI numbers do not run continuously across it —
  #14 #13 #12 #11 #21 is contiguous in the mouth but prints `#11–12`-style spans per quadrant
  (`#11–14, #21`), not `#11–21`, which would read as covering #15 through #18. Measured live on
  2026-09-12 with the misleading form on screen; `quadrantRuns` is the fix.
- Note there is a SECOND tooth-span convention in this repo, `abbreviateTeeth` above, which uses
  `FDI_ARCH_ORDER`. It describes a live selection in the popover; this one describes a claim in
  the panel. They are deliberately not shared.
- **`rowKey` in `app/treatment-panel.jsx` must be card-scoped** — `${card.key}|${row.ref}|${row.txId}`.
  A cross-jaw entry yields two cards from ONE ref, so `ref|txId` was identical on both and opening
  one `+` menu opened the other. Collapsing hides this for the common case; it does not fix it.

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

- Stage 1/2 footers are a fixed, floating glass dock (`.dock` in `styles.css`), not in-flow — **bottom-centred** using `left:50%; transform:translateX(-50%)`, the same idiom as `.stage-pill`. Height (`--dock-item-size:41px` + 5px padding × 2 + 1px border × 2) = **53px**, matching `.app-header__inner` (NOT `--header-h`, which is the 69px outer sticky shell — see gotcha below). Pills and panels (`PanelDock`) now own the **bottom-right corner** at `bottom:25px` / `bottom:75px`, with a single exported source of truth: `PILL_BOTTOM` and `PILL_H` in `tweaks-panel.jsx` (imported by `treatment-panel.jsx`). Phone (≤480px) keeps its own `--dock-item-size:38px` and smaller gap — centred but not enlarged. The dock sits under the centre of the arch drawing; check that the dock's top edge clears the arch SVG's rendered bounds in the browser — `.stage`'s bottom padding is not a reliable proxy because the dock is `position:fixed` against the viewport, not measured inside `.stage`.
- All dock items are transparent-bg with an ink-colored glyph (`.dock-item.primary` neutralized in CSS — no accent fill on Stage-nav/Summary buttons anymore). `.dock-item.active` still gets a faint accent tint for the edentulous toggle-on state.
- `ArchIcon` (edentulous glyph) is a plain arc only — no gum line, no teeth ticks. Upper/lower Edentulous and Restore states render the same arc; state is conveyed by the `active` tint + tooltip label only.
- Icon-only buttons, `aria-label` is the accessible name — tests must use `getByRole('button', { name: '<label>' })`, never text/class selectors.
- **Gotcha — verify layout numbers against the live app, not grep alone.** Both `.brand`/`StagePill` (chart) and the theme file's `--header-h:69px` looked authoritative from source but are dead/conditional: `.brand`/`<StagePill>` are never mounted in any JSX; `--header-h:69px` only applies when `data-theme="titan-editorial"` is set on `<html>`, which is true in `v3/index.html` (69px, confirmed live) but NOT in the root `Quotation App/index.html` (v2 build, unrelated — computes to a plain `:root` fallback of 52px there). When tuning against a parent-app number, load `v3/index.html` specifically and read `getBoundingClientRect()`/computed `--header-h`, don't trust a theme file or a different app entry point.
- `--dock-bg` token lives in both `flatTheme()`/`darkTheme()` (`dental-arch.jsx`) and the CSS `:root` fallback; CSS reads it as `var(--dock-bg, var(--card-bg))`. Not yet bridged through the parent app's `CHART_TOKEN_MAP` (`v3/js/main.js`) — add it there if the dock ever needs to react to a parent theme switch beyond the flat/dark toggle.
- z-index: dock = 40, popover = 50/60, `PanelDock` (bottom-right Tweaks/Treatments toggle) = `2147483645`. The dock and `PanelDock` no longer share a vertical stack — dock is centred, pills are corner-anchored — so the old gap arithmetic (`dock bottom + height ≤ PanelDock bottom`) is obsolete. The constraint that now matters is horizontal: the dock must not overlap the pills at any viewport width narrow enough that both reach the middle; check this at the tablet breakpoint (1180px).
- `SelectionActionBar` in `dental-arch.jsx` is defined but never rendered/tested anywhere — dead code as of 2026-07-19, not a dock collision risk. Don't assume it's live without checking.

## Full Project Context

Read memory file `project_quotation_app_chart_redesign.md` before starting any session.
