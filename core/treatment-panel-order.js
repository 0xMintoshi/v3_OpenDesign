// Pure logic — no React. Converts flat treatments array into ordered panel sections.

export const CLINICAL_RANK = {
  'extraction': 1, 'simple-surgical-extraction': 1, 'complex-surgical-extraction': 1,
  'sinus-lift': 2, 'alveolectomy': 2,
  'socket-preservation': 2, 'simultaneous-graft': 2, 'gbr': 2,
  'implant-only': 3, 'implant-crown': 3, 'implant-bridge-span': 3,
  'crown': 4, 'bridge-span': 4,
  'complete-denture': 5, 'partial-denture-upper': 5, 'partial-denture-lower': 5,
  'ortho-brackets': 6, 'ortho-aligners': 6,
};

// "#11–13" with en-dash — lowest–highest FDI numerically.
export function spanHeading(fdis) {
  const sorted = [...fdis].sort((a, b) => a - b);
  return `#${sorted[0]}–${sorted[sorted.length - 1]}`;
}

// Returns array of section objects; empty sections are omitted.
// Each section: { key, label, cards }
// Each card: { key, heading, toothIds, rows: [{ txId, label, scope, targets, rank }] }
export function buildPanelSections(treatments, allTeeth, txLabel) {
  // Index teeth by id for fast lookup
  const teethById = Object.fromEntries(allTeeth.map((t) => [t.id, t]));

  // Build cards map keyed by a stable string; group rows within a card.
  // upper FDI cards, lower FDI cards, upper non-FDI, lower non-FDI, full-mouth
  const upperFdiCards = new Map();  // cardKey -> card
  const lowerFdiCards = new Map();
  const upperOtherCards = [];       // sinus/arch, appended after FDI
  const lowerOtherCards = [];
  const fullMouthCards = [];

  for (const tx of treatments) {
    const rank = CLINICAL_RANK[tx.id] ?? 99;
    const rowLabel = txLabel[tx.id] ?? tx.id;

    if (tx.scope === 'full-mouth') {
      fullMouthCards.push({
        key: `fm-${tx.id}`,
        heading: null,
        toothIds: [],
        rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: tx.targets, rank }],
      });
      continue;
    }

    if (tx.scope === 'sinus') {
      for (const target of tx.targets) {
        const heading = target === 'sinus-right' ? 'Sinus (R)' : 'Sinus (L)';
        const sortKey = target === 'sinus-right' ? 0 : 1;
        upperOtherCards.push({
          key: `sinus-${target}`,
          heading,
          toothIds: [],
          _sortKey: sortKey,
          rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: [target], rank }],
        });
      }
      continue;
    }

    if (tx.scope === 'arch') {
      for (const target of tx.targets) {
        const isUpper = target === 'upper' || target === 'upper-arch';
        const heading = isUpper ? 'Upper Arch' : 'Lower Arch';
        const card = {
          key: `arch-${target}-${tx.id}`,
          heading,
          toothIds: [],
          _sortKey: 0,
          rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: [target], rank }],
        };
        if (isUpper) upperOtherCards.push(card);
        else lowerOtherCards.push(card);
      }
      continue;
    }

    // scope === 'tooth' — may be a span (multiple targets) or single-tooth
    if (tx.targets.length === 0) continue;

    const isSpan = tx.id === 'bridge-span' || tx.id === 'implant-bridge-span';

    if (isSpan) {
      const targetTeeth = tx.targets.map((id) => teethById[id]).filter(Boolean);
      if (targetTeeth.length === 0) continue;

      // Determine jaw from first tooth
      const jaw = targetTeeth[0].jaw;

      // Span card key: sorted target ids
      const cardKey = `span-${[...tx.targets].sort().join('-')}`;
      const fdis = targetTeeth.map((t) => t.fdi);
      const minCx = Math.min(...targetTeeth.map((t) => t.cx));

      // Find the tooth with the smallest cx to use as sort position
      const anchorTooth = targetTeeth.find((t) => t.cx === minCx) ?? targetTeeth[0];

      const card = {
        key: cardKey,
        heading: spanHeading(fdis),
        toothIds: tx.targets,
        _cx: minCx,
        _fdi: anchorTooth.fdi,
        rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: tx.targets, rank }],
      };

      if (jaw === 'upper') upperFdiCards.set(cardKey, card);
      else lowerFdiCards.set(cardKey, card);
      continue;
    }

    // Single-tooth treatments — group by individual tooth
    for (const toothId of tx.targets) {
      const tooth = teethById[toothId];
      if (!tooth) continue;

      const cardKey = `tooth-${toothId}`;
      const map = tooth.jaw === 'upper' ? upperFdiCards : lowerFdiCards;

      if (!map.has(cardKey)) {
        map.set(cardKey, {
          key: cardKey,
          heading: `#${tooth.fdi}`,
          toothIds: [toothId],
          _cx: tooth.cx,
          _fdi: tooth.fdi,
          rows: [],
        });
      }

      map.get(cardKey).rows.push({
        txId: tx.id,
        label: rowLabel,
        scope: tx.scope,
        targets: [toothId],
        rank,
      });
    }
  }

  // Sort FDI cards by ascending cx (anatomical left-to-right on chart)
  const sortByCx = (a, b) => a._cx - b._cx;

  // Sort rows within each card by rank then label
  const sortRows = (rows) =>
    [...rows].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));

  const finalizeCard = (card) => ({ ...card, rows: sortRows(card.rows) });

  const upperFdi = [...upperFdiCards.values()].sort(sortByCx).map(finalizeCard);
  const lowerFdi = [...lowerFdiCards.values()].sort(sortByCx).map(finalizeCard);

  // Sort sinus: right (0) before left (1), then arch cards as-is
  upperOtherCards.sort((a, b) => (a._sortKey ?? 0) - (b._sortKey ?? 0));

  const upperCards = [...upperFdi, ...upperOtherCards.map(finalizeCard)];
  const lowerCards = [...lowerFdi, ...lowerOtherCards.map(finalizeCard)];

  const sections = [];
  if (upperCards.length > 0) sections.push({ key: 'upper', label: 'Maxilla', cards: upperCards });
  if (lowerCards.length > 0) sections.push({ key: 'lower', label: 'Mandible', cards: lowerCards });
  if (fullMouthCards.length > 0) sections.push({ key: 'full-mouth', label: 'Full Mouth', cards: fullMouthCards });
  return sections;
}
