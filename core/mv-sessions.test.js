import { describe, it, expect } from 'vitest';
import { txRef, pruneSessions, joinSessions, leaveSession, nextSessionId } from './mv-sessions.js';
import { MEDISAVE_BUNDLE_IDS, MEDISAVE_MERGE_IDS, SESSION_SPLIT_IDS, isBundleable } from './conflict-rules.js';

const tx = (id, targets, session) => session
  ? { id, scope: 'tooth', targets, session }
  : { id, scope: 'tooth', targets };

describe('txRef', () => {
  it('does not depend on the order the teeth were clicked', () => {
    expect(txRef(tx('gbr', ['upper-16', 'upper-15'])))
      .toBe(txRef(tx('gbr', ['upper-15', 'upper-16'])));
  });
  it('separates two entries of the same treatment on different teeth', () => {
    expect(txRef(tx('gbr', ['upper-16']))).not.toBe(txRef(tx('gbr', ['upper-15'])));
  });
});

describe('joinSessions', () => {
  it("Minzhe's case: surgical extraction + bone graft on one site share a visit", () => {
    const list = [tx('simple-surgical-extraction', ['upper-13']), tx('gbr', ['upper-13'])];
    const out = joinSessions(list, list.map(txRef));
    expect(out[0].session).toBe('s1');
    expect(out[1].session).toBe('s1');
  });

  it('bundles across different teeth — the consumable belongs to the visit, not the tooth', () => {
    const list = [tx('simple-surgical-extraction', ['upper-18']), tx('gbr', ['lower-36'])];
    const out = joinSessions(list, list.map(txRef));
    expect(new Set(out.map((t) => t.session))).toEqual(new Set(['s1']));
  });

  it('an untagged row joins the tagged row it was dropped on', () => {
    const list = [tx('gbr', ['upper-13'], 's4'), tx('implant-only', ['upper-14'])];
    const out = joinSessions(list, list.map(txRef));
    expect(out.map((t) => t.session)).toEqual(['s4', 's4']);
  });

  it('merging two bundles keeps the lower id and strands nobody', () => {
    const list = [
      tx('simple-surgical-extraction', ['upper-13'], 's1'),
      tx('gbr', ['upper-13'], 's1'),
      tx('implant-only', ['lower-36'], 's2'),
      tx('complex-surgical-extraction', ['lower-37'], 's2'),
    ];
    // Only one member of each bundle is named, yet all four end up together.
    const out = joinSessions(list, [txRef(list[0]), txRef(list[2])]);
    expect(out.map((t) => t.session)).toEqual(['s1', 's1', 's1', 's1']);
  });

  it('does not depend on which row the operator clicked first', () => {
    const list = [tx('gbr', ['upper-13'], 's2'), tx('implant-only', ['upper-14'], 's1')];
    const a = joinSessions(list, [txRef(list[0]), txRef(list[1])]);
    const b = joinSessions(list, [txRef(list[1]), txRef(list[0])]);
    expect(a.map((t) => t.session)).toEqual(b.map((t) => t.session));
    expect(a[0].session).toBe('s1');
  });

  it('refuses to bundle a treatment that merges its targets (sinus lift)', () => {
    const list = [tx('gbr', ['upper-13']), { id: 'sinus-lift', scope: 'sinus', targets: ['right'] }];
    const out = joinSessions(list, list.map(txRef));
    expect(out.every((t) => !t.session)).toBe(true);
  });

  it('a single row cannot form a visit on its own', () => {
    const list = [tx('gbr', ['upper-13'])];
    expect(joinSessions(list, [txRef(list[0])])).toBe(list);
  });
});

describe('nextSessionId', () => {
  it('continues past restored bundles instead of colliding with them', () => {
    expect(nextSessionId([tx('gbr', ['a'], 's7'), tx('implant-only', ['b'], 's7')])).toBe('s8');
  });
  it('starts at s1 on an untagged plan', () => {
    expect(nextSessionId([tx('gbr', ['a'])])).toBe('s1');
  });
});

describe('pruneSessions', () => {
  it('drops a tag left behind when a bundle falls to one member', () => {
    const out = pruneSessions([tx('gbr', ['upper-13'], 's1')]);
    expect(out[0].session).toBeUndefined();
  });
  it('leaves a real two-member bundle alone', () => {
    const list = [tx('gbr', ['a'], 's1'), tx('implant-only', ['b'], 's1')];
    expect(pruneSessions(list)).toBe(list);
  });
  it('returns the same array reference when nothing changed, so the parent is not re-notified', () => {
    const list = [tx('gbr', ['a'])];
    expect(pruneSessions(list)).toBe(list);
  });
});

describe('leaveSession', () => {
  it('removing one of two members untags both', () => {
    const list = [tx('gbr', ['a'], 's1'), tx('implant-only', ['b'], 's1')];
    const out = leaveSession(list, txRef(list[0]));
    expect(out.every((t) => !t.session)).toBe(true);
  });
  it('removing one of three leaves the other two bundled', () => {
    const list = [tx('gbr', ['a'], 's1'), tx('implant-only', ['b'], 's1'), tx('implant-crown', ['c'], 's1')];
    const out = leaveSession(list, txRef(list[0]));
    expect(out.map((t) => t.session)).toEqual([undefined, 's1', 's1']);
  });
});

describe('the bundleable id lists', () => {
  it('covers every treatment that starts its own session, plus the implant bridge', () => {
    expect(MEDISAVE_BUNDLE_IDS).toEqual([...SESSION_SPLIT_IDS, 'implant-bridge-span']);
  });
  it('excludes exactly the two treatments that merge their targets', () => {
    expect(MEDISAVE_MERGE_IDS).toEqual(['sinus-lift', 'alveolectomy']);
    expect(MEDISAVE_MERGE_IDS.some(isBundleable)).toBe(false);
  });
});
