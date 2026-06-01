const IMPLANT_GROUP = ['implant-only', 'implant-crown', 'implant-bridge-span'];
const NATURAL_GROUP = ['crown', 'bridge-span'];
const ALL_PROSTHETICS = [...IMPLANT_GROUP, ...NATURAL_GROUP];

// Returns the set of treatment IDs that must be stripped from affected targets
// when txId is applied.
export function getConflictingTreatmentIds(txId) {
  if (IMPLANT_GROUP.includes(txId)) return ALL_PROSTHETICS;
  if (NATURAL_GROUP.includes(txId)) return ALL_PROSTHETICS;
  if (txId === 'extraction') return [...ALL_PROSTHETICS, 'extraction'];
  return [txId];
}
