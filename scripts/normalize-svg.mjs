import { readFileSync } from 'fs';

// Parse absolute-coord SVG path d string into segment objects.
// Handles M, L, C, Q, Z. Inkscape Plain SVG exports absolute coords by default.
export function parseSVGPath(d) {
  const segments = [];
  for (const match of d.matchAll(/([MLCQZ])\s*([\d\s,.-]*)/gi)) {
    const cmd = match[1].toUpperCase();
    const nums = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === 'M') {
      segments.push({ type: 'M', x: nums[0], y: nums[1] });
    } else if (cmd === 'L') {
      segments.push({ type: 'L', x: nums[0], y: nums[1] });
    } else if (cmd === 'C') {
      for (let i = 0; i + 5 < nums.length; i += 6)
        segments.push({ type: 'C', x1: nums[i], y1: nums[i+1], x2: nums[i+2], y2: nums[i+3], x: nums[i+4], y: nums[i+5] });
    } else if (cmd === 'Q') {
      for (let i = 0; i + 3 < nums.length; i += 4)
        segments.push({ type: 'Q', x1: nums[i], y1: nums[i+1], x: nums[i+2], y: nums[i+3] });
    } else if (cmd === 'Z') {
      segments.push({ type: 'Z' });
    }
  }
  return segments;
}

// Divide all x coords by w, all y coords by h. Rounds to 3 decimal places.
export function normalizePath(segments, w, h) {
  return segments.map(seg => {
    if (seg.type === 'Z') return seg;
    const n = { type: seg.type };
    if (seg.x  !== undefined) { n.x  = r(seg.x  / w); n.y  = r(seg.y  / h); }
    if (seg.x1 !== undefined) { n.x1 = r(seg.x1 / w); n.y1 = r(seg.y1 / h); }
    if (seg.x2 !== undefined) { n.x2 = r(seg.x2 / w); n.y2 = r(seg.y2 / h); }
    return n;
  });
}

function r(n) { return Math.round(n * 1000) / 1000; }

// CLI: node scripts/normalize-svg.mjs <svgfile> <width> <height> [<shape-id>]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const [,, file, w, h, id] = process.argv;
  if (!file || !w || !h) {
    console.error('Usage: node scripts/normalize-svg.mjs <svgfile> <width> <height> [<shape-id>]');
    process.exit(1);
  }
  const svg = readFileSync(file, 'utf-8');
  const dMatch = svg.match(/ d="([^"]+)"/);
  if (!dMatch) { console.error('No path d="..." found in SVG.'); process.exit(1); }
  const segments = normalizePath(parseSVGPath(dMatch[1]), Number(w), Number(h));
  console.log(JSON.stringify({
    id: id ?? 'shape',
    label: id ?? 'Shape',
    version: 1,
    segments,
  }, null, 2));
}
