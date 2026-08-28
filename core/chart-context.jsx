import React from 'react';
import { devSeed } from './dev-seed.js';
import { EXTRACTION_IDS } from './conflict-rules.js';

/**
 * Clinical + workflow state for the chart.
 *
 * This context holds the state; it does NOT persist it. The parent quotation app
 * owns persistence end to end — the chart emits CHART_STATE_CHANGED and is
 * restored via SET_CHART_STATE (see app/dental-arch.jsx). Presence healing runs
 * on that inbound path, in healPresence().
 *
 * Phase 1.5 deleted the chart's own Firestore round-trip (chart-service.js,
 * firebase.js, the `firebase` dependency and the /charts collection). Two copies
 * of the same clinical state permit a PARTIAL restore, which is how a chart ends
 * up showing one plan's treatments over another plan's presence — a mouth that
 * never existed, rendered without any error. `/charts` was redundant rather than
 * dormant: it does not return in the paid tier, so it was deleted rather than
 * flagged off. Do not reintroduce a second persistence path here.
 *
 * `patientId` is still accepted so callers and the iframe URL need not change,
 * but it is deliberately inert.
 */
const ChartStateContext = React.createContext(null);

// Extraction treatment IDs whose targets render as missing in Stage 2 come from
// conflict-rules.js, so the overlay, conflict and presence layers cannot drift apart.

export function ChartStateProvider({ children, seed }) {
  // Dev-only: ?seed=<key> preloads a canned scene, so a Fast-Refresh page reload
  // restores the same scene instead of an empty chart.
  const seeded = React.useMemo(() => devSeed(seed), [seed]);

  const [stage, setStage] = React.useState(() => (seeded ? seeded.stage : 'baseline'));
  const [presence, setPresence] = React.useState(() =>   // toothId -> 'missing' | 'implant'
    seeded ? { ...seeded.presence } : {});
  const [treatments, setTreatments] = React.useState(() => // [{ id, scope, targets }]
    seeded ? seeded.treatments.map((tx) => ({ ...tx, targets: [...tx.targets] })) : []);
  /* There is nothing to load, so the chart is ready on mount. This stays in the
     contract because the outbound emit effects in dental-arch.jsx are gated on it
     — they must not broadcast an empty [] over the parent's real quote before the
     chart has state. It is a constant now rather than a latch, but removing it
     would silently un-gate those emits. */
  const loaded = true;

  // Read-only derived view: baseline presence + this plan's extractions overlaid.
  // This is per-plan (treatments is per-plan) while presence stays shared Stage 1 truth.
  // Stage 1 consumers get the raw presence object (same reference) so nothing changes there.
  const effectivePresence = React.useMemo(() => {
    if (stage !== 'treatment') return presence;
    const ep = { ...presence };
    treatments.forEach((tx) => {
      if (tx.scope === 'tooth' && EXTRACTION_IDS.includes(tx.id)) {
        tx.targets.forEach((id) => { ep[id] = 'missing'; });
      }
    });
    return ep;
  }, [stage, presence, treatments]);

  const value = React.useMemo(
    () => ({ stage, setStage, presence, setPresence, treatments, setTreatments, loaded, effectivePresence }),
    [stage, presence, treatments, loaded, effectivePresence],
  );

  return (
    <ChartStateContext.Provider value={value}>
      {children}
    </ChartStateContext.Provider>
  );
}

export function useChartState() {
  const ctx = React.useContext(ChartStateContext);
  if (!ctx) throw new Error('useChartState must be used within ChartStateProvider');
  return ctx;
}
