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
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-2-generalize-structure.md`](docs/plans/2026-05-24-phase-2-generalize-structure.md)

Reshape repo into `core/ layout/ visuals/ app/ shapes-data/ lab/ legacy/`. Add ESLint import-boundary rule (`core` + `layout` may not import from `visuals` + `app`). Migrate remaining tooth crown shapes.

**TypeScript decision:** Explicitly deferred beyond Phase 2. Surface area too large alongside the directory restructure. Revisit after Phase 4 when the shape registry stabilizes.

---

## Phase 3 — Arch + Anatomy as Control-Point Shapes
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** [`docs/plans/2026-05-24-phase-3-arch-shapes.md`](docs/plans/2026-05-24-phase-3-arch-shapes.md)

Maxilla, mandible, and sinus zones authored as normalized control-point JSON in `shapes-data/`. Anatomy paths driven by `shapeToPath` — no more hardcoded strings for arch shapes. Lab shape selector added: pick any arch or tooth shape, drag control points to edit curvature. Exit criteria: arch curvature is adjustable by dragging points, not by a raw numeric slider.

---

## Phase 4 — Visual Registry + Overlay Categories
**Status:** Complete ✓
**Start:** 2026-05-24 | **Completion:** 2026-05-24
**Plan:** docs/plans/2026-05-24-phase-4-visual-registry.md

Split treatment overlays into tooth / span / arch / full-mouth categories with a formal registry. Author denture, bridge-span, and partial-denture shapes in Inkscape using the control-point workflow from Phase 1.

---

## Phase 5 — Label + Connector System Extraction
**Status:** Complete
**Start:** 2026-05-24 | **Completion:** 2026-05-25
**Plan:** [`docs/plans/2026-05-24-phase-5-label-connectors.md`](docs/plans/2026-05-24-phase-5-label-connectors.md)

Extract label/connector logic into a dedicated module. Add debug toggles (show anchor points, connector paths, mirror axis). Replace `window.__labelAPI` side-channel with real module exports.

---

## Phase 6 — Interaction State Cleanup
**Status:** Complete
**Start:** 2026-05-25 | **Completion:** 2026-05-25
**Plan:** [`docs/plans/2026-05-25-phase-6-interaction-state-cleanup.md`](docs/plans/2026-05-25-phase-6-interaction-state-cleanup.md)

Separate clinical state / ephemeral UI state / draft state into distinct stores. No Redux — plain React context or zustand. Clean up remaining `window.*` global side-channels introduced during Phase 0 preservation.

---

## Phase 7 — Backend Integration
**Status:** Complete ✓
**Start:** 2026-05-25 | **Completion:** 2026-05-25
**Plan:** [`docs/plans/2026-05-25-phase-7-backend-integration.md`](docs/plans/2026-05-25-phase-7-backend-integration.md)

Wire treatment records to backend using stable FDI string IDs already in place. Per-clinic theme loaded at runtime. Tablet layout decision (≤1180px: scale down vs simplified fallback) resolved here.

---

## Phase 8 — Deferred Quality Bar
**Status:** Complete
**Start:** 2026-05-25 | **Completion:** 2026-05-25
**Plan:** [`docs/plans/2026-05-25-phase-8-accessibility-perf.md`](docs/plans/2026-05-25-phase-8-accessibility-perf.md)

Accessibility (WCAG 2.1 AA for interactive SVG), performance pass (bundle size, paint metrics), and responsive layout. Explicitly deferred per ARCHITECTURE_REFACTOR_BRIEF_V4 — do not pull forward.

---

## Phase 9 — AI-assisted shape import + Lab point editing
**Status:** In progress
**Start:** 2026-05-25 | **Completion:** —
**Plan:** [`docs/plans/2026-05-25-phase-9-ai-shape-import.md`](docs/plans/2026-05-25-phase-9-ai-shape-import.md)

Feature 1: Add/insert/delete control points in the Lab (edge-hover phantom dot, click-to-insert, right-click/Delete-key to remove). Feature 2A: Clean-image trace via potrace-wasm (drag image onto canvas → threshold/trace → N sampled points). Feature 2B (V2): AI-assisted ROI for cluttered X-rays via Claude vision API → masked potrace. CLI wrapper: `scripts/trace-image.mjs`. Ships in order: F1 → F2A → CLI → F2B.

---

## Legacy Retirement
Track backwards-compatibility adapters in `legacy/` as needed. Delete when replacements stabilize.
