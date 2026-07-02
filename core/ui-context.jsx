import React from 'react';

// Ephemeral interaction state — scoped to one browser session, never persisted.
const UIStateContext = React.createContext(null);

export function UIStateProvider({ children }) {
  const [hoveredId, setHoveredId] = React.useState(null);
  const [selection, setSelection] = React.useState([]);
  const [popover, setPopover] = React.useState(null);
  const [exportJson, setExportJson] = React.useState(null);
  const [focusedToothId, setFocusedToothId] = React.useState(null);

  const value = React.useMemo(
    () => ({
      hoveredId, setHoveredId,
      selection, setSelection,
      popover, setPopover,
      exportJson, setExportJson,
      focusedToothId, setFocusedToothId,
    }),
    [hoveredId, selection, popover, exportJson, focusedToothId],
  );

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const ctx = React.useContext(UIStateContext);
  if (!ctx) throw new Error('useUIState must be used within UIStateProvider');
  return ctx;
}
