# Chart Footer → Floating Glass Dock Redesign

## Context

The v3 chart's Stage 1 and Stage 2 footers use wide text-pill buttons (`BaselineFooter` / `TreatmentFooter` in `app/dental-arch.jsx`). Minzhe wants them redesigned as a macOS-style dock, inspired by a shadcn/Tailwind/framer-motion sample. That stack doesn't exist in the chart repo (vanilla CSS + React 18 + Vite), so this translates the dock's design language into the chart's own tokens.

**Decisions locked (after critique round):**
- Scope: **both stage footers**. Tweaks trigger, SelectionActionBar, popover, and tablet layout untouched.
- **Icon-only buttons + tooltips** (on hover *and* `:focus-visible`; every item gets `aria-label`). Risk accepted: tooltips are invisible on touch — so each icon must be **designed to be representative of its label on its own** (dedicated icon-design phase with a drafts page; Minzhe picks before dock code starts).
- **Floating dock over the chart** — fixed near bottom-center so backdrop-blur has real chart content behind it (true glass). The in-flow footer row is retired.
- **CSS-only motion** — no framer-motion dependency. Tooltip fades and Clear Plan enter/exit in plain CSS transitions.
- Effects: glass container only — no magnify, glow, active dot, or idle bob.

**Repo hygiene:** chart repo has 19 uncommitted files from the RCT removal — commit them first (step 0) so this feature starts clean.

## Plan location

After approval, move this file to `Dentistry/Quotation App/v3/chart/docs/plans/2026-07-19-dock-footer.md`.

## Steps (all [Sonnet] — interactive UI work, no DS delegation)

### 0. Commit pending RCT removal
```
cd "Dentistry/Quotation App/v3/chart"
git status   # verify all 19 files are RCT cleanup
git add -A && git commit -m "revert: remove RCT feature (shelved)"
```

### 1. Icon design phase (before any dock code)
Icon-only buttons live or die on the icons, so they get designed deliberately, not picked from a generic set. Each icon must be representative of its label on its own:

| Action | Design intent |
|---|---|
| Upper Edentulous | Upper arch silhouette viewed as in the chart — arch curve opening **downward** with a gum-line, reading as "upper jaw, no teeth". Not a bare ⌒. |
| Lower Edentulous | True counterpart: arch opening **upward**. The pair must be instantly tellable apart at 20px — different orientation AND distinct silhouette weight. |
| Restore Upper / Lower (active state) | Same arch icon with teeth present (filled tooth row inside the arch) — the icon itself flips meaning, not just the tint. |
| Stage 2 → | "Advance to treatment planning": arrow-forward combined with a treatment cue (e.g. small tooth + plus, or arch→arrow composite). Not a bare arrow. |
| ← Stage 1 | Return cue: arrow-back combined with the baseline-chart cue (mirror language of Stage 2 icon so they read as a pair). |
| Summary → | Document/list glyph (quote lines) with forward cue — "export to summary". |
| Clear Plan | Eraser or sweep glyph — avoid trash-can (reads as delete-patient-data). |

Workflow (repo's established drafts idiom, like `crown-visual-drafts.html`):
- Build `public/dock-icon-drafts.html` — grid of 2–3 hand-drawn SVG candidates per action at actual size (20px) and 3× zoom, on both light and dark theme backgrounds, plus each pair shown side-by-side to test tellability.
- Minzhe reviews in browser and picks; chosen set gets locked before any dock code is written.
- Icons: inline SVG, `currentColor`, 20×20, consistent stroke width across the whole set.

### 2. New component: `app/dock.jsx` (no new dependencies)
- `<Dock>` — glass pill bar, `position: fixed; bottom: ~24px; left: 50%; translateX(-50%)`, translucent bg + `backdrop-filter: blur`, hairline border, soft shadow, `z-index` above chart but below popover/Tweaks (popover is z-50/60 — dock sits ~z-40).
- `<DockItem icon label onClick active primary accent>` — square icon button (~44px, rounded):
  - default: transparent bg, `var(--ink)` icon
  - `active` (arch edentulous engaged): accent-tinted fill; tooltip text swaps ("Restore Upper")
  - `primary` (Stage 2 / Summary): solid accent circle, white icon
- `<DockDivider>` — hairline separator.
- Tooltip: pure CSS — label element above the item, `opacity/transform` transition, shown on `:hover` and `:focus-visible`, styled with `--card-bg`/`--card-border`/`--ink`.
- Icons: the locked set from step 1, inlined in this file.

### 3. Rewire footers in `app/dental-arch.jsx`
Same handlers, new markup; the `<footer className="footer workflow-footer">` wrapper becomes the dock mount (or is replaced by it):
- **Stage 1**: `[upper-arch] [lower-arch] │ [Stage 2 →]primary`
- **Stage 2**: `[← back] │ [clear (only when treatments.length > 0, CSS enter/exit)] [Summary →]primary`
- The Stage 1 status text ("n teeth marked") is already hidden by `.baseline-footer` CSS — drop it or leave dormant, whichever diff is smaller.

### 4. Layout consequences of floating (the part that needs care)
- Chart area reclaims the old footer height — verify lower-arch teeth/labels don't sit under the dock; if they do, add bottom padding to the chart container equal to dock height + gap.
- **SelectionActionBar** (Stage 2, appears on selection): check its position — it must stack above the dock, not collide. Adjust its `bottom` offset if needed.
- Narrow viewport: replace the old `.footer` 459px media query with a dock equivalent (tighter gaps/smaller items).

### 5. Styles in `src/styles.css`
- New `.dock`, `.dock-item`, `.dock-divider`, `.dock-tooltip` rules on existing chart tokens.
- Add translucent `--dock-bg` to both `flatTheme()` and `darkTheme()` in `dental-arch.jsx` (opaque `--card-bg` can't do glass).
- **Check the parent theme bridge**: confirm `syncChartTheme()` / `CHART_TOKEN_MAP` in `v3/js/main.js` won't stomp or need to supply `--dock-bg`; give the CSS a sane `var(--dock-bg, fallback)`.
- Retire `.footer-btn`/`.arch-btn`/`.advance-btn` sizing rules; leave `.btn-ghost`/`.btn-primary` alone (used by SelectionActionBar, popover).
- Dock sizing/spacing as CSS vars at the top of the block so Minzhe can dial values himself.

### 6. Test migration (concrete, not incidental)
Old visible-text selectors ("Upper Edentulous", "Stage 2", "Clear Plan", "Summary") break by design:
- `e2e/verify.spec.js`, `e2e-parent/verify-session-split.spec.js` — migrate to `getByRole('button', { name: … })` backed by the new `aria-label`s.
- Unit tests touching footer markup (grep `Edentulous|Stage 2|Clear Plan|Summary` under tests) — same migration.
- `e2e/a11y.spec.js` — verify icon-only buttons still pass (aria-labels should cover it).

### 7. Verification
- `npm run dev`, then Playwright MCP on `http://localhost:<port>` (never `file://`): Stage 1 dock screenshot; toggle Upper Edentulous (active tint + tooltip swap); keyboard-Tab to confirm focus tooltips; advance to Stage 2; add treatment → Clear Plan appears; select teeth → SelectionActionBar doesn't collide with dock; Back/Summary click-through.
- `npm test` + `npm run lint` + `npm run e2e`.
- `npm run build`, then parent app (`npm run serve` from Quotation App root → `localhost:5173/v3/`), hard-refresh, confirm dock renders in the iframe under titan-editorial.

### 8. Wrap-up
Commit in chart repo. Update `chart/CLAUDE.md` only if a durable convention emerged (dock token names, z-index ladder).
