# Root canal geometry — drawing brief

You are drawing the **pulp canal space** for eight dental tooth types, to be added to an
existing interactive dental chart. Everything you need is in this folder. Read this file
completely before drawing anything.

---

## 1. What you are drawing

One closed shape per tooth type, describing the canal space **inside the root only**.

That shape gets rendered two different ways by the same app, from the same geometry:

| State | Paint |
|---|---|
| Every tooth, always | Filled with a faint neutral tint — reads as a thin canal line |
| Tooth with root canal treatment | Same shape, filled solid in the treatment accent colour |

This is why it must be a **closed, fillable shape**, not an open centreline. SVG strokes
cannot taper, and a canal that does not taper does not read as a canal.

---

## 2. The hard rule: root only

**Do not draw anything in the crown.** No pulp chamber, no pulp horns.

On each sheet the crown is filled grey with a dashed border. That region is out of bounds.
The white region bounded by the heavy dark line is the root, and your geometry must lie
entirely inside it.

This is a deliberate simplification, and it is not negotiable, for a functional reason: the
chart paints a separate crown graphic on top whenever a tooth is crowned, and root canal
followed by a crown is the single most common combination this chart will ever show. Anything
drawn in the crown would be covered up or would collide.

Consequence you should accept rather than work around: the pulp horns visible in the reference
images are omitted. The result is schematic, not anatomical.

---

## 3. Coordinate contract

Get this wrong and the output is unusable, so check it before you hand anything back.

- **Origin `(0,0)` sits at the centre of the biting edge**, not at a corner and not at the
  centre of the tooth.
- **The root runs in NEGATIVE y.** The root apex is near `y = -1.0h`. On screen in these
  sheets that means the root points *upward*.
- **x is a fraction of tooth width `w`**, running about `-0.5w` to `+0.5w`.
- **y is a fraction of tooth height `h`**, running `0` at the biting edge to about `-1.0h`
  at the apex.
- Every sheet carries a **0.1w by 0.1h grid, labelled**. Read your coordinates off that grid.
  Do not estimate them.
- **Cubic Bézier curves only** (`C` commands). No arcs, no quadratics, no polylines.
- Each canal is a **closed subpath** ending in `Z`.

All eight sheets are drawn root-up regardless of jaw. The app flips the lower arch itself at
render time — do not pre-flip anything.

---

## 4. Canal counts per tooth

These are fixed by root shapes that already exist in the chart. Do not invent extra roots
and do not merge existing ones. Seat each canal inside a specific root lobe you can see on
the sheet — for the molars especially, do not space the canals evenly across the width.

| Sheet | Tooth | Canals |
|---|---|---|
| 1 | Incisor (upper central) | 1 |
| 2 | Canine (upper) | 1 |
| 3 | First premolar (upper) | 2 — the root is genuinely bifurcated, one canal per limb |
| 4 | Second premolar (upper) | 1 |
| 5 | Molar (upper) | 3 — one per root |
| 6 | Molar (lower) | 2 — one per root |
| 7 | Third molar (upper) | 2 — extrapolate from the upper second molar |
| 8 | Third molar (lower) | 2 — extrapolate from the lower second molar |

Sheet 6 was originally specified as three canals, two of them in the mesial root. That was
revised to two on 2026-09-09 after seeing them rendered at real size: two canals inside one
mesial root do not stay legible at the scale this chart draws. One canal per root.

The two wisdom teeth have no reference image. Extrapolate from the adjacent second molar and
say clearly in your response that you did so.

---

## 5. What the reference images establish

The two reference images in this folder ({{REFERENCE_FILES}}) are standard pulp anatomy diagrams — one mandibular (roots pointing down,
molars with two roots) and one maxillary (roots up, molars with three). They are drawn exactly
the way this chart will render: **pulp space as a filled shape with a visible outline.**

Four things to take from them:

1. **The canal is widest at the cervical line and narrows toward the apex.** The taper is
   continuous, not stepped.
2. **The canal stops short of the anatomic apex.** It does not run to the point of the root.
3. **The canal follows the curve of its root**, including the outward lean of molar roots.
   It is not a straight line down the middle of a curved root.
4. **Canal walls are smooth.** No kinks, no sudden width changes.

Ignore the occlusal-view rows in both images. This chart only ever renders a facial view, so
those cannot be traced — they are useful only for confirming canal counts.

---

## 6. Where the canal starts

The coronal end of each canal anchors on, or just apical to, the **red dashed cervical line**
marked on every sheet. It must not cross it into the crown.

The cervical line position differs by tooth type and is printed in each sheet's description:

| Type | Cervical line |
|---|---|
| Incisor, canine | `-0.34h` |
| Premolars | `-0.36h` |
| Molars | `-0.40h` |
| Third molars | `-0.46h` |

For a multi-rooted tooth, the canals converge toward each other as they approach the cervical
line but stay separate — they do not join into a single opening.

---

## 7. What to hand back

For each of the eight teeth, return the path data as a plain SVG path string in the
normalized units described in section 3, like this:

```
incisor:  M 0.03 -0.36 C ... Z
molarU:   M ... Z  M ... Z  M ... Z
```

Multi-canal teeth return multiple closed subpaths in one string.

Also state, per tooth:
- how far short of the apex the canal stops, as a fraction of `h`
- the canal width at the cervical line, as a fraction of `w`
- anything you were unsure about

`10-format-example.json` shows the JSON segment structure used elsewhere in this project, if
you would rather return structured data. **Its numbers are not authoritative** — copy the
shape of the format, never the values.

---

## 8. Checks before you answer

- [ ] Every canal lies entirely inside the white root region, with visible clearance from
      the dark outline at every point — not touching it, not crossing it
- [ ] Nothing enters the grey crown region
- [ ] Canal counts match the table in section 4
- [ ] Coordinates are fractions of `w` and `h`, with y negative
- [ ] Every subpath is closed with `Z` and uses only `C` curves
- [ ] Canals taper continuously and stop short of the apex
- [ ] You checked the result against `09-arch-context.svg` — a canal can look right on its own
      sheet and wrong beside its neighbours

---

## Files in this folder

| File | What it is |
|---|---|
| `00-INSTRUCTIONS.md` | This file |
| `01-tooth-incisor.svg` … `08-tooth-wisdom-lower.svg` | The eight drawing sheets. Draw on these. |
| `09-arch-context.svg` | Both arches at true scale and spacing, for checking how it reads in context |
| `10-format-example.json` | Format reference for structured output. Numbers not authoritative. |
| {{REFERENCE_FILES}} | The pulp anatomy reference images |
