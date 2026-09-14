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

/**
 * The operator-defined MediSave procedure: a name they type and a CPF table they pick,
 * for work the catalogue does not carry. Deliberately NOT in CHART_TREATMENT_MAP or in
 * MEDISAVE_BUNDLE_IDS below — both of those describe catalogue treatments, and the
 * parent's parity tests read them that way.
 *
 * Entries carry a `uid`, because id and targets no longer identify one: two manual
 * procedures can sit on the same tooth, which is the whole point.
 */
export const MANUAL_MV_ID = 'manual-medisave';

// Returns the set of treatment IDs that must be stripped from affected targets
// when txId is applied.
export function getConflictingTreatmentIds(txId) {
  // A manual procedure conflicts with NOTHING, including other manual procedures. The
  // default return below is [txId], which would have stripped the previous manual entry
  // off these teeth — silent data loss, not a visual glitch, since the operator's typed
  // name goes with it. Two procedures on one tooth is the ordinary case here.
  if (txId === MANUAL_MV_ID) return [];
  if (IMPLANT_GROUP.includes(txId)) return ALL_PROSTHETICS;
  // bridge-span preserves implant-only so it can span over placed implants as abutments.
  if (txId === 'bridge-span') return ALL_PROSTHETICS.filter(id => id !== 'implant-only');
  if (NATURAL_GROUP.includes(txId)) return ALL_PROSTHETICS;
  // Any extraction type strips prosthetics + all other extraction types (only one per tooth).
  if (EXTRACTION_IDS.includes(txId)) return [...ALL_PROSTHETICS, ...EXTRACTION_IDS];
  return [txId];
}

/**
 * Treatments that start their own MediSave session on every apply, instead of merging
 * their targets into an existing entry with the same id. Moved here from a local const
 * inside handleApplyTreatment when same-visit bundling started needing the same list.
 *
 * This "one apply = one entry" property is what makes `session` (below) safe to attach:
 * two entries sharing an id but sitting in different visits can never be collapsed into
 * one by the merge path, because these ids never take the merge path.
 */
export const SESSION_SPLIT_IDS = ['implant-only', 'implant-crown', 'gbr',
                                  'simple-surgical-extraction', 'complex-surgical-extraction',
                                  'root-stump-extraction',
                                  // Area-scoped, added 2026-09-14. They used to merge their
                                  // targets into one entry, which is exactly what made them
                                  // unbundleable; the sinus and arch apply branches in
                                  // dental-arch.jsx now push one entry per side / per arch, so
                                  // they have the same one-apply-one-entry property as the rest.
                                  // Read only inside the popover.mode === 'tooth' branch there,
                                  // which these two never enter — they are on this list for what
                                  // MEDISAVE_BUNDLE_IDS derives from it, not for that branch.
                                  'sinus-lift', 'alveolectomy'];

/**
 * MediSave treatments that may be bundled into a shared-consumable visit.
 *
 * implant-bridge-span is not in SESSION_SPLIT_IDS but belongs here anyway: it pushes a
 * fresh entry per jaw on every apply and never merges by id, which is the only property
 * bundling depends on.
 */
export const MEDISAVE_BUNDLE_IDS = [...SESSION_SPLIT_IDS, 'implant-bridge-span'];

/* MEDISAVE_MERGE_IDS was here until 2026-09-14. It held sinus-lift and alveolectomy,
   the two MediSave treatments left out of bundling because they merged their targets
   into one entry. They now push one entry per side / per arch like everything else, so
   the exception list has no members and is gone: EVERY MediSave treatment is bundleable,
   and the operator decides what shares a visit. The parent parity test now asserts
   MEDISAVE_BUNDLE_IDS alone covers every surgical treatment in CHART_TREATMENT_MAP. */

/**
 * True when this treatment can join a same-visit bundle.
 *
 * The manual procedure is checked separately rather than being added to
 * MEDISAVE_BUNDLE_IDS: that list is asserted, by a parent test, to contain only
 * treatments the parent bills as surgical THROUGH THE CATALOGUE. A manual entry is
 * billed as surgical without a catalogue entry, so adding it to the list would force
 * that test to be loosened, and the drift it catches is worth more than the one-line
 * saving here.
 */
export function isBundleable(txId) {
  return txId === MANUAL_MV_ID || MEDISAVE_BUNDLE_IDS.includes(txId);
}
