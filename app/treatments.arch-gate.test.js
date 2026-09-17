import { describe, it, expect } from 'vitest';
import { ARCH_GROUPS } from './treatments.jsx';
import { isBundleable } from '../core/conflict-rules.js';

/*
 * Which arch treatments are gated on an edentulous arch.
 *
 * `isAvailable` in the popover reads `item.requires`, so this data IS the gate —
 * there is no other check. The test pins the clinical rule rather than the render:
 * an alveolectomy is performed on arches that still carry teeth, a complete denture
 * is not. The gate was wrong for alveolectomy until 2026-09-17.
 *
 * It does NOT prove the popover renders correctly; that was confirmed in the browser.
 */
const archItems = ARCH_GROUPS.filter((g) => g.scope === 'arch').flatMap((g) => g.items);
const byId = (id) => archItems.find((i) => i.id === id);

describe('arch treatment availability gates', () => {
  it('alveolectomy is NOT gated on an edentulous arch', () => {
    expect(byId('alveolectomy')).toBeDefined();
    expect(byId('alveolectomy').requires).toBeUndefined();
  });

  it('complete denture IS still gated on an edentulous arch', () => {
    expect(byId('complete-denture').requires).toBe('edentulous-arch');
  });

  it('offers the both-arches tile for exactly the bundleable arch items', () => {
    // The popover gates that second tile on isBundleable, not on a named id.
    expect(archItems.filter((i) => isBundleable(i.id)).map((i) => i.id)).toEqual(['alveolectomy']);
  });
});
