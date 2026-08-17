import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Guard: the tuning workflow reads these values by name. Renaming or inlining a
// constant silently breaks `npm run stroke-table`, so fail loudly here instead.
describe('stroke-table', () => {
  it('resolves every tunable to a number', () => {
    const out = execFileSync(process.execPath, [path.join(HERE, 'stroke-table.mjs'), '--json'], {
      encoding: 'utf8',
    });
    const rows = JSON.parse(out);
    expect(rows).toHaveLength(8);
    for (const r of rows) {
      expect(Number.isFinite(r.value), `${r.name} in ${r.file}`).toBe(true);
      expect(r.line).toBeGreaterThan(0);
    }
  });
});
