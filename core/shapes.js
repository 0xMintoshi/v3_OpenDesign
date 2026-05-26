// Converts normalized shape JSON to SVG path d string.
// Segment coords: x = rawX/w, y = rawY/h. At render: actual = norm * w or h.
export function shapeToPath(shape, w, h) {
  return shape.segments.map(seg => segToStr(seg, w, h)).filter(Boolean).join(' ');
}

// Emits segments [fromIdx..toIdx] as a path string fragment.
// If fromIdx === 0, includes the M; otherwise caller is already positioned.
export function shapeRangeToPath(shape, w, h, fromIdx, toIdx) {
  return shape.segments
    .slice(fromIdx, toIdx + 1)
    .map((seg, i) => {
      // Suppress M when mid-path (fromIdx > 0), replace with L to avoid jump
      if (i === 0 && fromIdx > 0 && seg.type === 'M') return '';
      return segToStr(seg, w, h);
    })
    .filter(Boolean)
    .join(' ');
}

function segToStr(seg, w, h) {
  switch (seg.type) {
    case 'M': return `M ${f(seg.x * w)} ${f(seg.y * h)}`;
    case 'L': return `L ${f(seg.x * w)} ${f(seg.y * h)}`;
    case 'C': return `C ${f(seg.x1*w)} ${f(seg.y1*h)} ${f(seg.x2*w)} ${f(seg.y2*h)} ${f(seg.x*w)} ${f(seg.y*h)}`;
    case 'Q': return `Q ${f(seg.x1*w)} ${f(seg.y1*h)} ${f(seg.x*w)} ${f(seg.y*h)}`;
    case 'Z': return 'Z';
    default:  return '';
  }
}

function f(n) { return n.toFixed(2); }
