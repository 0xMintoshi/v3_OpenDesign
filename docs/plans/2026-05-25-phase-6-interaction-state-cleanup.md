# Phase 6 — Interaction State Cleanup

**Status:** In progress  
**Date:** 2026-05-25  
**Exit criteria:** Clinical state lives in a named context; ephemeral UI state is explicitly classified; no `window.__*` globals remain; all 49 Vitest + 7 Playwright tests pass.

---

## Context

`DentalHero` in `app/dental-arch.jsx` holds all application state as a flat pile of `useState` calls. There is no conceptual separation between state that represents the patient record (durable, would be persisted to a backend) and state that represents transient UI interaction (hover, popover open, confirm dialog). This makes it harder to reason about what matters vs. what is ephemeral, and will become a blocker when Phase 7 wires clinical state to a backend.

**Current state inventory in `DentalHero`:**

| Variable | Type | Category |
|---|---|---|
| `presence` | `{ [toothId]: 'missing' }` | Clinical |
| `treatments` | `[{ id, scope, targets }]` | Clinical |
| `stage` | `'baseline' \| 'treatment'` | Workflow (clinical-adjacent) |
| `hoveredId` | `string \| null` | Ephemeral UI |
| `selection` | `string[]` | Ephemeral UI |
| `popover` | `{ mode, target, anchor, multi } \| null` | Ephemeral UI |
| `confirmWipe` | `{ label, onConfirm } \| null` | Ephemeral UI |
| `exportJson` | `object \| null` | Ephemeral UI |

**`window.*` audit (post Phase 5):**  
- `window.__labelAPI` — already removed in Phase 5 ✓  
- `window.parent.postMessage(__edit_mode_set_keys)` — intentional TweaksPanel host integration, keep  
- `window.dispatchEvent(new CustomEvent('tweakchange'))` — intentional same-window signal, keep  
- `window.addEventListener('message', ...)` for `__omelette_rail_enabled` — intentional host integration, keep  
- `window.innerWidth / innerHeight` — read-only DOM, fine  
- `window.addEventListener('keydown', ...)` for Escape — fine, standard keyboard handling  

**Conclusion:** No `window.__*` side-channels remain to clean up. The Phase 6 focus is state separation.

---

## Approach

Plain React context. No zustand — the app is a single page with one tree; zustand adds a dependency without buying anything at this scale. Context is sufficient and matches the ROADMAP spec.

Two new context modules:

1. **`core/chart-context.jsx`** — `ChartStateContext`: clinical + workflow state that will eventually round-trip to a backend. Provider wraps `DentalHero`; consumers are `TreatmentLayer`, `TreatmentLabels`, and `AnatomyBackground` (currently receive this as props from DentalHero).

2. **`core/ui-context.jsx`** — `UIStateContext`: ephemeral interaction state scoped to one session. Does not leave the browser; never persisted. `hoveredId`, `selection`, `popover`, `confirmWipe`, `exportJson`.

`DentalHero` becomes the provider for both contexts. Child components switch from prop-receipt to `useContext` for state they need.

---

## Tasks

- [ ] **6.1 — Create `core/chart-context.jsx`**  
  Export `ChartStateContext` + `useChartState` hook. Shape:  
  ```js
  { stage, setStage, presence, setPresence, treatments, setTreatments }
  ```  
  No reducer yet — keep `useState` internally, expose via context value.

- [ ] **6.2 — Create `core/ui-context.jsx`**  
  Export `UIStateContext` + `useUIState` hook. Shape:  
  ```js
  { hoveredId, setHoveredId, selection, setSelection,
    popover, setPopover, confirmWipe, setConfirmWipe,
    exportJson, setExportJson }
  ```

- [ ] **6.3 — Wrap providers in `DentalHero`**  
  Move `useState` calls for clinical + UI state into the two contexts. `DentalHero` renders:  
  ```jsx
  <ChartStateProvider>
    <UIStateProvider>
      {/* existing render tree */}
    </UIStateProvider>
  </ChartStateProvider>
  ```

- [ ] **6.4 — Migrate child components to `useContext`**  
  - `TreatmentLayer` — reads `treatments` from `ChartStateContext` (remove prop)  
  - `TreatmentLabels` — reads `treatments`, `presence` from `ChartStateContext` (remove props)  
  - `AnatomyBackground` — reads `hoveredId`, `stage` from contexts (remove props)  
  - `Tooth` — reads `hoveredId`, `stage` from `UIStateContext`/`ChartStateContext` (remove props)  
  - Only migrate props that are directly consumed; don't over-reach into handler props yet

- [ ] **6.5 — Confirm no `window.__*` globals remain**  
  Run: `grep -rn "window\.__" app/ core/ layout/ visuals/ lab/ src/`  
  Must return zero results.

- [ ] **6.6 — Add unit tests for context modules**  
  `core/chart-context.test.js` and `core/ui-context.test.js` — trivial: render a provider, consume via hook, verify initial state shape.

- [ ] **6.7 — Run full test suite**  
  `npm run test` (49 Vitest) + `npm run e2e` (7 Playwright). All must pass.

- [ ] **6.8 — Update ROADMAP.md**  
  Mark Phase 6 complete, set Phase 7 as next.

---

## What this phase does NOT do

- No TypeScript (still deferred per Phase 2 decision)
- No zustand
- No persistence / serialisation (Phase 7)
- No prop-drilling cleanup for handler functions (`onSelect`, `onHover`, etc.) — those are callbacks that belong in `DentalHero`; passing them as props is correct
- No changes to TweaksPanel state or `window.postMessage` host integration

---

## Risk

Low. The refactor is mechanical — move `useState` calls behind a context, update consumers. No logic changes. Tests cover the surface area. The only gotcha is that React context causes a full subtree re-render on every state change; `hoveredId` changes on every mouse-move. To avoid a render storm:

- Keep `UIStateContext` split from `ChartStateContext` so hover thrashing doesn't re-render treatment-heavy components
- If hover perf is still bad after the refactor, wrap `Tooth` and `AnatomyBackground` in `React.memo` (do this only if measurably needed)
