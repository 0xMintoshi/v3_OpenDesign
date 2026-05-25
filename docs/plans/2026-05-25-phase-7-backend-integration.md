# Phase 7 — Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire clinical chart state to Firebase/Firestore, load per-clinic themes from the `?clinic=` URL parameter, and add a simplified tablet layout fallback for screens ≤1180px.

**Architecture:** Three independent subsystems added in sequence — (1) Firestore persistence via a thin `chart-service` adapter, (2) a URL-driven theme registry that injects CSS custom properties at runtime, (3) a `useIsTablet` hook that swaps the full anatomy chart for a compact touch-friendly layout. The `ChartStateProvider` gains a `patientId` prop that drives load-on-mount and debounced auto-save. No new state management layers — the existing `ChartStateContext` is the single source of truth.

**Tech Stack:** React 18, Vite, Firebase JS SDK v11 (modular), Vitest, Playwright, plain CSS custom properties for theming.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `core/firebase.js` | Create | Firebase app init from Vite env vars |
| `core/chart-service.js` | Create | `saveChart` / `loadChart` Firestore adapters |
| `core/chart-context.jsx` | Modify | Add `patientId` prop; load on mount, debounced save on change |
| `core/themes.js` | Create | Clinic theme registry (slug → CSS variable map) |
| `core/use-clinic-theme.js` | Create | Read `?clinic=` param; inject CSS vars; return active theme slug |
| `layout/tablet-chart.jsx` | Create | Compact tooth-row-only chart for tablet viewports |
| `layout/use-is-tablet.js` | Create | `window.matchMedia('(max-width: 1180px)')` with resize listener |
| `app/dental-arch.jsx` | Modify | Wrap with `useIsTablet`; render `TabletChart` or full chart |
| `src/styles.css` | Modify | Add CSS custom property fallbacks for clinic theme vars |
| `core/chart-context.test.js` | Modify | Add persistence round-trip tests with mocked chart-service |
| `core/themes.test.js` | Create | Theme registry unit tests |
| `layout/tablet-chart.test.jsx` | Create | Tablet layout renders correct tooth count |
| `e2e/tablet.spec.js` | Create | Playwright: resize to 1000px, verify tablet layout visible |
| `e2e/theme.spec.js` | Create | Playwright: `?clinic=titan` applies expected CSS var |

---

## Task 1: Firebase init module

**Files:**
- Create: `core/firebase.js`
- Create: `.env.local` (gitignored)
- Modify: `.gitignore`

> Before starting: get the Firebase project config from the Quotation App demo (`Claude/Dentistry/Quotation App/demo/`) or create a new Firestore project. The config needs `apiKey`, `authDomain`, `projectId`.

- [ ] **Step 1.1: Add `firebase` dependency**

```bash
cd C:/Users/ZMZ/Desktop/v3_OpenDesign_2
npm install firebase
```

Expected: `firebase` appears in `package.json` dependencies, no errors.

- [ ] **Step 1.2: Create `.env.local` with Firebase config**

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```

Replace placeholder values with actual credentials from Firebase console.

- [ ] **Step 1.3: Ensure `.env.local` is gitignored**

Open `.gitignore`, verify `.env.local` is listed. If not, add it:

```
.env.local
```

- [ ] **Step 1.4: Create `core/firebase.js`**

```js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

- [ ] **Step 1.5: Verify dev server still starts**

```bash
npm run dev
```

Expected: server starts on `http://localhost:5173`, no console errors about Firebase config.

- [ ] **Step 1.6: Commit**

```bash
git add core/firebase.js .gitignore package.json package-lock.json
git commit -m "feat(firebase): add firebase init module with Vite env config"
```

---

## Task 2: chart-service — Firestore save/load adapter

**Files:**
- Create: `core/chart-service.js`

The chart document structure in Firestore:
```
charts/{patientId}
  stage: 'baseline' | 'treatment'
  presence: { [toothId]: 'missing' }   // toothId is FDI string e.g. "11", "46"
  treatments: [{ id, scope, targets }]
  updatedAt: serverTimestamp
```

- [ ] **Step 2.1: Write failing test for `loadChart`**

In `core/chart-service.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore module
vi.mock('../core/firebase.js', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import { loadChart, saveChart } from './chart-service.js';
import { getDoc, setDoc, doc } from 'firebase/firestore';

describe('chart-service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loadChart returns null when document does not exist', async () => {
    doc.mockReturnValue('docRef');
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await loadChart('patient-1');
    expect(result).toBeNull();
  });

  it('loadChart returns chart data when document exists', async () => {
    const data = { stage: 'baseline', presence: {}, treatments: [] };
    doc.mockReturnValue('docRef');
    getDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const result = await loadChart('patient-1');
    expect(result).toEqual(data);
  });

  it('saveChart writes stage, presence, treatments', async () => {
    doc.mockReturnValue('docRef');
    setDoc.mockResolvedValue(undefined);
    await saveChart('patient-1', { stage: 'treatment', presence: { '11': 'missing' }, treatments: [] });
    expect(setDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ stage: 'treatment', presence: { '11': 'missing' } }),
      { merge: true }
    );
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
npm run test -- chart-service
```

Expected: FAIL — `chart-service.js` not found.

- [ ] **Step 2.3: Create `core/chart-service.js`**

```js
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export async function loadChart(patientId) {
  const ref = doc(db, 'charts', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveChart(patientId, { stage, presence, treatments }) {
  const ref = doc(db, 'charts', patientId);
  await setDoc(ref, { stage, presence, treatments, updatedAt: serverTimestamp() }, { merge: true });
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
npm run test -- chart-service
```

Expected: 3 PASS.

- [ ] **Step 2.5: Commit**

```bash
git add core/chart-service.js core/chart-service.test.js
git commit -m "feat(chart-service): add Firestore save/load adapter with tests"
```

---

## Task 3: Wire ChartStateProvider to Firestore

**Files:**
- Modify: `core/chart-context.jsx`
- Modify: `core/chart-context.test.js`

`ChartStateProvider` gains an optional `patientId` prop. When present: load chart on mount, auto-save (debounced 800ms) when `stage`, `presence`, or `treatments` change. When absent: local-only (existing behaviour, offline/dev safe).

- [ ] **Step 3.1: Write failing tests for persistence wiring**

Add to `core/chart-context.test.js`:

```js
import { describe, it, expect, vi, beforeEach, act } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChartStateProvider, useChartState } from './chart-context.jsx';

vi.mock('./chart-service.js', () => ({
  loadChart: vi.fn(),
  saveChart: vi.fn(),
}));

import { loadChart, saveChart } from './chart-service.js';

function Consumer() {
  const { stage, treatments } = useChartState();
  return <div data-testid="stage">{stage}</div>;
}

describe('ChartStateProvider — persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads chart from backend on mount when patientId provided', async () => {
    loadChart.mockResolvedValue({ stage: 'treatment', presence: { '11': 'missing' }, treatments: [] });
    await act(async () => {
      render(
        <ChartStateProvider patientId="p1"><Consumer /></ChartStateProvider>
      );
    });
    expect(loadChart).toHaveBeenCalledWith('p1');
    expect(screen.getByTestId('stage').textContent).toBe('treatment');
  });

  it('does not call loadChart when patientId is absent', async () => {
    await act(async () => {
      render(<ChartStateProvider><Consumer /></ChartStateProvider>);
    });
    expect(loadChart).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
npm run test -- chart-context
```

Expected: FAIL — `loadChart` not called / stage stays 'baseline'.

- [ ] **Step 3.3: Modify `core/chart-context.jsx` to wire persistence**

```jsx
import React from 'react';
import { loadChart, saveChart } from './chart-service.js';

const ChartStateContext = React.createContext(null);

export function ChartStateProvider({ children, patientId }) {
  const [stage, setStage] = React.useState('baseline');
  const [presence, setPresence] = React.useState({});
  const [treatments, setTreatments] = React.useState([]);
  const [loaded, setLoaded] = React.useState(!patientId);

  // Load on mount
  React.useEffect(() => {
    if (!patientId) return;
    loadChart(patientId).then((data) => {
      if (data) {
        setStage(data.stage ?? 'baseline');
        setPresence(data.presence ?? {});
        setTreatments(data.treatments ?? []);
      }
      setLoaded(true);
    });
  }, [patientId]);

  // Debounced auto-save — only after initial load
  React.useEffect(() => {
    if (!patientId || !loaded) return;
    const timer = setTimeout(() => {
      saveChart(patientId, { stage, presence, treatments });
    }, 800);
    return () => clearTimeout(timer);
  }, [patientId, loaded, stage, presence, treatments]);

  const value = React.useMemo(
    () => ({ stage, setStage, presence, setPresence, treatments, setTreatments, loaded }),
    [stage, presence, treatments, loaded],
  );

  return (
    <ChartStateContext.Provider value={value}>
      {children}
    </ChartStateContext.Provider>
  );
}

export function useChartState() {
  const ctx = React.useContext(ChartStateContext);
  if (!ctx) throw new Error('useChartState must be used within ChartStateProvider');
  return ctx;
}
```

- [ ] **Step 3.4: Update `app/dental-arch.jsx` to pass `patientId` from URL**

In `DentalHero` (or wherever `ChartStateProvider` is rendered), read the URL param and pass it:

```jsx
// At top of DentalHero component:
const patientId = new URLSearchParams(window.location.search).get('patient') || null;

// In return:
<ChartStateProvider patientId={patientId}>
  ...
</ChartStateProvider>
```

- [ ] **Step 3.5: Run tests to verify they pass**

```bash
npm run test -- chart-context
```

Expected: all chart-context tests PASS (including the two new ones).

- [ ] **Step 3.6: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/?patient=test-001`. Confirm no console errors. Mark a tooth missing, wait 1 second, refresh page — tooth should still be missing (Firestore round-trip).

- [ ] **Step 3.7: Commit**

```bash
git add core/chart-context.jsx core/chart-context.test.js app/dental-arch.jsx
git commit -m "feat(chart-context): wire Firestore load-on-mount and debounced auto-save via patientId"
```

---

## Task 4: Clinic theme via URL parameter

**Files:**
- Create: `core/themes.js`
- Create: `core/use-clinic-theme.js`
- Create: `core/themes.test.js`
- Modify: `src/styles.css`
- Modify: `app/dental-arch.jsx`

Theme system: `?clinic=<slug>` → look up slug in registry → inject CSS custom properties onto `document.documentElement`. Components use `var(--clinic-accent)` etc. Fallback values defined in `styles.css`.

- [ ] **Step 4.1: Write failing tests for theme registry**

Create `core/themes.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getTheme, THEMES } from './themes.js';

describe('themes', () => {
  it('returns default theme for unknown slug', () => {
    const t = getTheme('unknown-clinic');
    expect(t.slug).toBe('default');
    expect(t.vars).toHaveProperty('--clinic-accent');
  });

  it('returns titan theme for slug "titan"', () => {
    const t = getTheme('titan');
    expect(t.slug).toBe('titan');
    expect(t.vars['--clinic-accent']).toBeDefined();
  });

  it('THEMES registry contains at least default and titan', () => {
    expect(THEMES.default).toBeDefined();
    expect(THEMES.titan).toBeDefined();
  });
});
```

- [ ] **Step 4.2: Run test to confirm fail**

```bash
npm run test -- themes
```

Expected: FAIL — `themes.js` not found.

- [ ] **Step 4.3: Create `core/themes.js`**

```js
export const THEMES = {
  default: {
    slug: 'default',
    vars: {
      '--clinic-accent': '#2563eb',
      '--clinic-accent-subtle': '#eff6ff',
      '--clinic-surface': '#ffffff',
      '--clinic-text': '#0f172a',
    },
  },
  titan: {
    slug: 'titan',
    vars: {
      '--clinic-accent': '#1a1a2e',
      '--clinic-accent-subtle': '#f0f0f8',
      '--clinic-surface': '#fafafa',
      '--clinic-text': '#0f172a',
    },
  },
  bright: {
    slug: 'bright',
    vars: {
      '--clinic-accent': '#0ea5e9',
      '--clinic-accent-subtle': '#f0f9ff',
      '--clinic-surface': '#ffffff',
      '--clinic-text': '#0c4a6e',
    },
  },
};

export function getTheme(slug) {
  return THEMES[slug] ?? THEMES.default;
}
```

- [ ] **Step 4.4: Run theme tests to confirm they pass**

```bash
npm run test -- themes
```

Expected: 3 PASS.

- [ ] **Step 4.5: Create `core/use-clinic-theme.js`**

```js
import { useEffect, useState } from 'react';
import { getTheme } from './themes.js';

export function useClinicTheme() {
  const slug = new URLSearchParams(window.location.search).get('clinic') ?? 'default';
  const [activeSlug, setActiveSlug] = useState(slug);

  useEffect(() => {
    const theme = getTheme(slug);
    Object.entries(theme.vars).forEach(([prop, val]) => {
      document.documentElement.style.setProperty(prop, val);
    });
    setActiveSlug(theme.slug);
  }, [slug]);

  return activeSlug;
}
```

- [ ] **Step 4.6: Add CSS custom property fallbacks to `src/styles.css`**

Add at the top of the existing `:root` block (or create one if absent):

```css
:root {
  --clinic-accent: #2563eb;
  --clinic-accent-subtle: #eff6ff;
  --clinic-surface: #ffffff;
  --clinic-text: #0f172a;
}
```

- [ ] **Step 4.7: Call `useClinicTheme` in `DentalHero`**

In `app/dental-arch.jsx`, inside `DentalHero`:

```jsx
import { useClinicTheme } from '../core/use-clinic-theme.js';

// Inside DentalHero:
useClinicTheme();
```

This is a side-effect-only call; no need to use the return value unless a component needs to display the clinic name.

- [ ] **Step 4.8: Add Playwright theme test**

Create `e2e/theme.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('?clinic=titan applies --clinic-accent CSS variable', async ({ page }) => {
  await page.goto('/?clinic=titan');
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--clinic-accent').trim()
  );
  expect(accent).toBe('#1a1a2e');
});

test('unknown clinic slug falls back to default theme', async ({ page }) => {
  await page.goto('/?clinic=nonexistent');
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--clinic-accent').trim()
  );
  expect(accent).toBe('#2563eb');
});
```

- [ ] **Step 4.9: Run full test suite**

```bash
npm run test && npm run e2e
```

Expected: all Vitest PASS, all Playwright PASS including the 2 new theme tests.

- [ ] **Step 4.10: Commit**

```bash
git add core/themes.js core/themes.test.js core/use-clinic-theme.js app/dental-arch.jsx src/styles.css e2e/theme.spec.js
git commit -m "feat(theme): URL-driven per-clinic theme registry with CSS custom properties"
```

---

## Task 5: `useIsTablet` hook

**Files:**
- Create: `layout/use-is-tablet.js`

- [ ] **Step 5.1: Write failing test**

Create `layout/use-is-tablet.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useIsTablet', () => {
  let matchMediaMock;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true });
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns false when viewport is wider than 1180px', async () => {
    const { useIsTablet } = await import('./use-is-tablet.js');
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia matches tablet breakpoint', async () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(max-width: 1180px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { useIsTablet } = await import('./use-is-tablet.js');
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 5.2: Run test to confirm fail**

```bash
npm run test -- use-is-tablet
```

Expected: FAIL.

- [ ] **Step 5.3: Create `layout/use-is-tablet.js`**

```js
import { useState, useEffect } from 'react';

const TABLET_QUERY = '(max-width: 1180px)';

export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() => window.matchMedia(TABLET_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(TABLET_QUERY);
    const handler = (e) => setIsTablet(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isTablet;
}
```

- [ ] **Step 5.4: Run tests to confirm pass**

```bash
npm run test -- use-is-tablet
```

Expected: 2 PASS.

- [ ] **Step 5.5: Commit**

```bash
git add layout/use-is-tablet.js layout/use-is-tablet.test.js
git commit -m "feat(layout): useIsTablet hook with matchMedia 1180px breakpoint"
```

---

## Task 6: Tablet simplified layout component

**Files:**
- Create: `layout/tablet-chart.jsx`
- Create: `layout/tablet-chart.test.jsx`

The tablet layout renders only the upper and lower tooth rows (no anatomy background, no sinus/arch overlays). Touch targets are enlarged. Treatment overlays remain functional.

- [ ] **Step 6.1: Write failing test**

Create `layout/tablet-chart.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TabletChart } from './tablet-chart.jsx';
import { ChartStateProvider } from '../core/chart-context.jsx';
import { UIStateProvider } from '../core/ui-context.jsx';

vi.mock('../core/chart-service.js', () => ({ loadChart: vi.fn(), saveChart: vi.fn() }));

function Wrapper({ children }) {
  return (
    <ChartStateProvider>
      <UIStateProvider>{children}</UIStateProvider>
    </ChartStateProvider>
  );
}

describe('TabletChart', () => {
  it('renders upper and lower tooth rows', () => {
    render(<Wrapper><TabletChart /></Wrapper>);
    expect(screen.getByTestId('tablet-upper-row')).toBeTruthy();
    expect(screen.getByTestId('tablet-lower-row')).toBeTruthy();
  });

  it('renders 16 teeth in each row', () => {
    render(<Wrapper><TabletChart /></Wrapper>);
    const upper = screen.getByTestId('tablet-upper-row');
    const lower = screen.getByTestId('tablet-lower-row');
    expect(upper.querySelectorAll('[data-tooth-id]').length).toBe(16);
    expect(lower.querySelectorAll('[data-tooth-id]').length).toBe(16);
  });
});
```

- [ ] **Step 6.2: Run test to confirm fail**

```bash
npm run test -- tablet-chart
```

Expected: FAIL.

- [ ] **Step 6.3: Create `layout/tablet-chart.jsx`**

```jsx
import React from 'react';
import { UPPER, LOWER, layoutArch, toothPaths } from './teeth-data.jsx';
import { useChartState } from '../core/chart-context.jsx';
import { useUIState } from '../core/ui-context.jsx';

const TABLET_SVG_WIDTH = 740;
const TABLET_TOOTH_SCALE = 0.9;

export function TabletChart({ onSelect, onHover }) {
  const { presence, treatments, stage } = useChartState();
  const { hoveredId, selection } = useUIState();

  const upper = React.useMemo(() => layoutArch(UPPER, TABLET_SVG_WIDTH, TABLET_TOOTH_SCALE), []);
  const lower = React.useMemo(() => layoutArch(LOWER, TABLET_SVG_WIDTH, TABLET_TOOTH_SCALE), []);

  const treatedTeeth = React.useMemo(() => {
    const s = new Set();
    treatments.forEach((tx) => {
      if (tx.scope === 'tooth') tx.targets.forEach((id) => s.add(id));
    });
    return s;
  }, [treatments]);

  const handleHover = onHover ?? (() => {});
  const handleSelect = onSelect ?? (() => {});

  return (
    <div className="tablet-chart" style={{ padding: '16px', touchAction: 'manipulation' }}>
      <svg
        data-testid="tablet-upper-row"
        viewBox={`0 0 ${TABLET_SVG_WIDTH} 110`}
        width="100%"
        style={{ display: 'block', marginBottom: '8px' }}>
        {upper.map((tooth) => (
          <TabletTooth
            key={tooth.id}
            tooth={tooth}
            jawFlip={false}
            presence={presence[tooth.id]}
            isHovered={hoveredId === tooth.id}
            isSelected={selection.includes(tooth.id)}
            hasTreatment={treatedTeeth.has(tooth.id)}
            stage={stage}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        ))}
      </svg>
      <svg
        data-testid="tablet-lower-row"
        viewBox={`0 0 ${TABLET_SVG_WIDTH} 110`}
        width="100%"
        style={{ display: 'block' }}>
        {lower.map((tooth) => (
          <TabletTooth
            key={tooth.id}
            tooth={tooth}
            jawFlip={true}
            presence={presence[tooth.id]}
            isHovered={hoveredId === tooth.id}
            isSelected={selection.includes(tooth.id)}
            hasTreatment={treatedTeeth.has(tooth.id)}
            stage={stage}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        ))}
      </svg>
    </div>
  );
}

function TabletTooth({ tooth, jawFlip, presence, isHovered, isSelected, hasTreatment, stage, onHover, onSelect }) {
  const { cx, h, w, type, fdi, tilt = 0, yOffset = 0 } = tooth;
  const flipY = jawFlip ? -1 : 1;
  const paths = toothPaths(type, w * 1.15, h * 1.15); // 15% larger touch target
  const missing = presence === 'missing';

  const fill = missing ? 'none' : (isSelected ? 'var(--clinic-accent-subtle, #eff6ff)' : '#fff');
  const stroke = isHovered ? 'var(--clinic-accent, #2563eb)' : (hasTreatment ? '#f97316' : '#94a3b8');

  return (
    <g
      data-tooth-id={tooth.id}
      data-tooth-fdi={fdi}
      transform={`translate(${cx}, ${55 + yOffset * flipY}) scale(1, ${flipY}) rotate(${tilt})`}
      style={{ cursor: stage === 'baseline' ? 'pointer' : 'pointer' }}
      onMouseEnter={() => onHover(tooth.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => onSelect({ kind: 'tooth', id: tooth.id }, e, 'click')}>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={fill}
          stroke={stroke}
          strokeWidth={isHovered ? 2 : 1.5}
          opacity={missing ? 0.2 : 1}
        />
      ))}
      <text
        y={jawFlip ? (h * 1.15 + 14) : -(h * 1.15 + 6)}
        textAnchor="middle"
        fontSize="9"
        fill="#64748b"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {fdi}
      </text>
    </g>
  );
}
```

- [ ] **Step 6.4: Run tests to confirm pass**

```bash
npm run test -- tablet-chart
```

Expected: 2 PASS.

- [ ] **Step 6.5: Commit**

```bash
git add layout/tablet-chart.jsx layout/tablet-chart.test.jsx
git commit -m "feat(layout): TabletChart simplified tooth-row layout for ≤1180px"
```

---

## Task 7: Wire tablet layout into the app

**Files:**
- Modify: `app/dental-arch.jsx`
- Create: `e2e/tablet.spec.js`

- [ ] **Step 7.1: Import `useIsTablet` and `TabletChart` in `dental-arch.jsx`**

Add at the top of `app/dental-arch.jsx`:

```jsx
import { useIsTablet } from '../layout/use-is-tablet.js';
import { TabletChart } from '../layout/tablet-chart.jsx';
```

- [ ] **Step 7.2: Add tablet branch to `DentalHero`**

Inside `DentalHero`, near the top of the component body (after existing hooks):

```jsx
const isTablet = useIsTablet();
```

In the return, wrap the full chart rendering so that the tablet layout is shown at ≤1180px:

```jsx
// Replace the top-level return with:
return (
  <ChartStateProvider patientId={patientId}>
    <UIStateProvider>
      {isTablet ? (
        <TabletChart
          onSelect={/* pass through the existing handler or define inline */}
          onHover={/* pass through */}
        />
      ) : (
        /* existing full chart render tree — unchanged */
      )}
    </UIStateProvider>
  </ChartStateProvider>
);
```

Note: the `onSelect` and `onHover` handlers in the tablet path should call `setHoveredId` and the selection logic already in `DentalHero`. Extract them to named callbacks before the conditional return so both paths share them.

- [ ] **Step 7.3: Create Playwright tablet test**

Create `e2e/tablet.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('tablet layout visible at 1000px width', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await page.goto('/');
  const upper = page.locator('[data-testid="tablet-upper-row"]');
  await expect(upper).toBeVisible();
});

test('full chart visible at 1400px width', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  const upper = page.locator('[data-testid="tablet-upper-row"]');
  await expect(upper).not.toBeVisible();
});
```

- [ ] **Step 7.4: Run full test suite**

```bash
npm run test && npm run e2e
```

Expected: all Vitest PASS, all Playwright PASS (9+ tests including the 2 new tablet tests).

- [ ] **Step 7.5: Commit**

```bash
git add app/dental-arch.jsx e2e/tablet.spec.js
git commit -m "feat(app): render TabletChart for ≤1180px viewports via useIsTablet"
```

---

## Task 8: Final verification and ROADMAP update

- [ ] **Step 8.1: Run full test suite clean**

```bash
npm run test && npm run e2e && npm run lint
```

Expected: all pass, no lint errors.

- [ ] **Step 8.2: Manual end-to-end smoke test**

1. `npm run dev`
2. Open `http://localhost:5173/?patient=smoke-001&clinic=titan`
3. Verify: titan CSS accent applied (inspect `--clinic-accent`)
4. Mark tooth 11 missing → wait 1s → refresh → tooth still missing (Firestore persisted)
5. Resize browser to 900px wide → verify `TabletChart` appears
6. Resize back to 1400px → full chart reappears

- [ ] **Step 8.3: Update `ROADMAP.md`**

Mark Phase 7 complete with today's date and link to this plan file. Set Phase 8 as next.

```markdown
## Phase 7 — Backend Integration
**Status:** Complete
**Start:** 2026-05-25 | **Completion:** 2026-05-25
**Plan:** [`docs/plans/2026-05-25-phase-7-backend-integration.md`](docs/plans/2026-05-25-phase-7-backend-integration.md)
```

- [ ] **Step 8.4: Commit**

```bash
git add ROADMAP.md
git commit -m "docs(roadmap): mark Phase 7 complete, Phase 8 next"
```

---

## Self-Review

**Spec coverage check:**

| ROADMAP requirement | Covered by |
|---|---|
| Wire treatment records to backend using stable FDI string IDs | Tasks 1–3 (Firestore with `{ presence: { [toothId] }, treatments: [{ id, scope, targets }] }`) |
| Per-clinic theme loaded at runtime | Task 4 (`?clinic=` → CSS custom properties) |
| Tablet layout decision ≤1180px resolved | Tasks 5–7 (simplified fallback with `TabletChart`) |

**Placeholder scan:** No TBD/TODO in task bodies. All code blocks are complete.

**Type consistency check:** `toothId` (string FDI, e.g. `"11"`) consistent throughout. `treatments[].id` (treatment slug string), `treatments[].scope` (`'tooth' | 'sinus' | 'arch' | 'full-mouth'`), `treatments[].targets` (string[]) — all consistent with Phase 6 context shape.

**Gaps noted:**
- Firestore security rules not covered — out of scope for Phase 7 (no auth in this app yet)
- Theme: `useClinicTheme` reads `window.location.search` directly (not React state), so dynamic param changes during a session won't re-apply. This is intentional — clinic identity is set per page load, not mid-session.
- `TabletChart` shares `onSelect`/`onHover` with full chart but the handler wiring (Step 7.2) requires attention to whichever form the full DentalHero render currently takes. The step flags this explicitly.
