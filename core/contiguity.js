// Returns true if selectedIds form a contiguous run (no present teeth between
// leftmost and rightmost selected) within the sorted arch.
// allTeeth: full array of tooth objects with { id, cx, jaw, presence }
export function areContiguous(selectedIds, allTeeth) {
  const selected = allTeeth.filter(t => selectedIds.includes(t.id));
  if (selected.length < 2) return true;

  const jaw = selected[0].jaw;
  if (selected.some(t => t.jaw !== jaw)) return false;

  const archTeeth = allTeeth.filter(t => t.jaw === jaw).sort((a, b) => a.cx - b.cx);
  const idxs = selected.map(t => archTeeth.findIndex(a => a.id === t.id));
  const minIdx = Math.min(...idxs);
  const maxIdx = Math.max(...idxs);

  for (let i = minIdx; i <= maxIdx; i++) {
    const t = archTeeth[i];
    if (!selectedIds.includes(t.id) && t.presence !== 'missing' && t.presence !== 'extracted' && t.presence !== 'implant') {
      return false;
    }
  }
  return true;
}
