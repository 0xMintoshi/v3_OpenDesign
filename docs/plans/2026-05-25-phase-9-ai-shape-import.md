# AI-assisted reference-image-to-control-points pipeline + Lab point editing

## Context

What you actually want from the post-refactor workflow:

1. Upload a **reference image** (dental atlas drawing, photo, or X-ray) into the Lab.
2. AI / tracing extracts the **outline as control points**.
3. The points appear in the Lab, where you **manually refine** (drag points, **add/insert** new ones, **delete** unwanted ones) until the outline is perfect.

The current Lab (Phase 1+3) gives you draggable control points but a **fixed point count per shape**, and no image import. That's the actual gap — not Open Design at all. This plan closes it.

You confirmed: mix of clean dental-atlas diagrams and cluttered photos/X-rays; you want both in-Lab UI buttons (for the common loop) and chat-driven access (for harder asks via this Claude Code session).

## Two features, one plan

### Feature 1 — Lab point editing: add / insert / delete control points

Without this, even a perfect trace gives you a static-density outline you can't make more detailed. This is the prerequisite.

**UX additions in `lab/`:**
- **Insert point on edge** — click anywhere on an outline segment to drop a new control point at that location, interpolated between its neighbors.
- **Delete point** — right-click a control point (or select + Delete key) to remove it.
- **Append point** — for open paths, a "+" handle at each end to extend.
- Visual affordance: hovering an edge segment shows a phantom insertion dot.

**Data layer:**
- The Lab's save-back logic already writes JSON to `shapes-data/*.json`. Confirm the schema supports variable-length point arrays (it should — points are stored as `[{x, y}, …]` per existing files; this is just exercising the variable length).
- Any rendering code that hardcodes a point count (e.g. expecting exactly 8 control points for a molar) needs to be made dynamic. Audit `visuals/`, `core/shape-to-path.js` (or wherever the Bezier reconstruction lives).

### Feature 2 — Reference-image-to-control-points

Two sub-paths because you work with both clean and cluttered images:

**Sub-path A — Clean image trace (MVP, no AI required)**

For dental atlas drawings, black-on-white silhouettes, clear single-tooth illustrations:
1. User drags an image file onto the Lab canvas.
2. Lab pre-processes: convert to grayscale, threshold to binary (slider for threshold value), optional invert.
3. Run **potrace** (pure-JS port: [`potrace`](https://www.npmjs.com/package/potrace) on Node, or [`potrace-wasm`](https://github.com/tomayac/potrace-wasm) for in-browser) to vectorize the silhouette into Bezier curves.
4. Sample N points along the resulting path (N user-configurable, default ~16). The Ramer–Douglas–Peucker simplification within potrace gives natural point distribution.
5. Drop sampled points into the active shape's control-point array, save to JSON.
6. User refines with Feature 1's add/delete + standard drag.

This path is **deterministic, fast, and accurate**. No model latency, no API keys.

**Sub-path B — Cluttered image trace (V2, AI-assisted ROI)**

For photos, X-rays, multi-tooth images where the outline is ambiguous:
1. User drags image onto Lab canvas.
2. **Segmentation step** — two options:
   - **Claude vision API** (cheap, you already have credits): send the image with a prompt like "return the bounding polygon for the labeled tooth as a list of (x,y) percentages." Use the returned polygon as a mask. Caveat: Claude's spatial precision is moderate; works for ROI selection, not for the final outline — so its output feeds potrace as a mask, not as the final points.
   - **SAM via Replicate API** (best quality, paid per call ~$0.001/image): click-to-segment — you click the tooth, SAM returns a precise pixel mask.
   - Pick one for V2 — Claude vision is the cheaper / lower-friction start; SAM is the upgrade if Claude's masks are too rough.
3. Apply the mask to the original image, run potrace on the masked silhouette → control points.
4. Same drop-into-Lab refinement loop as Sub-path A.

**Chat-driven access (same pipeline, different entry point):**
- Add `scripts/trace-image.mjs <image-path> <shape-slug>` that runs the same pipeline headlessly.
- Usage from this session: I run the script, write `shapes-data/<slug>.json`, you open the Lab to refine.
- This is the same code as the in-Lab path, just wrapped as a CLI.

## Implementation order

1. **Feature 1: Lab point insert/delete** (≈half a day) — prerequisite, ships standalone.
2. **Sub-path A: clean-image trace** (≈1 day) — MVP image import.
3. **Chat-driven CLI wrapper** (≈2 hours) — `scripts/trace-image.mjs` reusing the same pipeline.
4. **Sub-path B: AI-assisted ROI for cluttered images** (≈1 day) — V2, start with Claude vision API; upgrade to SAM if accuracy demands it.

Ship 1–3 first, evaluate before doing 4. If 1–3 already handle 80% of your shapes (clean atlas drawings), 4 might be a "later" item.

## Implementation steps

### Feature 1 — point insert/delete

1. **Audit `lab/` to find the point-rendering and drag-handling code.**
   - Likely files: `lab/lab-canvas.jsx`, `lab/control-points.jsx` (or similar — confirm via repo)
2. **Add edge-hover phantom dot** — mousemove on outline segment renders a faint dot at the projected point.
3. **Add insert-on-click** — click the phantom dot inserts a real control point, updates the shape's `points[]` array.
4. **Add delete** — right-click handler + Delete-key handler on selected points.
5. **Audit consumers of shape JSON for hardcoded point counts.** Anywhere that assumes a fixed N — fix to be length-agnostic.
6. **Vitest tests** — insertion produces a point on the segment; deletion removes; rendering survives variable N.
7. **Playwright smoke** — drag insert handle, save, reload, confirm persistence.

### Feature 2 Sub-path A — clean-image trace

1. **Install `potrace-wasm`** (or `potrace` if running pipeline server-side via the CLI wrapper).
2. **Add image drop zone to Lab** — file drag-onto-canvas or upload button.
3. **Pre-process panel** — threshold slider, invert toggle, live binary preview.
4. **Trace button** — runs potrace, returns SVG path data.
5. **Path sampler** — `samplePathToPoints(svgPath, n)`: walks the SVG path, samples N evenly-spaced points (use `getPointAtLength` via offscreen SVG, or a path-parsing lib like `path-data-parser` + arc-length parametrization).
6. **Replace active shape's points** — confirm dialog ("replace 12 points with 16 traced points?"), update JSON, re-render.
7. **Reference attribution** — store the source image filename in the JSON's metadata (e.g. `"source": "ref/molar-atlas-fig-4.png"`) so future you knows which atlas figure a shape came from.
8. **Vitest + Playwright** — trace a fixture image, confirm point count, confirm bounding box of points overlaps the source silhouette.

### Feature 2 Sub-path B — AI-assisted ROI (V2)

1. **Add ROI mode toggle in Lab UI** — switch between "clean trace" and "AI-assisted trace."
2. **Claude vision API call** — Anthropic SDK, model `claude-sonnet-4-6`, image + prompt for bounding polygon.
3. **Polygon-to-mask** — render the returned polygon as a binary mask in a canvas.
4. **Mask application** — multiply original image by mask, feed result to potrace.
5. **Optional SAM upgrade path** — document how to swap Claude vision for Replicate SAM if accuracy is insufficient. BYOK via `.env.local`.
6. **Tests** — fixture image with known ROI, confirm masked silhouette is correctly extracted.

### Chat-driven CLI wrapper

1. **`scripts/trace-image.mjs`** — accepts `--image <path> --shape <slug> [--roi-ai claude|sam] [--threshold 0.5] [--points 16]`.
2. Reuses the same pipeline modules from Feature 2 (extract into `lab/trace-pipeline.js` as shared code, import from both Lab UI and CLI).
3. Writes to `shapes-data/<slug>.json`, prints summary.
4. Add to `package.json`: `"trace": "node scripts/trace-image.mjs"`.

## Files to create / modify

**Feature 1:**
- `lab/lab-canvas.jsx` (or current point-render file) — phantom dot, insert/delete handlers
- `core/shape-to-path.js` (or wherever) — variable-N audit
- `lab/control-points.test.jsx` — new Vitest
- `e2e/lab-point-edit.spec.js` — new Playwright

**Feature 2:**
- `lab/trace-pipeline.js` (new) — potrace + sampler + mask logic (shared by UI and CLI)
- `lab/image-import.jsx` (new) — drop zone, preprocess panel, trace button
- `lab/trace-pipeline.test.js` — new Vitest
- `e2e/lab-image-trace.spec.js` — new Playwright
- `scripts/trace-image.mjs` (new) — CLI wrapper
- `package.json` — new deps (`potrace-wasm` or `potrace`), new scripts
- `shapes-data/SHAPES_SCHEMA.md` (new, lightweight) — document the optional `source` metadata field and the points-array variable-length contract; gives any future LLM (this session or another) enough to keep working on shapes

**Cleanup:**
- Delete `dental-hero-v2.html.artifact.json` (orphan metadata, dead pointer)

## Verification

End-to-end smoke test of the loop:
1. Take a clean atlas image of a maxillary canine.
2. `npm run lab`, drop the image, set threshold, trace.
3. Confirm ~16 points appear roughly matching the canine outline.
4. Use Feature 1 to insert 2 extra points at the cusp tip and delete 1 redundant point on the cervical line.
5. Drag points to perfect.
6. Save. Open `npm run dev`, place the canine via the visual registry, confirm it renders cleanly in the hero.
7. `npm test` + `npm run e2e` — full suite green.

Repeat with a cluttered X-ray once Sub-path B ships.

## Gaps to address during implementation

These are real edge cases the implementer (me, next session, or anyone else) must handle. Calling them out so they don't get discovered mid-build.

**Coordinate normalization.** Reference images are in pixel space. The Lab's shapes are normalized (Phase 3 made this explicit). The trace pipeline must map pixels → normalized lab coordinates. The right UX is probably: after tracing, show the new points overlaid on the existing shape's bounding box, with handles to scale / translate / rotate them into place before committing. Without this, the trace lands at the wrong size or in the wrong corner of the canvas.

**Multi-region shapes.** Per memory: `toothPaths` returns `{outline, cervical}`, not a single contour. Many shapes have multiple sub-paths (outline + cervical line, arch + sinus, bridge span across multiple teeth). One trace pass = one contour. Options: (a) trace each region from its own image, drop into a named sub-path; (b) detect multiple contours from one image and let user assign each one to a sub-path. Pick (a) for MVP, (b) later if friction warrants.

**Point semantics — ordered vs labelled.** Some shapes may have named anchor points (e.g. `cervical_mesial`, `cusp_buccal`) that consumers reference by name. A potrace trace produces an ordered array with no labels. Need to audit `shapes-data/` JSONs and any consumers in `visuals/` to confirm whether names matter. If they do, V1 trace replaces only the geometric outline and leaves named anchors untouched; user re-pins them after the trace.

**Visual registry wiring.** A new shape JSON is invisible to the hero until it's registered in `core/visual-registry.js` (Phase 4 added this registry). The chat-driven CLI should optionally auto-register; the in-Lab flow should prompt "register this shape so it appears in the hero?" on first save of a new file.

**Reference image storage.** Decide where source images live: `shapes-data/references/` (in-repo, gitignored) is cleanest. The repo already has `uploads/`, `screenshots/`, `scraps/` — pick one or add a fourth, document in README.

**Image preprocessing for X-rays / cluttered photos.** Beyond ROI selection, X-rays often need contrast stretch + denoise before potrace produces clean curves. Worth a preprocessing panel with: threshold, blur, contrast, invert. All client-side via canvas filters; no heavy deps.

**Auto-downsample large images.** A 4K X-ray will choke potrace-wasm. Downsample to ~1024px longest edge before tracing.

**"Simplify path" as the inverse of insert-point.** Feature 1 lets you add points; you also want to remove redundant ones. A "simplify" button running Douglas-Peucker over the current points covers the inverse case.

**Save-as-new-shape vs overwrite.** Replacing an entire shape's points with a traced set is destructive. Require explicit confirm, and offer "save as new slug" as the default action when tracing into an existing shape.

## Decisions (locked 2026-05-25)

1. **Reference image directory:** `shapes-data/references/` — keeps source assets next to the JSONs they produced.
2. **AI segmentation provider for V2:** Claude vision API first (Sonnet 4.6). Upgrade to SAM via Replicate only if Claude's mask precision proves insufficient on real X-rays.
3. **Fate of `dental-hero-v2.html.artifact.json`:** delete outright. Pure fossil; no historical value worth preserving.
4. **ROADMAP entry:** add as **Phase 9 — AI-assisted shape import + Lab point editing**. Track formally alongside Phases 0–8 in `ROADMAP.md` and create a phase plan at `docs/plans/2026-05-25-phase-9-ai-shape-import.md` (copy/move this plan there as the canonical project-scoped phase plan).

## What this plan deliberately does NOT do

- **No LLM coordinate estimation** for the final outline. LLMs hallucinate coordinates; potrace is exact. LLMs only assist with ROI selection (where in the image to trace), never with the trace itself.
- **No reverting the refactor.** The Lab already exists thanks to Phase 1+3; this plan adds two well-scoped features on top.
- **No Open Design integration.** That tool is now strictly worse than this loop for your needs — image import + variable point density + in-repo refinement is exactly the workflow Open Design lacked.
- **No bundled single-file artifact build.** Not needed; preview happens via `npm run dev`.
