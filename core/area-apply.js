/**
 * Applying an AREA-scoped treatment — sinus lift (per side) and alveolectomy (per arch).
 *
 * Until 2026-09-14 both branches in dental-arch.jsx merged a newly applied target into
 * whatever entry of the same id already existed, so one entry could end up covering both
 * sides or both arches. That is precisely what kept them out of same-visit bundling: an
 * entry spanning two sides cannot honestly carry one visit tag, because the two sides may
 * be done months apart. They were named in a MEDISAVE_MERGE_IDS exception list for it.
 *
 * One entry per target removes the exception. Each entry covers exactly one side or arch,
 * so each is independently taggable, and every MediSave treatment is bundleable with no
 * special cases left — the operator decides what shares a visit, which is the rule the
 * rest of the chart already follows.
 *
 * Pure, so vitest can exercise it: the apply path proper lives inside a React callback
 * with setTreatments mocked in the component suite, and the two branches would otherwise
 * carry the same guard twice.
 */

/**
 * Adds an area treatment for one target, if it is not already there.
 *
 * Re-applying a side or arch that already has an entry is a NO-OP rather than a second
 * entry: the operator clicking the same sinus twice means "this sinus is being lifted",
 * not "lift it twice", and a duplicate would claim the operation again.
 *
 * Returns the ORIGINAL array reference when nothing changes, so a React state setter can
 * skip the re-render.
 *
 * @param {Array<{id:string, scope:string, targets:string[]}>} list  current treatments
 * @param {string} txId   treatment id, e.g. 'sinus-lift'
 * @param {'sinus'|'arch'} scope
 * @param {string} target one side ('left'/'right') or one arch ('upper'/'lower')
 * @returns {Array} the list, with the entry appended when it was absent
 */
export function addAreaEntry(list, txId, scope, target) {
  const already = list.some(
    (tx) => tx.id === txId && tx.scope === scope && (tx.targets || []).includes(target),
  );
  if (already) return list;
  return [...list, { id: txId, scope, targets: [target] }];
}
