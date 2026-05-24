import { describe, it, expect } from 'vitest';
import { VISUAL_REGISTRY, registryFor } from './visual-registry.js';

const VALID_SCOPES = new Set(['tooth', 'sinus', 'arch', 'full-mouth']);
const VALID_CATEGORIES = new Set(['tooth', 'span', 'arch', 'full-mouth', 'sinus']);

describe('VISUAL_REGISTRY', () => {
  it('has at least 10 entries', () => {
    expect(Object.keys(VISUAL_REGISTRY).length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has required fields with valid scope and category', () => {
    for (const [id, entry] of Object.entries(VISUAL_REGISTRY)) {
      expect(entry, `${id} missing scope`).toHaveProperty('scope');
      expect(entry, `${id} missing category`).toHaveProperty('category');
      expect(entry, `${id} missing label`).toHaveProperty('label');
      expect(VALID_SCOPES.has(entry.scope), `${id} bad scope: ${entry.scope}`).toBe(true);
      expect(VALID_CATEGORIES.has(entry.category), `${id} bad category: ${entry.category}`).toBe(true);
    }
  });

  it('registryFor returns entry for known id', () => {
    const entry = registryFor('crown');
    expect(entry).toBeDefined();
    expect(entry.scope).toBe('tooth');
    expect(entry.category).toBe('tooth');
  });

  it('registryFor returns null for unknown id', () => {
    expect(registryFor('nonexistent-id-xyz')).toBeNull();
  });

  it('bridge-span entry has scope tooth and category span', () => {
    const entry = registryFor('bridge-span');
    expect(entry).not.toBeNull();
    expect(entry.scope).toBe('tooth');
    expect(entry.category).toBe('span');
    expect(entry.shapeId).toBe('bridge-span');
  });

  it('partial-denture-upper has scope arch', () => {
    const entry = registryFor('partial-denture-upper');
    expect(entry).not.toBeNull();
    expect(entry.scope).toBe('arch');
    expect(entry.category).toBe('arch');
    expect(entry.shapeId).toBe('partial-denture-upper');
  });

  it('partial-denture-lower has scope arch', () => {
    const entry = registryFor('partial-denture-lower');
    expect(entry).not.toBeNull();
    expect(entry.scope).toBe('arch');
    expect(entry.category).toBe('arch');
    expect(entry.shapeId).toBe('partial-denture-lower');
  });

  it('ortho-brackets and ortho-aligners use correct IDs', () => {
    expect(registryFor('ortho-brackets')).not.toBeNull();
    expect(registryFor('ortho-aligners')).not.toBeNull();
    expect(registryFor('ortho')).toBeNull();
    expect(registryFor('aligners')).toBeNull();
  });
});
