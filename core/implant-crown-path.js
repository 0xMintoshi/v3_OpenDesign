// Crown height ratio relative to tooth height, by tooth class.
export function fittedImplantCrownRatio(type) {
  if (type === 'wisdomU' || type === 'wisdomL') return 0.46;
  if (type === 'molarU' || type === 'molarL') return 0.40;
  if (type === 'premolar' || type === 'premolar1') return 0.36;
  return 0.34;
}

// Fitted implant crown outline path in tooth-local space (cx=0, occlusal upward).
// crownH = tooth.h * fittedImplantCrownRatio(tooth.type)
export function fittedImplantCrownPath(tooth, crownH) {
  const w = tooth.w;
  const half = w * 0.50;
  const shoulder = w * 0.43;
  const top = w * 0.30;
  const bottomX = half * 0.82;
  const bottomY = 1.5;
  const bottomBulge = crownH * 0.055;
  const y1 = -crownH;

  return `M 0 ${bottomBulge}
    C ${-w * 0.26} ${bottomBulge + 1.2}, ${-bottomX * 0.94} ${bottomY + 1.0}, ${-bottomX} ${bottomY}
    C ${-half * 0.99} ${-crownH * 0.07}, ${-half * 0.99} ${-crownH * 0.17}, ${-half * 0.96} ${-crownH * 0.30}
    C ${-half * 0.92} ${-crownH * 0.47}, ${-shoulder * 1.03} ${-crownH * 0.70}, ${-top} ${y1 + crownH * 0.05}
    C ${-w * 0.22} ${y1 - crownH * 0.06}, ${-w * 0.08} ${y1 - crownH * 0.08}, 0 ${y1 - crownH * 0.05}
    C ${w * 0.08} ${y1 - crownH * 0.08}, ${w * 0.22} ${y1 - crownH * 0.06}, ${top} ${y1 + crownH * 0.05}
    C ${shoulder * 1.03} ${-crownH * 0.70}, ${half * 0.92} ${-crownH * 0.47}, ${half * 0.96} ${-crownH * 0.30}
    C ${half * 0.99} ${-crownH * 0.17}, ${half * 0.99} ${-crownH * 0.07}, ${bottomX} ${bottomY}
    C ${bottomX * 0.94} ${bottomY + 1.0}, ${w * 0.26} ${bottomBulge + 1.2}, 0 ${bottomBulge} Z`;
}
