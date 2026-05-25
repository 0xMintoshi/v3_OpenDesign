# Shape JSON Schema

All files in `shapes-data/*.json` follow this schema.

## Required fields

```json
{
  "id":       "crown-molar-upper",
  "label":    "Upper Molar Crown",
  "segments": [ /* array of segment objects — see below */ ]
}
```

## Segment objects

Each segment has a `type` field. Coordinates are **normalized** — values in [0, 1] relative to the shape's bounding box (W × H pixels, defined in `ShapeLab.jsx` SHAPES catalog).

| type | fields              | notes                              |
|------|---------------------|------------------------------------|
| `M`  | `x, y`              | Move-to — first segment, sets start point |
| `L`  | `x, y`              | Line-to                            |
| `C`  | `x1, y1, x2, y2, x, y` | Cubic Bezier — `(x1,y1)` and `(x2,y2)` are control handles, `(x,y)` is the endpoint |
| `Q`  | `x1, y1, x, y`      | Quadratic Bezier                   |
| `Z`  | *(no fields)*       | Close path                         |

**The segment array is variable-length.** No consumer should assume a fixed point count.

## Optional `source` metadata

When a shape was traced from a reference image (via `scripts/trace-image.mjs` or the Lab's Import Image panel), the JSON may include:

```json
{
  "source": {
    "image":     "shapes-data/references/molar-atlas-fig4.png",
    "threshold": 0.5,
    "invert":    false,
    "tracedAt":  "2026-05-25T07:00:00.000Z"
  }
}
```

## Reference images

Source images live in `shapes-data/references/` (gitignored by default — add individual files if you want them version-controlled alongside the JSON they produced).
