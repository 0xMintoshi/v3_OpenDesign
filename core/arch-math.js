// Shared arch geometry helpers — used by both app/ and lab/.

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
  gap: 4,         // matches layoutArch default; ShapeLab previously used 3 (wrong)
  archDepth: 0,   // intentional: live app DEFAULT_TWEAKS.archDepth = 0
};
export const upperBiteY = ARCH_LAYOUT.biteCenter - ARCH_LAYOUT.archGap / 2; // 385
export const lowerBiteY = ARCH_LAYOUT.biteCenter + ARCH_LAYOUT.archGap / 2; // 435

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
