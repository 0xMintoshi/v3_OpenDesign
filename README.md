# v3hero — Interactive SVG Dental Chart

> **Current status: Phases 0–9 complete + naming refactor.** v3hero is feature-complete as a standalone app.

## Quick start

```bash
npm install       # first time only
npm run dev       # app → http://localhost:5173
npm run lab       # Shape Lab → http://localhost:5173/lab.html
```

## Stack

- **Vite + React 18** — dev server, HMR, ESM build
- **Vitest** — 111 unit tests (`npm run test`)
- **Playwright** — 30 e2e tests (`npm run e2e`)
- **Firebase / Firestore** — treatment state persistence

## All commands

```bash
npm run dev          # app dev server
npm run build        # production build → dist/
npm run preview      # serve dist/ locally
npm run lab          # Shape Lab standalone editor
npm run test         # Vitest unit tests (run once)
npm run test:watch   # Vitest in watch mode
npm run e2e          # Playwright end-to-end
npm run lint         # ESLint — must be clean before committing
npm run trace -- <image-path>  # CLI potrace wrapper
```

## Architecture overview

v3hero renders a full-mouth FDI dental chart with two independent layers:

1. **Anatomy layer** — teeth outlines, arch curves, sinus zones. Shape JSONs in `shapes-data/anatomy/`. Layout math (arch curve, FDI positions, angulation) stays parametric in `layout/teeth-data.jsx`.
2. **Treatment layer** — SVG overlays applied per tooth/arch/sinus. Registered in `core/treatment-registry.js`. Shape JSONs in `shapes-data/treatments/`.

See **`docs/USER_GUIDE.md`** for the full architectural guide, Shape Lab walkthrough, and practical authoring workflows.

## Key directories

```
core/               # Treatment registry, chart context, Firestore service, themes
layout/             # Anatomy rendering, tooth geometry, arch layout
treatment-overlays/ # Treatment SVG overlay components
shapes-data/
  anatomy/          # Arch/sinus JSONs + tooth template JSONs (shapes-data/anatomy/teeth/)
  treatments/       # Crown, bridge, denture JSONs
lab/                # Shape Lab (standalone editor)
scripts/            # normalize-svg.mjs, extract-tooth-shapes.mjs, trace-image.mjs
docs/               # USER_GUIDE.md
e2e/                # Playwright specs
```

## Shape Lab

`npm run lab` opens a standalone control-point editor for authoring and refining shape JSONs. Features:

- Drag anchor points and Bézier handles
- Insert / delete points
- Undo (Ctrl+Z) and Mirror right → left
- Composite view: editing an arch shape shows the other 3 anatomy shapes as ghosts
- Two-path editing for tooth templates (Outline / Cervical tabs)
- Import from image (clean trace or AI-assisted via Claude vision API)
- Download JSON to replace source files

## Next step

Embed v3hero into the live Quotation App.
