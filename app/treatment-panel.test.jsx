import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TreatmentPanel, PanelDock } from './treatment-panel.jsx';

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
  'simple-surgical-extraction': 'Simple Surgical Extraction',
  'complex-surgical-extraction': 'Complex Surgical Extraction',
  'implant-only': 'Implant',
  'implant-crown': 'Implant + Crown',
  'root-stump-extraction': 'Root Stump Extraction',
  'bridge-span': 'Bridge',
  alveolectomy: 'Alveolectomy',
};

const defaults = {
  open: true,
  onClose: vi.fn(),
  treatments: [],
  allTeeth: TEETH,
  accent: '#2A6FDB',
  txLabel: TX_LABEL,
  onRemoveTooth: vi.fn(),
  onRemoveSpan: vi.fn(),
  onRemoveOther: vi.fn(),
  onHoverTargets: vi.fn(),
  onAddToVisit: vi.fn(),
  onJoinVisit: vi.fn(),
  onLeaveVisit: vi.fn(),
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
    expect(container.querySelector('.trx-card-num').textContent).toBe('#21');
    expect(container.querySelector('.trx-row-lbl').textContent).toBe('Crown');
  });

  it('renders nothing when closed (dock owns the pill)', () => {
    const { container } = setup({ open: false });
    expect(container.querySelector('.trx-panel')).toBeNull();
    expect(container.querySelector('.trx-pill')).toBeNull();
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

  it('groups multiple non-collapse treatments for one tooth under a single number gutter', () => {
    const { container } = setup({
      treatments: [
        { id: 'extraction', scope: 'tooth', targets: ['upper-21'] },
        { id: 'crown', scope: 'tooth', targets: ['upper-21'] },
      ],
    });
    const cards = container.querySelectorAll('.trx-card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelectorAll('.trx-card-num').length).toBe(1);
    expect(cards[0].querySelectorAll('.trx-row').length).toBe(2);
  });

  it('gbr on ONE tooth shares that tooth card rather than splitting off', () => {
    // Changed 2026-09-12 with one-card-per-entry: collapsing is gated on more than one
    // target, so a graft and an extraction on the same tooth read as one site.
    const { container } = setup({
      treatments: [
        { id: 'extraction', scope: 'tooth', targets: ['upper-21'] },
        { id: 'gbr', scope: 'tooth', targets: ['upper-21'] },
      ],
    });
    expect(container.querySelectorAll('.trx-card').length).toBe(1);
    expect(container.querySelectorAll('.trx-row').length).toBe(2);
  });
});

describe('PanelDock', () => {
  it('renders both pills in treatment stage, one otherwise', () => {
    const { container, rerender } = render(
      <PanelDock showTreatments openPanel={null} onToggle={() => {}} />,
    );
    expect(container.querySelectorAll('.pnl-pill').length).toBe(2);
    rerender(<PanelDock showTreatments={false} openPanel={null} onToggle={() => {}} />);
    expect(container.querySelectorAll('.pnl-pill').length).toBe(1);
  });

  it('clicking a pill toggles its panel and marks it active when open', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <PanelDock showTreatments openPanel="treatment" onToggle={onToggle} />,
    );
    const pills = container.querySelectorAll('.pnl-pill');
    expect(pills[0].dataset.on).toBe('1');
    expect(pills[1].dataset.on).toBe('0');
    fireEvent.click(pills[1]);
    expect(onToggle).toHaveBeenCalledWith('tweaks');
    fireEvent.click(pills[0]);
    expect(onToggle).toHaveBeenCalledWith('treatment');
  });
});

describe('TreatmentPanel — same-visit MediSave bundles', () => {
  const EXO = { id: 'simple-surgical-extraction', scope: 'tooth', targets: ['upper-13'] };
  const GBR = { id: 'gbr', scope: 'tooth', targets: ['upper-13'] };
  const IMPLANT = { id: 'implant-only', scope: 'tooth', targets: ['upper-13'] };

  it('offers + on a MediSave row', () => {
    const { container } = setup({ treatments: [EXO] });
    expect(container.querySelector('.trx-add')).toBeTruthy();
  });

  it('does NOT offer + on a non-MediSave row — the feature is MediSave only', () => {
    const { container } = setup({ treatments: [{ id: 'crown', scope: 'tooth', targets: ['upper-13'] }] });
    expect(container.querySelector('.trx-add')).toBeNull();
  });

  it('does NOT offer + on a treatment that merges its targets (alveolectomy)', () => {
    const { container } = setup({ treatments: [{ id: 'alveolectomy', scope: 'arch', targets: ['upper'] }] });
    expect(container.querySelector('.trx-add')).toBeNull();
  });

  it('the + menu adds a MediSave treatment to the teeth of the row it was opened on', () => {
    const onAddToVisit = vi.fn();
    const { container } = setup({ treatments: [EXO], onAddToVisit });
    fireEvent.click(container.querySelector('.trx-add'));
    const item = [...container.querySelectorAll('.trx-menu-it')]
      .find((b) => b.textContent === 'Bone Graft (GBR)');
    fireEvent.click(item);
    expect(onAddToVisit).toHaveBeenCalledWith('gbr', ['upper-13'], 'simple-surgical-extraction::upper-13');
  });

  it('never offers a treatment that would conflict with the row it is added to', () => {
    const { container } = setup({ treatments: [EXO] });
    fireEvent.click(container.querySelector('.trx-add'));
    const labels = [...container.querySelectorAll('.trx-menu-it')].map((b) => b.textContent);
    // Extraction types are mutually exclusive on one tooth — offering one would apply
    // it and silently strip the row the operator clicked.
    expect(labels).not.toContain('Complex Surgical Extraction');
    expect(labels).toContain('Bone Graft (GBR)');
  });

  /* Join removed 2026-09-13. Membership is created ONLY from inside a bundle, via the +
     menu of one of its rows — never by a row elsewhere in the plan electing to join it.
     The consequence accepted with it: a bundle can only hold procedures on the host
     row's teeth, so a visit can no longer span two separate entries on different teeth. */
  it("offers no way for one row to join another row's visit", () => {
    const { container } = setup({ treatments: [EXO, { ...GBR, session: 's1' }] });
    fireEvent.click(container.querySelector('.trx-add'));
    const headings = [...container.querySelectorAll('.trx-menu-hd')].map((h) => h.textContent);
    expect(headings).toEqual(['Add Another MediSave Procedure']);
    // GBR still appears as an ADD option, which is a different thing: it creates a new
    // procedure on THIS row's teeth. What is gone is any item naming an existing entry's
    // visit — the Join items rendered as "Bone Graft (GBR) · Visit 1".
    const items = [...container.querySelectorAll('.trx-menu-it')].map((b) => b.textContent);
    expect(items.filter((t) => /Visit \d/.test(t))).toEqual([]);
  });

  /* The per-row "Visit 1" chip was replaced 2026-09-13 by a group marker: the members are
     drawn together under ONE heading. The distinction it carries is load-bearing and is
     asserted below — a card groups by TOOTH, and one tooth routinely spans two visits
     (extract + graft today, implant in four months), so "same card" cannot mean
     "same visit". */
  it('draws a bundle as one group holding all its members', () => {
    const { container } = setup({
      treatments: [{ ...EXO, session: 's1' }, { ...GBR, session: 's1' }],
    });
    const bundles = container.querySelectorAll('.trx-bundle');
    expect(bundles).toHaveLength(1);
    expect(bundles[0].querySelector('.trx-bundle-hd').textContent).toBe('Same visit');
    expect(bundles[0].querySelectorAll('.trx-row')).toHaveLength(2);
  });

  it('leaves unbundled rows outside any group — one tooth, two visits stays readable', () => {
    const { container } = setup({ treatments: [EXO, GBR] });
    expect(container.querySelector('.trx-bundle')).toBeNull();
    expect(container.querySelectorAll('.trx-row')).toHaveLength(2);
  });

  it('groups only the bundled members when a tooth carries both', () => {
    const { container } = setup({
      treatments: [{ ...EXO, session: 's1' }, { ...GBR, session: 's1' }, IMPLANT],
    });
    const bundle = container.querySelector('.trx-bundle');
    expect(bundle.querySelectorAll('.trx-row')).toHaveLength(2);
    expect(container.querySelectorAll('.trx-row')).toHaveLength(3);
  });

  it('leaving a visit is offered in the + menu, not as a second ✕ on the row', () => {
    const onLeaveVisit = vi.fn();
    const { container } = setup({
      treatments: [{ ...EXO, session: 's1' }, { ...GBR, session: 's1' }],
      onLeaveVisit,
    });
    fireEvent.click(container.querySelector('.trx-add'));
    const leave = [...container.querySelectorAll('.trx-menu-it')]
      .find((b) => b.textContent === 'Remove from this visit');
    fireEvent.click(leave);
    expect(onLeaveVisit).toHaveBeenCalledWith('simple-surgical-extraction::upper-13');
  });

  it('an unbundled row is offered no way to leave a visit', () => {
    const { container } = setup({ treatments: [EXO] });
    fireEvent.click(container.querySelector('.trx-add'));
    const items = [...container.querySelectorAll('.trx-menu-it')].map((b) => b.textContent);
    expect(items).not.toContain('Remove from this visit');
  });

  it('the menu never shows a Join heading', () => {
    // Changed 2026-09-12. The heading used to stand above 'No other MediSave treatment
    // yet.' — a state the operator cannot act on. The heading now appears only when
    // there is something to join. The add list's own empty line stays: it reports that a
    // conflict rule excluded everything, which IS information.
    const { container } = setup({
      treatments: [{ ...EXO, session: 's1' }, { ...GBR, session: 's1' }],
    });
    fireEvent.click(container.querySelector('.trx-add'));
    const headings = [...container.querySelectorAll('.trx-menu-hd')].map((h) => h.textContent);
    expect(headings).not.toContain('Join');
    expect(headings).toEqual(['Add Another MediSave Procedure']);
  });

  it('the + becomes a chevron while its menu is open', () => {
    const { container } = setup({ treatments: [EXO] });
    const btn = container.querySelector('.trx-add');
    expect(btn.textContent).toBe('+');
    expect(btn.querySelector('.trx-chev')).toBeNull();
    expect(btn.getAttribute('aria-label')).toContain('Add to the same visit');
    fireEvent.click(btn);
    expect(btn.textContent).toBe('');
    expect(btn.querySelector('.trx-chev')).toBeTruthy();
    // The label has to describe the click, not the button's old purpose.
    expect(btn.getAttribute('aria-label')).toContain('Close the visit menu');
  });

  it('opening one card\'s menu does not open another card\'s', () => {
    // THE rowKey GUARD. One cross-jaw entry yields two cards sharing one ref, so a
    // rowKey of ref|txId was identical on both and one click opened both menus.
    const { container } = setup({
      treatments: [
        { id: 'simple-surgical-extraction', scope: 'tooth', targets: ['upper-13', 'lower-46'] },
      ],
    });
    const adds = [...container.querySelectorAll('.trx-add')];
    expect(adds.length).toBe(2);
    fireEvent.click(adds[0]);
    expect(container.querySelectorAll('.trx-menu').length).toBe(1);
  });
});

describe('TreatmentPanel — the manual MediSave procedure', () => {
  const EXO = { id: 'simple-surgical-extraction', scope: 'tooth', targets: ['upper-13'] };
  const openMenu = (container) => fireEvent.click(container.querySelector('.trx-add'));
  const clickManual = (container) => fireEvent.click(
    [...container.querySelectorAll('.trx-menu-it')].find((b) => /Add manually/.test(b.textContent)));
  const openManualForm = (container) => { openMenu(container); clickManual(container); };

  it('the + menu offers a manual entry, and it opens a name box and a table list', () => {
    const { container } = setup({ treatments: [EXO] });
    openMenu(container);
    expect(container.querySelector('.trx-man')).toBeNull();
    clickManual(container);
    const form = container.querySelector('.trx-man');
    expect(form).toBeTruthy();
    expect(form.querySelector('input[type=text]')).toBeTruthy();
    // 21 CPF tables plus the empty prompt.
    expect(form.querySelectorAll('option').length).toBe(22);
  });

  it('Add stays disabled until BOTH a name and a table are given', () => {
    // Half a manual procedure is worse than none: a nameless row cannot be read on a
    // quote, and a tableless one cannot be priced at all.
    const { container } = setup({ treatments: [EXO] });
    openManualForm(container);
    const btn = container.querySelector('.trx-man-add');
    expect(btn.disabled).toBe(true);
    fireEvent.change(container.querySelector('.trx-man input[type=text]'),
      { target: { value: 'Frenectomy' } });
    expect(btn.disabled).toBe(true);
    fireEvent.change(container.querySelector('.trx-man select'), { target: { value: '2C' } });
    expect(btn.disabled).toBe(false);
  });

  it('whitespace alone is not a name', () => {
    const { container } = setup({ treatments: [EXO] });
    openManualForm(container);
    fireEvent.change(container.querySelector('.trx-man input[type=text]'),
      { target: { value: '   ' } });
    fireEvent.change(container.querySelector('.trx-man select'), { target: { value: '2C' } });
    expect(container.querySelector('.trx-man-add').disabled).toBe(true);
  });

  it('Add hands the host row, its teeth, and the typed name and table upward', () => {
    const onAddToVisit = vi.fn();
    const { container } = setup({ treatments: [EXO], onAddToVisit });
    openManualForm(container);
    fireEvent.change(container.querySelector('.trx-man input[type=text]'),
      { target: { value: '  Frenectomy  ' } });
    fireEvent.change(container.querySelector('.trx-man select'), { target: { value: '2C' } });
    fireEvent.click(container.querySelector('.trx-man-add'));
    expect(onAddToVisit).toHaveBeenCalledWith(
      'manual-medisave', ['upper-13'], 'simple-surgical-extraction::upper-13',
      { label: 'Frenectomy', table: '2C' },
    );
    // The menu closes on add, the same as picking a catalogue treatment does.
    expect(container.querySelector('.trx-menu')).toBeNull();
  });

  it('a half-typed name does not follow the operator to the next row', () => {
    // The draft lives outside the form, so without a reset on menu change the next
    // tooth's menu opens holding the last one's text.
    const { container } = setup({
      treatments: [EXO, { id: 'gbr', scope: 'tooth', targets: ['upper-11'] }],
    });
    const adds = [...container.querySelectorAll('.trx-add')];
    openManualForm(container);
    fireEvent.change(container.querySelector('.trx-man input[type=text]'),
      { target: { value: 'Frenectomy' } });
    fireEvent.click(adds[0]);            // close
    fireEvent.click(adds[1]);            // open the other row's menu
    expect(container.querySelector('.trx-man')).toBeNull();
    clickManual(container);
    expect(container.querySelector('.trx-man input[type=text]').value).toBe('');
  });

  it('a manual row shows the typed name and removes by ref, not by tooth', () => {
    // Removing by (tooth, id) would strip this tooth from EVERY manual entry on it.
    const onRemoveManual = vi.fn();
    const onRemoveTooth = vi.fn();
    const { container } = setup({
      onRemoveManual,
      onRemoveTooth,
      treatments: [
        { id: 'manual-medisave', scope: 'tooth', targets: ['upper-13'], uid: 'm1',
          label: 'Frenectomy', table: '2C' },
        { id: 'manual-medisave', scope: 'tooth', targets: ['upper-13'], uid: 'm2',
          label: 'Coronectomy', table: '1B' },
      ],
    });
    const labels = [...container.querySelectorAll('.trx-row-lbl')].map((e) => e.textContent);
    expect(labels.sort()).toEqual(['Coronectomy', 'Frenectomy']);
    fireEvent.click(container.querySelectorAll('.trx-rmv')[0]);
    expect(onRemoveTooth).not.toHaveBeenCalled();
    expect(onRemoveManual).toHaveBeenCalledTimes(1);
    expect(onRemoveManual.mock.calls[0][0]).toMatch(/^manual-medisave::upper-13::m[12]$/);
  });
});
