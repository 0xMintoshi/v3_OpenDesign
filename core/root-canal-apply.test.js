import { describe, it, expect } from 'vitest';
import { groupByRootCanalClass, applyRootCanal } from './root-canal-apply.js';
import { rootCanalIdFor, ROOT_CANAL_IDS, RCT_TILE_ID, getConflictingTreatmentIds,
         MEDISAVE_BUNDLE_IDS, SESSION_SPLIT_IDS } from './conflict-rules.js';

const tooth = (fdi, jaw = 'upper') => ({ id: `${jaw}-${fdi}`, fdi });

describe('rootCanalIdFor — the three CHAS classes', () => {
  it('treats 1-3 as anterior, 4-5 as premolar, 6-8 as molar', () => {
    [11, 12, 13, 21, 33, 41].forEach((f) => expect(rootCanalIdFor(f)).toBe('root-canal-anterior'));
    [14, 15, 24, 35, 45].forEach((f) => expect(rootCanalIdFor(f)).toBe('root-canal-premolar'));
    [16, 17, 26, 37, 47].forEach((f) => expect(rootCanalIdFor(f)).toBe('root-canal-molar'));
  });

  it('puts wisdom teeth with the molars', () => {
    [18, 28, 38, 48].forEach((f) => expect(rootCanalIdFor(f)).toBe('root-canal-molar'));
  });
});

describe('groupByRootCanalClass', () => {
  it('splits a mixed selection into one group per class', () => {
    // Minzhe's worked example: #11 #12 #14 #16 → anterior(2), premolar(1), molar(1).
    const groups = groupByRootCanalClass([tooth(11), tooth(12), tooth(14), tooth(16)]);
    expect(groups).toEqual([
      { id: 'root-canal-anterior', targets: ['upper-11', 'upper-12'] },
      { id: 'root-canal-premolar', targets: ['upper-14'] },
      { id: 'root-canal-molar', targets: ['upper-16'] },
    ]);
  });

  it('emits nothing for a class with no teeth', () => {
    const groups = groupByRootCanalClass([tooth(16), tooth(17)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('root-canal-molar');
  });

  it('returns no groups for an empty selection', () => {
    expect(groupByRootCanalClass([])).toEqual([]);
  });
});

describe('applyRootCanal', () => {
  it('stores three separate treatments from one apply, so each deletes independently', () => {
    const next = applyRootCanal([], [tooth(11), tooth(12), tooth(14), tooth(16)]);
    expect(next).toHaveLength(3);
    expect(next.map((t) => t.id)).toEqual(ROOT_CANAL_IDS);
    expect(next.every((t) => t.scope === 'tooth')).toBe(true);
    expect(next[0].targets).toEqual(['upper-11', 'upper-12']);
  });

  it('merges a later tooth into the entry for its OWN class', () => {
    let next = applyRootCanal([], [tooth(11)]);
    next = applyRootCanal(next, [tooth(12)]);
    expect(next).toHaveLength(1);
    expect(next[0].targets).toEqual(['upper-11', 'upper-12']);
  });

  it('does not merge across classes', () => {
    let next = applyRootCanal([], [tooth(11)]);
    next = applyRootCanal(next, [tooth(16)]);
    expect(next).toHaveLength(2);
    expect(next.find((t) => t.id === 'root-canal-anterior').targets).toEqual(['upper-11']);
    expect(next.find((t) => t.id === 'root-canal-molar').targets).toEqual(['upper-16']);
  });

  it('re-applying the same tooth does not duplicate it', () => {
    let next = applyRootCanal([], [tooth(16)]);
    next = applyRootCanal(next, [tooth(16)]);
    expect(next).toHaveLength(1);
    expect(next[0].targets).toEqual(['upper-16']);
  });

  it('leaves a crown on the same tooth alone — RCT + crown is the commonest pairing', () => {
    const withCrown = [{ id: 'crown', scope: 'tooth', targets: ['upper-16'] }];
    const next = applyRootCanal(withCrown, [tooth(16)]);
    expect(next.find((t) => t.id === 'crown').targets).toEqual(['upper-16']);
    expect(next.find((t) => t.id === 'root-canal-molar').targets).toEqual(['upper-16']);
  });

  it('leaves another class\'s root canal on a DIFFERENT tooth alone', () => {
    const existing = [{ id: 'root-canal-molar', scope: 'tooth', targets: ['upper-16'] }];
    const next = applyRootCanal(existing, [tooth(11)]);
    expect(next).toHaveLength(2);
    expect(next.find((t) => t.id === 'root-canal-molar').targets).toEqual(['upper-16']);
  });

  it('does not mutate the array it is given', () => {
    const before = [{ id: 'crown', scope: 'tooth', targets: ['upper-16'] }];
    const snapshot = JSON.stringify(before);
    applyRootCanal(before, [tooth(16)]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('root canal conflicts', () => {
  it('is stripped by every kind of extraction — you do not quote an RCT on a tooth you remove', () => {
    ['extraction', 'simple-surgical-extraction', 'complex-surgical-extraction',
     'root-stump-extraction'].forEach((extId) => {
      const conflicts = getConflictingTreatmentIds(extId);
      ROOT_CANAL_IDS.forEach((rctId) => expect(conflicts).toContain(rctId));
    });
  });

  it('does not strip a crown, a veneer or a bridge', () => {
    ROOT_CANAL_IDS.forEach((rctId) => {
      const conflicts = getConflictingTreatmentIds(rctId);
      expect(conflicts).not.toContain('crown');
      expect(conflicts).not.toContain('veneer');
      expect(conflicts).not.toContain('bridge-span');
      expect(conflicts).toEqual([rctId]);
    });
  });

  it('is CHAS, so it never joins a MediSave bundle or session split', () => {
    // A parent parity test asserts MEDISAVE_BUNDLE_IDS holds only ids the parent bills as
    // surgical; an RCT id leaking onto it would fail there, far from this file.
    ROOT_CANAL_IDS.forEach((id) => {
      expect(MEDISAVE_BUNDLE_IDS).not.toContain(id);
      expect(SESSION_SPLIT_IDS).not.toContain(id);
    });
  });

  it('the popover token is never one of the stored ids', () => {
    expect(ROOT_CANAL_IDS).not.toContain(RCT_TILE_ID);
  });
});
