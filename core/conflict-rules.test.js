import { describe, it, expect } from 'vitest';
import { getConflictingTreatmentIds } from './conflict-rules.js';

describe('getConflictingTreatmentIds', () => {
  it('implant-bridge-span conflicts with all implant-* and natural group', () => {
    const result = getConflictingTreatmentIds('implant-bridge-span');
    expect(result).toContain('implant-only');
    expect(result).toContain('implant-crown');
    expect(result).toContain('implant-bridge-span');
    expect(result).toContain('crown');
    expect(result).toContain('bridge-span');
  });

  it('implant-crown conflicts with all implant-* and natural group', () => {
    const result = getConflictingTreatmentIds('implant-crown');
    expect(result).toContain('implant-only');
    expect(result).toContain('implant-crown');
    expect(result).toContain('implant-bridge-span');
    expect(result).toContain('crown');
    expect(result).toContain('bridge-span');
  });

  it('implant-only conflicts with all implant-* and natural group', () => {
    const result = getConflictingTreatmentIds('implant-only');
    expect(result).toContain('implant-only');
    expect(result).toContain('crown');
    expect(result).toContain('bridge-span');
  });

  it('crown strips implant group', () => {
    const result = getConflictingTreatmentIds('crown');
    expect(result).toContain('implant-only');
    expect(result).toContain('implant-crown');
    expect(result).toContain('implant-bridge-span');
    expect(result).toContain('crown');
    expect(result).toContain('bridge-span');
  });

  it('bridge-span strips implant group', () => {
    const result = getConflictingTreatmentIds('bridge-span');
    expect(result).toContain('implant-bridge-span');
    expect(result).toContain('implant-crown');
  });

  it('extraction returns only itself', () => {
    const result = getConflictingTreatmentIds('extraction');
    expect(result).toEqual(['extraction']);
  });

  it('gbr returns only itself', () => {
    const result = getConflictingTreatmentIds('gbr');
    expect(result).toEqual(['gbr']);
  });

  it('socket-preservation returns only itself', () => {
    const result = getConflictingTreatmentIds('socket-preservation');
    expect(result).toEqual(['socket-preservation']);
  });
});
