# Parametric root canals

**Date:** 2026-09-09
**Status:** proposed, not started
**Supersedes:** the path-string canal geometry landed earlier today in `layout/canal-data.js`

## Why

A canal is a centreline with a width that tapers. Storing it as 25 to 87 cubic Bézier
segments makes every edit a control-point drag, and makes mirror symmetry a matter of luck
rather than construction. Measuring the delivered paths showed the luck already ran out: the
upper molar's distobuccal canal is twice as wide at the mouth as its mesiobuccal twin, and
carries fifteen times the centreline bow, because it was produced by a loose mirror.

Parameters make symmetry exact, and make the shape editable with named sliders for the things
that actually vary: how wide the canal starts, how hard it tapers, how far it runs, how it leans.

## The model

Each canal is eight numbers. Every one is a slider in ShapeLab, so there is no indirection
between what is edited and what is stored.

| Field | Unit | Meaning |
|---|---|---|
| `mouthX` | fraction of `w` | coronal end of the centreline, across the tooth |
| `mouthY` | fraction of `h` | coronal end, negative, at or just apical to the cervical line |
| `length` | fraction of `h` | centreline run from mouth to apical tip |
| `lean` | degrees | centreline angle from vertical, positive leans toward +x |
| `bow` | fraction of `w` | lateral offset of the centreline midpoint from the mouth-to-apex chord |
| `wMouth` | fraction of `w` | half-width at the mouth |
| `wApex` | fraction of `w` | half-width at the apical tip |
| `taper` | exponent | width falloff, 1 is linear, above 1 pinches early |

Apex is derived, never stored: `apex = mouth + length * (sin lean, -cos lean)`. Width at
centreline fraction `t` is `wApex + (wMouth - wApex) * (1 - t) ** taper`.

Mirrored canals are the same entry with `mouthX`, `lean` and `bow` negated. The generator
does that, so no mirrored numbers are ever typed by hand.

## Seed values

Fitted from the paths now in `canal-data.js`, so the first render matches what is on screen
today, with two deliberate corrections noted below. `taper` seeds at 1.6 for every canal,
which reproduces the current near-parallel walls; it is the first dial worth raising.

| Tooth | Canal | mouthX | mouthY | length | lean | bow | wMouth | wApex |
|---|---|---|---|---|---|---|---|---|
| incisor | single | 0 | -0.367 | 0.597 | 0 | 0 | 0.090 | 0.004 |
| canine | single | 0 | -0.372 | 0.607 | 0 | 0 | 0.100 | 0.004 |
| premolar | single | 0 | -0.393 | 0.587 | 0 | 0 | 0.070 | 0.004 |
| premolar1 | buccal | 0.113 | -0.387 | 0.590 | -1.5 | 0.017 | 0.106 | 0.004 |
| premolar1 | palatal | *mirror of buccal* | | | | | | |
| molarU | mesiobuccal | 0.235 | -0.420 | 0.512 | -6.9 | -0.002 | 0.047 | 0.004 |
| molarU | palatal | 0 | -0.528 | 0.377 | 0 | 0 | 0.027 | 0.004 |
| molarU | distobuccal | *mirror of mesiobuccal* | | | | | | |
| molarL | mesial | 0.235 | -0.420 | 0.512 | -6.9 | -0.002 | 0.047 | 0.004 |
| molarL | distal | *mirror of mesial* | | | | | | |
| wisdomU | mesial | 0.185 | -0.489 | 0.443 | -1.6 | 0.006 | 0.045 | 0.004 |
| wisdomU | distal | *mirror of mesial* | | | | | | |
| wisdomL | mesial | 0.185 | -0.489 | 0.443 | -1.6 | 0.006 | 0.045 | 0.004 |
| wisdomL | distal | *mirror of mesial* | | | | | | |

Two corrections applied while seeding, both from the measurement table:

1. The distobuccal and distal canals are seeded as exact mirrors rather than from their own
   measured values (`wMouth` 0.0915, `bow` -0.0341). Those numbers are a mirroring artefact,
   not a drawn intention.
2. `wApex` is seeded at 0.004 w everywhere. The delivered paths run to a true point, which
   renders as a hairline that disappears at chart scale.

## The lower molar stays at two canals

The original brief asked for two mesial canals and one distal, and an earlier note recorded
"lower molar drawn anatomically faithful" as a locked decision. **Minzhe overruled that on
2026-09-09: the lower molar keeps two canals, one per root.** The mesiolingual canal is not to
be added, here or later, without him asking for it.

The chart is schematic, not anatomical, and it already omits pulp horns for the same reason.
Two canals crowded into one mesial root would not survive the scale the arch renders at.

## Work

### 1. Generator — `core/canal-shape.js` (new)

- `canalOutline(params)` returns one closed subpath string in normalized units.
- `canalGroupPath(entries)` joins several, applying the mirror flag.
- Centreline is a quadratic from mouth to apex, control point at the chord midpoint offset by
  `bow` along the chord normal.
- Sample 7 points per side, offset by the width function along the local normal, convert to
  cubics with Catmull-Rom to Bézier. Six cubics per wall, which matches what the existing
  simplifier produces from the current paths.
- Apical tip closes with a single cubic cap; the mouth closes with a straight `L`, as now.
- Pure arithmetic. No new dependency, and nothing to precompute or regenerate.

### 2. Parameter table — `layout/canal-data.js` (rewrite)

- `CANAL_PATHS` is replaced by `CANAL_PARAMS`, keyed by the same eight tooth types.
- `canalPath(type, w, h)` keeps its exact signature and return type, so `teeth-data.jsx`
  line 311 and `dental-arch.jsx` line 198 do not change at all.
- `scaleCanalPath` and the command allowlist are deleted; nothing parses path strings any more.

### 3. Containment test — `core/canal-shape.test.js` (new)

This is the part the current geometry has no answer for. Between 3.6% and 6.3% of the
delivered canal boundary sits outside the root on five of the eight types.

- Flatten the canal and the root path to polygons in pure JS, then assert every canal boundary
  point is inside the root, for all eight types at the real dimensions the arch uses,
  including the narrow lower central incisor.
- Assert each canal is closed, tapers monotonically, and stops short of the apex.
- Mutation check: widen one seed canal by 40% and confirm the test fails.
- Then nudge the seed parameters until it passes. Expected changes are small: `mouthY` a few
  thousandths more apical on the molars and wisdoms, where the straight mouth cap currently
  clips the curved cervical line at its corners.

### 4. ShapeLab canal tab — `lab/ShapeLab.jsx`

- The Canal tab stops being a control-point editor and becomes a slider panel.
- A canal selector sits above the sliders, so a molar's three canals are tuned one at a time.
  This fixes the current limitation where the whole-shape buttons move every canal together.
- Live preview against the outline and cervical ghosts, as now.
- A Copy Params button emits the table row ready to paste into `canal-data.js`.
- The outline and cervical tabs keep the existing point editor untouched.

### 5. Retire the path round-trip

- Delete `scripts/canal-from-lab.mjs`. It transplants path strings, which will no longer exist.
- Drop the `canal` key from `scripts/extract-tooth-shapes.mjs` and from the eight tooth JSONs.
  Those files exist to feed ShapeLab's point editor, and canals will not use it.
- Keep the diverged-outline guard added today. That fixed a separate real bug.

### 6. Docs

- Replace the Root canals section of `CLAUDE.md` with the parameter contract and the mirror rule.
- `CHANGELOG.md` entry recording why paths were dropped in favour of parameters.

## Verification

- `npm run lint`, `npm test`, `npm run build` all clean.
- The containment test above, with its mutation check.
- Screenshot the full arch and the per-tooth diagnostic sheet, and compare against
  `screenshots/canal-check-sheet.png` from the path version.
- Drive ShapeLab with Playwright: move a slider, confirm only that canal changes, confirm the
  outline and cervical paths are untouched.

## Out of scope

- The root canal treatment overlay, registry entry and conflict rules. Baseline canal geometry
  only, as now.
- Any change to how the canal is painted. One geometry, two paint recipes, unchanged.
