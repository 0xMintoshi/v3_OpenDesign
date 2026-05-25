/**
 * Pure function — no React imports.
 *
 * Mirror the source side of a closed path onto the dest side.
 * sourceSide: 'left' | 'right'
 * centerX: the axis of symmetry (default 0.5 for normalised coords)
 *
 * Strategy:
 *   - Seam anchors (x === centerX) are kept as-is; not mirrored.
 *   - Source anchors (x strictly on the source side) are mirrored and reversed
 *     for consistent winding; C handles are swapped after reversal.
 *   - Dest anchors (x strictly on the dest side) are dropped.
 *   - M and Z are always kept.
 *   - Mirrored segs are inserted at the position of the first dropped dest seg
 *     in the original path — this preserves correct path topology whether dest
 *     is interleaved, split, or contiguous.
 */
export function mirrorSegments(segs, sourceSide, centerX = 0.5) {
  const eps = 1e-6;
  const mx = x => Math.round((2 * centerX - x) * 1e3) / 1e3;
  const isSeam   = s => s.x !== undefined && Math.abs(s.x - centerX) < eps;
  const isSource = s =>
    s.type !== 'Z' && s.x !== undefined && !isSeam(s) &&
    (sourceSide === 'right' ? s.x > centerX : s.x < centerX);
  const isKept = s =>
    s.type === 'M' || s.type === 'Z' || s.x === undefined || isSeam(s) || isSource(s);

  const sourceSegs = segs.filter(isSource);
  if (!sourceSegs.length) return segs;

  // Mirror x coords of each source segment.
  const mirrored = sourceSegs.map(s => {
    const n = { type: s.type, x: mx(s.x), y: s.y };
    if (s.x1 !== undefined) { n.x1 = mx(s.x1); n.y1 = s.y1; }
    if (s.x2 !== undefined) { n.x2 = mx(s.x2); n.y2 = s.y2; }
    return n;
  });

  // Reverse for consistent winding; swap C handles after reversal
  // (near-start and near-end handles exchange roles when direction flips).
  const reversed = [...mirrored].reverse().map(s =>
    s.type === 'C'
      ? { ...s, x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1 }
      : s
  );

  const kept = segs.filter(isKept);

  // Insert at the position of the first dropped dest seg in the original path.
  // Count how many kept segs appear before that position.
  const firstDestOrigIdx = segs.findIndex(s => !isKept(s));
  const insertAt = firstDestOrigIdx === -1
    ? kept.length - 1  // no dest: insert before Z
    : segs.slice(0, firstDestOrigIdx).filter(isKept).length;

  return [
    ...kept.slice(0, insertAt),
    ...reversed,
    ...kept.slice(insertAt),
  ];
}
