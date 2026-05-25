import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
    const { getByTestId } = render(<Wrapper><TabletChart /></Wrapper>);
    expect(getByTestId('tablet-upper-row')).toBeTruthy();
    expect(getByTestId('tablet-lower-row')).toBeTruthy();
  });

  it('renders 16 teeth in each row', () => {
    const { container } = render(<Wrapper><TabletChart /></Wrapper>);
    const upper = container.querySelector('[data-testid="tablet-upper-row"]');
    const lower = container.querySelector('[data-testid="tablet-lower-row"]');
    expect(upper.querySelectorAll('[data-tooth-id]').length).toBe(16);
    expect(lower.querySelectorAll('[data-tooth-id]').length).toBe(16);
  });
});
