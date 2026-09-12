/**
 * The operator-defined MediSave procedure — the parts that are pure logic.
 *
 * The panel form and the entry it builds are covered in app/treatment-panel.test.jsx and
 * app/chart-state-sync.test.jsx; this file pins the identity rules underneath them,
 * because every one of them is a silent-data-loss bug when it goes wrong rather than a
 * visible one.
 */
import { describe, it, expect } from 'vitest';
import { txRef, chartTxKey, nextManualUid } from './mv-sessions.js';
import { getConflictingTreatmentIds, isBundleable, MANUAL_MV_ID,
         MEDISAVE_BUNDLE_IDS } from './conflict-rules.js';
import { CPF_TABLE_CODES, isCpfTable } from './cpf-tables.js';

const manual = (uid, table = '2C', targets = ['upper-13']) =>
  ({ id: MANUAL_MV_ID, scope: 'tooth', targets, uid, label: 'Frenectomy', table });

describe('a manual procedure is identified by its uid, not by its teeth', () => {
  it('two manual entries on the SAME tooth get different refs', () => {
    // The panel addresses rows by ref for remove, join and leave. Sharing a ref would
    // send every one of those to whichever entry happened to be found first.
    expect(txRef(manual('m1'))).not.toBe(txRef(manual('m2')));
  });

  it('two manual entries on the same tooth get different bridge keys', () => {
    // The parent pairs summary rows to chart entries by this string, and removing a
    // summary row posts it back. Sharing it would delete the wrong procedure.
    expect(chartTxKey(manual('m1'))).not.toBe(chartTxKey(manual('m2')));
  });

  it('an entry with no uid keeps exactly the ref and key it always had', () => {
    // The additive property. Every saved quote predates uid, so a changed string here
    // would strand every restored chart row on the next edit.
    const plain = { id: 'gbr', scope: 'tooth', targets: ['upper-13', 'upper-11'] };
    expect(txRef(plain)).toBe('gbr::upper-11,upper-13');
    expect(chartTxKey(plain)).toBe('gbr:upper-11,upper-13');
  });

  it('the uid is derived from the list, so a restore cannot collide', () => {
    expect(nextManualUid([])).toBe('m1');
    expect(nextManualUid([manual('m1'), manual('m2')])).toBe('m3');
    // The case a counter gets wrong: restored entries the session never issued.
    expect(nextManualUid([manual('m7')])).toBe('m8');
  });
});

describe('a manual procedure conflicts with nothing', () => {
  it('applying one strips no other treatment, not even another manual one', () => {
    // The default branch returns [txId], which would have stripped the previous manual
    // entry's targets and deleted it. Silent: the operator's typed name goes with it.
    expect(getConflictingTreatmentIds(MANUAL_MV_ID)).toEqual([]);
  });

  it('a catalogue treatment still strips its own group', () => {
    // The guard above must not have loosened the real conflict rules.
    expect(getConflictingTreatmentIds('gbr')).toEqual(['gbr']);
    expect(getConflictingTreatmentIds('implant-only')).toContain('crown');
  });
});

describe('a manual procedure can be bundled, without joining the catalogue list', () => {
  it('is bundleable', () => {
    expect(isBundleable(MANUAL_MV_ID)).toBe(true);
  });

  it('is NOT in MEDISAVE_BUNDLE_IDS', () => {
    // Deliberate. A parent test asserts that list holds only treatments the parent
    // bills as surgical through CHART_TREATMENT_MAP, and a manual entry has no map
    // entry. Adding it here would force that drift guard to be loosened.
    expect(MEDISAVE_BUNDLE_IDS).not.toContain(MANUAL_MV_ID);
  });
});

describe('the CPF table list', () => {
  it('holds the 21 codes from 1A to 7C', () => {
    expect(CPF_TABLE_CODES).toHaveLength(21);
    expect(CPF_TABLE_CODES[0]).toBe('1A');
    expect(CPF_TABLE_CODES[20]).toBe('7C');
  });

  it('rejects anything not on it', () => {
    expect(isCpfTable('2C')).toBe(true);
    expect(isCpfTable('8A')).toBe(false);
    expect(isCpfTable('')).toBe(false);
    expect(isCpfTable(undefined)).toBe(false);
  });
});
