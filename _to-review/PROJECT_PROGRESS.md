# Project Progress

> **Note (2026-05-24):** Phase-level planning has moved to [ROADMAP.md](ROADMAP.md). This file remains the authoritative record of implementation decisions and known-good behavior for the current in-browser-Babel prototype. Continue reading it for regression watchlists, treatment logic, and geometry decisions.



## Current State

The project is an interactive dental hero prototype centered on `Dental Hero.html` and the JSX modules it loads. The active flow includes Stage 1/Stage 2 dental arch interaction, treatment popovers, treatment labels, and a manual placement system for label coordinates.

Latest continuation made focused live geometry polish edits in `dental-arch.jsx`: FDI number placement now follows each tooth's angulated centerline, lower FDI placement is corrected for the mandibular flip, sinus `L/R` labels are removed, lower sinus corners are rounded, and the maxilla bone level now uses a scalloped cervical contour like the mandible.

Current session wrap-up: the active prototype is in a stable treatment-logic and formatting state; implant/crown visual redesign is live; upper molar roots, maxilla outline, sinus shapes, FDI label anchoring, and maxilla bone-level scalloping are now accepted live behavior. `Dental Hero.html` is the canonical entry file. `dental-hero-v2.html` is an older/responsive experiment and should not be edited unless the user asks to switch to it.

Latest live geometry polish:

- `dental-arch.jsx`: FDI label anchors are positioned on each tooth's local angled centerline, then counter-rotated/flipped so text stays readable.
- `dental-arch.jsx`: mandibular FDI offsets account for the lower jaw flipped coordinate system; lower labels should remain below the lower arch.
- `dental-arch.jsx`: sinus zones no longer display `MS · L/R` text labels.
- `dental-arch.jsx`: lower left/right sinus corners are rounded while keeping the same overall sinus footprint.
- `dental-arch.jsx`: the upper/maxilla bone level now follows a per-tooth scalloped cervical contour instead of a straight/broad line.

Previous geometry promotion:

- `teeth-data.jsx`: upper first/second molars (`molarUOutline`, teeth 16/17/26/27) now use the accepted root/furcation form.
- The molar root source vocabulary came from existing 18/28 upper wisdom roots, then added a palatal root from the furcation.
- Accepted molar traits: broad mesial/distal bases, smooth single-point furcation close to the crown, palatal root emerging from that point, palatal root slightly shorter/rounder than mesial/distal roots, no jagged inner transitions.
- `dental-arch.jsx`: maxilla outline is smoother/simple-outline-only.
- `dental-arch.jsx`: sinus shapes are more rectangular and wider/raised at the top corners while the floor still follows the live cervical baseline logic.
- Mandible and IDN were intentionally not promoted. Do not treat any diagnostic mandible draft as approved.

The latest treatment logic pass changed Stage 2 clinical rules:

- `extraction` marks selected present teeth missing when applied.
- Removing an `extraction` label restores that tooth to present.
- `implant-only`, `implant-crown`, `socket-preservation`, `gbr`, and `simultaneous-graft` require selected teeth to already be missing/extracted.
- `implant-only` and `implant-crown` remain mutually exclusive per tooth.
- Bone graft treatments are stackable; `socket-preservation`, `gbr`, and `simultaneous-graft` do not replace each other.
- Existing same-treatment rows still merge target teeth instead of creating duplicates.
- `alveolectomy` and `complete-denture` are not mutually exclusive and may both exist on an edentulous arch.
- `alveolectomy` and `complete-denture` require an edentulous arch, including an arch that became edentulous through Stage 2 extractions.
- `ortho-brackets` and `ortho-aligners` cannot be added when the patient is fully edentulous; they require at least one present tooth.
- Full-mouth ortho treatments remain mutually exclusive with each other.

The latest UI pass removed treatment item subtitles from the popover cards for compactness, preserved disabled reasons as hover titles, restored Stage 2 helper copy to `Left-click opens treatment. Ctrl+L-click or right-click selects multiple.`, locked `arch-upper` and `arch-lower` label defaults to the latest provided coordinates, and made the Tweaks panel/collapse/reopen controls share one lower-right anchor.

Older formatting state still applies: the Tweaks menu is simplified and collapsible, the export control is attached to the `Manual Placement Mode` row, Stage 1/Stage 2 footer buttons share sizing, duplicate instructional footer copy has been removed, and the top stage instruction line is centered for both stages. Keep the current Stage 2 selection contract unless the user explicitly asks to change it.

The core Stage 2 selection contract is still:

- Left click on a tooth opens the treatment popover for that single tooth.
- Ctrl/Cmd + left click toggles that tooth into or out of multi-select.
- Right click toggles that tooth into or out of multi-select and suppresses the browser context menu.
- The floating action bar appears only after deliberate multi-select.
- Drag-to-select has been removed because it conflicted with normal tooth selection.

## Latest Session Summary

Date: 2026-05-23

Goal: apply focused live polish to FDI label placement, sinus labeling/shape, and the maxilla bone-level contour.

Outcome:

- Kept the edits narrow and limited to `dental-arch.jsx`.
- Changed FDI number placement so labels follow the tooth angulation line while text remains upright.
- Corrected lower FDI label placement by using the correct local-Y offset under mandibular jaw flip.
- Removed visible sinus `MS · L/R` labels without removing sinus interaction.
- Rounded the lower left/right corners of both sinus shapes.
- Changed maxilla bone level to use the same scalloped cervical contour language as the mandible.

Stable geometry behavior after this session:

- Upper and lower FDI labels should feel centered to each tooth's own tilt.
- Lower FDI labels must stay on the lower arch; this is a regression check for any future transform edits.
- Sinus zones remain visible/interactive but unlabeled.
- Maxilla and mandible bone-level edges now both avoid a straight-line read.
- Maxilla/sinus style remains schematic and simple: no extra internal detail.

Process takeaways:

- This session worked well because each request was solved as one small local edit, then visually judged before moving on.
- For transform issues, first identify the coordinate system and transform order; avoid compensating with arbitrary screen-space offsets.
- For SVG anatomy polish, edit the smallest path segment that carries the visual problem.
- Keep saying which exact behavior is being preserved before editing: readable text, jaw orientation, sinus interaction, outer footprint, or previous accepted geometry.

## Previous Dental Geometry Summary

Date: 2026-05-22

Goal: redesign the dental illustration geometry by drafting in the real hero context first, then promote only the accepted geometry while leaving mandible untouched.

Outcome:

- Created and iterated `dental-geometry-fit-diagnostic.html` without touching live files first.
- Rebuilt the diagnostic from the current hero diagram instead of isolated tooth/anatomy sketches.
- Accepted the sinus direction: more rectangular, wider/raised top corners, lower sinus floor tied to the live baseline.
- Accepted the maxilla direction for now: simple smoother outline only.
- Explored mandible drafts but did not promote them; mandible remains a future task.
- Upper molar roots were iterated heavily. The accepted direction copied 18/28 (`wisdomUOutline`) root language onto 16/17/26/27, then added a smoother palatal root from a single-point furcation.
- Promoted only `molarUOutline`, upper maxilla `bonePath`, and `buildSinus`.
- Left treatment logic, props, exports, interactions, layout, colors, mandible, IDN, and `anatomy.jsx` untouched.

Stable geometry behavior after promotion:

- Upper molars keep current hero crown style but have redesigned roots/furcation.
- Mesial/distal roots should remain broad at the cervical base and tapered toward the apex.
- Palatal root should emerge from the furcation, not appear as a thin stick or bulb-ended appendage.
- Maxilla and sinus are simple outline/zone shapes only; no internal anatomy details.
- Mandible is still the live pre-existing outline.

## Previous Visual-Treatment Summary

Date: 2026-05-21

Goal: start the visual-treatment drawing workflow, recover from the failed implant redraw, and establish a safer diagnostic-to-production workflow for future visual upgrades.

Outcome:

- Discussed how future backend treatment records should map into shared hero visual types instead of one visual per database treatment.
- Listed the current supported visual treatment families: extraction, implant, bone graft, sinus lift, arch surgery/alveolectomy, complete denture, and orthodontics.
- Captured the next visual-treatment backlog from the user: crown, bridge, partial denture, clear aligners, and extraction redraw.
- Created draft/preview files for visual exploration: `crown-visual-drafts.html`, `implant-visual-drafts.html`, and `implant-hero-fit-preview.html`.
- User rejected realistic implant drafts and clarified the style rule: match the current hero language with blue outline and white interior.
- A blue-outline candidate was promoted into `treatments.jsx`, then rejected after real-hero review because crown size/position/angulation were wrong and the implant became too small.
- The next pass created `implant-fit-diagnostic.html` as a measurement board using the real tooth data, real arch transforms, tooth ghost outlines, crown envelope guides, implant axis, collar line, and fixture bounds.
- The diagnostic pass exposed the root cause: the old production implant only received simplified `x`, `y`, `w`, `h`, and `jaw` values, while the real teeth also use `cx`, `yOffset`, `tilt`, jaw flip, tooth type, and natural tooth path geometry.
- The crown silhouette was tuned in the diagnostic first: rounded crown corners, removed the internal curved "SS" detail lines, and softened the occlusal shoulder with a simpler continuous Bezier path.
- After user approval in the diagnostic, the fitted renderer was promoted into `treatments.jsx`.

Stable implant behavior after promotion:

- `implant-only` and `implant-crown` still use existing treatment IDs.
- Both now route through `FittedImplantOverlay` in `treatments.jsx`.
- `FittedImplantOverlay` receives the full `tooth` object plus `biteY`, `withCrown`, and `accent`, so it can use tooth type, width, height, `cx`, `yOffset`, `jaw`, and `tilt`.
- Implant placement now mirrors the real tooth coordinate model: arch bite translation first, then tooth-level translate/flip/rotate.
- The desired style remains non-realistic: blue outline, white interior, minimal detail, no gradients, no metal fills, no cream crown fill.
- Implant+crown is solved first from the natural tooth crown envelope; implant-only reuses the same fixture/collar anchor with the crown hidden.

## Previous Treatment Logic Summary

Date: 2026-05-20

Goal: align treatment-addition/removal logic with the clinical model and keep the popover compact.

Outcome:

- Audited current treatment addition and removal behavior.
- Changed `extraction` so adding it marks teeth missing.
- Added reverse logic so removing an extraction label restores the tooth to present.
- Changed implant/socket/graft availability so `implant-only`, `implant-crown`, `socket-preservation`, `gbr`, and `simultaneous-graft` require missing/extracted selected teeth.
- Preserved target merging for repeated same-treatment additions.
- Removed false mutual exclusion between bone graft treatments.
- Removed false mutual exclusion between `alveolectomy` and `complete-denture`.
- Added a fully edentulous guard so metal braces and clear aligners cannot be added when no teeth are present.
- Removed popover treatment subtitles for more compact treatment cards.
- Locked latest default arch label coordinates for `arch-upper` and `arch-lower`.
- Re-anchored the Tweaks menu so expanded, collapsed, and collapse affordances share one lower-right position.

## Previous Session Summary

Date: 2026-05-19

Goal: make Stage 2 multi-select usable without breaking the primary left-click popover behavior, then clean up the Stage 1/Stage 2 formatting and Tweaks menu.

Outcome:

- Audited the existing Stage 2 interaction model.
- Identified that drag-select only started from the SVG background and ignored tooth-start drags.
- First tried an explicit click/drag selection mode with a floating apply bar.
- Rejected that mode because click and drag still felt poor for this UI.
- Restored left click as the primary single-tooth popover action.
- Changed multi-select to deliberate modifier/right-click gestures.
- Kept the floating action bar, but only for multi-selection.
- Removed active drag-select behavior and stale "drag to select" helper copy.
- Centered the Stage 1/Stage 2 instruction title at the top of the prototype.
- Removed duplicated lower-left instruction copy from both stages.
- Simplified the Tweaks menu: removed Layout Debug Guides, Arch Curvature, and the Treatment Labels toggle.
- Changed Stage 1 controls to `Upper Edentulous`, `Lower Edentulous`, and `Stage 2 ->`.
- Changed Stage 2 back action to a blue `Stage 1` button with the left arrow retained.
- Attached the compact `Export` action to the `Manual Placement Mode` row.
- Added a collapsible Tweaks menu whose expanded collapse affordance and collapsed reopen button share the same lower-right anchor.

## Interaction Decisions

- Preserve left click as the fastest path to editing one tooth.
- Multi-select should be deliberate, not triggered by normal clicks.
- Ctrl/Cmd-click is the precision multi-select shortcut.
- Right-click is the discoverable mouse-only multi-select shortcut.
- Do not reintroduce drag-to-select unless the UI gets a separate explicit selection tool or mode.
- Floating action bars should appear only after a meaningful selection exists.
- Avoid hidden interaction changes that make the same click do different things across stages without visible feedback.

## Files Changed

- `Dental Hero.html` - current prototype entry file.
- `dental-arch.jsx` - dental arch rendering, Stage 1/2 tooth interactions, treatment popover wiring, multi-select state, floating action bar.
- `treatments.jsx` - treatment catalog, eligibility, treatment overlays, current implant/implant-crown SVG, label rendering, and manual placement system.
- `tweaks-panel.jsx` - prototype controls and manual placement visibility from earlier session work.
- `SESSION_SUMMARY.md` - detailed record of the manual placement session.

## Known Good Behavior

Check these before and after future edits:

- Stage 2 left click opens a treatment popover for exactly one tooth.
- Ctrl/Cmd-left-click toggles multi-select and does not immediately open the treatment popover.
- Right-click toggles multi-select and does not open the browser context menu.
- Floating action bar appears for multi-select and supports Clear / Apply treatment.
- Apply treatment opens the treatment popover for the selected teeth.
- Escape clears active selection/popover state where supported.
- Stage 1 interactions still behave as expected.
- Treatment label manual placement still works when enabled.
- Tweaks menu can collapse to a compact lower-right `Tweaks` button and reopen from the same anchor.
- Manual placement export is a compact `Export` button in the `Manual Placement Mode` row.
- Stage 1 and Stage 2 footer buttons use the same sizing and typography.
- Extraction removal restores the tooth to present.
- Missing-only treatments (`implant-only`, `implant-crown`, `socket-preservation`, `gbr`, `simultaneous-graft`) are disabled for present teeth.
- Fully edentulous patients cannot receive `ortho-brackets` or `ortho-aligners`.
- `alveolectomy` and `complete-denture` can coexist on the same edentulous arch.
- Implant-only and implant+crown render through `FittedImplantOverlay`, promoted from `implant-fit-diagnostic.html`.
- Upper/lower implant direction must still be rechecked visually after any future transform change.
- Upper 16/17/26/27 molars use the accepted live `molarUOutline` root/furcation geometry.
- Sinus shapes are rectangular/wider at the top, with the lower floor still anchored from the live cervical baseline.
- Sinus zones remain interactive but do not show `MS`, `L`, or `R` text labels.
- FDI numbers stay readable while following each tooth's tilt; lower FDI numbers stay below the mandibular arch.
- Maxilla bone level is scalloped along the cervical line, matching the mandible's non-straight contour language.
- Maxilla is a smooth simple outline only.
- Mandible and IDN remain unchanged from before the geometry session.

## Open Questions / Next Ideas

- Should right-click also open a tiny contextual menu, or is direct toggle enough?
- Should selected teeth show a stronger visual state when multi-selected?
- Should the floating bar include the selected tooth count and treatment eligibility hints?
- Should disabled treatment reasons be visible somewhere other than hover titles now that subtitle rows were removed?
- Should we add a small in-prototype tooltip or helper text for right-click multi-select?
- Should we add a QA checklist file for Stage 1, Stage 2, popovers, and manual placement?
- Should the Stage 2 title say `Ctrl-click` instead of `Ctrl+L-click`? The current copy matches the latest request, but `Ctrl+L` can be read as a browser shortcut rather than "Ctrl + left click".
- Should visual-treatment drafts stay as separate HTML boards or be cleaned up once each visual is promoted?
- Should crown be implemented next as a new visual type for existing teeth and implant sites?
- Should bridge be modeled as a span treatment instead of selected individual tooth treatments?

## Design Notes

- The user prefers predictable, direct manipulation over clever gesture-heavy selection.
- Squarish, controlled layouts are preferred over overly rounded or decorative UI.
- Visible affordances matter: if a mode is active, show it.
- The user prefers compact controls in the Tweaks table; avoid spreading one setting across multiple rows.
- Duplicated instructional copy should be removed from footers once the centered top instruction exists.
- Honest constraints are better than fake polish; if a treatment is not eligible, disable it clearly.
- For treatment visuals, the user prefers the current hero SVG language: blue outline, white interior, minimal detail, clear fit on each tooth.
- For base dental illustration geometry, the user strongly prefers editing from the current hero style instead of drawing isolated anatomy icons.
- Use nearby accepted teeth as reference before inventing a new tooth silhouette. For upper molars, 18/28 (`wisdomUOutline`) was the accepted reference vocabulary.
- The user wants diagnostic drafts in the real hero context so proportions can be judged realistically.
- Prototype visual drafts separately and show fit on actual hero tooth positions before editing production source.
- User strongly rejects visuals that look like generic icons, bowls, or disconnected caps. Match the natural tooth first.
- For difficult SVG treatment visuals, separate fit from style: first build a diagnostic board with geometry guides, then tune the drawing, then promote the approved renderer.
- The successful implant workflow was: inspect old plan and current production geometry, identify missing transform inputs, build `implant-fit-diagnostic.html`, tune crown silhouette there, then promote only the approved fitted renderer into `treatments.jsx`.
- Keep future interaction changes small and testable because `dental-arch.jsx` carries several shared behaviors.

## Regression Watchlist

- Stage 2 selection state and popover state can interfere with each other.
- Browser context-menu suppression is required for right-click multi-select.
- Treatment popover positioning is sensitive to selected tooth coordinates.
- Present vs missing tooth eligibility needs explicit handling in treatment options.
- Treatment availability and application rules are split between `treatments.jsx` and `dental-arch.jsx`; update both when changing clinical rules.
- Extraction is the only treatment removal that currently reverses tooth presence.
- Full-mouth ortho has both a UI availability gate and an apply-handler guard; keep both to avoid stale-popover bugs.
- Manual placement state in `treatments.jsx` should not be broken by arch interaction changes.
- Implant/crown fit can look correct in a standalone draft but fail in the arch. Always test visual overlays against real tooth geometry and actual arch transforms before production promotion.
- Tooth/anatomy geometry can also look acceptable in isolation but fail in the hero. Build diagnostics on top of the current hero diagram before production promotion.
- Do not promote mandible geometry from `dental-geometry-fit-diagnostic.html`; the user has not approved a mandible outline yet.
- If mandible is changed later, recheck IDN containment inside the new mandibular boundary.
- Avoid jagged inner root transitions when editing upper molars; keep smooth Bezier continuity around the furcation and palatal-root emergence.
- FDI label transforms are order-sensitive. Preserve local centerline placement, tooth-tilt counter-rotation, and lower-jaw flip compensation.
- Do not re-add sinus text labels while adjusting sinus hover/selection behavior.
- Maxilla bone-level scallops should remain smooth; avoid replacing the upper cervical edge with one broad straight curve.
- Upper/lower overlay orientation is easy to invert. Check both jaws after changing any transform.
- Do not tie implant fixture size too tightly to prosthetic crown fitting; preserve fixture readability while matching crown envelope to tooth class.
- In-browser JSX transform means syntax errors in JSX files can break the whole prototype at load.

## Handoff Notes For Future Sessions

Start by reading this file, then `SESSION_SUMMARY.md` if the task touches manual placement or visual-treatment drawing. For Stage 2 interaction work, inspect `dental-arch.jsx` first and preserve the current interaction contract unless the user explicitly changes it. For overlay drawing work, inspect `treatments.jsx` and the relevant tooth geometry first, then build or update a diagnostic/fit-preview file before production edits.

When changing selection behavior, update this file in the same session so future work does not reconstruct decisions from chat history.
