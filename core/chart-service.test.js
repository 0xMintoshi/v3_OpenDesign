import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./firebase.js', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS'),
}));

import { loadChart, saveChart } from './chart-service.js';
import { getDoc, setDoc, doc } from 'firebase/firestore';

describe('chart-service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loadChart returns null when document does not exist', async () => {
    doc.mockReturnValue('docRef');
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await loadChart('patient-1');
    expect(result).toBeNull();
  });

  it('loadChart returns chart data when document exists', async () => {
    const data = { stage: 'baseline', presence: {}, treatments: [] };
    doc.mockReturnValue('docRef');
    getDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const result = await loadChart('patient-1');
    expect(result).toEqual(data);
  });

  it('saveChart writes stage, presence, treatments', async () => {
    doc.mockReturnValue('docRef');
    setDoc.mockResolvedValue(undefined);
    await saveChart('patient-1', { stage: 'treatment', presence: { '11': 'missing' }, treatments: [] });
    expect(setDoc).toHaveBeenCalledWith(
      'docRef',
      expect.objectContaining({ stage: 'treatment', presence: { '11': 'missing' } }),
      { merge: true }
    );
  });
});
