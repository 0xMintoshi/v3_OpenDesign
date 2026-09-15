import { ROOT_CANAL_IDS, rootCanalIdFor, getConflictingTreatmentIds } from './conflict-rules.js';

/**
 * Root canal is the ONE tooth treatment where a single apply produces several entries.
 *
 * CHAS bills an anterior, a premolar and a molar root canal as three different procedures,
 * and Minzhe wants them separately removable — so selecting #11 #12 #14 #16 and clicking
 * the one Root Canal tile must store three treatments, not one covering all four teeth.
 * A treatment's identity across the iframe bridge is its id plus its teeth, and the
 * parent's removeFromSummary deletes EVERY summary row sharing an identity; one shared id
 * would therefore have meant deleting the Anterior row also deleted the Molar row and
 * cleared its tooth.
 *
 * This lives here, pure, rather than inside handleApplyTreatment, because that function is
 * a React callback the component suite mocks — the same reason core/area-apply.js exists.
 */

/**
 * Bucket a selection into one apply per tooth class.
 *
 * @param {Array<{id:string, fdi:number}>} teeth  tooth objects — `fdi` is the integer,
 *        `id` the 'upper-16' string. Mixing them up is a standing trap in this codebase.
 * @returns {Array<{id:string, targets:string[]}>} one entry per non-empty class, always in
 *          anterior → premolar → molar order so the stored order is deterministic.
 */
export function groupByRootCanalClass(teeth) {
  const buckets = new Map();
  (teeth || []).forEach((t) => {
    const id = rootCanalIdFor(t.fdi);
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(t.id);
  });
  return ROOT_CANAL_IDS
    .filter((id) => buckets.has(id))
    .map((id) => ({ id, targets: buckets.get(id) }));
}

/**
 * Apply root canal to a selection, fanning out by tooth class.
 *
 * Within a class this is the ordinary merge-by-id every tooth treatment uses: a second
 * anterior tooth joins the existing anterior entry rather than starting a second one.
 * The conflict strip runs PER CLASS because getConflictingTreatmentIds is looked up by id
 * and the three classes are three different ids.
 *
 * @param {Array} treatments  current treatments array (not mutated)
 * @param {Array<{id:string, fdi:number}>} teeth  the selection, implants already filtered out
 * @returns {Array} the new treatments array
 */
export function applyRootCanal(treatments, teeth) {
  let next = [...(treatments || [])];
  groupByRootCanalClass(teeth).forEach(({ id, targets }) => {
    const exclusive = getConflictingTreatmentIds(id);
    next = next.map((tx) => {
      if (tx.scope !== 'tooth' || !exclusive.includes(tx.id)) return tx;
      return { ...tx, targets: tx.targets.filter((tid) => !targets.includes(tid)) };
    }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);

    const idx = next.findIndex((tx) => tx.id === id && tx.scope === 'tooth');
    if (idx >= 0) {
      const merged = new Set([...next[idx].targets, ...targets]);
      next[idx] = { ...next[idx], targets: [...merged] };
    } else {
      next.push({ id, scope: 'tooth', targets });
    }
  });
  return next;
}
