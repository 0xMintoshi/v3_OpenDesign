import { describe, it, expect } from 'vitest';
import { getTheme, THEMES } from './themes.js';

describe('themes', () => {
  it('returns default theme for unknown slug', () => {
    const t = getTheme('unknown-clinic');
    expect(t.slug).toBe('default');
    expect(t.vars).toHaveProperty('--clinic-accent');
  });

  it('returns titan theme for slug "titan"', () => {
    const t = getTheme('titan');
    expect(t.slug).toBe('titan');
    expect(t.vars['--clinic-accent']).toBeDefined();
  });

  it('THEMES registry contains at least default and titan', () => {
    expect(THEMES.default).toBeDefined();
    expect(THEMES.titan).toBeDefined();
  });
});
