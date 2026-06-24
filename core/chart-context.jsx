import React from 'react';
import { loadChart, saveChart } from './chart-service.js';

// Clinical + workflow state. These values represent the patient record and
// round-trip to Firestore when patientId is provided (Phase 7).
const ChartStateContext = React.createContext(null);

export function ChartStateProvider({ children, patientId }) {
  const [stage, setStage] = React.useState('baseline');
  const [presence, setPresence] = React.useState({});       // toothId -> 'missing'
  const [treatments, setTreatments] = React.useState([]);   // [{ id, scope, targets }]
  const [loaded, setLoaded] = React.useState(!patientId);

  // Load on mount
  React.useEffect(() => {
    if (!patientId) return;
    // 5s fallback so the chart renders even if Firestore hangs or denies auth
    const fallback = setTimeout(() => setLoaded(true), 5000);
    loadChart(patientId).then((data) => {
      if (data) {
        setStage(data.stage ?? 'baseline');
        setPresence(data.presence ?? {});
        setTreatments(data.treatments ?? []);
      }
    }).catch(() => {
      // Firestore unavailable — chart still renders, just no persisted state
    }).finally(() => {
      clearTimeout(fallback);
      setLoaded(true);
    });
  }, [patientId]);

  // Debounced auto-save — only after initial load
  React.useEffect(() => {
    if (!patientId || !loaded) return;
    const timer = setTimeout(() => {
      saveChart(patientId, { stage, presence, treatments });
    }, 800);
    return () => clearTimeout(timer);
  }, [patientId, loaded, stage, presence, treatments]);

  const value = React.useMemo(
    () => ({ stage, setStage, presence, setPresence, treatments, setTreatments, loaded }),
    [stage, presence, treatments, loaded],
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
