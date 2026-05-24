# Phase 0 — Vite Migration Plan (v3hero prototype)

## Context

The v3hero dental interactive prototype runs as in-browser Babel (React 18.3.1 + @babel/standalone via UMD CDN). All 5 `.jsx` files share state through `window.*` globals (~64 cross-file references), with script load order in the HTML entries acting as the only dependency resolution. There is no `package.json`, no module system, no tests, no build.

ARCHITECTURE_REFACTOR_BRIEF_V4 makes Vite a hard prerequisite: every later constraint ("`core/layout` may not import from `visuals/app`") is only enforceable with real ES modules. Phase 0 is a behavior-preserving lift from CDN/Babel → Vite + plain JSX, nothing more. No folder reshuffle into `core/layout/visuals/app` yet — that begins in the vertical slice phase.

**Target repo (confirmed):** `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\` — already a git repo, holds the most recent v3hero work. (The earlier `_archive/v3 Design/` copy under the Quotation App is historical; ignore it.)

---

## Current State Audit

`v3_OpenDesign_2/` contains 5 jsx modules (~3.8k LOC), 7 HTML files, plus screenshots/scraps/uploads. Real git repo, no `package.json`.

### JSX modules (load order = dependency order)

| File | LOC | Role |
|---|---|---|
| `tweaks-panel.jsx` | 610 | Tweak UI primitives + `useTweaks` hook (loaded first; 27 `window.` refs — mostly self-publishing) |
| `teeth-data.jsx` | 321 | `TOOTH_TYPES`, FDI maps, `toothPaths`, `layoutArch`, `UPPER`/`LOWER` (0 `window.` consumers — leaf module) |
| `anatomy.jsx` | 126 | Maxilla/mandible/sinus/IDN path generators (0 `window.` consumers) |
| `treatments.jsx` | 1662 | Treatment registry, `TreatmentLayer`, `TreatmentLabels`, `TreatmentPopover`, `ConfirmDialog` (9 `window.` refs) |
| `dental-arch.jsx` | 1068 | `DentalHero` root component (28 `window.` refs — biggest consumer) |

### HTML files

**Live entry (loads the 5 jsx modules — single Vite entry):**
- `Dental Hero.html` — the prototype (note: filename contains a space; either keep and quote everywhere, or rename to `dental-hero.html` as part of Task 0 — recommended)

**Standalone diagnostics/drafts (no jsx imports — self-contained sandbox HTMLs):**
- `crown-visual-drafts.html`
- `dental-geometry-fit-diagnostic.html`
- `implant-fit-diagnostic.html`
- `implant-hero-fit-preview.html`
- `implant-visual-drafts.html`
- `test.html`

The standalones are not part of the React app graph. They go into `public/` so Vite serves them as-is at `/<filename>.html` without trying to parse them.

### Risk flags

1. **Filename has a space (`Dental Hero.html`)** — Vite + npm scripts handle quoted paths, but it's friction in every CLI call. Recommend renaming to `dental-hero.html` in Task 0 (also becomes the default URL — clean).
2. **CDN SRI hashes** on React/Babel scripts — wholesale replaced; no concern.
3. **Script order is load-bearing**: `tweaks-panel → teeth-data → anatomy → treatments → dental-arch`. Real imports surface any circular dep.
4. **`window.__labelAPI` / `__DEFAULT_LABEL_POSITIONS` / `exportLabelPositions` / `setLabelPositions`** — cross-component side-channel. For Phase 0 these stay on `window` (behavior unchanged). Flag for the vertical-slice phase.
5. **EDITMODE-BEGIN markers** in `dental-arch.jsx` — likely tooling sentinels; preserve verbatim.
6. **Inline `<style>` block** in the entry HTML — extract into `src/styles.css` verbatim, imported by `main.jsx`. No token refactor.

---

## Plan

### Task -1 — Write the multi-phase roadmap [Sonnet]
Create `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\ROADMAP.md` so you can see at a glance which phase the project is in. Single source of truth — every other doc points here. Structure:

- **Phase 0 — Vite migration** *(current)*. Behavior unchanged; CDN/Babel → real ES modules. Exit criteria: app boots via `npm run dev`, `npm run build` clean, manual interaction sweep passes vs `pre-vite-baseline`.
- **Phase 1 — Vertical slice (proof of editing approach).** Minimal `lab/` + control-point editor + ONE molar crown end-to-end (Inkscape import → normalize → drag in lab → export JSON → render via `visuals/shapes`). Exit criteria: editing a crown outline by dragging points is genuinely faster than today; output crown at least matches current hand-drawn quality.
- **Phase 2 — Generalize structure outward.** Reshape repo into `core/ layout/ visuals/ app/ shapes-data/ lab/ legacy/`. Add ESLint import-boundary rule (`core` + `layout` may not import from `visuals` + `app`). Migrate remaining crowns.
- **Phase 3 — Arch + anatomy as control-point shapes.** Maxilla/mandible authored in Inkscape or landmark-generated; draggable in lab.
- **Phase 4 — Visual registry + overlay categories.** Split tooth/span/arch/full-mouth overlays; author denture/span shapes in Inkscape.
- **Phase 5 — Label/connector system extraction.** Dedicated module; debug toggles.
- **Phase 6 — Interaction state cleanup.** Separate clinical/ephemeral/UI/draft state.
- **Phase 7 — Backend integration.** Stable FDI string IDs already in place; wire treatment records to backend; per-clinic theme loaded at runtime.
- **Phase 8 — Deferred quality bar.** Accessibility, performance pass, responsive (deferred per brief; do not pull forward).
- **Legacy retirement.** Track adapters in `legacy/`; delete as their replacements stabilize.

For each phase: status (Not started / In progress / Done), start date, completion date, link to its plan file under `docs/plans/`. Keep it terse — one paragraph per phase, max.

### Task 0 — Update standard project docs [Sonnet]
Before touching code, sync the docs that future sessions read first. All edits are explicit and small.

1. **`C:\Users\ZMZ\Desktop\v3_OpenDesign_2\README.md`** — add a "Current status: Phase 0 (Vite migration in progress) — see ROADMAP.md" banner at the top. Once Phase 0 completes, this becomes the "how to run" doc (`npm i`, `npm run dev`, etc.). For now just point at the roadmap.
2. **`C:\Users\ZMZ\Desktop\v3_OpenDesign_2\PROJECT_PROGRESS.md`** and **`SESSION_SUMMARY.md`** — read each, decide whether they're still load-bearing or superseded by ROADMAP.md. If superseded, add a one-line redirect at the top ("See ROADMAP.md") rather than deleting — preserves history.
3. **Workspace CLAUDE.md** (`c:\Users\ZMZ\Desktop\Claude\.claude\CLAUDE.md`): update the "Quotation app v3hero" bullet to reflect that v3hero now lives at `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\` as its own git repo (not under `Quotation App/v3 Design/`), and point at the new `ROADMAP.md` as the canonical phase tracker. Remove the stale reference to `sure-but-i-would-calm-badger.md` if that plan is now superseded.
4. **Memory entry `project_quotation_app_chart_redesign.md`** (under `C:\Users\ZMZ\.claude\projects\c--Users-ZMZ-Desktop-Claude\memory\`): update path from the old location to `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\`; replace the old plan link with `ROADMAP.md`; note that Phase 0 is the current focus.
5. **Memory entry `feedback_v3design_workflow.md`**: re-evaluate — the "v3 Design/ is gitignored, transfer via markdown" workflow is ending (the new repo is independent). Either update the rule to reflect the new repo, or mark obsolete and remove from `MEMORY.md`.
6. **`C:\Users\ZMZ\Desktop\v3_OpenDesign_2\docs\plans\`** — create dir; copy this plan in as `2026-05-24-phase-0-vite-migration.md` so the plan lives with the code per the workspace plan-storage convention.

### Task 0.5 — Baseline + prep [Sonnet]
- From inside `C:\Users\ZMZ\Desktop\v3_OpenDesign_2`: `git status` (confirm clean), `git tag pre-vite-baseline` so any regression is bisectable.
- Rename `Dental Hero.html` → `dental-hero.html` (recommended) and commit. Update any references inside other HTMLs/markdown.
- Confirm Node ≥ 20 LTS installed (`node -v`). Install if missing.
- Capture baseline screenshots of `dental-hero.html` for visual diff post-migration.

### Task 1 — Scaffold Vite (single-page) [Sonnet]
- Inside the repo: `npm init -y`, then `npm i -D vite @vitejs/plugin-react` and `npm i react@18.3.1 react-dom@18.3.1` (pin the exact versions the CDN was serving — preserves behavior).
- Vite expects the entry HTML to be named `index.html` at the project root. Either: (a) rename `dental-hero.html` → `index.html`, or (b) keep the name and configure `vite.config.js` with `rollupOptions.input` pointing at `dental-hero.html`. **Recommend (a)** — simplest, and it becomes the natural site root once this ships.
- Add `package.json` scripts: `dev`, `build`, `preview`.
- Confirm `npm run dev` boots (will error on the jsx until Task 2).
- Commit: "Phase 0.1: Vite scaffold".

### Task 2 — Convert each .jsx to ES modules [Sonnet]
Mechanical, one file at a time, leaves first. After each: `npm run dev` reload → no console errors → commit.

1. **`tweaks-panel.jsx`** — add `import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'`; delete `const { ... } = React` line; add `export { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle, TweakSlider, TweakButton }` at bottom. Keep any `window.*` self-publishing intact for now (some of the 27 refs are likely setters consumed by `dental-arch`'s legacy paths; remove only the ones that become dead after Task 5).
2. **`teeth-data.jsx`** — export `TOOTH_TYPES`, `QUADRANT`, `toothPaths`, `layoutArch`, `UPPER`, `LOWER`.
3. **`anatomy.jsx`** — export `maxillaPath`, `mandiblePath`, `nasalCavityPath`, `nasalSeptumPath`, `maxillarySinusPath`, `idnCanalPath`, `idnSchematicPath`, `mentalForamenCenters`, `ramusDetailPath`.
4. **`treatments.jsx`** — convert 9 `window.*` reads to imports; export `TreatmentLayer`, `TreatmentLabels`, `TreatmentPopover`, `ConfirmDialog`, and any registry constants consumed by `dental-arch.jsx`.
5. **`dental-arch.jsx`** — replace all 28 `window.*` call sites with named imports from the four modules above. Keep `window.__labelAPI`, `window.__DEFAULT_LABEL_POSITIONS`, `window.exportLabelPositions`, `window.setLabelPositions` on `window` (don't refactor the side-channel in this phase). Export `DentalHero` as default.

### Task 3 — Wire entry + bootstrap [Sonnet]
- Create `src/main.jsx`:
  ```js
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import DentalHero from '../dental-arch.jsx';
  import './styles.css';
  createRoot(document.getElementById('root')).render(<DentalHero />);
  ```
- In `index.html` (the renamed `Dental Hero.html`): delete the 3 CDN `<script>` tags + 5 `<script type="text/babel">` tags; replace with `<script type="module" src="/src/main.jsx"></script>`. Keep `<head>` (fonts/preconnects) and `<div id="root">`.
- Extract the inline `<style>` block into `src/styles.css` verbatim.
- Move the 6 standalone diagnostic HTMLs (`crown-visual-drafts.html`, `dental-geometry-fit-diagnostic.html`, `implant-fit-diagnostic.html`, `implant-hero-fit-preview.html`, `implant-visual-drafts.html`, `test.html`) into `public/` so Vite serves them untouched at `/<filename>.html`. **Before moving:** quick grep each for relative asset references (`./screenshots/...`, etc.) — Vite serves `public/` at `/`, so relative paths from inside still resolve, but only if the referenced files are also moved or symlinked.
- Leave `screenshots/`, `scraps/`, `uploads/`, `*.png`, `v3hero.zip`, `*.artifact.json`, `*.md` at repo root.
- Keep `.jsx` files at repo root for now (no `src/` reshuffle — that belongs with the layered refactor).

### Task 4 — Verify behavior unchanged [Sonnet]
See Verification section.

### Task 5 — Tooling baseline (minimal) [Sonnet]
- `.gitignore`: `node_modules`, `dist`, `.vite`, `.DS_Store`.
- Update `README.md` with install/run/build instructions and the M1 MacBook note from the brief.
- **Do not** add ESLint, Prettier, Husky, TypeScript, or the import-boundary lint rule yet — those belong with the layered refactor.

---

## Critical Files

- `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\Dental Hero.html` → renamed to `index.html`; CDN/babel tags stripped
- `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\dental-arch.jsx` — root component; 28 `window.*` call sites to convert
- `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\treatments.jsx` — 9 `window.*` refs; biggest module by LOC (1662)
- `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\tweaks-panel.jsx` — exports the most public API (8 components + hook)
- New: `package.json`, `vite.config.js`, `src/main.jsx`, `src/styles.css`

## Verification

End-to-end checks before declaring Phase 0 done:

1. `npm run dev` boots without console errors; app loads at `/`.
2. `npm run build` produces `dist/` with no warnings about unresolved imports.
3. `npm run preview` serves the built bundle; visual parity with `pre-vite-baseline` screenshots.
4. Manual interaction sweep (compare screenshots before/after):
   - Initial load matches baseline
   - Click a tooth → popover opens
   - Ctrl/Cmd-click second tooth → multi-select activates
   - Apply treatment from popover → overlay renders
   - Theme toggle (tweaks panel) switches theme
   - Toggles: FDI numbering, leader lines, sinus zones, IDN — all update
   - Arch curvature slider reshapes arch live
   - Manual placement mode → label drag handles appear; drag persists
   - "Export positions" → JSON appears in console/clipboard
   - Stage advance → footer swaps to treatment stage
5. Standalone diagnostics (`crown-visual-drafts.html` etc.) load unchanged at `/crown-visual-drafts.html` etc. (since they have no module imports, this is purely "did the move into `public/` break the relative URLs they use" — check for any local `./<asset>` references before moving).
6. `git log --stat pre-vite-baseline..HEAD` — only mechanical changes (imports/exports, file moves, package.json/vite.config additions). No behavior edits in the diff.

If any flow breaks: **stop, do not patch around it in this phase.** Phase 0 is behavior-unchanged by definition — a regression means a missed global, not a redesign opportunity.

## Open Questions / Deferred

1. **Do the standalone diagnostic HTMLs reference any sibling assets (e.g., `./screenshots/foo.png`, `./uploads/...`)?** Quick grep before moving them into `public/`. If yes, either move the assets too or keep the HTMLs at root and exclude them from the Vite graph.
2. **Deferred to next phase (post-Vite):** `window.__labelAPI` side-channel, inline-CSS → tokens split, ESLint module-boundary rule, folder reshuffle into `core/layout/visuals/app`, vertical slice (lab + molar crown + control-point editor), TypeScript decision.
