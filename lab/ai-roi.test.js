import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── fetchAiRoi ────────────────────────────────────────────────────────────────
// ai-roi.js reads import.meta.env.VITE_ANTHROPIC_API_KEY at call time,
// so we stub it via vi.stubEnv before importing.

describe('fetchAiRoi', () => {
  let fetchAiRoi;

  beforeEach(async () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key-123');
    // Re-import each test so env stub is picked up
    vi.resetModules();
    ({ fetchAiRoi } = await import('./ai-roi.js'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('throws when API key is not set', async () => {
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');
    vi.resetModules();
    const { fetchAiRoi: fn } = await import('./ai-roi.js');
    await expect(fn('data:image/png;base64,abc')).rejects.toThrow('VITE_ANTHROPIC_API_KEY');
  });

  it('throws on invalid data URL', async () => {
    await expect(fetchAiRoi('not-a-data-url')).rejects.toThrow('Invalid image data URL');
  });

  it('parses a clean polygon response from the API', async () => {
    const polygon = [{ x: 30, y: 10 }, { x: 70, y: 10 }, { x: 70, y: 90 }, { x: 30, y: 90 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(polygon) }],
      }),
    });

    const result = await fetchAiRoi('data:image/png;base64,iVBORw==');
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ x: 30, y: 10 });
    expect(result[2]).toEqual({ x: 70, y: 90 });
  });

  it('strips markdown fences from model response', async () => {
    const polygon = [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }, { x: 20, y: 80 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '```json\n' + JSON.stringify(polygon) + '\n```' }],
      }),
    });

    const result = await fetchAiRoi('data:image/jpeg;base64,abc123');
    expect(result).toHaveLength(4);
    expect(result[1].x).toBe(80);
  });

  it('clamps out-of-range percentage values', async () => {
    const polygon = [{ x: -10, y: 110 }, { x: 50, y: 50 }, { x: 100, y: 100 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(polygon) }],
      }),
    });

    const result = await fetchAiRoi('data:image/png;base64,abc');
    expect(result[0].x).toBe(0);   // clamped from -10
    expect(result[0].y).toBe(100); // clamped from 110
  });

  it('throws when API returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(fetchAiRoi('data:image/png;base64,abc')).rejects.toThrow('401');
  });

  it('throws when response contains fewer than 3 points', async () => {
    const polygon = [{ x: 10, y: 10 }, { x: 90, y: 10 }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(polygon) }],
      }),
    });

    await expect(fetchAiRoi('data:image/png;base64,abc')).rejects.toThrow('at least 3 points');
  });

  it('throws when response contains no parseable JSON array', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Sorry, I cannot identify a tooth in this image.' }],
      }),
    });

    await expect(fetchAiRoi('data:image/png;base64,abc')).rejects.toThrow('Could not parse polygon');
  });
});

// ── applyPolygonMask ──────────────────────────────────────────────────────────
// Browser-only (uses document.createElement). jsdom canvas 2D is a stub —
// we only verify the function exists and does not throw on a valid polygon.

describe('applyPolygonMask (structural)', () => {
  it('is exported from trace-pipeline.js', async () => {
    const mod = await import('./trace-pipeline.js');
    expect(typeof mod.applyPolygonMask).toBe('function');
  });

  it('does not throw on a valid 4-point polygon with a stub canvas', () => {
    // Minimal canvas stub — enough for the mask logic to run without errors
    const makeCtx = () => ({
      fillStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      stroke: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4 * 4 * 4) })),
      putImageData: vi.fn(),
    });

    const mockMaskCanvas = { width: 0, height: 0, getContext: () => makeCtx() };
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return mockMaskCanvas;
      return origCreate(tag);
    });

    const canvas = { width: 4, height: 4, getContext: () => makeCtx() };
    const polygon = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

    const { applyPolygonMask } = require('./trace-pipeline.js');
    // Should not throw
    expect(() => applyPolygonMask(canvas, polygon)).not.toThrow();

    vi.restoreAllMocks();
  });
});
