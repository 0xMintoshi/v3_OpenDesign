import { describe, it, expect } from 'vitest';
import { addAreaEntry, addBothArchEntries } from './area-apply.js';
import { txRef } from './mv-sessions.js';
import { isBundleable } from './conflict-rules.js';
import { pruneSessions } from './mv-sessions.js';

const sinus = (target) => ({ id: 'sinus-lift', scope: 'sinus', targets: [target] });
const arch = (target) => ({ id: 'alveolectomy', scope: 'arch', targets: [target] });

describe('addAreaEntry', () => {
  describe('one entry per target — the property that makes bundling honest', () => {
    it('adds an entry when the area has none', () => {
      expect(addAreaEntry([], 'sinus-lift', 'sinus', 'right')).toEqual([sinus('right')]);
    });

    it('keeps the two sides as SEPARATE entries rather than merging them', () => {
      let list = addAreaEntry([], 'sinus-lift', 'sinus', 'right');
      list = addAreaEntry(list, 'sinus-lift', 'sinus', 'left');
      expect(list).toEqual([sinus('right'), sinus('left')]);
      // The old behaviour produced ONE entry carrying ['right','left'], which could not
      // say that only one side belonged to a given visit.
      expect(list.every((t) => t.targets.length === 1)).toBe(true);
    });

    it('keeps the two arches as separate entries', () => {
      let list = addAreaEntry([], 'alveolectomy', 'arch', 'upper');
      list = addAreaEntry(list, 'alveolectomy', 'arch', 'lower');
      expect(list).toEqual([arch('upper'), arch('lower')]);
    });

    it('gives each entry its own ref, so the panel can address them independently', () => {
      let list = addAreaEntry([], 'sinus-lift', 'sinus', 'right');
      list = addAreaEntry(list, 'sinus-lift', 'sinus', 'left');
      expect(txRef(list[0])).not.toBe(txRef(list[1]));
    });
  });

  describe('re-applying the same target is a no-op', () => {
    it('does not add a second entry for a side already present', () => {
      const list = [sinus('right')];
      expect(addAreaEntry(list, 'sinus-lift', 'sinus', 'right')).toEqual([sinus('right')]);
    });

    it('returns the SAME array reference, so React can skip the re-render', () => {
      const list = [sinus('right')];
      expect(addAreaEntry(list, 'sinus-lift', 'sinus', 'right')).toBe(list);
    });

    it('still adds the other side when one is already there', () => {
      const list = [sinus('right')];
      expect(addAreaEntry(list, 'sinus-lift', 'sinus', 'left')).toHaveLength(2);
    });
  });

  describe('does not disturb anything else in the list', () => {
    it('leaves unrelated treatments untouched', () => {
      const other = { id: 'gbr', scope: 'tooth', targets: ['upper-13'] };
      const out = addAreaEntry([other], 'sinus-lift', 'sinus', 'right');
      expect(out[0]).toBe(other);
      expect(out).toHaveLength(2);
    });

    it('does not treat a different treatment on the same target as a duplicate', () => {
      const list = [{ id: 'alveolectomy', scope: 'arch', targets: ['upper'] }];
      const out = addAreaEntry(list, 'complete-denture', 'arch', 'upper');
      expect(out).toHaveLength(2);
    });

    it('does not match across scopes', () => {
      const list = [{ id: 'x', scope: 'tooth', targets: ['upper'] }];
      expect(addAreaEntry(list, 'x', 'arch', 'upper')).toHaveLength(2);
    });

    it('preserves a session tag on an entry it does not touch', () => {
      const tagged = { ...sinus('right'), session: 's1' };
      const out = addAreaEntry([tagged], 'sinus-lift', 'sinus', 'left');
      expect(out[0].session).toBe('s1');
      expect(out[1].session).toBeUndefined();
    });
  });

  describe('the entries it makes are bundleable — the point of the change', () => {
    it('produces entries whose ids can join a same-visit bundle', () => {
      const list = addAreaEntry(addAreaEntry([], 'sinus-lift', 'sinus', 'right'),
        'alveolectomy', 'arch', 'upper');
      expect(list.every((t) => isBundleable(t.id))).toBe(true);
    });
  });
});


/*
 * Both arches in one declared visit.
 *
 * The rule being pinned is not "two entries appear" but WHICH entries get the tag.
 * A pre-existing arch entry may have been applied on another day; sweeping it into
 * this visit would claim one $830 across two appointments. That is a billing error,
 * not a display one, so it gets the sharper test.
 */
describe('addBothArchEntries', () => {
  it('creates one entry per arch, both carrying the same session', () => {
    const out = addBothArchEntries([], 'alveolectomy', 's1');
    expect(out).toHaveLength(2);
    expect(out.map((tx) => tx.targets[0]).sort()).toEqual(['lower', 'upper']);
    expect(out.every((tx) => tx.scope === 'arch')).toBe(true);
    expect(new Set(out.map((tx) => tx.session))).toEqual(new Set(['s1']));
  });

  it('never merges the two arches into one entry', () => {
    const out = addBothArchEntries([], 'alveolectomy', 's1');
    // One target each. An entry spanning both arches is the shape this module was
    // written to eliminate — it cannot honestly carry a single visit tag.
    expect(out.map((tx) => tx.targets.length)).toEqual([1, 1]);
  });

  it('leaves a pre-existing arch entry untagged and adds only the missing one', () => {
    const existing = arch('upper');
    const out = addBothArchEntries([existing], 'alveolectomy', 's7');
    expect(out).toHaveLength(2);
    const upper = out.find((tx) => tx.targets[0] === 'upper');
    const lower = out.find((tx) => tx.targets[0] === 'lower');
    expect(upper).toBe(existing);          // same reference — untouched
    expect(upper.session).toBeUndefined(); // and NOT swept into this visit
    expect(lower.session).toBe('s7');
  });

  it('is a no-op when both arches already carry the treatment', () => {
    const list = [arch('upper'), arch('lower')];
    expect(addBothArchEntries(list, 'alveolectomy', 's1')).toBe(list);
  });

  it('survives pruneSessions — two bundleable members is a real visit', () => {
    const out = addBothArchEntries([], 'alveolectomy', 's1');
    expect(isBundleable('alveolectomy')).toBe(true);
    expect(pruneSessions(out)).toBe(out);
    expect(pruneSessions(out).every((tx) => tx.session === 's1')).toBe(true);
  });

  /*
   * The no-retro-bundling rule, end to end. Minzhe, 2026-09-17: a visit is declared when
   * the work is created and never afterwards.
   *
   * So when one arch already exists, "both arches" adds the other, tags only the new one,
   * and pruneSessions — which the component runs over every render — then strips that tag
   * because a bundle of one is not a bundle. The net result is NO visit, which is the
   * correct outcome: the pre-existing entry may be from another day, and nothing may
   * retro-join it. The operator sees no SAME VISIT brace, which is the honest feedback.
   */
  it('forms NO visit when one arch already existed — bundling is never retrofitted', () => {
    const out = pruneSessions(addBothArchEntries([arch('upper')], 'alveolectomy', 's1'));
    expect(out).toHaveLength(2);
    expect(out.every((tx) => tx.session === undefined)).toBe(true);
  });

  it('gives the two entries distinct refs, so the panel can address each', () => {
    const out = addBothArchEntries([], 'alveolectomy', 's1');
    expect(txRef(out[0])).not.toBe(txRef(out[1]));
  });
});
