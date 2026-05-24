# CODING AGENTS: READ THIS FIRST

> **Current status: Phase 0 complete — Vite build.** See [ROADMAP.md](ROADMAP.md) for the full phase plan.

## Running the app

```
npm install       # first time only
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the dist/ build locally
```

Entry: `src/main.jsx` → `dental-arch.jsx`. Styles: `src/styles.css`.

This folder is an interactive HTML/JSX prototype project. The active work is the dental hero treatment-planning prototype.

## Current project context

Before editing the prototype, read `PROJECT_PROGRESS.md`. It records the current Stage 1/Stage 2 UI state, the Stage 2 tooth-selection contract, the current treatment-addition rules, and the regression watchlist that must be preserved unless the user explicitly changes it.

If the task touches treatment label manual placement, default coordinates, export/import, the Tweaks panel, dental illustration geometry, or current visual-treatment drawing decisions, also read `SESSION_SUMMARY.md`.

## Active files

- `index.html` + `src/main.jsx` - Vite entry (replaces old `Dental Hero.html`).
- `dental-arch.jsx` - Stage 1/Stage 2 state, tooth presence, treatment application/removal, popover wiring, live maxilla/sinus geometry, and FDI number placement.
- `treatments.jsx` - treatment catalog, availability rules, popover cards, treatment labels, default label positions.
- `tweaks-panel.jsx` - compact Tweaks menu, manual placement toggle/export, collapsed menu positioning.
- `teeth-data.jsx` - tooth geometry and identifiers. Latest live geometry change: upper molars only (`molarUOutline`) now use the accepted diagnostic furcation/root form.
- `anatomy.jsx` - standalone anatomy helper paths. Not the current hero source for the promoted maxilla/sinus geometry.

`dental-hero-v2.html` is an older/responsive experiment. Do not treat it as canonical unless the user explicitly asks to switch to it.

## Current visual-treatment context

The user is now building toward a larger backend treatment database. Keep a separation between:

- database treatments: clinical/product source of truth;
- hero visual treatments: reusable SVG overlays in `treatments.jsx`;
- final form treatments: detailed fields loaded after a visual treatment choice.

Do not assume every database treatment needs a unique arch visual. Many records should map to shared visual types.

Current visual backlog from the user:

- crown: only existing tooth or implant site;
- bridge: multi-tooth span where every unit in the span draws a crown, including pontics over missing teeth;
- partial denture: multi-select teeth, removable partial denture visual;
- clear aligners: existing visual needs refinement;
- extraction: replace the current red X with a cleaner clinical marker.

Latest implant decision: the fitted implant redraw is now live. The successful pass used `implant-fit-diagnostic.html` first, then promoted the approved renderer into `treatments.jsx` as `FittedImplantOverlay`. The live implant now uses the full tooth object and real tooth transform (`cx`, `w`, `h`, `type`, `tilt`, `yOffset`, jaw flip, and `biteY`) instead of simplified `x/y/w/h` placement. The style direction still stands: blue outline, white interior, minimal detail, no gradients/metal/cream realism. Implant-only must continue to reuse the implant+crown fixture/collar anchor with the crown hidden.

## Working rules

- Read `Dental Hero.html` in full before changing UI or CSS, then follow its imported JSX modules.
- Preserve the current Stage 2 selection contract unless the user explicitly changes it.
- Keep changes small and focused. `dental-arch.jsx` and `treatments.jsx` share treatment behavior, so update both when a rule affects both availability and application.
- For FDI number placement, preserve the current transform intent: anchor the label on the tooth's local angulated centerline, then counter-rotate/flip so the glyphs stay readable. Recheck upper and lower teeth because the mandibular jaw flip inverts local Y.
- Sinus zones are currently unlabeled by design. Keep the shapes interactive, but do not re-add visible `MS`, `L`, or `R` labels unless requested.
- Maxilla and mandible bone-level edges should both read as anatomical/scalloped rather than straight baselines.
- For visual-treatment drawing, prototype in a separate draft/fit-preview file first, then promote the chosen SVG into `treatments.jsx`.
- New overlays must fit each single tooth using tooth `cx`, `w`, `h`, `jaw`, `yOffset`, and when relevant `tilt`/natural tooth path geometry; test upper and lower orientation before shipping.
- Do not promote implant/crown SVG edits until the user approves them inside the real hero context, not only in standalone draft boards.
- For difficult treatment visuals, use the implant workflow as the model: inspect old plan/current production, identify the geometry source of truth, build a diagnostic with guides, tune one variable at a time, then promote only the approved renderer.
- For dental illustration geometry, use the same diagnostic-first workflow. The current reference board is `dental-geometry-fit-diagnostic.html`; it reconstructed the current hero base before promoting only approved upper molar, maxilla, and sinus edits.
- Do not promote mandible/IDN changes from the diagnostic unless the user explicitly approves them. The latest live push intentionally excluded mandible edits.
- Do not overwrite user screenshots or older prototype variants unless explicitly asked.
- This is a Vite/React app (Phase 0 complete). Run `npm run dev` to work on it. Syntax errors in any JSX module will surface as HMR errors in the browser console.
