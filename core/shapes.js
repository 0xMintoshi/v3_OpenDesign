// Converts normalized shape JSON to SVG path d string.
// Segment coords: x = rawX/w, y = rawY/h. At render: actual = norm * w or h.
export function shapeToPath(shape, w, h) {
  return shape.segments.map(seg => {
    switch (seg.type) {
      case 'M': return `M ${f(seg.x * w)} ${f(seg.y * h)}`;
      case 'L': return `L ${f(seg.x * w)} ${f(seg.y * h)}`;
      case 'C': return `C ${f(seg.x1*w)} ${f(seg.y1*h)} ${f(seg.x2*w)} ${f(seg.y2*h)} ${f(seg.x*w)} ${f(seg.y*h)}`;
      case 'Q': return `Q ${f(seg.x1*w)} ${f(seg.y1*h)} ${f(seg.x*w)} ${f(seg.y*h)}`;
      case 'Z': return 'Z';
      default:  return '';
    }
  }).filter(Boolean).join(' ');
}

function f(n) { return n.toFixed(2); }
