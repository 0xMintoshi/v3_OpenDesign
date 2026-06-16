# Session Summary — Dental Hero Manual Placement

> **Note (2026-05-24):** Phase-level planning has moved to [ROADMAP.md](ROADMAP.md). This file remains the authoritative detailed session log for manual placement, treatment logic, and visual-treatment drawing decisions.



Latest update: 2026-05-23

Scope: manual placement, treatment logic, and visual-treatment drawing handoff.

This file summarizes the active dental hero handoff. It keeps the manual placement details and adds the latest treatment-logic, visual-treatment, and base-geometry decisions for future sessions.

## Latest Live Geometry Polish Session Wrap-Up

Date: 2026-05-23

Goal: make several focused live refinements to the dental arch illustration after the larger diagnostic geometry work.

Files touched:
- `dental-arch.jsx`
- `README.md`
- `SESSION_SUMMARY.md`
- `PROJECT_PROGRESS.md`

What changed in `dental-arch.jsx`:
- FDI numbers now sit on the tooth's own angulated centerline. The anchor moves along local tooth Y before counter-rotation, so labels feel centered to tilted teeth while the text remains readable.
- Lower FDI numbers use the opposite local offset needed by the mandibular flipped coordinate system. This fixed the lower labels appearing near the upper arch.
- The visible `MS · L/R` text labels were removed from the sinus zones. The sinus shapes remain visible, hoverable, and selectable in treatment stage.
- The lower left and lower right sinus corners were rounded by changing the lower side-floor joins in `buildSinus`.
- The maxilla bone edge now uses the same per-tooth scalloped cervical contour style as the mandible, instead of reading as a broad straight line.

Stable behavior after this polish:
- FDI glyphs should stay upright/readable while their placement follows each tooth's tilt.
- Upper labels sit above upper teeth; lower labels sit below lower teeth. Recheck both jaws after any transform/order change.
- Sinus zones should be label-free; do not reintroduce `MS`, `L`, or `R` text unless the user asks.
- Sinus shape remains simple and rectangular-ish, with softened lower corners and no internal anatomical detail.
- Maxilla now has a natural scalloped bone-level edge; mandible already had this behavior.

Workflow reflection from this session:
- The edits were efficient because each request was handled as a narrow patch to the existing live renderer, not a redraw.
- For transform bugs, naming the coordinate-system reason first helped: upper/lower jaw flip, local Y, counter-rotation, then glyph readability.
- For shape tweaks, changing the smallest SVG path segment worked better than rebuilding the anatomy shape.
- The user gave fast visual approval after each small change. Keep future geometry passes in this rhythm: inspect, state the exact local edit, patch, then verify the diff.

Watchlist:
- SVG transform order is fragile. For FDI labels, preserve the sequence: place along local tooth centerline, counter-rotate tooth tilt, then compensate jaw flip for text readability.
- Do not make maxilla/sinus more anatomically detailed unless asked. The accepted style is clean schematic outline.
- When changing sinus geometry, preserve floor relationship to the live cervical baseline and keep left/right symmetry.
- When changing maxilla bone edge, preserve smooth cervical scallops and avoid jagged joins near posterior ends.

## Latest Dental Illustration Geometry Session Wrap-Up

Date: 2026-05-22

Goal: redesign parts of the base dental illustration geometry with a diagnostic-first workflow, then promote only the approved changes to the live hero.

Files touched or created:
- `dental-geometry-fit-diagnostic.html`
- `teeth-data.jsx`
- `dental-arch.jsx`
- `README.md`
- `SESSION_SUMMARY.md`
- `PROJECT_PROGRESS.md`

What happened:
- The user explicitly requested no live edits at first. A diagnostic board was created and then rebuilt to use the current hero diagram as the base rather than isolated standalone sketches.
- The diagnostic compared the current hero against drafted geometry in the same arch context. This became the working habit for this session: draft in context, isolate the exact shape being judged, then promote only the approved piece.
- Sinus drafts were accepted. Constraint: keep the lower sinus floor anchored to the same live-build baseline while making the sinus more rectangular and raising/widening the top corners.
- Maxilla draft was accepted for now. Constraint: simple outline only, smoother corners, no internal detail.
- Mandible drafts were explored but not accepted for live. The final live push explicitly excluded mandible changes.
- Upper molars took several iterations. The winning direction started by copying the existing `wisdomUOutline` root language from teeth 18/28 onto upper molars 16/17/26/27, then adding a palatal root from the furcation.
- The final approved molar behavior: broad mesial/distal root bases, smoother single-point furcation close to the crown, palatal root emerging from that furcation, palatal root smoother and slightly shorter/rounder than the mesial/distal roots, and no jagged inner transitions.

Current live geometry state:
- `teeth-data.jsx`: `molarUOutline` is live with the accepted upper molar furcation/root geometry. This affects upper first/second molars 16/17/26/27.
- `dental-arch.jsx`: `bonePath(..., 'upper', ...)` has the accepted smoother maxilla outline.
- `dental-arch.jsx`: `buildSinus` has the accepted more rectangular sinus shape; floor remains derived from the live cervical baseline logic.
- Mandible branch in `bonePath`, IDN rendering, treatment logic, props, exports, interactions, layout, and colors were intentionally not changed by the geometry promotion.
- `anatomy.jsx` was not edited in this session.

User preferences reinforced:
- Study the current hero outline style before drawing. Do not invent a new dental illustration style.
- For teeth, edit from the existing hero geometry or copy nearby accepted tooth language before drawing new anatomy from scratch.
- The user prefers diagnostic drafts that show the real current diagram context, not isolated icons.
- When a reference upload is simple, follow the silhouette directly; avoid over-anatomizing with extra bulges, rods, or decorative smoothing.
- Make one variable visible at a time: root taper, furcation, mandible, sinus, etc. should each get their own focused drafts.

Watchlist:
- Mandible is still unresolved. Do not assume any diagnostic mandible variant is approved.
- IDN currently remains acceptable only because the live mandible was not changed. If mandible changes later, recheck IDN containment inside the new mandibular outline.
- Upper molar roots are sensitive to tiny curve changes. Preserve the broad root bases, clean single-point furcation, and smooth palatal-root emergence if adjusting crowns later.
- Do not change lower molars while tuning upper molars unless explicitly asked.
- Keep maxilla/sinus simple: outline/sinus zones only, no internal anatomical detail.

Reusable process lesson:
- For base illustration geometry, the diagnostic must recreate the current hero diagram first. A standalone sketch can mislead because the user judges fit, style, and proportion against the live hero.
- Use existing tooth outlines as source vocabulary. In this session, 18/28 (`wisdomUOutline`) was the useful source for 16/17/26/27 root language.
- Promote the smallest approved geometry patch. The final live push changed only `molarUOutline`, upper `bonePath`, and `buildSinus`; mandible/IDN stayed untouched.

## Latest Implant Diagnostic Session Wrap-Up

Date: 2026-05-22

Goal: fix the implant/implant+crown visual by planning first, studying the failed prior approach, creating a diagnostic preview, tuning the SVG there, and only then promoting the approved result to the live treatment layer.

Files touched or created:
- `implant-fit-diagnostic.html`
- `treatments.jsx`
- `PROJECT_PROGRESS.md`
- `SESSION_SUMMARY.md`
- `README.md`

What happened:
- The session started with no production edits. The first move was to inspect the old plan, the reverted production overlay, the current implant drafts, and the tooth geometry.
- The key finding was that the old production `ImplantOverlay` only received simplified placement data (`x`, `y`, `w`, `h`, `jaw`, `withCrown`, `accent`). The real tooth renderer uses more precise geometry: `cx`, `w`, `h`, `type`, `tilt`, `yOffset`, and jaw flip.
- A separate diagnostic file, `implant-fit-diagnostic.html`, was created before touching production. It renders real tooth ghost outlines, crown envelopes, implant axis guides, collar/cervical guides, fixture bounds, upper/lower jaw orientation, and multiple tooth classes.
- The diagnostic made proportion problems visible without risking the live hero. It showed that crown and fixture size must respond to tooth class and actual tooth envelope, not a single fixed crown/fixture drawing.
- The crown shape was iterated in the diagnostic only: corners were rounded, the internal curved "SS" crown detail was removed, the occlusal transition was softened, and one over-correction was reverted before making a smaller cleaner change.
- After user approval, the fitted renderer was promoted into `treatments.jsx`.

Current live implant state:
- `implant-only` and `implant-crown` still use the same treatment IDs and availability logic.
- Live rendering now uses `FittedImplantOverlay` in `treatments.jsx`.
- `FittedImplantOverlay` receives the full `tooth` object and `biteY`, then mirrors the real tooth transform: arch bite position first, tooth `cx`, jaw flip, `yOffset`, and `tilt`.
- Implant+crown uses the approved smooth crown silhouette with no internal crown grooves.
- Implant-only reuses the same fitted fixture/collar anchor with the crown hidden, rather than being separately positioned.
- Style remains blue outline, white interior, minimal detail, no metal, no gradients, no cream realism.

Reusable process lesson:
- For visual-treatment upgrades, do not redraw straight into production when fit matters. First identify the geometry source of truth, then build a diagnostic that makes position, proportion, angulation, and envelope visible.
- Separate geometry fitting from illustration styling. The diagnostic should show guides and honest overlays first; beauty can come later.
- Use real production transforms in the diagnostic. For per-tooth overlays that means tooth `cx`, `w`, `h`, `type`, `tilt`, `yOffset`, `jaw`, and natural tooth paths when relevant.
- Tune one variable at a time. In this session, the accepted result came from changing only the crown path after the fit math was stable.
- Promote only the approved renderer, not the whole diagnostic apparatus. Diagnostic guides stay in the preview file; production gets the minimal fitted overlay code.
- Keep the diagnostic file as the reference for future regressions. If implant visuals drift later, compare against `implant-fit-diagnostic.html`.

Recommended workflow for the next visual features:
- Crown: first create a crown-fit diagnostic using the natural tooth path/envelope, then promote a per-tooth crown overlay.
- Bridge: build a span diagnostic first, because span logic must solve abutments, pontics, and missing-tooth gaps before styling.
- Partial denture: build a multi-tooth diagnostic with clasp/connector guides and selected-tooth anchors.
- Clear aligners: use a diagnostic that overlays shell bounds over current tooth crowns across upper/lower examples.
- Extraction marker: still simpler, but test against real crown centers and tooth tilt before replacing the live red X.

## Previous Visual-Treatment Session Wrap-Up

Date: 2026-05-21

Goal: establish how visual treatments should connect to a future backend treatment database, then explore implant and implant+crown redraws in the current hero style.

Files touched or created in this visual pass:
- `treatments.jsx`
- `crown-visual-drafts.html`
- `implant-visual-drafts.html`
- `implant-hero-fit-preview.html`
- `README.md`
- `PROJECT_PROGRESS.md`
- `SESSION_SUMMARY.md`

Backend/design model decision:
- Keep the backend treatment database as the clinical/product source of truth.
- Map many database treatments to a smaller set of reusable hero visual types.
- Keep the hero visual layer focused on display and target selection, not as the treatment database.
- Some future database treatments should have `visualType: null` and appear only in search/final forms, not as arch overlays.

Current user-requested visual backlog:
- `crown`: draw on an existing tooth or an implant site.
- `bridge`: model as a span. Example `11-13` draws crown units on 11, 12, and 13, even if 12 is missing.
- `partial denture`: multi-select teeth and draw a removable partial denture visual.
- `clear aligners`: current `ortho-aligners` exists but needs visual refinement.
- `extraction`: current red X is disliked and should be redrawn.

Implant decision from this older pass:
- The user rejected realistic/gradient/metal implant drafts.
- The preferred style still follows the existing hero language: blue outline, white interior, minimal detail.
- A promoted implant redraw failed in real hero context: the implant+crown position was wrong, the implant became too small, and the generated crown looked like a bowl.
- The failed promoted redraw was reverted during this older pass. This is no longer current production state; the later implant diagnostic pass promoted `FittedImplantOverlay`.
- Do not treat `implant-visual-drafts.html` or `implant-hero-fit-preview.html` as approved production source.
- The later accepted production direction solved `implant-crown` first by using the natural tooth crown size, position, and angulation as the reference structure, then derived `implant-only` from the same fixture/collar anchor with the crown hidden.

Practical habit for future visual work:
- Start with a draft board, then a hero-fit preview on real tooth positions, then production source.
- Do not promote a standalone SVG until it has been checked in the actual `Dental Hero.html` hero context and explicitly approved there.
- Keep new treatment visuals as reusable per-tooth or per-span overlays driven by `cx`, `w`, `h`, `jaw`, `yOffset`, and when relevant `tilt`/natural tooth paths.
- Avoid realistic shading unless the user explicitly reverses this direction.
- Avoid generating separate cartoon crown caps; natural tooth geometry is the reference.

## Overview

Goal: provide a predictable manual placement system for treatment labels on the dental hero. The user wanted locked default spawn positions (immutable by page functions), but still allow interactive, session-only manual edits (drag/lock) that do not persist across sessions unless explicitly promoted.

Work completed (high level):
- Implemented drag-and-drop placement for labels with session-only edits.
- Introduced a two-tier position model: DEFAULT (in-code, immutable), persistent (localStorage, optional), and session (in-memory) overrides.
- Added export/import helpers and a visible export modal so JSON can be copied/downloaded.
- Enabled programmatic mirroring for left/right label symmetry and enforced it at initialization.
- Fixed several cross-browser pointer-capture issues so dragging works in Edge and the app preview.
- Tuned visual/typographic issues (reverted SVG text squeezing, restored font stack) and reduced label width.

## Files changed (summary)

- treatments.jsx
  - Core manual-placement implementation and most edits live here.
  - Added: sessionPositions (in-memory), persistentPositions (localStorage), DEFAULT_LABEL_POSITIONS (in-code authoritative defaults).
  - Drag & drop: pointer handlers attached to label rects, touch-action fixes, pointer capture fixed to use `evt.currentTarget` and stored dragRef.
  - Export/import API: `window.exportLabelPositions()` and `window.setLabelPositions(obj)` exposed.
  - Label rendering: LABEL_W reduced to 150, removed `textLength` and `lengthAdjust` (fixed distorted font), set font to `var(--sans)`.
  - Mirroring: programmatic mirror enforcement for matching left/right teeth and sinuses (mirror axis uses view width; mirrored_x = viewWidth - x).
  - Initialization: clears persistent overrides (when requested) and enforces default immutability.

- dental-arch.jsx
  - Tweaks wiring and controls updated.
  - Export button behaviour improved: now opens an export modal with JSON preview and copy/download options.
  - Exposes `manualPlacementMode` prop into TreatmentLabels.

- tweaks-panel.jsx
  - Tweaks panel default-open state changed so the UI is visible during review.

- Dental Hero.html
  - Canonical HTML artifact for the active prototype; existing file loads the updated JSX modules. (If you want an explicit build / precompile step we can add it.)

> Note: many small edits and fixes were made iteratively in treatments.jsx (pointer, layout, export, default positions). The authoritative implementation lives in that file.

## How the placement model works now

There are three layers of label positions (display priority order):

1. Session positions (sessionPositions) — in-memory, created by user dragging while the page is open. These are immediately visible but not persisted. They are included in the export payload so you can copy/paste them back to me to promote to defaults.
2. Persistent positions (persistentPositions) — saved in localStorage under `labelPositions`. These are used for non-default keys when present. The project includes a forced-clear option that can remove this key to revert to defaults.
3. DEFAULT_LABEL_POSITIONS — the in-code canonical spawn positions you locked in. These are treated as immutable by page functions (imports ignore DEFAULT keys). They are the default spawn points every new session will use.

Behavioral rules:
- Dragging always writes to sessionPositions (so changes are session-only by default).
- Double-click lock toggles affect session state only (DEFAULT keys remain locked permanently unless you ask me to update code).
- Export (`window.exportLabelPositions()` or Tweaks → Export) returns a merged object (defaults + persistent + session) suitable for handing back for promotion to permanent defaults.
- setLabelPositions(obj) will write only non-default keys into persistentPositions (it ignores DEFAULT keys).
- Mirroring of left/right is enforced programmatically at init for the tooth groups you asked (upper 11–18 ↔ 21–28, lower 41–48 ↔ 31–38, sinuses mirrored). The mirror axis is computed from the SVG view width.

## How to use / verify

1. Open `Dental Hero.html` in the preview.
2. Enter Stage 2 (Treatment Plan).
3. Open Tweaks (bottom-right) and enable `Manual placement mode`.
4. Drag a label — it should move immediately and the connector updates.
5. Reload the page — labels revert to DEFAULT positions (session edits are not persisted).
6. Export current positions: Tweaks → Export (modal) or run `window.exportLabelPositions()` in the console. The modal shows JSON and lets you copy/download.

## Concrete changelog (chronological highlights)

- Added manual placement mode and per-label drag handlers.
- Implemented sessionPositions + persistentPositions + DEFAULT positions model.
- Fixed pointer capture to use `evt.currentTarget` and stored dragRef (Edge + preview stability).
- Routed pointer handlers to the label `<rect>` and set text elements to `pointer-events: none` to avoid interceptions.
- Reduced LABEL_W from 196 → 150 and prevented text squeezing by removing `textLength` adjustments.
- Restored label font to the previous (system / `var(--sans)`) stack.
- Added export modal with JSON preview and copy/download buttons.
- Added `window.exportLabelPositions()` and `window.setLabelPositions(obj)` helper APIs.
- Enforced programmatic mirroring and force-cleared persistent overrides on init (as requested) so defaults appear immediately.

## Known notes & suggestions

- Export/import flow: the modal currently supports copy + download. I can add an Import (file upload) button that calls `window.setLabelPositions()` and optionally promotes values to DEFAULT.
- Visual cues: consider adding a small badge/outline that shows whether a label is DEFAULT / persistent / session. This makes it clearer which source is active.
- Persistence policy: right now DEFAULT keys are immutable. If you want a process for promoting session edits to DEFAULT, I can add a safe review/promote flow.
- Build: the prototype uses in-browser Babel for JSX transform. For production or heavy testing, precompile the JSX to avoid runtime transforms and to match browser behaviour.

## Latest Formatting Session Wrap-Up

Date: 2026-05-19

Goal: clean up the existing `Dental Hero.html` prototype formatting without changing the Stage 2 tooth-selection rules.

Files touched in this cleanup:
- `Dental Hero.html`
- `dental-arch.jsx`
- `tweaks-panel.jsx`
- `PROJECT_PROGRESS.md`

Current UI state:
- Stage 1 and Stage 2 share a centered top instruction title via `.stage-hint`.
- Stage 1 lower footer no longer repeats the instruction copy.
- Stage 2 lower footer no longer repeats `Left click a tooth...` beside the back button.
- Stage 1 arch buttons read `Upper Edentulous` and `Lower Edentulous`; restore states are capitalized.
- Stage 1 advance button reads `Stage 2 ->`.
- Stage 2 back button reads `Stage 1` with the left arrow retained, and is blue/primary like the Stage 1 advance button.
- Stage 1 and Stage 2 footer buttons share the same sizing, alignment, and font size.
- Tweaks menu no longer shows `Layout Debug Guides`, `Arch Curvature`, or `Treatment Labels`.
- `Accent` swatches in Tweaks are compressed into short toggle-height rectangles.
- `Manual Placement Mode` is one horizontal row: label, compact `Export` button, toggle.
- Tweaks menu can collapse to a compact lower-right button; the expanded collapse icon is positioned on the same lower-right anchor.
- Stage 2 title currently reads: `Left-click opens treatment. Ctrl+L-click or right-click selects multiple.`

Preserved Stage 2 interaction contract:
- Left click on a tooth opens the treatment popover for that single tooth.
- Ctrl/Cmd + left click toggles multi-select.
- Right click toggles multi-select and suppresses the browser context menu.
- The floating action bar appears only after deliberate multi-select.
- Drag-to-select remains removed.

Open note for the next session:
- The phrase `Ctrl+L-click` matches the latest requested copy, but it is potentially ambiguous because Ctrl+L is a common browser shortcut. Consider changing it to `Ctrl-click` or `Ctrl + left-click` if the user wants clearer wording.

## Latest Treatment Logic Session Wrap-Up

Date: 2026-05-20

Goal: update Stage 2 treatment-addition logic to match the user's clinical model, then preserve the decisions for the next session.

Files touched in this session:
- `Dental Hero.html`
- `dental-arch.jsx`
- `treatments.jsx`
- `tweaks-panel.jsx`
- `README.md`
- `SESSION_SUMMARY.md`
- `PROJECT_PROGRESS.md`

Treatment logic now:
- `extraction` is available for present teeth and, when applied in Stage 2, marks the selected teeth missing.
- Removing an `extraction` label from a tooth restores that tooth to present.
- `implant-only`, `implant-crown`, `socket-preservation`, `gbr`, and `simultaneous-graft` require selected teeth to already be missing/extracted.
- `implant-only` and `implant-crown` remain mutually exclusive per tooth.
- Bone graft treatments are not mutually exclusive. `socket-preservation`, `gbr`, and `simultaneous-graft` may stack on the same tooth.
- Existing same-treatment rows still merge target teeth instead of creating duplicate rows.
- `alveolectomy` and `complete-denture` are not mutually exclusive. Both can exist on an edentulous arch.
- `alveolectomy` and `complete-denture` require an edentulous arch, whether it started edentulous or became edentulous through extractions.
- `ortho-brackets` and `ortho-aligners` require at least one present tooth. They cannot be added when the patient is fully edentulous.
- Full-mouth ortho treatments remain mutually exclusive with each other.

Popover and control updates:
- Treatment item subtitle lines were removed from the popover for more compact cards.
- Disabled treatment explanations are kept as hover titles instead of always-visible subtitles.
- Stage 2 helper copy is intentionally `Left-click opens treatment. Ctrl+L-click or right-click selects multiple.`
- The Tweaks menu uses a shared lower-right anchor for the expanded panel, the collapse chevron, and the collapsed `Tweaks` reopen button.

Default label positions updated:
- `arch-upper` is locked at `{ "cx": 1509.6471557617188, "cy": 353.6470413208008, "locked": true }`.
- `arch-lower` is locked at `{ "cx": 1509.6469116210938, "cy": 459.56858825683594, "locked": true }`.

Removal behavior:
- Tooth label cards remove one treatment from one tooth target.
- Non-tooth labels remove one sinus or arch target from the treatment row.
- Full-mouth treatment removal deletes the whole full-mouth treatment row because its only target is `both`.
- The only removal that currently changes tooth presence is extraction removal, which restores the tooth to present.

## Takeaways — how to make future sessions smoother

- Lock the desired default positions in a single canonical file (we used DEFAULT_LABEL_POSITIONS in `treatments.jsx`). Keep that file small and documented so promotion workflows are clear.
- Keep the export/import workflow robust and visible (modal + copy + download + import) so the user/operator can hand edits back and forth without relying on console logs.
- Visualize sources of truth: add an in-UI badge (default/persistent/session) and a mirror-axis overlay to speed verification.
- Cross-browser pointer handling: always use `evt.currentTarget` for pointer capture and attach handlers to predictable child elements (rect background). Add `touch-action: none` to draggable elements to avoid platform gesture conflicts.
- Testing: create a short QA checklist for interactive features (drag in Edge, Chrome, preview) and add small automated visual checks if possible.
- Small diffs: prefer many small, focused commits/patches. This session iterated rapidly; smaller commits make rollbacks and code-review easier.

## DEFAULT_LABEL_POSITIONS (developer-only)

The authoritative locked defaults are stored in treatments.jsx as the
`DEFAULT_LABEL_POSITIONS` constant. Paste the JSON below into that variable
to reproduce the exact locked positions we agreed on in this session. These
values are immutable from the UI and must be changed only by editing the file
or via code (developer action).

```json
{
  "tooth-upper-17": { "cx": 231.59215898513787, "cy": 155.21578979492188, "locked": true },
  "tooth-upper-16": { "cx": 389.34824157714837, "cy": 98.66664123535156, "locked": true },
  "tooth-upper-18": { "cx": 141.77100402832025, "cy": 243.68623733520508, "locked": true },
  "tooth-upper-14": { "cx": 567.9059326171874, "cy": 16.54902935028076, "locked": true },
  "tooth-upper-15": { "cx": 413.98885864257807, "cy": 15.294124603271484, "locked": true },
  "tooth-upper-13": { "cx": 549.9755456542969, "cy": 99.92150688171387, "locked": true },
  "tooth-upper-12": { "cx": 704.5947497558593, "cy": 118.82353210449219, "locked": true },
  "tooth-upper-11": { "cx": 723.056513671875, "cy": 34.666643142700195, "locked": true },

  "sinus-right": { "cx": 470.66656494140625, "cy": -52.90190887451172, "locked": true },

  "tooth-upper-21": { "cx": 876.943486328125, "cy": 42.470603942871094, "locked": true },
  "tooth-upper-22": { "cx": 894.5177368164061, "cy": 125.92157936096191, "locked": true },
  "tooth-upper-23": { "cx": 1050.7529663085936, "cy": 107.72551727294922, "locked": true },
  "tooth-upper-24": { "cx": 1050.753088378906, "cy": 27.411767959594727, "locked": true },
  "tooth-upper-25": { "cx": 1208.8708251953124, "cy": 28.666690826416016, "locked": true },
  "tooth-upper-26": { "cx": 1235.8512939453124, "cy": 105.84311103820801, "locked": true },
  "tooth-upper-27": { "cx": 1360.9133544921874, "cy": 193.21571350097656, "locked": true },
  "tooth-upper-28": { "cx": 1444.3645263671874, "cy": 283.5686721801758, "locked": true },

  "sinus-left": { "cx": 1129.3334350585938, "cy": -52.90190887451172, "locked": true },

  "arch-upper": { "cx": 1509.6471557617188, "cy": 353.6470413208008, "locked": true },
  "arch-lower": { "cx": 1509.6469116210938, "cy": 459.56858825683594, "locked": true },
  "full-mouth": { "cx": 1449.6470947265625, "cy": 430.07843017578125, "locked": true },

  "tooth-lower-48": { "cx": 155.87058105468748, "cy": 515.0979919433594, "locked": true },
  "tooth-lower-47": { "cx": 228.19216613769532, "cy": 604.8234252929688, "locked": true },
  "tooth-lower-46": { "cx": 355.9020690917969, "cy": 692.3920288085938, "locked": true },
  "tooth-lower-45": { "cx": 405.39619750976556, "cy": 781.568603515625, "locked": true },
  "tooth-lower-44": { "cx": 517.5184301757812, "cy": 699.3726806640625, "locked": true },
  "tooth-lower-43": { "cx": 562.7336022949219, "cy": 790.6923828125, "locked": true },
  "tooth-lower-42": { "cx": 678.0325244140624, "cy": 705.0194091796875, "locked": true },
  "tooth-lower-41": { "cx": 720.12853515625, "cy": 793.41162109375, "locked": true },

  "tooth-lower-38": { "cx": 1444.1294189453125, "cy": 515.0979919433594, "locked": true },
  "tooth-lower-37": { "cx": 1371.8078338623047, "cy": 604.8234252929688, "locked": true },
  "tooth-lower-36": { "cx": 1244.0979309082031, "cy": 692.3920288085938, "locked": true },
  "tooth-lower-35": { "cx": 1194.6038024902344, "cy": 781.568603515625, "locked": true },
  "tooth-lower-34": { "cx": 1082.4815698242187, "cy": 699.3726806640625, "locked": true },
  "tooth-lower-33": { "cx": 1036.6388952636719, "cy": 790.6923828125, "locked": true },
  "tooth-lower-32": { "cx": 921.9674755859376, "cy": 705.0194091796875, "locked": true },
  "tooth-lower-31": { "cx": 874.2244311523438, "cy": 794.0391235351562, "locked": true }
}
```

## Reproduction prompt (paste at session start)

If you paste the following brief at the start of a new design session the agent will reproduce the work and land on the same staged state we reached today (manual placement enabled, defaults installed, mirroring enforced):

```
Reproduce dental-hero manual placement session:
- Write DEFAULT_LABEL_POSITIONS in treatments.jsx to the provided JSON (developer-only locked defaults).
- Implement sessionPositions (in-memory) for session-only drags and persistentPositions in localStorage for non-default keys.
- Rendering precedence: session -> persistent -> defaults -> computed layout.
- Manual placement mode: when enabled via Tweaks, labels are draggable (pointer events on rect), drag writes to sessionPositions, double-click toggles session lock for non-defaults.
- Expose window.exportLabelPositions() and window.setLabelPositions(obj) (imports filter out default keys).
- Enforce exact mirroring for pairs (axis x=1600): upper 11..18 <-> 21..28, lower 41..48 <-> 31..38, sinus-left <- mirror(sinus-right).
- Reduce LABEL_W to 150, remove SVG textLength/lengthAdjust; restore fontFamily to var(--sans).
- Provide export modal (copy/download) and ensure pointer capture uses evt.currentTarget and stored dragRef.

Use the DEFAULT_LABEL_POSITIONS JSON included above.
```
