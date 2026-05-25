# Phase 8 — Accessibility + Performance
**Date:** 2026-05-25  
**Status:** In progress  
**Repo:** `C:\Users\ZMZ\Desktop\v3_OpenDesign_2\`

---

## Context

Phase 7 delivered: 65 Vitest, 11 Playwright, 0 lint errors. Backend wired, tablet layout resolved.

Phase 8 is the deferred quality bar:
1. **WCAG 2.1 AA** for interactive SVG (tooth selection is completely keyboard-unreachable today)
2. **Performance pass** — vendor chunk split, paint metrics
3. **Responsive CSS polish** — below-tablet breakpoints, touch targets

---

## Current State Audit

### Accessibility gaps
- `Tooth` (`app/dental-arch.jsx:17`) renders as `<g>` with `onClick` / `onMouseEnter` only — no `role`, `tabIndex`, `aria-label`, `onKeyDown`. Invisible to keyboard and screen readers.
- Global `window.addEventListener('keydown')` at line 656 handles some keyboard shortcuts but is not routed through React focus management.
- `dental-arch.jsx:989` — `role="status" aria-live="polite"` on selection bar: ✅ already correct.
- `tweaks-panel.jsx` — radio groups, switches, buttons: ✅ mostly ARIA-annotated.
- **Missing:** tooth grid keyboard navigation (arrow keys), focus ring, `aria-label` with FDI + tooth type, `aria-pressed` for selected state.

### Performance gaps
- `main.js` 328KB / 102KB gzip — React + React-DOM bundled into the app chunk, no vendor split.
- `jsx-runtime` 150KB / 48KB gzip — separate chunk already (Vite did this automatically).
- `vite.config.js` has no `manualChunks` — React will be re-downloaded on every app change if no vendor cache header.
- No `<link rel="preload">` in `index.html`.

### Responsive gaps
- `useIsTablet` breakpoint at 1180px is functional.
- CSS below 768px (phone) not validated — dental chart may overflow on narrow viewports.
- Touch targets on tooth elements: SVG `<g>` hit areas may be too small (<44×44px) on mobile.

---

## Implementation Plan

### A — Accessibility (WCAG 2.1 AA) [Sonnet]

#### A1 — Tooth keyboard navigation
**File:** `app/dental-arch.jsx` — `Tooth` component (lines 17–65)

- Add `role="button"` to the outer `<g>`.
- Add `tabIndex={0}` (or `-1` for teeth not in the roving tabindex ring — see A2).
- Add `aria-label={`Tooth ${fdi} (${type})`}` — e.g. `"Tooth 11 (upper-central-incisor)"`.
- Add `aria-pressed={isSelected}`.
- Add `onKeyDown` handler: `Enter` / `Space` → trigger `onSelect`; already mirrors button semantics.
- Add visible focus ring via CSS: `g:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.

#### A2 — Roving tabindex for the tooth grid
The dental arch has 32 teeth. Putting `tabIndex={0}` on all 32 creates excessive tab stops. Use a **roving tabindex** pattern:
- The focused tooth gets `tabIndex={0}`; all others get `tabIndex={-1}`.
- Arrow keys (←/→/↑/↓) move focus between teeth in FDI order.
- Track `focusedToothId` in `UIState` (already exists in `core/ui-context.jsx`).
- Remove the global `window.addEventListener('keydown')` at line 661 — replace with focused-element `onKeyDown` on the arch container.

**Files changed:** `app/dental-arch.jsx`, `core/ui-context.jsx` (add `focusedToothId` field).

#### A3 — SVG chart container ARIA
- Wrap the main `<svg>` in a `<div role="group" aria-label="Dental chart">`.
- Add `aria-label` to upper and lower arch groups: `"Upper arch"` / `"Lower arch"`.

#### A4 — Focus ring CSS
- `main.css` (or wherever global styles live): add `:focus-visible` ring for SVG `<g>` elements.
- Ensure the ring is visible against both light and dark clinic themes.

#### A5 — Accessibility tests (Vitest)
New test file: `app/dental-arch.test.jsx`
- Tooth renders with `role="button"` and correct `aria-label`.
- `aria-pressed` reflects selection state.
- Keyboard `Enter` on focused tooth triggers `onSelect`.
- Arrow key on arch container moves `focusedToothId`.

**Target: +8–10 Vitest tests.**

#### A6 — Playwright accessibility smoke test
New test file: `e2e/a11y.spec.js`
- Tab into the chart from outside.
- Verify first tooth is reachable and has correct accessible name.
- Arrow key to an adjacent tooth.
- Press Enter to select it; verify `aria-pressed="true"`.

**Target: +3–4 Playwright tests.**

---

### B — Performance [Sonnet]

#### B1 — Vendor chunk split
**File:** `vite.config.js`

Add `manualChunks` to split React + React-DOM into a stable `vendor` chunk:

```js
build: {
  rollupOptions: {
    input: { main: resolve(__dirname, 'index.html'), lab: resolve(__dirname, 'lab.html') },
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
      },
    },
  },
},
```

Expected result: `vendor.js` ~150KB gzip (static, long-cache), `main.js` drops to ~50–60KB gzip (changes per deploy).

#### B2 — Firebase lazy load
`core/firebase.js` imports the full Firebase SDK. If Firebase is only needed after auth, wrap the import with dynamic `import()` on first use.

Assess after B1 build output — if firebase chunk is already small (< 10KB), skip.

#### B3 — Preload hint
Add `<link rel="modulepreload" href="..." />` for the vendor chunk in `index.html` after build (or automate via `vite-plugin-html` if worth the dependency).

Decision: only add if vendor chunk is confirmed > 50KB gzip — otherwise overhead isn't worth it.

---

### C — Responsive CSS polish [Sonnet]

#### C1 — Phone breakpoint audit
Run app at 375px viewport. Document overflow issues. Fix CSS so chart scales down without horizontal scroll.

Key suspect: the SVG viewBox is likely fixed-aspect — check `app/dental-arch.jsx` render for the `<svg>` element and ensure `width: 100%` / `viewBox` is set.

#### C2 — Touch target enlargement
SVG tooth `<g>` elements may have hit areas < 44×44px on narrow viewports. Options:
- Expand the `<g>` hit area with an invisible `<rect>` behind the tooth path.
- Or use CSS `touch-action` + a larger `padding` equivalent via SVG `<rect fill="transparent">`.

Only apply to `<= 1180px` (tablet/phone) — desktop mouse interaction is fine.

#### C3 — Responsive test
Add Playwright test at 375px viewport: verify chart renders without horizontal scroll and teeth are tappable (hit area test via `boundingBox()`).

---

## Exit Criteria

- [ ] All 32 teeth reachable by keyboard (Tab → first tooth, arrow keys navigate within arch)
- [ ] Screen reader announces tooth: e.g. "Tooth 11, upper-central-incisor, button, not selected"
- [ ] `Enter` / `Space` selects focused tooth (same as click)
- [ ] Visible `:focus-visible` ring on all interactive elements
- [ ] Vendor chunk split: `main.js` < 120KB gzip
- [ ] No horizontal scroll at 375px viewport
- [ ] Touch targets ≥ 44px on tablet/phone breakpoint
- [ ] Vitest ≥ 73 (+ ~8 new), Playwright ≥ 14 (+ ~3 new), 0 lint errors

---

## Task Checklist

- [ ] A1 — Add `role="button"`, `aria-label`, `aria-pressed`, `onKeyDown` to `Tooth`
- [ ] A2 — Roving tabindex + arrow key navigation; remove global keydown listener
- [ ] A3 — SVG container and arch group ARIA labels
- [ ] A4 — `:focus-visible` CSS ring
- [ ] A5 — Vitest tests for keyboard + ARIA in `dental-arch.test.jsx`
- [ ] A6 — Playwright a11y smoke test in `e2e/a11y.spec.js`
- [ ] B1 — Vendor chunk split in `vite.config.js`
- [ ] B2 — Firebase lazy load (assess post-B1)
- [ ] B3 — Preload hint (conditional on chunk size)
- [ ] C1 — Phone breakpoint audit + CSS fix
- [ ] C2 — Touch target enlargement
- [ ] C3 — Playwright 375px responsive test
- [ ] Update ROADMAP.md Phase 8 entry to Complete
- [ ] Update memory `project_quotation_app_chart_redesign.md`

---

## DS-eligibility

| Task | Owner | Justification |
|------|-------|---------------|
| A1–A4 | Sonnet | Requires understanding existing component props + state flow |
| A5–A6 | Sonnet | Tests depend on implementation details |
| B1 | Sonnet | Simple config change, but must verify output |
| B2 | Sonnet | Conditional — assess first |
| C1–C3 | Sonnet | Requires running Playwright at specific viewport |
