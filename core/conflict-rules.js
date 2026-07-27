const IMPLANT_GROUP = ['implant-only', 'implant-crown', 'implant-bridge-span'];
const NATURAL_GROUP = ['crown', 'bridge-span', 'veneer'];
const ALL_PROSTHETICS = [...IMPLANT_GROUP, ...NATURAL_GROUP];
const EXTRACTION_GROUP = ['extraction', 'simple-surgical-extraction', 'complex-surgical-extraction', 'root-stump-extraction'];

// Returns the set of treatment IDs that must be stripped from affected targets
// when txId is applied.
export function getConflictingTreatmentIds(txId) {
  if (IMPLANT_GROUP.includes(txId)) return ALL_PROSTHETICS;
  // bridge-span preserves implant-only so it can span over placed implants as abutments.
  if (txId === 'bridge-span') return ALL_PROSTHETICS.filter(id => id !== 'implant-only');
  if (NATURAL_GROUP.includes(txId)) return ALL_PROSTHETICS;
  // Any extraction type strips prosthetics + all other extraction types (only one per tooth).
  if (EXTRACTION_GROUP.includes(txId)) return [...ALL_PROSTHETICS, ...EXTRACTION_GROUP];
  return [txId];
}
