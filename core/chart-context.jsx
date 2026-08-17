import React from 'react';
import { loadChart, saveChart } from './chart-service.js';
import { devSeed } from './dev-seed.js';
import { EXTRACTION_IDS } from './conflict-rules.js';

// Clinical + workflow state. These values represent the patient record and
// round-trip to Firestore when patientId is provided (Phase 7).
const ChartStateContext = React.createContext(null);

// Extraction treatment IDs whose targets render as missing in Stage 2 come from
// conflict-rules.js, so the overlay, conflict and presence layers cannot drift apart.

export function ChartStateProvider({ children, patientId, seed }) {
  // Dev-only: ?seed=<key> preloads a canned scene and bypasses Firestore entirely,
  // so a Fast-Refresh page reload restores the same scene instead of an empty chart.
  const seeded = React.useMemo(() => devSeed(seed), [seed]);

  const [stage, setStage] = React.useState(() => (seeded ? seeded.stage : 'baseline'));
  const [presence, setPresence] = React.useState(() =>   // toothId -> 'missing' | 'implant'
    seeded ? { ...seeded.presence } : {});
  const [treatments, setTreatments] = React.useState(() => // [{ id, scope, targets }]
    seeded ? seeded.treatments.map((tx) => ({ ...tx, targets: [...tx.targets] })) : []);
  const [loaded, setLoaded] = React.useState(!patientId || !!seeded);

  // Load on mount
  React.useEffect(() => {
    if (!patientId || seeded) return;
    // 5s fallback so the chart renders even if Firestore hangs or denies auth
    const fallback = setTimeout(() => setLoaded(true), 5000);
    loadChart(patientId).then((data) => {
      if (data) {
        setStage(data.stage ?? 'baseline');
        // Migration: drop presence entries that are 'missing' AND are the target
        // of a stored extraction treatment. This combination cannot arise
        // legitimately (the popover requires presence !== 'missing' to offer an
        // extraction), so it is a Stage-2 mutation that leaked into stored
        // presence before this fix. Idempotent — nothing writes it again.
        const rawPresence = data.presence ?? {};
        const storedTreatments = data.treatments ?? [];
        const extractedIds = new Set();
        storedTreatments.forEach((tx) => {
          if (tx.scope === 'tooth' && EXTRACTION_IDS.includes(tx.id)) {
            tx.targets.forEach((id) => extractedIds.add(id));
          }
        });
        const healedPresence = Object.fromEntries(
          Object.entries(rawPresence).filter(
            ([id, status]) => !(status === 'missing' && extractedIds.has(id))
          )
        );
        setPresence(healedPresence);
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
