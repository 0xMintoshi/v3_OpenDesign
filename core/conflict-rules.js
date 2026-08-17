const IMPLANT_GROUP = ['implant-only', 'implant-crown', 'implant-bridge-span'];
const NATURAL_GROUP = ['crown', 'bridge-span', 'veneer'];
const ALL_PROSTHETICS = [...IMPLANT_GROUP, ...NATURAL_GROUP];
// Single source of truth for extraction treatment IDs. Also consumed by
// chart-context.jsx (Stage-2 auto-missing presence) and app/treatments.jsx
// (overlay routing). Adding an extraction type = add it here only.
export const EXTRACTION_IDS = ['extraction', 'simple-surgical-extraction', 'complex-surgical-extraction', 'root-stump-extraction'];

// Returns the set of treatment IDs that must be stripped from affected targets
// when txId is applied.
export function getConflictingTreatmentIds(txId) {
  if (IMPLANT_GROUP.includes(txId)) return ALL_PROSTHETICS;
  // bridge-span preserves implant-only so it can span over placed implants as abutments.
  if (txId === 'bridge-span') return ALL_PROSTHETICS.filter(id => id !== 'implant-only');
  if (NATURAL_GROUP.includes(txId)) return ALL_PROSTHETICS;
  // Any extraction type strips prosthetics + all other extraction types (only one per tooth).
  if (EXTRACTION_IDS.includes(txId)) return [...ALL_PROSTHETICS, ...EXTRACTION_IDS];
  return [txId];
}
