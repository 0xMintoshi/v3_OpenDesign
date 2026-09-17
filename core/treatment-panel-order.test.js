import { describe, it, expect } from 'vitest';
import { buildPanelSections, CLINICAL_RANK, spanHeading, COLLAPSE_MIN } from './treatment-panel-order.js';

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

  it('same tooth, multiple non-collapse treatments → one card with rows sorted by rank', () => {
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-21'] },
      { id: 'implant-only', scope: 'tooth', targets: ['upper-21'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].cards).toHaveLength(1);
    const rows = sections[0].cards[0].rows;
    // implant-only rank 3, crown rank 4
    expect(rows.map((r) => r.txId)).toEqual(['implant-only', 'crown']);
  });

  it('SINGLE-tooth MediSave treatments share the tooth card, they do not split off', () => {
    // Changed 2026-09-12. gbr used to take its own collapse card even on one tooth,
    // which put an extraction and a graft on the SAME tooth into two cards — the
    // commonest bundling case, shown as if it were two unrelated sites. Collapsing is
    // now gated on more than one target, so one tooth reads as one card.
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-21'] },
      { id: 'gbr', scope: 'tooth', targets: ['upper-21'] },
      { id: 'implant-only', scope: 'tooth', targets: ['upper-21'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].cards).toHaveLength(1);
    expect(sections[0].cards[0].heading).toBe('#21');
    expect(sections[0].cards[0].rows.map(r => r.txId).sort())
      .toEqual(['crown', 'gbr', 'implant-only']);
  });

  it('gbr on contiguous lower teeth → one range card', () => {
    const treatments = [
      { id: 'gbr', scope: 'tooth', targets: ['lower-43', 'lower-42', 'lower-41'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].key).toBe('lower');
    expect(sections[0].cards).toHaveLength(1);
    // '#41–43', not the old cx-ordered '#43–41': numeric ordering is what
    // spanHeading gives and what bridge spans in this same panel already use.
    expect(sections[0].cards[0].heading).toBe('#41–43');
    expect(sections[0].cards[0].rows[0].collapse).toBe(true);
    expect(sections[0].cards[0].toothIds.sort()).toEqual(['lower-41', 'lower-42', 'lower-43']);
  });

  it('gbr on non-contiguous teeth → ONE card listing both, never a false range', () => {
    // THE MUTATION GUARD on the one-card-per-entry decision. This used to be two cards,
    // one per contiguous run. One apply is one claim, so it is one card — but the
    // heading must not read '#41–43' and imply the untreated #42 between them.
    // lower-43 (cx=60) and lower-41 (cx=80) with lower-42 (cx=70) present between.
    const treatments = [
      { id: 'gbr', scope: 'tooth', targets: ['lower-43', 'lower-41'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].key).toBe('lower');
    expect(sections[0].cards).toHaveLength(1);
    expect(sections[0].cards[0].heading).toBe('#43, #41');
    expect(sections[0].cards[0].toothIds.sort()).toEqual(['lower-41', 'lower-43']);
  });

  it('a 3-tooth surgical extraction is ONE card headed #11–13', () => {
    // The headline case. Three cards read as three procedures; the quote bills, and
    // CPF pays, one.
    const treatments = [
      { id: 'simple-surgical-extraction', scope: 'tooth',
        targets: ['upper-11', 'upper-12', 'upper-13'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH,
      { 'simple-surgical-extraction': 'Simple Surgical Extraction' });
    expect(sections[0].cards).toHaveLength(1);
    expect(sections[0].cards[0].heading).toBe('#11–13');
    expect(sections[0].cards[0].rows).toHaveLength(1);
  });

  it('a run crossing the midline splits its heading at the quadrant', () => {
    // Measured live 2026-09-12: a marquee over #14–#11 plus #21 printed '#11–21',
    // a range that reads as covering #15–#18 as well. FDI numbers do not run
    // continuously across the midline, so a range is only truthful inside one quadrant.
    const treatments = [
      { id: 'simple-surgical-extraction', scope: 'tooth',
        targets: ['upper-11', 'upper-12', 'upper-21'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH,
      { 'simple-surgical-extraction': 'Simple Surgical Extraction' });
    expect(sections[0].cards).toHaveLength(1);
    expect(sections[0].cards[0].heading).toBe('#11–12, #21');
  });

  it('a NON-bundleable multi-tooth treatment still gets one card per tooth', () => {
    // The gate is isBundleable, not "has several targets". A crown is billed per tooth
    // and must keep saying so.
    const treatments = [
      { id: 'crown', scope: 'tooth', targets: ['upper-11', 'upper-12'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, TX_LABEL);
    expect(sections[0].cards).toHaveLength(2);
    expect(sections[0].cards.map(c => c.heading).sort()).toEqual(['#11', '#12']);
  });

  it('a cross-jaw entry yields one card per jaw, both sharing one ref', () => {
    const treatments = [
      { id: 'simple-surgical-extraction', scope: 'tooth', targets: ['upper-11', 'lower-41'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH,
      { 'simple-surgical-extraction': 'Simple Surgical Extraction' });
    const cards = sections.flatMap(sec => sec.cards);
    expect(cards).toHaveLength(2);
    // One entry, one claim, two cards — which is why rowKey must be card-scoped.
    expect(new Set(cards.map(c => c.rows[0].ref)).size).toBe(1);
  });

  it('simultaneous-graft collapses the same way as gbr', () => {
    const treatments = [
      { id: 'simultaneous-graft', scope: 'tooth', targets: ['upper-11', 'upper-12'] },
    ];
    const sections = buildPanelSections(treatments, ALL_TEETH, { 'simultaneous-graft': 'Simultaneous Graft' });
    expect(sections[0].cards).toHaveLength(1);
    // Numerically ordered now, so '#11–12' rather than the cx-ordered '#12–11'.
    expect(sections[0].cards[0].heading).toBe('#11–12');
    expect(sections[0].cards[0].rows[0].collapse).toBe(true);
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

/*
 * Two collapse thresholds, on purpose.
 *
 * A MediSave entry collapses at TWO teeth because one entry is one claim, and
 * drawing it as two cards states two procedures about something CPF pays for once.
 * Everything else collapses at COLLAPSE_MIN because sixteen identical rows is noise
 * — a display concern with no billing statement attached either way.
 *
 * The surgical-extraction case below is the regression guard: raising the MediSave
 * threshold to COLLAPSE_MIN would split a two-tooth entry back into two cards and
 * reintroduce exactly the misstatement the collapse rule exists to prevent.
 */
describe('collapse thresholds', () => {
  const upperIds = (n) => UPPER_TEETH.slice(0, n).map((t) => t.id);
  const cardsFor = (id, n) =>
    buildPanelSections([{ id, scope: 'tooth', targets: upperIds(n) }], ALL_TEETH, TX_LABEL)
      .flatMap((s) => s.cards);

  it('leaves a non-MediSave entry below the threshold as one card per tooth', () => {
    expect(cardsFor('extraction', COLLAPSE_MIN - 1)).toHaveLength(COLLAPSE_MIN - 1);
  });

  it('collapses a non-MediSave entry at the threshold', () => {
    const cards = cardsFor('extraction', COLLAPSE_MIN);
    expect(cards).toHaveLength(1);
    expect(cards[0].rows[0].collapse).toBe(true);
  });

  it('collapses a whole-arch extraction to one card with a quadrant-split heading', () => {
    const cards = cardsFor('extraction', 16);
    expect(cards).toHaveLength(1);
    expect(cards[0].heading).toBe('#11–18, #21–28');
    expect(cards[0].toothIds).toHaveLength(16);
  });

  it('still collapses a TWO-tooth MediSave entry — its threshold did not move', () => {
    expect(cardsFor('simple-surgical-extraction', 2)).toHaveLength(1);
  });

  it('applies the threshold to any non-MediSave treatment, not just extractions', () => {
    expect(cardsFor('crown', COLLAPSE_MIN)).toHaveLength(1);
    expect(cardsFor('crown', COLLAPSE_MIN - 1)).toHaveLength(COLLAPSE_MIN - 1);
  });

  it('gives a collapsed non-MediSave row every target, so removing it removes the entry', () => {
    const cards = cardsFor('extraction', COLLAPSE_MIN);
    expect(cards[0].rows[0].targets).toEqual(upperIds(COLLAPSE_MIN));
  });
});

/*
 * Both arches in one visit.
 *
 * The two entries are on different areas, so before this they landed in two cards in
 * two different jaw sections, each drawing its own SAME VISIT brace — one appointment
 * that read as two. They now collapse into ONE card headed "Both Arches", which belongs
 * to neither jaw and therefore sits in the existing Full Mouth section.
 *
 * Display only. The data is unchanged: still two entries, one per arch, sharing a
 * session. See core/area-apply.js.
 */
describe('a visit spanning both arches', () => {
  const upper = (session) => ({ id: 'alveolectomy', scope: 'arch', targets: ['upper'], ...(session ? { session } : {}) });
  const lower = (session) => ({ id: 'alveolectomy', scope: 'arch', targets: ['lower'], ...(session ? { session } : {}) });
  const build = (txs) => buildPanelSections(txs, ALL_TEETH, TX_LABEL);

  it('draws one card in the Full Mouth section, not one per jaw', () => {
    const sections = build([upper('s1'), lower('s1')]);
    expect(sections.map((x) => x.key)).toEqual(['full-mouth']);
    expect(sections[0].cards).toHaveLength(1);
    expect(sections[0].cards[0].heading).toBe('Both Arches');
  });

  it('keeps both arches as separate rows, each naming its arch, upper first', () => {
    const rows = build([lower('s1'), upper('s1')])[0].cards[0].rows;
    expect(rows.map((r) => r.archLabel)).toEqual(['Upper', 'Lower']);
    expect(rows.map((r) => r.label)).toEqual(['Alveolectomy', 'Alveolectomy']);
  });

  it('gives the rows one shared session, so the panel draws a single brace', () => {
    const rows = build([upper('s1'), lower('s1')])[0].cards[0].rows;
    expect(new Set(rows.map((r) => r.session))).toEqual(new Set(['s1']));
  });

  it('gives each row its own ref, so one arch can be removed without the other', () => {
    const rows = build([upper('s1'), lower('s1')])[0].cards[0].rows;
    expect(rows[0].ref).not.toBe(rows[1].ref);
    expect(rows.map((r) => r.targets)).toEqual([['upper'], ['lower']]);
  });

  it('leaves UNBUNDLED arch entries exactly where they were', () => {
    const sections = build([upper(), lower()]);
    expect(sections.map((x) => x.key)).toEqual(['upper', 'lower']);
    expect(sections[0].cards[0].heading).toBe('Upper Arch');
    expect(sections[1].cards[0].heading).toBe('Lower Arch');
  });

  it('leaves a single bundled arch alone — one arch is not both arches', () => {
    // pruneSessions would strip a lone tag upstream; this asserts the panel does not
    // invent a Both Arches card from one member if one ever reaches it.
    const sections = build([upper('s1')]);
    expect(sections.map((x) => x.key)).toEqual(['upper']);
    expect(sections[0].cards[0].heading).toBe('Upper Arch');
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
