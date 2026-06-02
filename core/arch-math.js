// Shared arch geometry helpers — used by both app/ and lab/.

// Crown/root boundary per tooth type.
// y: boundary as fraction of h (negative = apical from bite)
// dip: how far the boundary curve sags apically (fraction of h)
export const CERVICAL = {
  incisor:   { y: 0.34, dip: 0.055 },
  canine:    { y: 0.34, dip: 0.062 },
  premolar:  { y: 0.36, dip: 0.065 },
  premolar1: { y: 0.36, dip: 0.065 },
  molarU:    { y: 0.40, dip: 0.072 },
  molarL:    { y: 0.40, dip: 0.072 },
  wisdomU:   { y: 0.46, dip: 0.083 },
  wisdomL:   { y: 0.46, dip: 0.083 },
};

export function crownDepth(type, h) {
  return (CERVICAL[type]?.y ?? 0.34) * h;
}

export function chRatioFor(type) {
  if (type === 'wisdomU' || type === 'wisdomL') return 0.46;
  if (type === 'molarU' || type === 'molarL') return 0.40;
  if (type === 'premolar' || type === 'premolar1') return 0.36;
  return 0.34;
}

export const ARCH_LAYOUT = {
  scale: 2.2,
  biteCenter: 410,
  archGap: 50,
  centerX: 800,   // center of app's 1600-wide viewBox
  gap: 4,         // fallback absolute gap (px); used only when gapFrac is null
  gapFrac: 0.08,  // proportional gap: 8% of each tooth's scaled width → equal visual spacing
  archDepth: 0,   // intentional: live app DEFAULT_TWEAKS.archDepth = 0
};
export const upperBiteY = ARCH_LAYOUT.biteCenter - ARCH_LAYOUT.archGap / 2; // 385
export const lowerBiteY = ARCH_LAYOUT.biteCenter + ARCH_LAYOUT.archGap / 2; // 435

// Cervical (crown–root junction) screen-y for each tooth in the arch.
// Accounts for per-tooth yOffset (arch curvature) and jaw orientation.
export function cervicalPoints(teeth, biteY, jaw) {
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);
  return sorted.map((t) => {
    const ch = t.h * chRatioFor(t.type);
    const yo = t.yOffset || 0;
    const y = jaw === 'upper' ? biteY + yo - ch : biteY - yo + ch;
    return { x: t.cx, y, w: t.w, fdi: t.fdi };
  });
}

// Y of the alveolar crest for the alveolectomy upper far edge: sinus floor level.
// Uses posterior teeth (deepest cervical y among a set) minus the clearance used in buildSinus.
export function sinusFloorY(cervical, clearance = 45) {
  const posterior = cervical.filter((_, i) => i <= 4 || i >= cervical.length - 5);
  const maxCerv = Math.max(...posterior.map(t => t.y));
  return maxCerv - clearance;
}

// Scallop R→L: traces from rightmost tooth to leftmost cervical point.
// peakDir: -1 for upper (dips away from bite = upward), +1 for lower.
export function scallopRL(cervical, peakDir, peakDepth = 4) {
  let s = '';
  for (let i = cervical.length - 2; i >= 0; i--) {
    const p = cervical[i], n = cervical[i + 1];
    const mx = (p.x + n.x) / 2;
    const my = (p.y + n.y) / 2 + peakDir * peakDepth;
    s += `Q ${mx} ${my} ${p.x} ${p.y} `;
  }
  return s;
}

// Scallop L→R: traces from leftmost tooth to rightmost cervical point.
export function scallopLR(cervical, peakDir, peakDepth = 4) {
  let s = '';
  for (let i = 1; i < cervical.length; i++) {
    const p = cervical[i], prev = cervical[i - 1];
    const mx = (prev.x + p.x) / 2;
    const my = (prev.y + p.y) / 2 + peakDir * peakDepth;
    s += `Q ${mx} ${my} ${p.x} ${p.y} `;
  }
  return s;
}
