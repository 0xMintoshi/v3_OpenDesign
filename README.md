# CODING AGENTS: READ THIS FIRST

This folder is an interactive HTML/JSX prototype project. The active work is the dental hero treatment-planning prototype.

## Current project context

Before editing the prototype, read `PROJECT_PROGRESS.md`. It records the current Stage 1/Stage 2 UI state, the Stage 2 tooth-selection contract, the current treatment-addition rules, and the regression watchlist that must be preserved unless the user explicitly changes it.

If the task touches treatment label manual placement, default coordinates, export/import, the Tweaks panel, or current visual-treatment drawing decisions, also read `SESSION_SUMMARY.md`.

## Active files

- `Dental Hero.html` - current canonical prototype entry file.
- `dental-arch.jsx` - Stage 1/Stage 2 state, tooth presence, treatment application/removal, popover wiring.
- `treatments.jsx` - treatment catalog, availability rules, popover cards, treatment labels, default label positions.
- `tweaks-panel.jsx` - compact Tweaks menu, manual placement toggle/export, collapsed menu positioning.
- `teeth-data.jsx` - tooth geometry and identifiers.
- `anatomy.jsx` - anatomy helper paths.

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

Latest implant decision: the attempted promoted implant redraw was rejected and reverted. Production `treatments.jsx` is back to the earlier `ImplantOverlay({ x, y, w, h, jaw, withCrown, accent })` schematic. The style direction still stands: blue outline, white interior, minimal detail, no gradients/metal/cream realism. The next implant pass must match the natural tooth crown size, position, and angulation first, then place implant-only from the implant+crown fixture anchor.

## Working rules

- Read `Dental Hero.html` in full before changing UI or CSS, then follow its imported JSX modules.
- Preserve the current Stage 2 selection contract unless the user explicitly changes it.
- Keep changes small and focused. `dental-arch.jsx` and `treatments.jsx` share treatment behavior, so update both when a rule affects both availability and application.
- For visual-treatment drawing, prototype in a separate draft/fit-preview file first, then promote the chosen SVG into `treatments.jsx`.
- New overlays must fit each single tooth using tooth `cx`, `w`, `h`, `jaw`, `yOffset`, and when relevant `tilt`/natural tooth path geometry; test upper and lower orientation before shipping.
- Do not promote implant/crown SVG edits until the user approves them inside the real hero context, not only in standalone draft boards.
- Do not overwrite user screenshots or older prototype variants unless explicitly asked.
- This is a prototype using in-browser Babel/React. Syntax errors in any JSX module can break the whole page at load.
