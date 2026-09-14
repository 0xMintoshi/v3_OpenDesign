import { describe, it, expect } from 'vitest';
import { addAreaEntry } from './area-apply.js';
import { txRef } from './mv-sessions.js';
import { isBundleable } from './conflict-rules.js';

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
