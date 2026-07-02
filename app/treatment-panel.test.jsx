import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TreatmentPanel } from './treatment-panel.jsx';

// Minimal tooth set for testing
const TEETH = [
  { id: 'upper-11', jaw: 'upper', fdi: 11, cx: 80 },
  { id: 'upper-12', jaw: 'upper', fdi: 12, cx: 70 },
  { id: 'upper-13', jaw: 'upper', fdi: 13, cx: 60 },
  { id: 'upper-21', jaw: 'upper', fdi: 21, cx: 90 },
  { id: 'lower-46', jaw: 'lower', fdi: 46, cx: 30 },
];
const TX_LABEL = {
  crown: 'Crown',
  extraction: 'Extraction',
  gbr: 'Bone Graft (GBR)',
  'bridge-span': 'Bridge',
  alveolectomy: 'Alveolectomy',
};

const defaults = {
  open: true,
  onOpen: vi.fn(),
  onClose: vi.fn(),
  treatments: [],
  allTeeth: TEETH,
  accent: '#2A6FDB',
  txLabel: TX_LABEL,
  onRemoveTooth: vi.fn(),
  onRemoveSpan: vi.fn(),
  onRemoveOther: vi.fn(),
  onHoverTargets: vi.fn(),
};

function setup(overrides = {}) {
  const props = { ...defaults, ...overrides };
  const { container } = render(<TreatmentPanel {...props} />);
  return { container, props };
}

describe('TreatmentPanel', () => {
  it('shows empty hint when no treatments', () => {
    const { container } = setup();
    expect(container.querySelector('.trx-empty')).toBeTruthy();
  });

  it('renders sections from treatment list', () => {
    const { container } = setup({
      treatments: [{ id: 'crown', scope: 'tooth', targets: ['upper-21'] }],
    });
    expect(container.querySelector('.trx-sect').textContent).toBe('Maxilla');
    expect(container.querySelector('.trx-card-hd').textContent).toBe('#21');
    expect(container.querySelector('.trx-row-lbl').textContent).toBe('Crown');
  });

  it('renders collapsed pill when closed', () => {
    const { container } = setup({ open: false });
    expect(container.querySelector('.trx-pill')).toBeTruthy();
    expect(container.querySelector('.trx-panel')).toBeNull();
  });

  it('clicking pill calls onOpen', () => {
    const onOpen = vi.fn();
    const { container } = setup({ open: false, onOpen });
    fireEvent.click(container.querySelector('.trx-pill'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('clicking collapse chevron calls onClose', () => {
    const onClose = vi.fn();
    const { container } = setup({ onClose });
    fireEvent.click(container.querySelector('.twk-collapse'));
    expect(onClose).toHaveBeenCalled();
  });

  it('✕ on tooth row calls onRemoveTooth with correct args', () => {
    const onRemoveTooth = vi.fn();
    const { container } = setup({
      treatments: [{ id: 'crown', scope: 'tooth', targets: ['upper-21'] }],
      onRemoveTooth,
    });
    fireEvent.click(container.querySelector('.trx-rmv'));
    expect(onRemoveTooth).toHaveBeenCalledWith('upper-21', 'crown');
  });

  it('✕ on span row calls onRemoveSpan with correct args', () => {
    const onRemoveSpan = vi.fn();
    const { container } = setup({
      treatments: [{ id: 'bridge-span', scope: 'tooth', targets: ['upper-11', 'upper-12', 'upper-13'] }],
      onRemoveSpan,
    });
    fireEvent.click(container.querySelector('.trx-rmv'));
    expect(onRemoveSpan).toHaveBeenCalledWith('bridge-span', ['upper-11', 'upper-12', 'upper-13']);
  });

  it('✕ on arch row calls onRemoveOther per target', () => {
    const onRemoveOther = vi.fn();
    const { container } = setup({
      treatments: [{ id: 'alveolectomy', scope: 'arch', targets: ['upper'] }],
      onRemoveOther,
    });
    fireEvent.click(container.querySelector('.trx-rmv'));
    expect(onRemoveOther).toHaveBeenCalledWith('alveolectomy', 'upper');
  });

  it('hover row calls onHoverTargets with toothIds, mouseleave clears', () => {
    const onHoverTargets = vi.fn();
    const { container } = setup({
      treatments: [{ id: 'crown', scope: 'tooth', targets: ['upper-21'] }],
      onHoverTargets,
    });
    const row = container.querySelector('.trx-row');
    fireEvent.mouseEnter(row);
    expect(onHoverTargets).toHaveBeenCalledWith(['upper-21']);
    fireEvent.mouseLeave(row);
    expect(onHoverTargets).toHaveBeenLastCalledWith([]);
  });

  it('renders upper and lower sections', () => {
    const { container } = setup({
      treatments: [
        { id: 'crown', scope: 'tooth', targets: ['upper-21'] },
        { id: 'extraction', scope: 'tooth', targets: ['lower-46'] },
      ],
    });
    const sects = container.querySelectorAll('.trx-sect');
    expect(sects[0].textContent).toBe('Maxilla');
    expect(sects[1].textContent).toBe('Mandible');
  });
});
