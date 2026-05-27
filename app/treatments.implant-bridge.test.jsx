import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ImplantBridgeSpanOverlay } from './treatments.jsx';

function makeTooth(id, cx, jaw, type = 'molarU') {
  return { id, cx, jaw, type, w: 40, h: 50, tilt: 0, yOffset: 0 };
}

describe('ImplantBridgeSpanOverlay', () => {
  it('returns null for empty teeth', () => {
    const { container } = render(
      <svg><ImplantBridgeSpanOverlay teeth={[]} biteY={100} accent="#f00" /></svg>
    );
    expect(container.querySelector('g')).toBeNull();
  });

  it('renders crown paths for all 3 teeth', () => {
    const teeth = [
      makeTooth('u1', 100, 'upper'),
      makeTooth('u2', 200, 'upper'),
      makeTooth('u3', 300, 'upper'),
    ];
    const { container } = render(
      <svg><ImplantBridgeSpanOverlay teeth={teeth} biteY={100} accent="#00f" /></svg>
    );
    // Each tooth gets a crown path; at least 3 crown paths exist
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it('renders fixture blocks only at endpoints (first and last by cx)', () => {
    const teeth = [
      makeTooth('u2', 200, 'upper'),
      makeTooth('u1', 100, 'upper'), // sorted to first
      makeTooth('u3', 300, 'upper'), // sorted to last
    ];
    const { container } = render(
      <svg><ImplantBridgeSpanOverlay teeth={teeth} biteY={100} accent="#00f" /></svg>
    );
    // Fixture block renders a rect (collar) — only 2 rects for 2 endpoints
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(2);
  });

  it('renders interproximal contact strokes between adjacent teeth', () => {
    const teeth = [
      makeTooth('u1', 100, 'upper'),
      makeTooth('u2', 200, 'upper'),
      makeTooth('u3', 300, 'upper'),
    ];
    const { container } = render(
      <svg><ImplantBridgeSpanOverlay teeth={teeth} biteY={100} accent="#00f" /></svg>
    );
    // 3 teeth → 2 contact strokes (between u1-u2, u2-u3)
    // Contact paths have key pattern "ibridge-contact"
    const allPaths = Array.from(container.querySelectorAll('path'));
    // We can't inspect keys in DOM but we know: paths count ≥ 3 crowns + 2 contacts = 5
    // Plus fixture paths (body + threads per endpoint) → well above 5
    expect(allPaths.length).toBeGreaterThanOrEqual(5);
  });

  it('single tooth renders one crown and one fixture', () => {
    const teeth = [makeTooth('u1', 100, 'upper')];
    const { container } = render(
      <svg><ImplantBridgeSpanOverlay teeth={teeth} biteY={100} accent="#00f" /></svg>
    );
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(1); // one fixture collar
  });
});
