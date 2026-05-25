import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import DentalHero from './dental-arch.jsx';
import { ChartStateProvider } from '../core/chart-context.jsx';
import { UIStateProvider } from '../core/ui-context.jsx';

vi.mock('../core/chart-service.js', () => ({ loadChart: vi.fn(), saveChart: vi.fn() }));
vi.mock('../core/firebase.js', () => ({ db: {} }));
vi.mock('../layout/use-is-tablet.js', () => ({ useIsTablet: () => false }));
vi.mock('../core/chart-context.jsx', () => ({
  ChartStateProvider: ({ children }) => children,
  useChartState: () => ({
    stage: 'treatment',
    presence: {},
    treatments: [],
    loaded: true,
    setStage: vi.fn(),
    setPresence: vi.fn(),
    setTreatments: vi.fn(),
  }),
}));

function Wrapper({ children }) {
  return (
    <ChartStateProvider>
      <UIStateProvider>{children}</UIStateProvider>
    </ChartStateProvider>
  );
}

function renderHero() {
  return render(
    <Wrapper>
      <DentalHero />
    </Wrapper>,
  );
}

describe('DentalHero — tooth accessibility (A5)', () => {
  it('renders 32 tooth buttons', () => {
    const { container } = renderHero();
    const teeth = container.querySelectorAll('[role="button"][data-tooth-id]');
    expect(teeth.length).toBe(32);
  });

  it('each tooth has role="button"', () => {
    const { container } = renderHero();
    const teeth = container.querySelectorAll('[data-tooth-id]');
    teeth.forEach((g) => expect(g.getAttribute('role')).toBe('button'));
  });

  it('each tooth has a non-empty aria-label', () => {
    const { container } = renderHero();
    const teeth = container.querySelectorAll('[role="button"][data-tooth-id]');
    teeth.forEach((g) => {
      const label = g.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('tooth aria-label includes FDI number', () => {
    const { container } = renderHero();
    const tooth11 = container.querySelector('[data-tooth-fdi="11"]');
    expect(tooth11).toBeTruthy();
    expect(tooth11.getAttribute('aria-label')).toContain('11');
  });

  it('tooth aria-pressed is "false" when not selected', () => {
    const { container } = renderHero();
    const teeth = container.querySelectorAll('[role="button"][data-tooth-id]');
    teeth.forEach((g) => expect(g.getAttribute('aria-pressed')).toBe('false'));
  });

  it('tooth aria-pressed becomes "true" after click', () => {
    const { container } = renderHero();
    const tooth = container.querySelector('[data-tooth-fdi="11"]');
    fireEvent.click(tooth);
    expect(tooth.getAttribute('aria-pressed')).toBe('true');
  });

  it('Enter key on tooth triggers selection', () => {
    const { container } = renderHero();
    const tooth = container.querySelector('[data-tooth-fdi="21"]');
    fireEvent.keyDown(tooth, { key: 'Enter' });
    expect(tooth.getAttribute('aria-pressed')).toBe('true');
  });

  it('Space key on tooth triggers selection', () => {
    const { container } = renderHero();
    const tooth = container.querySelector('[data-tooth-fdi="36"]');
    fireEvent.keyDown(tooth, { key: ' ' });
    expect(tooth.getAttribute('aria-pressed')).toBe('true');
  });

  it('first upper tooth starts with tabIndex 0, others have -1', () => {
    const { container } = renderHero();
    const upper = container.querySelectorAll('[data-tooth-fdi]');
    // find upper-18 (first in upper arch)
    const first = container.querySelector('[data-tooth-fdi="18"]');
    expect(first.getAttribute('tabindex')).toBe('0');
    // at least some teeth have tabIndex -1
    const minusOnes = Array.from(upper).filter((g) => g.getAttribute('tabindex') === '-1');
    expect(minusOnes.length).toBeGreaterThan(0);
  });

  it('SVG container has aria-label "Dental chart"', () => {
    const { container } = renderHero();
    const svg = container.querySelector('svg[aria-label="Dental chart"]');
    expect(svg).toBeTruthy();
  });
});
