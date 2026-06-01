// Pure helpers for marquee (drag-to-multi-select) tooth selection.
// No React — usable in both app and tests.

// Per-type vertical nudge, mirroring the logic in app/dental-arch.jsx Tooth component.
export function toothYAdjust(tooth) {
  const { type, h, jaw } = tooth;
  const incisorShift = type === 'incisor' ? h * 0.03 : 0;
  const canineShift  = type === 'canine'  ? h * -0.02 : 0;
  return jaw === 'upper' ? -(incisorShift + canineShift) : (incisorShift + canineShift);
}

// Build axis-aligned bounding boxes for all teeth in SVG viewBox coordinates.
// Returns Map<id, { minX, maxX, minY, maxY, jaw }>.
export function toothBBoxes(teeth, upperBiteY, lowerBiteY) {
  const map = new Map();
  for (const tooth of teeth) {
    const { id, jaw, cx, w, h, yOffset = 0 } = tooth;
    const flipY = jaw === 'upper' ? 1 : -1;
    const biteY = jaw === 'upper' ? upperBiteY : lowerBiteY;
    const centerY = biteY + yOffset * flipY + toothYAdjust(tooth);

    // In local space, outline spans from ~0 (occlusal) to ~-h (root tip).
    // After scale(1, flipY): upper flips so crown goes UP (minY = centerY - h),
    // lower flips so crown goes DOWN (maxY = centerY + h).
    // Add a small 10% margin on the non-root side for the cervical bump.
    const minX = cx - w / 2;
    const maxX = cx + w / 2;
    const minY = jaw === 'upper' ? centerY - h : centerY - h * 0.10;
    const maxY = jaw === 'upper' ? centerY + h * 0.10 : centerY + h;

    map.set(id, { minX, maxX, minY, maxY, jaw });
  }
  return map;
}

export function rectsIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

// Compute the set of teeth hit by the current marquee rect.
// Returns { lockedArch, hits } where:
//   lockedArch — the jaw string that's locked for this drag (null if no tooth hit yet)
//   hits       — array of tooth ids in the locked arch that intersect rect
export function computeMarquee({ bboxes, rect, startPt, lockedArch }) {
  let nextLockedArch = lockedArch;

  if (!nextLockedArch) {
    // Find all intersecting teeth and pick the one nearest to drag start.
    let bestId = null;
    let bestDist = Infinity;
    for (const [id, box] of bboxes) {
      if (!rectsIntersect(box, rect)) continue;
      const cx = (box.minX + box.maxX) / 2;
      const cy = (box.minY + box.maxY) / 2;
      const d = Math.hypot(cx - startPt.x, cy - startPt.y);
      if (d < bestDist) { bestDist = d; bestId = id; }
    }
    if (bestId) nextLockedArch = bboxes.get(bestId).jaw;
  }

  const hits = [];
  if (nextLockedArch) {
    for (const [id, box] of bboxes) {
      if (box.jaw === nextLockedArch && rectsIntersect(box, rect)) hits.push(id);
    }
  }

  return { lockedArch: nextLockedArch, hits };
}
