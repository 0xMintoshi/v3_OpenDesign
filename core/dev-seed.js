// Dev-only scaffolding — canned chart scenarios for visual tuning.
//
// Activated with ?seed=<key> on the standalone dev server. When a seed is
// active, ChartStateProvider skips Firestore entirely (no load, no autosave),
// so the scene is identical on every page reload and unauthenticated origins
// don't spam permission errors.
//
// The parent app never passes ?seed=, so this is inert in the built bundle: no
// Firestore load, no autosave, nothing reachable from production. Kept as a
// permanent tuning fixture — it is the scene the chart-stroke-tuning skill opens.
//
// Tooth ids are `${jaw}-${fdi}` (layout/teeth-data.jsx:62).
// Span treatments require >= 2 contiguous teeth in a single jaw.

export const DEV_SEEDS = {
  // 'cb' — crown & bridge & veneer. Every tunable stroke site on screen at once:
  //   CrownOverlay.jsx:21          -> the three plain crowns (#11, #21, #22)
  //   BridgeSpanOverlay.jsx:10,:11 -> the upper bridge (crowns + connector bar)
  //   treatments.jsx:248           -> the single implant crown (#36)
  //   treatments.jsx:372           -> the lower implant-bridge crowns
  //   VeneerOverlay.jsx:10,:11     -> the veneers (#12, #13, #23)
  //
  // Veneers sit immediately next to crowns so the ring and the outline can be
  // judged side by side.
  cb: {
    stage: 'treatment',
    presence: {
      'upper-15': 'missing',   // pontic site under the bridge
      'lower-46': 'missing',   // pontic site under the implant bridge
    },
    treatments: [
      { id: 'crown',               scope: 'tooth', targets: ['upper-11', 'upper-21', 'upper-22'] },
      { id: 'veneer',              scope: 'tooth', targets: ['upper-12', 'upper-13', 'upper-23'] },
      { id: 'bridge-span',         scope: 'tooth', targets: ['upper-14', 'upper-15', 'upper-16'] },
      { id: 'implant-crown',       scope: 'tooth', targets: ['lower-36'] },
      { id: 'implant-bridge-span', scope: 'tooth', targets: ['lower-45', 'lower-46', 'lower-47'] },
    ],
  },
};

export function devSeed(key) {
  return (key && DEV_SEEDS[key]) || null;
}
