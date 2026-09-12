// Same-visit MediSave bundles — pure logic, no React.
//
// CPF allows the $830 consumable once per day. A chart treatment cannot know which
// procedures share an appointment, so the operator declares it: entries carrying the
// same `session` string are one visit and the parent app claims one consumable for them.
//
// Safe to hang off a treatment entry because every bundleable id is in SESSION_SPLIT_IDS
// (or is implant-bridge-span) and therefore pushes a fresh entry per apply instead of
// merging targets into an existing same-id entry. See conflict-rules.js.

import { isBundleable } from './conflict-rules.js';

/**
 * Stable identity for one treatment entry, used to address it from a panel row.
 * Targets are sorted so the ref does not depend on click order.
 *
 * Deliberately NOT the same string as the parent app's txKey (`id:targets`): that one
 * crosses the iframe bridge and pairs summary rows to chart treatments, and giving the
 * two jobs one format would couple a panel interaction to the quote's row identity.
 */
export function txRef(tx) {
  return `${tx.id}::${[...(tx.targets || [])].sort().join(',')}`;
}

/**
 * Drop tags from sessions that no longer have at least two members.
 *
 * Derived rather than maintained: every removal path in dental-arch.jsx can orphan a
 * bundle member, and running this over the list once is the only way a "bundle of one"
 * cannot survive somewhere. A bundle of one would otherwise keep claiming a shared
 * consumable that is no longer shared with anything.
 */
export function pruneSessions(treatments) {
  const counts = new Map();
  for (const tx of treatments) {
    if (!tx.session) continue;
    counts.set(tx.session, (counts.get(tx.session) || 0) + 1);
  }
  let changed = false;
  const out = treatments.map((tx) => {
    if (!tx.session) return tx;
    if (counts.get(tx.session) >= 2 && isBundleable(tx.id)) return tx;
    changed = true;
    const { session, ...rest } = tx;
    return rest;
  });
  // Preserve referential identity when nothing changed, so useMemo consumers downstream
  // do not re-emit an identical treatments array to the parent on every render.
  return changed ? out : treatments;
}

/**
 * The next free session id for this treatment list.
 *
 * Derived from what is already there rather than from a counter, so ids stay unique
 * across a Firestore restore — a counter would restart at 1 and collide with restored
 * bundles.
 */
export function nextSessionId(treatments) {
  let max = 0;
  for (const tx of treatments) {
    const m = /^s(\d+)$/.exec(tx.session || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `s${max + 1}`;
}

/**
 * Put the entries named by `refs` into one visit, returning a new treatments array.
 *
 * Merge rules:
 *  - none of them tagged  -> a fresh session
 *  - exactly one tagged   -> the others join it
 *  - several tagged       -> those bundles merge; the lowest-numbered id wins, so the
 *                            result does not depend on which row was clicked first
 * Entries that are not bundleable are left alone.
 */
export function joinSessions(treatments, refs) {
  const wanted = new Set(refs);
  const members = treatments.filter((tx) => wanted.has(txRef(tx)) && isBundleable(tx.id));
  if (members.length < 2) return treatments;

  const existing = [...new Set(members.map((tx) => tx.session).filter(Boolean))];
  const winner = existing.length
    ? existing.sort((a, b) => {
        const na = parseInt(/\d+/.exec(a)?.[0] ?? '0', 10);
        const nb = parseInt(/\d+/.exec(b)?.[0] ?? '0', 10);
        return na - nb;
      })[0]
    : nextSessionId(treatments);

  const absorbed = new Set(existing);
  return treatments.map((tx) => {
    const isMember = wanted.has(txRef(tx)) && isBundleable(tx.id);
    // Rows already in one of the merging bundles come along, even if the operator
    // only named one of them — merging two bundles must not strand their other members.
    const isAbsorbed = tx.session && absorbed.has(tx.session);
    return (isMember || isAbsorbed) ? { ...tx, session: winner } : tx;
  });
}

/** Take one entry out of its visit. `pruneSessions` then cleans up a leftover single. */
export function leaveSession(treatments, ref) {
  return pruneSessions(treatments.map((tx) => {
    if (txRef(tx) !== ref || !tx.session) return tx;
    const { session, ...rest } = tx;
    return rest;
  }));
}
