# v3hero Dental Chart — Project Roadmap

Single source of truth for phase status. All phase plan files live under `docs/plans/`.

---

## Phase 0 — Vite Migration
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-0-vite-migration.md`](docs/plans/2026-05-24-phase-0-vite-migration.md)

Behavior-preserving lift from CDN/Babel → Vite + plain JSX. No folder reshuffle, no new features. Exit criteria: `npm run dev` boots, `npm run build` clean, manual interaction sweep passes vs `pre-vite-baseline` screenshots.

---

## Phase 1 — Vertical Slice (Lab + One Molar Crown)
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-1-vertical-slice.md`](docs/plans/2026-05-24-phase-1-vertical-slice.md)

Minimal in-app visual lab + control-point editor + one molar crown end-to-end: Inkscape import → normalize → drag control points in lab → export JSON → render via `visuals/shapes`. Proves the editing approach before building the full structure. Exit criteria: editing a crown outline by dragging points is genuinely faster than today; output crown matches current hand-drawn quality.

---

## Phase 2 — Generalize Structure
**Status:** In progress
**Start:** 2026-05-24 | **Completion:** —
**Plan:** [`docs/plans/2026-05-24-phase-2-generalize-structure.md`](docs/plans/2026-05-24-phase-2-generalize-structure.md)

Reshape repo into `core/ layout/ visuals/ app/ shapes-data/ lab/ legacy/`. Add ESLint import-boundary rule (`core` + `layout` may not import from `visuals` + `app`). Migrate remaining tooth crown shapes.

**TypeScript decision:** Explicitly deferred beyond Phase 2. Surface area too large alongside the directory restructure. Revisit after Phase 4 when the shape registry stabilizes.

---

## Phase 3 — Arch + Anatomy as Control-Point Shapes
**Status:** Not started
**Start:** — | **Completion:** —
**Plan:** —

Maxilla, mandible, and sinus zones authored in Inkscape or generated from anatomical landmarks; editable via control points in the lab. Exit criteria: arch curvature is adjustable by dragging points, not by a raw numeric slider.

---

## Phase 4 — Visual Registry + Overlay Categories
**Status:** Not started
**Start:** — | **Completion:** —
**Plan:** —

Split treatment overlays into tooth / span / arch / full-mouth categories with a formal registry. Author denture, bridge-span, and partial-denture shapes in Inkscape using the control-point workflow from Phase 1.

---

## Phase 5 — Label + Connector System Extraction
**Status:** Not started
**Start:** — | **Completion:** —
**Plan:** —

Extract label/connector logic into a dedicated module. Add debug toggles (show anchor points, connector paths, mirror axis). Replace `window.__labelAPI` side-channel with real module exports.

---

## Phase 6 — Interaction State Cleanup
**Status:** Not started
**Start:** — | **Completion:** —
**Plan:** —

Separate clinical state / ephemeral UI state / draft state into distinct stores. No Redux — plain React context or zustand. Clean up remaining `window.*` global side-channels introduced during Phase 0 preservation.

---

## Phase 7 — Backend Integration
**Status:** Not started
**Start:** — | **Completion:** —
**Plan:** —

Wire treatment records to backend using stable FDI string IDs already in place. Per-clinic theme loaded at runtime. Tablet layout decision (≤1180px: scale down vs simplified fallback) resolved here.

---

## Phase 8 — Deferred Quality Bar
**Status:** Not started
**Start:** — | **Completion:** —
**Plan:** —

Accessibility (WCAG 2.1 AA for interactive SVG), performance pass (bundle size, paint metrics), and responsive layout. Explicitly deferred per ARCHITECTURE_REFACTOR_BRIEF_V4 — do not pull forward.

---

## Legacy Retirement
Track backwards-compatibility adapters in `legacy/` as needed. Delete when replacements stabilize.
