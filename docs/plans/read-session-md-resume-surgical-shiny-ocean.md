# Plan — Multiple Retained Root Surgical Extraction: trigger logic + summary wiring

## Context

"Root Stump Extraction" (TOSP **SF816T**) was added to the chart's Extraction group last
session but never browser-verified. Investigating the trigger question surfaced three
problems:

1. **Gating is wrong.** All four extraction items share `requires: 'extractable-tooth'`, so
   SF816T shows for *any* present-or-root-stump tooth — no root-stump or "multiple" condition.
2. **The summary row is silently broken.** The chart→quote bridge looks up the curated
   `SURG` catalog (`data/catalog.js`), which has no `SF816T` entry, so `SURG.find(...)`
   returns `undefined`, warns, and adds **no line**. Applying it does nothing on the quote.
3. **Label mismatch (data file, not the code).** `data/tospcodes.js` mislabels `SF816T` as
   "Full Bony Impaction". Per the clinician (authoritative), **SF816T is the correct code for
   surgical removal of multiple retained roots**. That reference label is what's wrong.

**Terminology (record):** *retained roots = fractured roots = "propane" roots = root-stump* —
all synonyms for the `presence === 'root-stump'` baseline state.

## Decisions locked with user

- **Single root stump** → Medisave options are **Simple Surgical (SF812T)** and **Complex
  Surgical (SF813T)**; plus Normal Extraction (CHAS). **No SF816T.**
- **Multiple root stumps (2+, all root-stump)** → the **only** Medisave option is **SF816T
  "Multiple Retained Root Surgical Extraction"**; Simple/Complex Surgical are **hidden**.
  Normal Extraction (CHAS) stays, qty = number of teeth.
- **SF816T:** label "Multiple Retained Root Surgical Extraction", **qty 1 per applied group**,
  Medisave **$1,950 = $1,120 surgical + $830 misc, Table 2C** (same amount as SF813T).
- No per-root anatomical counting; no `tooth.type` gate — purely `presence === 'root-stump'`
  count.

**Eligibility matrix:**

| Selection | Extraction (CHAS) | Simple Surg (SF812T) | Complex Surg (SF813T) | Multi Retained Root (SF816T) |
|---|---|---|---|---|
| present tooth/teeth | ✓ | ✓ | ✓ | ✗ |
| **1** root-stump tooth | ✓ | ✓ | ✓ | ✗ |
| **2+** root-stump teeth | ✓ (qty=#teeth) | ✗ | ✗ | ✓ (qty 1) |
| mixed present + root-stump | ✓ | ✓ | ✓ | ✗ |

## Changes

### 1. `v3/chart/app/treatments.jsx` — gating + label
In the `TX_GROUPS` Extraction group:
- `root-stump-extraction`: `label` → `'Multiple Retained Root Surgical Extraction'`,
  `requires` → `'multi-root-stump'`, update `hint` (e.g. "multiple retained roots · SF816T").
  (Safe: not in `MISSING_TOOTH_REQUIRED`, so the post-process loop won't overwrite `requires`.)
- `simple-surgical-extraction` & `complex-surgical-extraction`: `requires: 'extractable-tooth'`
  → `requires: 'surgical-extractable'` (so they can be hidden for multi-root-stump).
- `extraction` (normal, CHAS): **unchanged** — stays `requires: 'extractable-tooth'`.

In `TreatmentPopover`, add an `allRootStump` prop and two `isAvailable` branches:
```js
if (item.requires === 'surgical-extractable')
  return allExtractable === true &&
         !(allRootStump === true && Array.isArray(target) && target.length >= 2);
if (item.requires === 'multi-root-stump')
  return allRootStump === true && Array.isArray(target) && target.length >= 2;
```
- Keep `root-stump-extraction` in the `EXTRACTION_IDS` array in `TreatmentLayer` (already
  there) so it still draws the red-cross overlay when it's the sole treatment.

### 2. `v3/chart/app/dental-arch.jsx` — pass the new prop
In the `<TreatmentPopover .../>` block (~line 1339), alongside `allExtractable`:
```js
allRootStump={popover && popover.mode === 'tooth'
  ? popover.target.every(t => presence[t.id] === 'root-stump')
  : false}
```
- No change to `autoMissing` / `SESSION_SPLIT_IDS` — `root-stump-extraction` is already in both
  (marks teeth `missing` on apply; each apply = its own group → one qty-1 row per group).

### 3. `v3/js/chart-treatment-map.js` — label + quantity (code stays SF816T)
`root-stump-extraction`: `label` → `'Multiple Retained Root Surgical Extraction'`,
`qtyFromTargets: true` → `false` (bridge ternary then yields **qty 1**), `unit` → `'per procedure'`.
`target` stays `{ sec: 'surg', code: 'SF816T' }`.

### 4. `v3/data/catalog.js` — add the billable SURG entry
Add to the `SURG` array (mirrors the SF813T shape so the default `getSurgLine` branch bills
`medisave × qty`):
```js
{ code: "SF816T", name: "Multiple Retained Root Surgical Extraction", tosp: "Table 2C",
  medisave: 1950, breakdown: "$1,120 surgical + $830 misc", unit: "per procedure" },
```

### 5. `v3/data/tospcodes.js` — align the reference label (consistency)
Update the `SF816T` row: `name` → `'Multiple Retained Root Surgical Extraction'`,
`table` → `'2C'`, `claim` → `1950`, so the admin sidebar's code-autofill matches the billing.
(Leave the impaction siblings SF810T/811T/817T untouched.)

### Sinus — no change
SB802M confirmed $1,390 + $830 = **$2,220**. Catalog already correct.

## Design confirmed (critique-tested)

- **Trigger unit ≠ billing unit, both settled:** SF816T fires on **2+ root-stump teeth**
  (a lone molar root-stump uses Simple/Complex Surgical, not SF816T), and bills **qty 1 per
  applied selection** (4 root-stump molars applied together = one $1,950 line). The app
  models "multiple retained roots" as "2+ teeth marked root-stump" — accepted approximation
  (no per-root data exists).
- **Conflict exclusion already wired:** `root-stump-extraction` is in `EXTRACTION_GROUP`
  (`core/conflict-rules.js:4`) — applying it strips any other extraction type on the same
  teeth. No change needed.

## Build & verification (end-to-end)

1. `cd "Dentistry/Quotation App/v3/chart" && npm run build` — the v3 app iframe loads built
   `dist/`, not source; edits are invisible until rebuilt. Hard-refresh (Ctrl+Shift+R).
2. **Catalog-shadow check (do first):** `SURG` is a runtime shadow replaced by
   `rebuildCatalogState()` from a clinic's saved config (`applyClinicConfig`, main.js
   ~3486). Confirm the live/demo config in use does **not** override SURG with a stored
   surgical catalog that omits `SF816T`; if it does, add `SF816T` there / via the admin
   sidebar too, or the bridge's `SURG.find('SF816T')` returns `undefined` and the row
   silently vanishes despite the `catalog.js` edit.
3. Chart Vitest: gating lives in the non-exported `isAvailable` closure inside
   `TreatmentPopover`, so test by **rendering the popover** with `mode:'tooth'` +
   `allRootStump`/`target` props and asserting item presence in the DOM (not by calling
   `isAvailable` directly). Cases: 1 root-stump → no SF816T, Simple/Complex present; 2 root
   stumps → SF816T present, Simple/Complex absent, Extraction present.
4. Browser (`npm run serve` in parent, per v3/CLAUDE.md):
   - Stage 1: mark two teeth (e.g. #16, #26) as **Root stump**.
   - Stage 2, select **one** → Root Stump option **absent**; Extraction / Simple / Complex present.
   - Select **both** → menu shows **only** Multiple Retained Root Surgical Extraction (+ Normal
     Extraction under CHAS); Simple/Complex Surgical **gone**.
   - Apply → Summary shows exactly **one** "Multiple Retained Root Surgical Extraction" row,
     **qty 1**, remark = both FDIs, Medisave **$1,950**, no console warning.
   - Regression: a present tooth still shows Extraction/Simple/Complex, never SF816T.

## Follow-up (post-implementation)
- **Pre-ship gate (optional, clinician's call):** confirm `SF816T` against the actual MOH
  TOSP fee schedule — its `tospcodes.js` sibling family (SF810/811/816/817) labels it "Full
  Bony Impaction," so repurposing it to retained roots rests on your authority; cheap to
  double-check given the claim impact.
- Memory: (a) terminology synonym set; (b) SF816T = multiple-retained-roots per clinician
  authority (tospcodes.js "impaction" label was wrong); (c) chart bridge bills off `catalog.js`
  SURG, not `tospcodes.js`.
- Move this plan into `Dentistry/Quotation App/v3/chart/docs/plans/` before starting.
- SESSION.md: closes the two open SF816T threads.
