# Procedural Complete Denture Overlay — v3hero chart

## Context

The complete denture (upper + lower) on the dental chart is currently a **static traced SVG** — `shapes-data/treatments/complete-denture-upper.json` / `-lower.json` rendered as one filled path by `treatment-overlays/CompleteDentureOverlay.jsx`. It was a compromise ("plastered over the arch"): no relationship to tooth geometry, no per-tooth structure, doesn't adapt to layout.

Goal: rebuild it **procedurally** from the existing tooth geometry, the same way `ClearAlignerOverlay.jsx` builds its tray. User-approved design decisions:

1. **Denture teeth = individual crowns**, first molar to first molar only — FDI x1–x6 per quadrant (16→26 upper, 36→46 lower; no 7s/8s).
2. **Deep flange** like the reference screenshot — sweeps well past the cervical line away from the bite, rounded distal ends just past the first molars, optional midline frenum notch.
3. **Style:** flange = translucent `accent` fill (~0.82 opacity, matching other treatment overlays); denture teeth = accent **outlines with an opaque background-token knockout fill** drawn on top of the flange — teeth punch out of the base like the reference (and knockout hides contact-overlap seams). Find the chart's existing bg token/color source (check how other overlays or the chart bg get it) — no hardcoded white.

Repo: `Dentistry/Quotation App/v3/chart/` (own nested git repo — run git ops inside it). All work stays inside the chart repo except the final `npm run build` note for the v3 iframe.

4. **Denture tooth shape ≠ raw crown path.** The natural `toothPaths().crown` is cut flat at the cervical line → squarish. Each denture tooth keeps the crown's occlusal/incisal contour but the cervical end is **redrawn as a semicircular dome** spanning the tooth's left/right proximal points — giving the scalloped, rounded look of the reference. Adjacent denture teeth must **touch** (no interproximal gaps).
5. **Flange rim height (user's red-line reference):** the upper flange's vestibular border is a **near-horizontal rim at a fixed global y** across the whole arch (red line ≈ chart y ≈ 150 in the 1600×800 viewBox; upper biteY ≈ 385) — NOT a constant offset from each tooth's cervical line. The rim runs flat, then wraps down with rounded corners just past the first molars. Lower arch mirrors this below its cervical level. Rim y per arch is a tunable constant.
6. **Mockup before code:** prototype and visually approve the denture shape in a standalone mockup (real geometry, throwaway renderer) before touching any app component — cheaper iteration, saves tokens. **The design itself is the hard part** (past attempts failed on it) — all shape iteration lives in the mockup phase.

**Verified during planning:** `allTeeth` (`app/dental-arch.jsx:517`) is built purely from layout scaling (`[...scaledUpper, ...scaledLower]`); `presence` is a separate map. Tooth geometry (cx, w, h, type, fdi) is fully available on edentulous arches. The wiring assumption holds.

## Approach

**Phase 0 — mockup first.** Dump the real tooth geometry to JSON, prototype the flange/crown ring algorithm in a standalone scratchpad HTML+SVG page, screenshot it over a faded arch reference, and iterate the shape constants with the user until approved. Only then port the validated algorithm into the app.

**Phase 1 — port.** Rewrite `CompleteDentureOverlay.jsx` in place, keeping the component name and adding a `teeth` prop. Reuse the ClearAligner machinery (sampling, B-spline, end caps). Old JSONs stay on disk (ShapeLab may reference them); the component just stops importing them.

## Files

| File | Change |
|---|---|
| `treatment-overlays/CompleteDentureOverlay.jsx` | Full rewrite — procedural flange + crowns |
| `app/treatments.jsx` (line ~807) | Pass `teeth={arch === 'upper' ? upperTeeth : lowerTeeth}` (already in scope, lines 794–795) |
| `treatment-overlays/CompleteDentureOverlay.test.jsx` | New Vitest file |
| `treatment-overlays/ClearAlignerOverlay.jsx` | Export the shared helpers needed (see step 2) — no behavior change |

## Steps

### 0. Mockup (no app code)

1. **Dump geometry from the live app:** `scaledUpper`/`scaledLower` are computed inside the `dental-arch.jsx` component, so don't replicate the scaling in a script (drift risk). Instead run `npm run dev` and use Playwright `browser_evaluate` on the running chart to serialize per tooth `{ fdi, type, cx, w, h, yOffset, tilt }`, `toothPaths(type,w,h)` `outline`/`crown` d-strings, and `upperBiteY`/`lowerBiteY` to `/tmp/denture-geometry.json` — guaranteed identical to what the app renders. (Fallback if the data isn't reachable from the page: a temporary `window.__dumpGeometry` hook or vitest script, deleted after the dump.)
2. **Standalone mockup page** in the scratchpad: single HTML file, inline SVG viewBox 1600×800, plain-JS copies of `smoothClosedRing` + prototypes of `buildFlangeRing` and `dentureToothPath` (crown incisal + semicircular cervical dome). Renders: (a) all tooth outlines faded grey for context, (b) the denture — flange fill + 12 touching dome-capped denture teeth per arch — in blue. Tuning constants exposed at the top of the file (or as sliders if cheap).
3. **Iterate with user:** screenshot via Playwright to /tmp, show, adjust constants/shape logic (rim y, distal wrap, frenum notch, dome height, tooth contact) until the user approves the look. All shape iteration happens here — zero app-code churn.
4. The approved constants + ring algorithm become the source of truth for Phase 1.

### 1. Wire the teeth prop
In `treatments.jsx` TreatmentLayer (~line 806), pass the arch's teeth array to `CompleteDentureOverlay`. Props become `{ jaw, accent, biteY, archWidth, teeth }`.

### 2. Share ClearAligner helpers
Export from `ClearAlignerOverlay.jsx` (or move to a small shared module `treatment-overlays/tray-geometry.js` if exporting feels cleaner): `toGlobal`, `walkCrown`, `binCrown`, `cervProfile`, `smoothClosedRing`, `buildEndCap`. **Locked rules:** `smoothClosedRing` quadratic B-spline only (never Catmull-Rom); transform convention `translate(cx, biteY + yOffset*flipY + toothYAdjust(tooth)) scale(1, flipY) rotate(tilt)`; `toothYAdjust` from `core/marquee-select.js` must be applied.

### 3. Rewrite CompleteDentureOverlay.jsx

**Tooth selection** — filter + sort:
```js
const dentureTeeth = teeth
  .filter(t => t.fdi % 10 >= 1 && t.fdi % 10 <= 6)   // x1–x6 only; excludes 17,18,27,28 / 37,38,47,48
  .sort((a, b) => a.cx - b.cx);
```
⚠️ Use `t.fdi` (integer) never `t.id`. Do **not** use a flat numeric range like `11–26` — it wrongly includes 17/18.

**Constants block** (top of file, adjust-values-only — approved S2 values 2026-07-07):
```js
// ── Tuning (adjust values only) — S2-approved mockup values ─────────────────
const RIM_OFFSET          = 150;  // vestibular rim distance from biteY, away from bite
                                  // (upper rim y = biteY - RIM_OFFSET; lower = biteY + RIM_OFFSET)
const CROWN_H_MULT        = 1.05; // crown height multiplier
const NECK_FRAC           = 0.28; // cervical neck half-width, fraction of w
const FLANGE_TUCK         = 0.10; // flange inner edge: fraction of crownH from the bite
const FLANGE_END_OUT      = 21;   // distal cap x-extension past first-molar wall
const FRENUM_NOTCH_DEPTH  = 32;   // midline dip in the vestibular rim (0 = off)
const FRENUM_NOTCH_WIDTH  = 40;   // x half-width of the notch
const SPEE_DEPTH          = 9;    // curve of Spee: posteriors recede from bite (quadratic, upward)
const BUCCAL_DIP          = 21;   // rim dip over the premolar region (buccal frenum)
const CANINE_RISE         = 12;   // rim peak over the canine eminence (const)
const CONTACT_OVERLAP     = 3;    // extra half-width per tooth so neighbors touch
const CROWN_STROKE        = 2.4;
const FLANGE_OPACITY      = 0.80;
const RIM_BINS_PER_TOOTH  = 2;    // sparse rim sampling (rim is nearly flat)
const CERV_BINS           = 15;   // reuse of aligner cervical sampling density
// Per-group vertical offsets (screen coords: negative = up). Applied per tooth by jaw+type group.
const GROUP_YOFF = {
  upper: { incisor: 11, canine: 0, premolar: 3, molar: 2 },
  lower: { incisor: -1, canine: 6, premolar: 0, molar: 0 },
};
// Per-type dome + split constants — one global value will NOT work: an incisor's
// widest point sits near the incisal edge, a molar's near the cervical, and the
// reference shows tall anterior scallops / shallower posterior ones.
const DOME_FRAC_BY_TYPE   = { incisor: 1.0, canine: 1.0, premolar: 0.8, molar: 0.6 };
const SPLIT_FRAC_BY_TYPE  = { /* per-type y-level (fraction of crownDepth) where crown form hands off to dome */ };
// ─────────────────────────────────────────────────────────────────────────────
```

**Denture tooth shape** — `dentureToothPath(type, w, h)` (new, the design-critical piece):
- Sample the natural crown via `walkCrown`, keep only the **occlusal/incisal portion** — cut at a per-type y-level (`SPLIT_FRAC_BY_TYPE`), not blindly at the widest point (widest point ≈ incisal edge on incisors, ≈ cervical on molars; a global rule degenerates on one or the other).
- From the left cut point, sweep a **dome** (elliptical arc, height = `DOME_FRAC_BY_TYPE[type] * w/2`) across the cervical end to the right cut point, replacing the flat cervical cut — per-type so anteriors get tall scallops, posteriors shallower, matching the reference.
- Close the ring and smooth (`smoothClosedRing` or direct arc command `A`).
- **Contact:** teeth must touch — widen each shape by `CONTACT_OVERLAP` per side (or scale x so proximal walls meet the midpoint between neighbors; pick whichever looks right in the mockup). Natural layout has `gapFrac: 0.08` spacing to overcome. Slight overlaps are invisible thanks to the opaque knockout fill.
- The flange's gingival border simply tucks behind the touching tooth row (the domes themselves provide the scallop) — no separate festooning needed; the ring's inner border just needs to run cervical to the dome peaks.

**Flange ring** — `buildFlangeRing(dentureTeeth, biteY, jaw)` returns a point ring for `smoothClosedRing`:
- Per tooth: `toothPaths(type, w, h)` → `.crown` (destructure — never `.map()` the return), `crownDepth(type, h)`, cervical envelope via `cervProfile`.
- **Inner (gingival) border, left→right:** a simple line running just cervical to the denture-tooth dome peaks — it hides behind the knocked-out tooth row, so no festooning needed.
- **Right distal cap:** from the gingival corner of the last tooth out `FLANGE_END_OUT`, wrapping up to the rim with a rounded corner — reuse `buildEndCap` shape logic (interior bulge points only, corners left to the spline).
- **Outer (vestibular) rim, right→left:** **near-horizontal line at `biteY ∓ RIM_OFFSET`** (per the user's red-line reference — biteY-relative so it survives layout changes; NOT a per-tooth cervical offset), sampled sparsely (`RIM_BINS_PER_TOOTH`). At the midline (x ≈ ARCH_LAYOUT.centerX = 800) inject the frenum notch: pull `FRENUM_NOTCH_DEPTH` toward the bite over `FRENUM_NOTCH_WIDTH` — likely needs a tight cluster of 3–4 control points to survive the B-spline smoothing.
- **Left distal cap** closes the ring.
- Direction handling: gingival border/caps built in local coords via `toGlobal` (flipY +1 upper / −1 lower); the rim is already in global y, so only the rim constant differs per arch.

**Crowns pass** — for each denture tooth render:
```jsx
<g transform={`translate(${cx}, ${biteY + (yOffset||0)*flipY + toothYAdjust(t)}) scale(1, ${flipY}) rotate(${tilt||0})`}>
  <path d={dentureToothPath(type, w, h)} fill={bgToken} stroke={accent}
        strokeWidth={CROWN_STROKE} strokeLinejoin="round" strokeLinecap="round" />
</g>
```
Crown fill: **opaque background-token knockout** (user-approved) — teeth punch out of the flange like the reference. Source the bg color the same way the chart bg gets it (check theme token wiring / CHART_TOKEN_MAP conventions); never a hardcoded hex.

**Render order within the component:** flange path first (fill `accent`, `fillOpacity FLANGE_OPACITY`, `stroke none`), crowns on top. `pointerEvents: 'none'` on the wrapping `<g>` (existing convention).

### 4. Retire old assets (non-destructively)
- Delete the two JSON imports + `shapeToPath` usage from the component.
- Leave `complete-denture-*.json` files on disk (ShapeLab reference; locked "never re-add layers" rule stays moot).
- **PartialDentureOverlay untouched.**

### 5. Tests — `CompleteDentureOverlay.test.jsx`
Follow existing patterns (186 Vitest tests; use `container.querySelector`, not getByTestId — locked rule for multi-render files):
- Filter: mixed-FDI fixture → only x1–x6 survive (assert 17/18/27/28 and 37/38/47/48 excluded), sorted by cx.
- Ring builder: returns ≥ 3 points; ring y-extent extends past the cervical line by ~FLANGE_DEPTH in the away-from-bite direction for both jaws (sign flips correctly).
- Component: renders 1 flange path with `fillOpacity` = FLANGE_OPACITY + 12 crown paths for a full 16→26 fixture; returns null for empty/undefined `teeth`.

## Verification

0. **Phase 0 gate:** user approves the mockup screenshots before any Phase 1 code is written.
1. `npm run lint` and `npx vitest run` in `v3/chart/` — all existing 186 + new tests pass.
2. `npm run dev` — mark an arch edentulous, apply Complete Denture, screenshot upper and lower and compare against the approved mockup:
   - flange fills accent @0.82, deep border with rounded distal ends just past the 6s, frenum notch at midline
   - 12 outlined crowns per arch at correct positions (check incisors/canines for toothYAdjust drift)
   - both arches applied together (like the reference screenshot) look coherent
3. Screenshots go to /tmp per scratch-artifact rule; user dials the tuning constants from there.
4. After sign-off: `npm run build` in `v3/chart/` so the v3 quotation-app iframe (loads from `dist/`) picks it up; hard-refresh the iframe.

## Session breakdown

Each item = one session, no compaction needed. Plan lives at `Dentistry/Quotation App/v3/chart/docs/plans/2026-07-06-procedural-complete-denture.md` — every kickoff prompt reads it first. Mockup working files persist in `/tmp/denture-mockup/` between sessions (if wiped, S1 regenerates cheaply). DS not eligible anywhere (Playwright/runtime + design work — both "never delegate" tiers).

### S1 — Geometry dump + mockup scaffold `[Sonnet]`
Small, mechanical: dev server up, Playwright-evaluate the geometry dump to `/tmp/denture-mockup/denture-geometry.json`, build the mockup HTML scaffold (faded arch + first rough denture render with placeholder constants), one screenshot. No design iteration in this session.

> **Kickoff:** Read `Dentistry/Quotation App/v3/chart/docs/plans/2026-07-06-procedural-complete-denture.md`, then execute **S1 only**: dump live tooth geometry via Playwright from `npm run dev` (v3/chart) to `/tmp/denture-mockup/denture-geometry.json`, and build the standalone mockup page `/tmp/denture-mockup/mockup.html` per plan Step 0.2 with placeholder constants. Screenshot it and stop — no design tuning, no app code.

### S2 — Mockup design iteration `[Opus]` *(the hard part; re-run as many sessions as needed)*
Design-critical: dial `dentureToothPath` per-type domes/splits, rim, frenum notch, distal caps, contact overlap against the reference screenshots with the user in the loop. Exit condition: user says "approved"; write final constants + algorithm notes into the plan file's constants block.

> **Kickoff:** Read `Dentistry/Quotation App/v3/chart/docs/plans/2026-07-06-procedural-complete-denture.md`, then execute **S2**: iterate the denture mockup at `/tmp/denture-mockup/mockup.html` (geometry JSON alongside it) with me until I approve the look. Screenshot each round via Playwright to /tmp. Focus: per-type dome shapes, tooth contact, flange rim per red-line reference, frenum notch, distal wrap. When approved, write the final constants back into the plan file and stop — no app code.

### S3 — Port into the app `[Sonnet]`
Mechanical port of the approved algorithm: rewrite `CompleteDentureOverlay.jsx`, export shared helpers from `ClearAlignerOverlay.jsx`, wire the `teeth` prop in `treatments.jsx`, resolve the bg knockout token, lint, visual side-by-side vs approved mockup screenshot.

> **Kickoff:** Read `Dentistry/Quotation App/v3/chart/docs/plans/2026-07-06-procedural-complete-denture.md` (constants block = approved S2 values), then execute **S3**: port the mockup algorithm into `treatment-overlays/CompleteDentureOverlay.jsx` per plan Steps 1–4. Verify in `npm run dev` (edentulous arch + Complete Denture, upper and lower) against the approved mockup screenshot. Lint. Stop before tests/commit.

### S4 — Tests, build, commit `[Sonnet]`
New test file per plan Step 5, `npx vitest run` (all 186+ green), `npm run build` for the iframe, hard-refresh check in the v3 app, commit inside `v3/chart/` (nested repo!).

> **Kickoff:** Read `Dentistry/Quotation App/v3/chart/docs/plans/2026-07-06-procedural-complete-denture.md`, then execute **S4**: add `CompleteDentureOverlay.test.jsx` per plan Step 5, run full vitest + lint, `npm run build`, verify the denture renders in the v3 quotation app iframe (hard refresh), then commit from inside `v3/chart/` (nested git repo — never from the parent).
