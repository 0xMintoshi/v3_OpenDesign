import React from 'react';

// Clinical + workflow state. These values represent the patient record and
// will eventually round-trip to a backend (Phase 7).
const ChartStateContext = React.createContext(null);

export function ChartStateProvider({ children }) {
  const [stage, setStage] = React.useState('baseline');
  const [presence, setPresence] = React.useState({});       // toothId -> 'missing'
  const [treatments, setTreatments] = React.useState([]);   // [{ id, scope, targets }]

  const value = React.useMemo(
    () => ({ stage, setStage, presence, setPresence, treatments, setTreatments }),
    [stage, presence, treatments],
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
