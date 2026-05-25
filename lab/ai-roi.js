// AI-assisted ROI segmentation for cluttered dental images (X-rays, photos).
// Calls Claude vision API (haiku-4-5) to return an approximate tooth outline
// as a polygon of (x, y) percentages. That polygon is then used as a canvas
// mask before potrace runs — not as the final shape points.
//
// Requires VITE_ANTHROPIC_API_KEY in .env.local.
// Calling the API directly from the browser is intentional (lab tool, not public).

const MODEL = 'claude-haiku-4-5-20251001';

const ROI_PROMPT =
  'You are analyzing a dental image (X-ray, intraoral photo, or clinical diagram). ' +
  'Identify the primary or most prominent tooth visible. ' +
  'Return its approximate outline as a JSON array of {x, y} objects ' +
  'where x and y are percentages (0–100) relative to the image width and height respectively, ' +
  'ordered clockwise starting from the topmost point. ' +
  'Use 8–16 points for adequate coverage. ' +
  'Return ONLY the raw JSON array — no markdown fences, no explanation, no other text. ' +
  'Example: [{"x":30,"y":10},{"x":70,"y":12},{"x":75,"y":85},{"x":25,"y":88}]';

/**
 * Call Claude vision API with a data-URL image.
 * Returns a polygon as Array<{x: number, y: number}> where x/y are percentages (0–100).
 *
 * @param {string} imageDataUrl  — e.g. "data:image/png;base64,..."
 * @returns {Promise<Array<{x: number, y: number}>>}
 */
export async function fetchAiRoi(imageDataUrl) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.'
    );
  }

  const commaIdx = imageDataUrl.indexOf(',');
  if (commaIdx === -1) throw new Error('Invalid image data URL');
  const header   = imageDataUrl.slice(0, commaIdx);
  const base64   = imageDataUrl.slice(commaIdx + 1);
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            { type: 'text', text: ROI_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const text  = data.content?.[0]?.text ?? '';

  // Strip any accidental markdown fences
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    throw new Error(`Could not parse polygon from response: "${text.slice(0, 200)}"`);
  }

  let polygon;
  try {
    polygon = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON in response: "${jsonMatch[0].slice(0, 200)}"`);
  }

  if (!Array.isArray(polygon) || polygon.length < 3) {
    throw new Error(`Polygon must have at least 3 points, got: ${JSON.stringify(polygon)}`);
  }

  // Validate and clamp all points
  return polygon.map(({ x, y }, i) => {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error(`Point ${i} is not numeric: ${JSON.stringify({ x, y })}`);
    }
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  });
}
