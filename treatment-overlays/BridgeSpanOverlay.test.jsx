import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BridgeSpanOverlay, bridgeConnectorPath } from './BridgeSpanOverlay.jsx';

const makeTooth = (id, cx, type = 'premolar') => ({
  id,
  cx,
  w: 60,
  h: 100,
  type,
  jaw: 'upper',
  tilt: 0,
  yOffset: 0,
});

const TEETH = [
  makeTooth('t1', 100),
  makeTooth('t2', 170),
  makeTooth('t3', 240),
];

describe('BridgeSpanOverlay', () => {
  it('renders a filled connector path for each adjacent pair', () => {
    const { container } = render(
      <svg>
        <BridgeSpanOverlay teeth={TEETH} biteY={400} accent="#888" />
      </svg>,
    );
    // 3 teeth → 2 connectors
    const paths = Array.from(container.querySelectorAll('path[fill="#888"]'));
    expect(paths.length).toBe(2);
  });

  it('connector d-string contains no NaN or undefined', () => {
    const a = makeTooth('a', 100);
    const b = makeTooth('b', 170);
    const d = bridgeConnectorPath(a, b, 400, 1);
    expect(d).not.toMatch(/NaN/);
    expect(d).not.toMatch(/undefined/);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('returns null for empty teeth array', () => {
    const { container } = render(
      <svg>
        <BridgeSpanOverlay teeth={[]} biteY={400} accent="#888" />
      </svg>,
    );
    expect(container.querySelector('g')).toBeNull();
  });
});
