# Root Stump — fourth Stage 1 tooth state (v3 chart)

## Context

Stage 1 (baseline) currently has three tooth states: healthy (`undefined`), `'missing'`, `'implant'`. Minzhe wants a fourth: **root stump** — a retained root with no crown. Visually it's the root form only; the closed root path already exists (`toothPaths().root`, produced by `splitToothAtCervical()` in `core/tooth-split.js`, which retraces the cervical boundary curve to close the root shape — no new geometry needed).

Decisions locked with user:
- Click rotation: healthy → missing → implant → **root-stump** → healthy.
- Baseline popover gets a **third card** ("Root stump") with a small root icon.
- Stage 2 treatment options for a root-stump tooth: **the 3 extraction types only** (extraction / simple surgical / complex surgical). Existing anterior-posterior CHAS logic and Medisave session logic are keyed on treatment ID + tooth position, so they apply unchanged.
- Root stump is **NOT** a natural bridge abutment and **NOT** counted in `claimableCrowns` (treated like implant/missing for those).

Repo: `Dentistry/Quotation App/v3/chart` — **nested git repo, cd inside for all git ops.** State value: `'root-stump'`.

## Changes

### 1. State cycle — `app/dental-arch.jsx:18-21`
```js
cyclePresence: undefined → 'missing' → 'implant' → 'root-stump' → undefined
```

### 2. Tooth rendering — `app/dental-arch.jsx` `Tooth` component (~lines 41-192)
- `const isRootStump = presence === 'root-stump'`.
- Body path: `const bodyPath = isRootStump ? paths.root : paths.outline` — use for the visible fill path (line 136), the selected halo path (line 147). The root path is already closed with the retraced cervical curve.
- Keep the **full outline** as the 12px invisible hit target (line 113) — same pattern as missing teeth, keeps clicks easy.
- Fill/stroke: same as healthy (`var(--tooth-fill)` / `var(--tooth-stroke)`); hover/selected/drag tinting unchanged.
- Skip the separate cervical line (line 158 `!missing` → also `&& !isRootStump`) — the root path's boundary curve already draws that junction.
- Hover lift condition (line 58) and hover-fill condition (line 83): treat root stump like a healthy tooth (allow lift/hover).

### 3. Baseline popover card — `app/treatments.jsx` baseline mode (~lines 1052-1082)
- Third `<button className="baseline-option">` after the implant card: label "Root stump", `onApplyBaseline('root-stump')`.
- Icon: small SVG of the root form — tapered root silhouette topped by a shallow cervical curve (echo the real geometry: flat-ish top with a slight apical dip), solid stroke, same viewBox scale as the existing two icons.
- Verify `handleApplyBaseline` (dental-arch.jsx ~line 860) passes arbitrary values through to `setPresence` — expected generic; adjust if it whitelists.

### 4. Stage 2 gating — extractions only
- `app/dental-arch.jsx` popover props (~1337-1352):
  - `allPresent`: add `&& presence[t.id] !== 'root-stump'` (so crown is NOT offered).
  - New prop `allExtractable`: every target is healthy OR `'root-stump'`.
  - `hasBridgeAbutment` (line 1345): exclude `'root-stump'` from the natural-abutment condition.
- `app/treatments.jsx`:
  - Extraction items (lines 26-28): change `requires: 'present-tooth'` → `requires: 'extractable-tooth'`, and update the hint copy ("present teeth only" → "present teeth or root stumps").
  - `isAvailable` (line ~1107): `'extractable-tooth'` → `allExtractable === true`; thread the new prop through `TreatmentPopover`.
  - Bridge-span natural-abutment check (~lines 862-863): exclude `'root-stump'`.
- **Mixed-selection semantics (intended):** a selection of healthy + root-stump teeth offers extraction (all extractable) but hides crown (`allPresent` false). A selection containing missing/implant teeth offers neither, as today.
- `MISSING_TOOTH_REQUIRED` items already require `allMissing` — root stump correctly gets no implant/graft options.
- Extraction apply flow (dental-arch.jsx 774-787): filters only exclude `'implant'`, so root stump is a valid target and auto-marks `'missing'` on apply — correct, no change.
- Tooth click handler line 721 (`implant` early-return): unchanged — root stump opens the popover.

### 5. Export / counts — `app/dental-arch.jsx`
- `claimableCrowns` (~484-486): add `!== 'root-stump'` to the natural-crown condition.
- Edentulous checks (lines 520, 740) compare `=== 'missing'` — a root-stump arch is *not* edentulous; leave as-is. (Arch bulk-click will overwrite root stumps to missing, same as it already overwrites implants — accepted existing pattern.)

**Per-site decision table (all known presence-comparison sites — rule: root stump = present for extraction, absent for prosthetics/abutments/claims):**

| Site | Decision |
|---|---|
| `dental-arch.jsx:54-85` Tooth render | new `isRootStump` branch (change §2) |
| `dental-arch.jsx:484-486` claimableCrowns | exclude root-stump (change above) |
| `dental-arch.jsx:520, 740` edentulous checks | unchanged — stump arch not edentulous |
| `dental-arch.jsx:539` selectionStats (Stage 2 footer missing-count) | unchanged — root stump not "missing"; verify footer label reads sensibly with a stump selected |
| `dental-arch.jsx:721` implant early-return | unchanged — stump opens popover |
| `dental-arch.jsx:780, 787` extraction target filter | unchanged — only excludes implant, so stump auto-marks missing on extraction (desired) |
| `dental-arch.jsx:1338-1352` popover props | allPresent excludes stump; new allExtractable; hasBridgeAbutment excludes stump (change §4) |
| `treatments.jsx:255` ExistingImplantLayer | unchanged — matches `'implant'` only |
| `treatments.jsx:862-863` bridge natural abutment | exclude stump (change §4) |
| `layout/tablet-chart.jsx:81` | **scoped out** — tablet already ignores `'implant'` too; stump renders as normal tooth there, matching existing low-fidelity behavior |
| `dental-arch.jsx:1316` BaselineFooter count | unchanged — label is generic "N teeth marked" |

During implementation, one final `grep -n "'missing'\|'implant'"` across `app/` + `core/` to confirm no site was added since this table; any new site gets the same rule.

### 6. Persistence
No schema change — `presence` map already stores arbitrary string values through `chart-context.jsx` / `chart-service.js` (Firestore) untouched.

## Tests (`app/dental-arch.apply.test.jsx`, `app/dental-arch.test.jsx`)
- Update `cyclePresence` test: healthy → missing → implant → root-stump → healthy.
- New: `toothPaths(type, w, h).root` for **every tooth type** is a non-empty closed path (`M…Z`) — first-ever consumer of the root path, so lock its integrity in a unit test.
- New: root-stump tooth renders `paths.root` (body path ≠ outline) and no separate cervical path.
- New: popover for a root-stump tooth offers the 3 extractions, not crown / implant options.
- New: applying `extraction` to a root-stump tooth marks it `'missing'`.
- New: `claimableCrowns` / `hasBridgeAbutment` exclude root-stump teeth.

## Verification
1. `cd "Dentistry/Quotation App/v3/chart"` — `npx vitest run` (all existing + new tests green; baseline was 186 passing).
2. `npm run build` (required for the v3 iframe), then `npm run serve` from Quotation App parent, hard-refresh (Ctrl+Shift+R).
3. Manual — **root-shape sweep first**: `paths.root` has never been rendered before, so mark one of each tooth type as root stump in BOTH jaws (central incisor, canine, premolar, molar, wisdom ×2 jaws) and eyeball every root form (closed cervical junction, correct winding/fill, no artifacts). Any bad shape = geometry work in `tooth-split.js`/`teeth-data.jsx` before proceeding (known edge case: neck anchors sitting exactly at `cervicalY` on premolars/molars).
4. Manual — behavior: Stage 1 click a tooth 4× → missing (dashed) → implant → root stump (root form only) → healthy. Multi-select → baseline popover shows 3 cards; root-stump card applies. Advance to Stage 2: root-stump tooth click → extraction options only; apply extraction → tooth goes dashed-missing; anterior vs posterior tooth extraction flows into summary with correct CHAS item; surgical extraction adds Medisave line. Bridge over a root stump: not offered as abutment. Mixed healthy+stump selection → extraction offered, crown hidden.
5. `npm run lint`.
