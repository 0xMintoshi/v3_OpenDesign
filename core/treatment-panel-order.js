// Pure logic — no React. Converts flat treatments array into ordered panel sections.

import { txRef } from './mv-sessions.js';
import { isBundleable, MANUAL_MV_ID } from './conflict-rules.js';

// Area treatments that collapse like a MediSave entry but are NOT bundleable — they
// are not on MEDISAVE_BUNDLE_IDS, so isBundleable() does not catch them and without
// this they would regress to one card per tooth.
const AREA_IDS = new Set(['simultaneous-graft']);

/**
 * How many teeth a NON-MediSave entry needs before its card collapses.
 *
 * MediSave entries collapse at two and never consult this. The two thresholds exist
 * for two different reasons and must not be unified: collapsing a MediSave entry is a
 * BILLING statement — one entry is one claim, so two cards would assert two procedures
 * about something CPF pays for once — while collapsing anything else is only tidiness,
 * since nothing is misstated either way. Raising the MediSave threshold to this number
 * would split a two-tooth surgical extraction back into two cards and reintroduce the
 * exact misstatement the collapse rule was written to prevent.
 *
 * Set at 4 by Minzhe, 2026-09-17: below it, individual rows are still useful for
 * per-tooth removal; above it the panel was printing sixteen identical lines for one
 * apply.
 */
export const COLLAPSE_MIN = 4;

// One run's heading. spanHeading renders a single-tooth run as '#21–21', which reads
// as a range of one; a lone tooth gets the plain '#21' form instead.
function runHeading(runTeeth) {
  return runTeeth.length === 1
    ? `#${runTeeth[0].fdi}`
    : spanHeading(runTeeth.map(t => t.fdi));
}

// A run is positionally contiguous but may cross the midline, and FDI numbers do not
// run continuously across it: #14 #13 #12 #11 #21 is contiguous in the mouth, yet
// spanHeading's numeric min–max prints '#11–21', a range that reads as including #15
// through #18. Splitting the run at each quadrant change gives '#11–14, #21' instead —
// every printed range then sits inside one quadrant, where ascending FDI is exactly how
// a dentist writes it. Measured live 2026-09-12; the misleading form was on screen.
function quadrantRuns(runTeeth) {
  const out = [];
  for (const t of runTeeth) {
    const q = Math.floor(t.fdi / 10);
    const last = out[out.length - 1];
    if (last && Math.floor(last[0].fdi / 10) === q) last.push(t);
    else out.push([t]);
  }
  return out;
}

// Splits targetIds into one or more contiguous runs per jaw.
// A run is broken by any present (non-missing/extracted/implant) tooth between endpoints.
// Returns array of arrays of tooth objects, each sorted by ascending cx.
function splitRuns(targetIds, allTeeth) {
  const teethById = Object.fromEntries(allTeeth.map(t => [t.id, t]));
  const selected = targetIds.map(id => teethById[id]).filter(Boolean);
  if (selected.length === 0) return [];

  // Group by jaw
  const byJaw = {};
  for (const t of selected) {
    (byJaw[t.jaw] = byJaw[t.jaw] || []).push(t);
  }

  const runs = [];
  for (const jaw of Object.keys(byJaw)) {
    const jawTeeth = allTeeth.filter(t => t.jaw === jaw).sort((a, b) => a.cx - b.cx);
    const selInJaw = byJaw[jaw].sort((a, b) => a.cx - b.cx);
    const selIds = new Set(selInJaw.map(t => t.id));

    let currentRun = [selInJaw[0]];
    for (let i = 1; i < selInJaw.length; i++) {
      const prev = selInJaw[i - 1];
      const curr = selInJaw[i];
      // Find teeth between prev and curr in the arch
      const prevIdx = jawTeeth.findIndex(t => t.id === prev.id);
      const currIdx = jawTeeth.findIndex(t => t.id === curr.id);
      let broken = false;
      for (let j = prevIdx + 1; j < currIdx; j++) {
        const between = jawTeeth[j];
        if (!selIds.has(between.id) && between.presence !== 'missing' && between.presence !== 'extracted' && between.presence !== 'implant') {
          broken = true;
          break;
        }
      }
      if (broken) {
        runs.push(currentRun);
        currentRun = [curr];
      } else {
        currentRun.push(curr);
      }
    }
    runs.push(currentRun);
  }
  return runs;
}

export const CLINICAL_RANK = {
  'extraction': 1, 'simple-surgical-extraction': 1, 'complex-surgical-extraction': 1,
  'sinus-lift': 2, 'alveolectomy': 2,
  'socket-preservation': 2, 'simultaneous-graft': 2, 'gbr': 2,
  'implant-only': 3, 'implant-crown': 3, 'implant-bridge-span': 3,
  'manual-medisave': 2,
  // 3.5 so a root canal reads above the crown (4) that usually follows it on the same
  // tooth. Its position relative to implants (3) is arbitrary — an implant tooth can never
  // carry a root canal. Sorting is `CLINICAL_RANK[tx.id] ?? 99`, so a float is fine.
  'root-canal-anterior': 3.5, 'root-canal-premolar': 3.5, 'root-canal-molar': 3.5,
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
// Each card: { key, heading, toothIds, rows: [{ txId, label, scope, targets, rank, session, ref }] }
//   session — the same-visit bundle tag, when the owning entry carries one
//   ref     — addresses the owning treatment entry; a single-tooth row's `targets`
//             holds only its own tooth and so cannot identify a multi-tooth entry
/** 'upper-arch' and 'upper' are the same arch; the stored form has varied. */
function archOf(target) {
  return (target === 'upper' || target === 'upper-arch') ? 'upper' : 'lower';
}

export function buildPanelSections(treatments, allTeeth, txLabel) {
  // Index teeth by id for fast lookup
  const teethById = Object.fromEntries(allTeeth.map((t) => [t.id, t]));

  /* Visits whose ARCH members cover both arches.
     Such a visit belongs to neither jaw, so drawing it as one card per jaw put a
     single appointment in two sections with a divider between them and a SAME VISIT
     brace on each — it read as two appointments. Those collapse into one "Both Arches"
     card in the Full Mouth section instead.
     Two arches is the test, not two members: a visit could only ever hold one entry
     per arch (addAreaEntry is a no-op on a repeat), and one arch is not both. */
  const archesPerSession = new Map();
  for (const tx of treatments) {
    if (tx.scope !== 'arch' || !tx.session) continue;
    if (!archesPerSession.has(tx.session)) archesPerSession.set(tx.session, new Set());
    for (const target of tx.targets || []) archesPerSession.get(tx.session).add(archOf(target));
  }
  const bothArchSessions = new Set(
    [...archesPerSession].filter(([, arches]) => arches.size > 1).map(([sess]) => sess)
  );
  const bothArchCards = new Map();  // session -> the one card

  // Build cards map keyed by a stable string; group rows within a card.
  // upper FDI cards, lower FDI cards, upper non-FDI, lower non-FDI, full-mouth
  const upperFdiCards = new Map();  // cardKey -> card
  const lowerFdiCards = new Map();
  const upperOtherCards = [];       // sinus/arch, appended after FDI
  const lowerOtherCards = [];
  const fullMouthCards = [];

  for (const tx of treatments) {
    const rank = CLINICAL_RANK[tx.id] ?? 99;
    // A manual procedure's name is typed by the operator and carried on the entry
    // itself, so it has no txLabel — every manual entry would otherwise read
    // 'manual-medisave'. Rank 2 puts it with the other surgical adjuncts.
    const rowLabel = tx.id === MANUAL_MV_ID
      ? (tx.label || 'MediSave Procedure')
      : (txLabel[tx.id] ?? tx.id);

    if (tx.scope === 'full-mouth') {
      fullMouthCards.push({
        key: `fm-${tx.id}`,
        heading: null,
        toothIds: [],
        rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: tx.targets, rank, session: tx.session, ref: txRef(tx) }],
      });
      continue;
    }

    if (tx.scope === 'sinus') {
      for (const target of tx.targets) {
        // Sinus targets are stored as 'right' / 'left' (popover.target.side).
        const isRight = target === 'right';
        const heading = isRight ? 'Sinus (R)' : 'Sinus (L)';
        const sortKey = isRight ? 0 : 1;
        upperOtherCards.push({
          key: `sinus-${target}`,
          heading,
          toothIds: [],
          _sortKey: sortKey,
          rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: [target], rank, session: tx.session, ref: txRef(tx) }],
        });
      }
      continue;
    }

    if (tx.scope === 'arch') {
      if (tx.session && bothArchSessions.has(tx.session)) {
        let card = bothArchCards.get(tx.session);
        if (!card) {
          card = { key: `visit-${tx.session}`, heading: 'Both Arches', toothIds: [], rows: [] };
          bothArchCards.set(tx.session, card);
          fullMouthCards.push(card);
        }
        for (const target of tx.targets) {
          const isUpper = archOf(target) === 'upper';
          card.rows.push({
            txId: tx.id, label: rowLabel, scope: tx.scope, targets: [target],
            // The arch moves onto the ROW because the card heading can no longer carry
            // it. Every other card is headed by the one place its contents apply to;
            // this card covers two, so naming one of them in the heading would be false.
            archLabel: isUpper ? 'Upper' : 'Lower',
            _archOrder: isUpper ? 0 : 1,
            rank, session: tx.session, ref: txRef(tx),
          });
        }
        continue;
      }
      for (const target of tx.targets) {
        const isUpper = target === 'upper' || target === 'upper-arch';
        const heading = isUpper ? 'Upper Arch' : 'Lower Arch';
        const card = {
          key: `arch-${target}-${tx.id}`,
          heading,
          toothIds: [],
          _sortKey: 0,
          rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: [target], rank, session: tx.session, ref: txRef(tx) }],
        };
        if (isUpper) upperOtherCards.push(card);
        else lowerOtherCards.push(card);
      }
      continue;
    }

    // scope === 'tooth' — may be a span (multiple targets) or single-tooth
    if (tx.targets.length === 0) continue;

    // ONE CARD PER ENTRY — for every MediSave treatment on more than one tooth, and
    // for anything else at COLLAPSE_MIN teeth or more.
    //
    // One apply = one entry = one claim (the operation and the consumable are both
    // claimed once for the line), so one entry must read as one row. Listing three
    // extractions as three cards said "three procedures" about something the quote
    // bills, and CPF pays, as one.
    //
    // This replaced a narrower COLLAPSE_IDS rule that gave gbr and simultaneous-graft
    // one card PER CONTIGUOUS RUN. Runs are not the claim boundary and cannot be: this
    // file's splitRuns bridges missing/extracted/implant teeth, while the parent's
    // countToothAreas breaks on any positional gap. The two already disagree, so making
    // cards follow either one asserts a clinical claim the app cannot back. A genuinely
    // separate second site is a second APPLY, which is a second entry and a second card.
    //
    // Runs survive as a heading formatter only: '#11–13' when contiguous, '#14–15, #17'
    // when not, so the card never implies teeth that were not treated.
    //
    // Split per jaw because sections are Maxilla/Mandible. A cross-jaw entry therefore
    // yields two cards sharing one ref — which is exactly why rowKey in
    // treatment-panel.jsx is card-scoped.
    // MediSave (and the AREA_IDS that bill like it) collapse at two teeth; everything
    // else waits for COLLAPSE_MIN. See that constant for why the two differ.
    const billsAsOne = isBundleable(tx.id) || AREA_IDS.has(tx.id);
    if (tx.targets.length >= (billsAsOne ? 2 : COLLAPSE_MIN)) {
      const byJaw = new Map();
      for (const runTeeth of splitRuns(tx.targets, allTeeth)) {
        if (runTeeth.length === 0) continue;
        const jaw = runTeeth[0].jaw;
        if (!byJaw.has(jaw)) byJaw.set(jaw, []);
        byJaw.get(jaw).push(runTeeth);
      }
      for (const [jaw, jawRuns] of byJaw) {
        const teeth = jawRuns.flat();
        const ids = teeth.map(t => t.id);
        const cardKey = `entry-${txRef(tx)}-${jaw}`;
        const card = {
          key: cardKey,
          // Numerically sorted, giving '#11–13' rather than a cx-ordered '#13–11', and
          // matching the format bridge spans already use in this same panel.
          heading: jawRuns.flatMap(quadrantRuns).map(runHeading).join(', '),
          toothIds: ids,
          _cx: Math.min(...teeth.map(t => t.cx)),
          _fdi: teeth[0].fdi,
          rows: [{
            txId: tx.id,
            label: rowLabel,
            scope: tx.scope,
            targets: ids,
            collapse: true,
            rank,
            session: tx.session,
            ref: txRef(tx),
          }],
        };
        if (jaw === 'upper') upperFdiCards.set(cardKey, card);
        else lowerFdiCards.set(cardKey, card);
      }
      continue;
    }

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
        rows: [{ txId: tx.id, label: rowLabel, scope: tx.scope, targets: tx.targets, rank, session: tx.session, ref: txRef(tx) }],
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
        session: tx.session,
        ref: txRef(tx),
      });
    }
  }

  // Sort FDI cards by ascending cx (anatomical left-to-right on chart)
  const sortByCx = (a, b) => a._cx - b._cx;

  // Sort rows within each card by rank then label
  /* _archOrder puts Upper above Lower in a Both Arches card. Without it the two rows
     tie on rank AND label — same treatment, same rank — so their order would fall out
     of however the entries happen to sit in the treatments array. */
  const sortRows = (rows) =>
    [...rows].sort((a, b) =>
      a.rank - b.rank || (a._archOrder ?? 0) - (b._archOrder ?? 0) || a.label.localeCompare(b.label));

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
  /* finalizeCard was not applied here before: every full-mouth card held exactly one
     row (orthodontics), so there was nothing to sort. A Both Arches card holds two,
     and without this its rows keep whatever order the treatments array happened to
     have — Lower above Upper if the lower arch was applied first. */
  if (fullMouthCards.length > 0) {
    sections.push({ key: 'full-mouth', label: 'Full Mouth', cards: fullMouthCards.map(finalizeCard) });
  }
  return sections;
}
