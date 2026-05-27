const IMPLANT_GROUP = ['implant-only', 'implant-crown', 'implant-bridge-span'];
const NATURAL_GROUP = ['crown', 'bridge-span'];

// Returns the set of treatment IDs that must be stripped from affected targets
// when txId is applied.
export function getConflictingTreatmentIds(txId) {
  if (IMPLANT_GROUP.includes(txId)) return [...IMPLANT_GROUP, ...NATURAL_GROUP];
  if (NATURAL_GROUP.includes(txId)) return [...IMPLANT_GROUP, ...NATURAL_GROUP];
  return [txId];
}
