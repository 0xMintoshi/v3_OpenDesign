import { describe, it, expect } from 'vitest';
import { buildPanelSections, CLINICAL_RANK, spanHeading } from './treatment-panel-order.js';

// Minimal tooth fixtures matching the real allTeeth shape.
const mkTooth = (jaw, fdi, cx) => ({ id: `${jaw}-${fdi}`, jaw, fdi, cx });

const UPPER_TEETH = [
  mkTooth('upper', 18, 10), mkTooth('upper', 17, 20), mkTooth('upper', 16, 30),
  mkTooth('upper', 15, 40), mkTooth('upper', 14, 50), mkTooth('upper', 13, 60),
  mkTooth('upper', 12, 70), mkTooth('upper', 11, 80),
  mkTooth('upper', 21, 90), mkTooth('upper', 22, 100), mkTooth('upper', 23, 110),
  mkTooth('upper', 24, 120), mkTooth('upper', 25, 130), mkTooth('upper', 26, 140),
  mkTooth('upper', 27, 150), mkTooth('upper', 28, 160),
];
const LOWER_TEETH = [
  mkTooth('lower', 48, 10), mkTooth('lower', 47, 20), mkTooth('lower', 46, 30),
  mkTooth('lower', 45, 40), mkTooth('lower', 44, 50), mkTooth('lower', 43, 60),
  mkTooth('lower', 42, 70), mkTooth('lower', 41, 80),
  mkTooth('lower', 31, 90), mkTooth('lower', 32, 100), mkTooth('lower', 33, 110),
  mkTooth('lower', 34, 120), mkTooth('lower', 35, 130), mkTooth('lower', 36, 140),
  mkTooth('lower', 37, 150), mkTooth('lower', 38, 160),
];
const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

const TX_LABEL = {
  'extraction': 'Extraction',
  'crown': 'Crown',
  'implant-only': 'Implant',
  'implant-crown': 'Implant + Crown',
  'bridge-span': 'Bridge',
  'implant-bridge-span': 'Implant Bridge',
  'gbr': 'Bone Graft (GBR)',
  'sinus-lift': 'Sinus Lift',
  'alveolectomy': 'Alveolectomy',
  'complete-denture': 'Complete Denture',
  'partial-denture-upper': 'Partial Denture',
  'ortho-brackets': 'Braces',
};

describe('buildPanelSections', () => {
  it('returns empty array when no treatments', () => {
    expect(buildPanelSections([], ALL_TEETH, TX_LABEL)).toEqual([]);
  });

  it('anatomical cx ordering — 24 added before 11, 11 listed first (lower cx)', () => {
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-24'] },
      { id: 'crown', scope: 'tooth', targets: ['upper-11'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('upper');
    const headings = sections[0].cards.map((c) => c.heading);
    // upper-11 cx=80, upper-24 cx=120 → 11 comes first
    expect(headings).toEqual(['#11', '#24']);
  });

  it('span sorted by min-cx, displayed as #11–13', () => {
    const treatments = [
      { id: 'bridge-span', scope: 'tooth', targets: ['upper-11', 'upper-12', 'upper-13'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].cards[0].heading).toBe('#11–13');
  });

  it('non-FDI cards (sinus) appear below FDI cards within upper section', () => {
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-16'] },
      { id: 'sinus-lift', scope: 'sinus', targets: ['right'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].key).toBe('upper');
    const headings = sections[0].cards.map((c) => c.heading);
    expect(headings[0]).toBe('#16');
    expect(headings[1]).toBe('Sinus (R)');
  });

  it('sinus-lift right appears before left', () => {
    const treatments = [
      { id: 'sinus-lift', scope: 'sinus', targets: ['left', 'right'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    const headings = sections[0].cards.map((c) => c.heading);
    expect(headings).toEqual(['Sinus (R)', 'Sinus (L)']);
  });

  it('full-mouth treatment goes in its own section last', () => {
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-21'] },
      { id: 'ortho-brackets', scope: 'full-mouth', targets: [] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[sections.length - 1].key).toBe('full-mouth');
    expect(sections[0].key).toBe('upper');
  });

  it('same tooth, multiple treatments → one card with rows sorted by rank', () => {
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-21'] },
      { id: 'gbr', scope: 'tooth', targets: ['upper-21'] },
      { id: 'implant-only', scope: 'tooth', targets: ['upper-21'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].cards).toHaveLength(1);
    const rows = sections[0].cards[0].rows;
    // gbr rank 2, implant-only rank 3, crown rank 4
    expect(rows.map((r) => r.txId)).toEqual(['gbr', 'implant-only', 'crown']);
  });

  it('lower arch treatment goes to Mandible section', () => {
    const treatments = [
      { id: 'extraction', scope: 'tooth', targets: ['lower-46'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].key).toBe('lower');
    expect(sections[0].cards[0].heading).toBe('#46');
  });

  it('span card toothIds contains all span targets', () => {
    const treatments = [
      { id: 'bridge-span', scope: 'tooth', targets: ['upper-11', 'upper-12', 'upper-13'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].cards[0].toothIds.sort()).toEqual(['upper-11', 'upper-12', 'upper-13']);
  });

  it('upper and lower sections appear in correct order', () => {
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['lower-36'] },
      { id: 'crown', scope: 'tooth', targets: ['upper-16'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections.map((s) => s.key)).toEqual(['upper', 'lower']);
  });
});

describe('spanHeading', () => {
  it('formats min–max with en-dash', () => {
    expect(spanHeading([13, 11, 12])).toBe('#11–13');
    expect(spanHeading([21])).toBe('#21–21');
  });
});

describe('CLINICAL_RANK', () => {
  it('extraction has rank 1', () => expect(CLINICAL_RANK['extraction']).toBe(1));
  it('gbr has rank 2', () => expect(CLINICAL_RANK['gbr']).toBe(2));
  it('implant-only has rank 3', () => expect(CLINICAL_RANK['implant-only']).toBe(3));
  it('crown has rank 4', () => expect(CLINICAL_RANK['crown']).toBe(4));
});
