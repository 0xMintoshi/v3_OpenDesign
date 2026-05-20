# Project Progress

## Current State

The project is an interactive dental hero prototype centered on `Dental Hero.html` and the JSX modules it loads. The active flow includes Stage 1/Stage 2 dental arch interaction, treatment popovers, treatment labels, and a manual placement system for label coordinates.

Latest continuation preserved the Stage 2 gesture contract and moved into visual-treatment design. An attempted implant/implant+crown redraw was promoted, judged unacceptable in the real hero, and then reverted. Production `treatments.jsx` is back to the earlier schematic `ImplantOverlay` implementation.

Current session wrap-up: the active prototype is in a stable treatment-logic and formatting state for the next session, but implant/crown visual redesign is unresolved. `Dental Hero.html` is the canonical entry file. `dental-hero-v2.html` is an older/responsive experiment and should not be edited unless the user asks to switch to it.

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

Date: 2026-05-21

Goal: start the visual-treatment drawing workflow, explore implant/implant+crown visuals, and record what did and did not work for future sessions.

Outcome:

- Discussed how future backend treatment records should map into shared hero visual types instead of one visual per database treatment.
- Listed the current supported visual treatment families: extraction, implant, bone graft, sinus lift, arch surgery/alveolectomy, complete denture, and orthodontics.
- Captured the next visual-treatment backlog from the user: crown, bridge, partial denture, clear aligners, and extraction redraw.
- Created draft/preview files for visual exploration: `crown-visual-drafts.html`, `implant-visual-drafts.html`, and `implant-hero-fit-preview.html`.
- User rejected realistic implant drafts and clarified the style rule: match the current hero language with blue outline and white interior.
- A blue-outline candidate was promoted into `treatments.jsx`, then rejected after real-hero review because crown size/position/angulation were wrong and the implant became too small.
- The promoted implant redraw was reverted. Production is back to the prior `ImplantOverlay` signature and schematic drawing.

Stable implant behavior after revert:

- `implant-only` and `implant-crown` still use existing treatment IDs.
- Both route through `ImplantOverlay` in `treatments.jsx`.
- Production `ImplantOverlay` currently takes `x`, `y`, `w`, `h`, `jaw`, `withCrown`, and `accent`; it does not currently take `toothYOffset`, `toothType`, or `tilt`.
- The desired style is still not realistic rendering: no gradients, no metal fills, no cream crown fill.
- The next implant+crown pass must use the natural tooth crown as the reference structure: match crown size by tooth class, crown position, and angulation before placing the fixture.
- Implant-only should reuse the implant fixture position solved from implant+crown, with the crown hidden.

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
- Implant-only and implant+crown render through the reverted schematic blue-outline/white-fill overlay.
- Upper/lower implant direction must be rechecked visually after any future transform change.

## Open Questions / Next Ideas

- Should right-click also open a tiny contextual menu, or is direct toggle enough?
- Should selected teeth show a stronger visual state when multi-selected?
- Should the floating bar include the selected tooth count and treatment eligibility hints?
- Should disabled treatment reasons be visible somewhere other than hover titles now that subtitle rows were removed?
- Should we add a small in-prototype tooltip or helper text for right-click multi-select?
- Should we add a QA checklist file for Stage 1, Stage 2, popovers, and manual placement?
- Should the Stage 2 title say `Ctrl-click` instead of `Ctrl+L-click`? The current copy matches the latest request, but `Ctrl+L` can be read as a browser shortcut rather than "Ctrl + left click".
- Should visual-treatment drafts stay as separate HTML boards or be cleaned up once each visual is promoted?
- Should implant+crown be solved first by tracing/reusing the natural tooth crown geometry instead of generating a separate cap?
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
- Prototype visual drafts separately and show fit on actual hero tooth positions before editing production source.
- User strongly rejects visuals that look like generic icons, bowls, or disconnected caps. Match the natural tooth first.
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
- Implant/crown fit can look correct in a standalone draft but fail in the arch. Always test in the actual hero context, not only a preview board.
- Upper/lower overlay orientation is easy to invert. Check both jaws after changing any transform.
- Do not tie implant fixture size too tightly to prosthetic crown fitting; the failed pass made the implant too small.
- In-browser JSX transform means syntax errors in JSX files can break the whole prototype at load.

## Handoff Notes For Future Sessions

Start by reading this file, then `SESSION_SUMMARY.md` if the task touches manual placement or visual-treatment drawing. For Stage 2 interaction work, inspect `dental-arch.jsx` first and preserve the current interaction contract unless the user explicitly changes it. For overlay drawing work, inspect `treatments.jsx` first, then test in a draft/fit-preview file before production edits.

When changing selection behavior, update this file in the same session so future work does not reconstruct decisions from chat history.
