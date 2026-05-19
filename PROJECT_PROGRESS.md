# Project Progress

## Current State

The project is an interactive dental hero prototype centered on `Dental Hero.html` and the JSX modules it loads. The active flow includes Stage 1/Stage 2 dental arch interaction, treatment popovers, treatment labels, and a manual placement system for label coordinates.

Latest continuation preserved the Stage 2 gesture contract and improved multi-select feedback: selected teeth now get a stronger outline state, the floating action bar shows selected FDI numbers plus present/missing counts, and disabled treatment copy now explains present-tooth requirements correctly.

Current formatting pass centers the Stage 1/Stage 2 instruction line at the top of the prototype and removes the duplicated Stage 1 instruction from the lower-left footer. Stage 2 tooth-selection rules remain unchanged.

Current tweaks-menu formatting pass removes `Layout Debug Guides` and `Arch Curvature` from the visible Tweaks menu, compacts label-position export into a small `Export` button beside `Manual Placement Mode`, title-cases menu labels, and adds a collapsed `Tweaks` button anchored above the lower-right stage action area. Stage 2 tooth-selection rules remain unchanged.

Latest tweak refinement matches the provided screenshot: the `Manual Placement Mode` row now reads as label, compact `Export` button, then toggle switch. Stage 2 tooth-selection rules remain unchanged.

Follow-up tweak refinement fixes the row layout so `Manual Placement Mode`, the compact `Export` button, and the toggle render as one horizontal control row instead of stacking as three separate rows. Stage 2 tooth-selection rules remain unchanged.

Current tweaks-table pass compresses the `Accent` color options into short toggle-height pills, renames `Leader Lines` to `Treatment Labels`, changes the Stage 2 footer copy to `Hide labels` / `Show labels`, and makes the Tweaks panel collapse affordance explicit with a `Collapse` control plus the lower-right `Tweaks` reopen button. Stage 2 tooth-selection rules remain unchanged.

Latest tweaks-table pass moves the visible collapse affordance to the bottom-right of the Tweaks panel and changes it from written `Collapse` text to a compact chevron-style symbol. Stage 2 tooth-selection rules remain unchanged.

Current formatting pass removes the duplicate `Treatment Labels` toggle from the Tweaks panel, renames Stage 1 arch controls to `Upper Edentulous` and `Lower Edentulous`, removes the duplicated Stage 2 footer instruction, rewrites `Edit baseline` to `Stage 1`, and gives Stage 1/Stage 2 footer buttons shared sizing. Stage 2 tooth-selection rules remain unchanged.

Latest formatting pass shortens the Stage 1 advance button to `Stage 2 ->`, updates the Stage 2 header copy to `Left-click opens treatment. Ctrl+L click or right-click selects multiple.`, makes the Stage 2 `Stage 1` back button blue to match the primary footer action, aligns footer button font sizes, and repositions the Tweaks panel so the expanded collapse icon lands on the same anchor as the collapsed Tweaks button. Stage 2 tooth-selection rules remain unchanged.

Session wrap-up: the active prototype is in a stable formatting state for the next session. The Tweaks menu is simplified and collapsible, the export control is attached to the `Manual Placement Mode` row, Stage 1/Stage 2 footer buttons share sizing, duplicate instructional footer copy has been removed, and the top stage instruction line is centered for both stages. Keep the current Stage 2 selection contract unless the user explicitly asks to change it.

The most recent focus was Stage 2 tooth selection. The current Stage 2 contract is:

- Left click on a tooth opens the treatment popover for that single tooth.
- Ctrl/Cmd + left click toggles that tooth into or out of multi-select.
- Right click toggles that tooth into or out of multi-select and suppresses the browser context menu.
- The floating action bar appears only after deliberate multi-select.
- Drag-to-select has been removed because it conflicted with normal tooth selection.

## Latest Session Summary

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
- `treatments.jsx` - treatment label rendering and manual placement system from earlier session work.
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

## Open Questions / Next Ideas

- Should right-click also open a tiny contextual menu, or is direct toggle enough?
- Should selected teeth show a stronger visual state when multi-selected?
- Should the floating bar include the selected tooth count and treatment eligibility hints?
- Should incompatible treatments be disabled with explanations when mixed present/missing teeth are selected?
- Should we add a small in-prototype tooltip or helper text for right-click multi-select?
- Should we add a QA checklist file for Stage 1, Stage 2, popovers, and manual placement?
- Should the Stage 2 title say `Ctrl-click` instead of `Ctrl+L click`? The current copy matches the latest request, but `Ctrl+L` can be read as a browser shortcut rather than "Ctrl + left click".

## Design Notes

- The user prefers predictable, direct manipulation over clever gesture-heavy selection.
- Squarish, controlled layouts are preferred over overly rounded or decorative UI.
- Visible affordances matter: if a mode is active, show it.
- The user prefers compact controls in the Tweaks table; avoid spreading one setting across multiple rows.
- Duplicated instructional copy should be removed from footers once the centered top instruction exists.
- Honest constraints are better than fake polish; if a treatment is not eligible, disable it clearly.
- Keep future interaction changes small and testable because `dental-arch.jsx` carries several shared behaviors.

## Regression Watchlist

- Stage 2 selection state and popover state can interfere with each other.
- Browser context-menu suppression is required for right-click multi-select.
- Treatment popover positioning is sensitive to selected tooth coordinates.
- Present vs missing tooth eligibility needs explicit handling in treatment options.
- Manual placement state in `treatments.jsx` should not be broken by arch interaction changes.
- In-browser JSX transform means syntax errors in JSX files can break the whole prototype at load.

## Handoff Notes For Future Sessions

Start by reading this file, then `SESSION_SUMMARY.md` if the task touches manual placement. For Stage 2 interaction work, inspect `dental-arch.jsx` first and preserve the current interaction contract unless the user explicitly changes it.

When changing selection behavior, update this file in the same session so future work does not reconstruct decisions from chat history.
