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

### Every MediSave treatment is bundleable — there are no exceptions (2026-09-14)
- `MEDISAVE_MERGE_IDS` is **deleted**, not emptied. It held `sinus-lift` and `alveolectomy`, the
  two treatments excluded from same-visit bundling. Do not reintroduce an exception list; if a new
  MediSave treatment cannot bundle, fix the treatment, not the list.
- **Why they were excluded, and what changed:** both MERGED a newly applied target into an existing
  entry of the same id, so one entry could cover both sides or both arches. An entry spanning two
  areas cannot honestly carry one visit tag — the two may be done months apart. They now push
  **one entry per side / per arch**, giving them the one-apply-one-entry property everything else
  already had. That property is the ONLY thing bundling depends on.
- **`core/area-apply.js` (`addAreaEntry`) owns this.** Both the sinus and arch branches of
  `handleApplyTreatment` call it; it is pure so vitest can reach it, because the apply path proper
  lives inside a React callback that the component suite mocks. Re-applying a side that already has
  an entry is a **no-op returning the original array reference**, so React can skip the re-render.
- Area entries never reach the tooth-run card builder in `treatment-panel-order.js`: `scope`
  `'sinus'` and `'arch'` are handled earlier and `continue`. A scope guard was planned for that
  line and dropped as unreachable — do not re-add it.
- `SESSION_SPLIT_IDS` is also read inside the `popover.mode === 'tooth'` branch, which these two
  never enter. They are on the list for what `MEDISAVE_BUNDLE_IDS` derives from it, not for that
  branch.

### "Add to this visit" makes a TOOTH entry, whatever the host row is (2026-09-14)
- `addToVisit` in `app/dental-arch.jsx` hardcodes `scope: 'tooth'` and reuses the HOST row's
  `targets`. That is right for tooth-on-tooth and wrong for every row whose targets are not teeth.
- **Accepted limitation:** adding a sinus lift from an implant row produces
  `{ id:'sinus-lift', scope:'tooth', targets:['upper-14'] }`. The money is right — the parent's
  `CHART_TREATMENT_MAP` keys on `id` alone — but the sinus overlay is drawn from
  `treatments.filter(t => t.scope === 'sinus')` (`app/treatments.jsx`), so **no visual appears**,
  and the summary row's location reads as a tooth number rather than a side. A same-day sinus lift
  plus implant is rare enough that Minzhe accepted this rather than spend effort on it.
- **FIXED the same day — the reverse direction is now blocked.** It used to be open: the add
  button rendered on an area row, and the menu offered "Dental Implant" on a sinus row, writing
  `targets:['right']` into a tooth-scoped entry — a chargeable implant line whose location was a
  side, with no overlay anywhere. `addOptionsFor` now returns nothing when `row.scope !== 'tooth'`,
  and "Add manually…" is hidden there for the same reason. The button itself survives on an area
  row ONLY while that row is in a visit, because "Remove from this visit" lives inside the menu.
- **Consequence, and it is the honest cost of that fix:** an area entry that was applied properly
  (a sinus lift with a real side and its overlay) has no reachable way to join a visit at all.
  Adding from it never worked; joining two entries that already exist was removed on 2026-09-13.
  What area treatments have is the reverse path — added FROM a tooth row — which is what produces
  the verified $3,340 bundle. Joining two entries that already exist is NOT coming back: the plan
  that would have restored it (`docs/plans/2026-09-14-visit-record-above-both-avenues.md`, parent
  repo) was shelved on 2026-09-14 when Minzhe ruled out cross-avenue bundling. A unit test written
  2026-09-14 asserted the + IS offered on an area row; it pinned the affordance, not the outcome,
  and has been rewritten to assert the rule above.

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

### Same-visit bundles in the panel (2026-09-13)

- **There is no Join.** Membership is created ONLY from inside a bundle, via the `+` menu of one of
  its rows. A row elsewhere in the plan cannot elect to join one, and `joinOptionsFor` /
  `onJoinVisit` are gone. Consequence accepted with it: the `+` applies the added procedure to the
  HOST row's teeth, so **a visit can no longer span two entries on different teeth** — and an
  unbundled pair cannot be re-bundled at all, it must be deleted and re-added from the host's `+`.
- `joinSessions` is UNCHANGED and still supports merging two tagged bundles, but nothing can reach
  that branch (the second ref is always a brand-new untagged entry). It and its two unit cases are
  annotated as unreachable rather than deleted — do not read them as product capabilities.
- **Leaving a visit lives in the `+` menu**, not on the row. A second ✕ beside the row's delete ✕
  is two controls a keystroke apart meaning very different things.
- **A bundle is drawn as a GROUP, never as a tag repeated per row.** The card groups by TOOTH, and
  one tooth routinely spans two visits (extract + graft today, implant in four months), so "same
  card" cannot mean "same visit" — measured: without a marker the bundled and unbundled pairs
  render identically, for an $830 difference. The mark is a brace (`.trx-bundle::before`): one
  continuous stroke closed top and bottom by its corner radii. **A spine-less variant — two corner
  arcs alone — was built and rejected**; the marks drift apart as a bundle grows and stop reading
  as one enclosure. Tuning is three values (stroke weight, arm depth, ink alpha); change those,
  never the structure.
- **`.trx-bundle-hd` must out-specify `.trx-card-num+.trx-card-rows .trx-row{padding-left:0}`**
  (3 classes) or the heading keeps its 2px inset while the rows lose theirs and the two text left
  edges disagree by 2px. Hence `.trx-card-rows .trx-bundle .trx-row` in that selector.
- **Verify text alignment with a Range over the text nodes, never element rects.** The heading is a
  full-width box and the row label an inline span, so comparing `getBoundingClientRect()` reports a
  phantom 2px offset on markup that is correctly aligned.

### CSS-in-JS gotcha

`TRX_STYLE` / `DOCK_STYLE` are template literals. **A backtick anywhere inside them — including in
a CSS comment — closes the string** and the build fails with a JS parse error pointing at the CSS.
Quote identifiers in those comments with nothing, or with single quotes.

### The manual MediSave procedure (`manual-medisave`)
- An operator-defined procedure: a name they type and a CPF table they pick, added from the `+`
  menu of any bundleable row. The entry is
  `{ id: 'manual-medisave', scope: 'tooth', targets, uid, label, table, session? }` and rides the
  ordinary `treatments` array, so persistence, restore and same-visit bundling all work with no
  new message type.
- **It is NOT in `CHART_TREATMENT_MAP` or `MEDISAVE_BUNDLE_IDS`, deliberately.** Both describe
  catalogue treatments, and a parent parity test asserts the bundle list holds only ids the parent
  bills as surgical THROUGH that map. `isBundleable` therefore checks `MANUAL_MV_ID` on its own
  line, which keeps that drift guard strict.
- **`uid` is the identity, not `(id, targets)`.** Two manual procedures can sit on one tooth,
  which is the point of the feature, and every path that addresses a treatment by id and targets
  will silently destroy one of them. Three were fixed when this shipped and each is a test:
  `getConflictingTreatmentIds` returns `[]` for the manual id; `addToVisit` skips its same-id
  target strip; and removal goes through `removeManualEntry(ref)` rather than the per-tooth path.
  `txRef` and `chartTxKey` both append the uid, additively — no uid, and the string is unchanged,
  so no saved quote needs migrating.
- **The dropdown holds codes only** (`core/cpf-tables.js`). Every dollar amount lives in the
  parent's `v3/data/tosptables.js`; a parent test asserts the two lists are equal. Posting the
  list through the bridge instead was rejected: the chart runs standalone in its own dev server
  and test suite, so it would still need a fallback, plus an empty-dropdown race on first paint.
- **The typed name is operator text crossing into `innerHTML`.** It is cleaned once at the parent's
  bridge boundary (`sanitizeChartTreatments` in `js/main.js`), stripped rather than escaped so the
  PDF never prints an entity. Every other chart label is a hardcoded constant; this is the first
  that is not.

### Root canal — the one treatment stored as several entries per apply (2026-09-15)

- **Three stored ids, not one:** `ROOT_CANAL_IDS` in `core/conflict-rules.js` =
  `root-canal-anterior` / `-premolar` / `-molar`. CHAS prices the three tooth classes as three
  different procedures and Minzhe wants them separately removable, so ONE tile click writes one
  entry per class present in the selection. `rootCanalIdFor(fdi)` is the split: `n<=3` anterior,
  `n===4||5` premolar, `n>=6` molar (wisdom teeth are molars). Nothing existing had that
  boundary — the parent's extraction split breaks at 3 and the veneer rule at 5.
- **Why not one id.** A treatment's identity across the bridge is its id plus its teeth, and the
  parent's `removeFromSummary` deletes EVERY summary row sharing an identity. One id would have
  meant three summary rows on one key, so deleting the Anterior row also deleted the Molar row
  and cleared its tooth. Three ids also mean the parent needs no billing split at all — each maps
  to a plain `nsId` in `CHART_TREATMENT_MAP` the way `crown` does.
- **`RCT_TILE_ID` (`'root-canal'`) NEVER REACHES STATE.** It is the popover's token; the apply
  handler expands it. Do not add it to the registry, `CLINICAL_RANK` or `CHART_TREATMENT_MAP`, and
  do not read a grep hit for it as a stored treatment.
- **`TX_LABEL` is built from popover ITEMS, so the three stored ids have no label of their own.**
  `app/treatments.jsx` fills them from `VISUAL_REGISTRY` explicitly. Without that the Treatment
  Plan panel printed the raw id — `root-canal-molar` — at the patient. Found on screen, not by a
  test; `app/dental-arch.apply.test.jsx` now asserts every tooth-scoped registry id has a label.
- **`applyDirect` on a TX_GROUPS entry makes the category tile apply on the single click**, with
  no item list. It must be honoured in BOTH places the popover can resolve a category: the grid's
  onClick and the single-available-group auto-skip. Honouring only the grid leaves a path that
  lands on the one-row list the direct tile exists to avoid.
- **The transform is pure, in `core/root-canal-apply.js`** (`groupByRootCanalClass`,
  `applyRootCanal`), because `handleApplyTreatment` is a React callback the component suite mocks
  — same reasoning as `core/area-apply.js`. Within a class it is the ordinary merge-by-id: a
  second anterior tooth joins the existing anterior entry.
- **Conflicts:** every extraction type strips all three (you do not quote a root canal on a tooth
  you are removing). Root canal itself is deliberately absent from the conflict chain and falls
  through to the default `[txId]`, which is what lets a crown or veneer sit on an endodontically
  treated tooth — the commonest pairing there is, and the reason the canal geometry is root-only.
- **Paint: `(showCanals || hasRootCanal)`.** The treated canal is solid `accent` at opacity 1 and
  must NOT be gated on the Tweaks toggle, which defaults to off — gating it would make an applied
  root canal invisible on a fresh chart. The faint anatomical version keeps `CANAL_BASE_OPACITY`.
- **These are CHAS.** They must never join `MEDISAVE_BUNDLE_IDS` or `SESSION_SPLIT_IDS`; a parent
  parity test asserts that list holds only ids the parent bills as surgical.
- *Accepted:* CHAS allows 2 RCT claims a year shared across all three types, but `maxClaims: 2` is
  read per row, so an anterior plus a molar can default to 4 claimed units. The sidebar behaves
  the same way, and the app warns rather than enforces.

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
