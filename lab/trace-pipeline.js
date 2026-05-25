// Shared tracing pipeline: image preprocessing + SVG path parsing + coordinate normalization.
// Works in both browser (ImageImport.jsx) and Node CLI (scripts/trace-image.mjs).

const MAX_SIDE_PX = 1024;

/**
 * Downsample and draw an ImageBitmap/HTMLImageElement onto canvas.
 * Constrains longest edge to MAX_SIDE_PX.
 * Returns the canvas (possibly resized).
 */
export function drawToCanvas(img, canvas) {
  let w = img.naturalWidth ?? img.width;
  let h = img.naturalHeight ?? img.height;
  if (Math.max(w, h) > MAX_SIDE_PX) {
    if (w >= h) { h = Math.round((h / w) * MAX_SIDE_PX); w = MAX_SIDE_PX; }
    else        { w = Math.round((w / h) * MAX_SIDE_PX); h = MAX_SIDE_PX; }
  }
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * Apply grayscale + threshold in-place to a canvas.
 * threshold: 0.0–1.0. Pixels below threshold*255 luminance → black, above → white.
 * invert: flip black/white.
 */
export function applyThreshold(canvas, threshold, invert) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const cutoff = threshold * 255;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let bit = gray < cutoff ? 0 : 255;
    if (invert) bit = 255 - bit;
    data[i] = data[i + 1] = data[i + 2] = bit;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Parse a potrace SVG output string into our segment format.
 * Potrace outputs absolute M, L, C, Z — no other commands.
 * Returns null if no path found.
 */
export function parseSvgPath(svgString) {
  const dMatch = svgString.match(/\bd="([^"]+)"/);
  if (!dMatch) return null;
  return parseD(dMatch[1]);
}

/**
 * Parse a raw SVG path `d` string into segments.
 * Handles absolute M, L, C, Z (potrace subset).
 */
export function parseD(d) {
  const segments = [];
  // Split on SVG command letters, each chunk = one command + its numbers
  const chunks = d.match(/[MLCZmlcz][^MLCZmlcz]*/g) || [];
  for (const chunk of chunks) {
    const cmd = chunk[0].toUpperCase();
    const nums = chunk.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    switch (cmd) {
      case 'M':
        for (let i = 0; i < nums.length; i += 2)
          segments.push({ type: i === 0 ? 'M' : 'L', x: nums[i], y: nums[i + 1] });
        break;
      case 'L':
        for (let i = 0; i < nums.length; i += 2)
          segments.push({ type: 'L', x: nums[i], y: nums[i + 1] });
        break;
      case 'C':
        for (let i = 0; i < nums.length; i += 6)
          segments.push({ type: 'C', x1: nums[i], y1: nums[i + 1], x2: nums[i + 2], y2: nums[i + 3], x: nums[i + 4], y: nums[i + 5] });
        break;
      case 'Z':
        segments.push({ type: 'Z' });
        break;
    }
  }
  return segments.length > 0 ? segments : null;
}

/**
 * Normalize segment pixel coords to [0,1] relative to imgW × imgH.
 * Result is directly usable as shape.segments.
 */
export function normalizeSegments(segments, imgW, imgH) {
  return segments.map(seg => {
    if (seg.type === 'Z') return { type: 'Z' };
    const n = { type: seg.type };
    if (seg.x  !== undefined) { n.x  = r(seg.x  / imgW); n.y  = r(seg.y  / imgH); }
    if (seg.x1 !== undefined) { n.x1 = r(seg.x1 / imgW); n.y1 = r(seg.y1 / imgH); }
    if (seg.x2 !== undefined) { n.x2 = r(seg.x2 / imgW); n.y2 = r(seg.y2 / imgH); }
    return n;
  });
}

/**
 * Rescale normalized segments so the bounding box fills [0,1]×[0,1].
 * Preserves aspect ratio — shorter axis is centered.
 */
export function fitToBoundingBox(segments) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const seg of segments) {
    if (seg.x  !== undefined) { minX = Math.min(minX, seg.x);  maxX = Math.max(maxX, seg.x);  minY = Math.min(minY, seg.y);  maxY = Math.max(maxY, seg.y); }
    if (seg.x1 !== undefined) { minX = Math.min(minX, seg.x1); maxX = Math.max(maxX, seg.x1); minY = Math.min(minY, seg.y1); maxY = Math.max(maxY, seg.y1); }
    if (seg.x2 !== undefined) { minX = Math.min(minX, seg.x2); maxX = Math.max(maxX, seg.x2); minY = Math.min(minY, seg.y2); maxY = Math.max(maxY, seg.y2); }
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min(1 / rangeX, 1 / rangeY);
  const offX = (1 - rangeX * scale) / 2 - minX * scale;
  const offY = (1 - rangeY * scale) / 2 - minY * scale;
  return segments.map(seg => {
    if (seg.type === 'Z') return { type: 'Z' };
    const n = { type: seg.type };
    if (seg.x  !== undefined) { n.x  = r(seg.x  * scale + offX); n.y  = r(seg.y  * scale + offY); }
    if (seg.x1 !== undefined) { n.x1 = r(seg.x1 * scale + offX); n.y1 = r(seg.y1 * scale + offY); }
    if (seg.x2 !== undefined) { n.x2 = r(seg.x2 * scale + offX); n.y2 = r(seg.y2 * scale + offY); }
    return n;
  });
}

function r(n) { return Math.round(n * 1000) / 1000; }
