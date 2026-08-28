import React from 'react';
import { loadChart, saveChart } from './chart-service.js';
import { devSeed } from './dev-seed.js';
import { EXTRACTION_IDS, healPresence } from './conflict-rules.js';

// Clinical + workflow state. These values represent the patient record and
// round-trip to Firestore when patientId is provided (Phase 7).
const ChartStateContext = React.createContext(null);

// Extraction treatment IDs whose targets render as missing in Stage 2 come from
// conflict-rules.js, so the overlay, conflict and presence layers cannot drift apart.

/**
 * Phase 1.4 — the chart's own cloud round-trip is off.
 *
 * The parent quotation app now owns chart state end to end: it receives
 * CHART_STATE_CHANGED and restores via SET_CHART_STATE. Two copies of the same
 * clinical state permit a partial restore, which is how a chart silently ends up
 * showing one plan's treatments over another plan's presence.
 *
 * Kept as a named constant (rather than deleted outright) only until Phase 1.5's
 * regression suite proves the parent's copy carries the state alone. `/charts` is
 * redundant, not dormant — it does not return in the paid tier, so 1.5 deletes
 * chart-service.js and firebase.js rather than flipping this back on.
 */
const CHART_CLOUD_PERSISTENCE = false;

export function ChartStateProvider({ children, patientId, seed }) {
  // Dev-only: ?seed=<key> preloads a canned scene and bypasses Firestore entirely,
  // so a Fast-Refresh page reload restores the same scene instead of an empty chart.
  const seeded = React.useMemo(() => devSeed(seed), [seed]);

  const [stage, setStage] = React.useState(() => (seeded ? seeded.stage : 'baseline'));
  const [presence, setPresence] = React.useState(() =>   // toothId -> 'missing' | 'implant'
    seeded ? { ...seeded.presence } : {});
  const [treatments, setTreatments] = React.useState(() => // [{ id, scope, targets }]
    seeded ? seeded.treatments.map((tx) => ({ ...tx, targets: [...tx.targets] })) : []);
  /* With cloud persistence off there is nothing to wait for, so the chart is
     "loaded" on mount — otherwise the outbound emit effects, which are gated on
     `loaded` to avoid broadcasting an empty [] over the parent's real quote,
     would never fire at all. */
  const [loaded, setLoaded] = React.useState(
    !CHART_CLOUD_PERSISTENCE || !patientId || !!seeded);

  // Load on mount
  React.useEffect(() => {
    if (!CHART_CLOUD_PERSISTENCE) return;
    if (!patientId || seeded) return;
    // 5s fallback so the chart renders even if Firestore hangs or denies auth
    const fallback = setTimeout(() => setLoaded(true), 5000);
    loadChart(patientId).then((data) => {
      if (data) {
        setStage(data.stage ?? 'baseline');
        // Presence healing now lives in healPresence() (conflict-rules.js) and runs
        // on every inbound restore, including the parent's SET_CHART_STATE — this
        // load path is switched off in Phase 1.4, so a repair that only ran here
        // would never reach a local draft carrying the bad combination.
        const storedTreatments = data.treatments ?? [];
        setPresence(healPresence(data.presence, storedTreatments));
        setTreatments(storedTreatments);
      }
    }).catch(() => {
      // Firestore unavailable — chart still renders, just no persisted state
    }).finally(() => {
      clearTimeout(fallback);
      setLoaded(true);
    });
  }, [patientId, seeded]);

  // Debounced auto-save — only after initial load. Never persist a dev seed.
  React.useEffect(() => {
    if (!CHART_CLOUD_PERSISTENCE) return;
    if (!patientId || !loaded || seeded) return;
    const timer = setTimeout(() => {
      saveChart(patientId, { stage, presence, treatments });
    }, 800);
    return () => clearTimeout(timer);
  }, [patientId, loaded, seeded, stage, presence, treatments]);

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
