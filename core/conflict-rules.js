const IMPLANT_GROUP = ['implant-only', 'implant-crown', 'implant-bridge-span'];
const NATURAL_GROUP = ['crown', 'bridge-span', 'veneer'];
const ALL_PROSTHETICS = [...IMPLANT_GROUP, ...NATURAL_GROUP];
// Single source of truth for extraction treatment IDs. Also consumed by
// chart-context.jsx (Stage-2 auto-missing presence) and app/treatments.jsx
// (overlay routing). Adding an extraction type = add it here only.
export const EXTRACTION_IDS = ['extraction', 'simple-surgical-extraction', 'complex-surgical-extraction', 'root-stump-extraction'];

/**
 * Repair presence maps carrying an illegal 'missing'-plus-extraction-target entry.
 *
 * A tooth cannot legitimately be BOTH stored as 'missing' in baseline presence AND
 * the target of a stored extraction: the popover requires presence !== 'missing'
 * before it offers an extraction at all. The combination only exists in data
 * written before that fix, where a Stage-2 mutation leaked into stored presence.
 *
 * Lives here because it is a rule about extraction semantics, beside the ID list
 * it depends on. Idempotent, so it is safe to run on every inbound restore —
 * which is exactly what it does now, rather than only on the Firestore load path
 * that Phase 1.4 switches off.
 *
 * @param {Record<string,string>} presence   toothId -> 'missing' | 'implant' | …
 * @param {Array<{id:string, scope:string, targets:string[]}>} treatments
 * @returns {Record<string,string>} a new presence map with illegal entries dropped
 */
export function healPresence(presence, treatments) {
  const raw = presence || {};
  const txs = treatments || [];
  const extractedIds = new Set();
  txs.forEach((tx) => {
    if (tx && tx.scope === 'tooth' && EXTRACTION_IDS.includes(tx.id)) {
      (tx.targets || []).forEach((id) => extractedIds.add(id));
    }
  });
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([id, status]) => !(status === 'missing' && extractedIds.has(id))
    )
  );
}

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
