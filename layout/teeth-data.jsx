// =========================================================================
// Tooth path generators v2 — outlined anatomical style (modern flat schematic).
// Each tooth returns { outline, cervical } where:
//   - outline: closed silhouette (crown + root, single path)
//   - cervical: open arc that visually separates crown from root
// Origin at biting edge (y=0). Root extends into negative y.
// =========================================================================

const TOOTH_TYPES = {
  central:   { w: 28, h: 88,  type: 'incisor',   name: 'Central Incisor',  roots: 1 },
  lateral:   { w: 24, h: 82,  type: 'incisor',   name: 'Lateral Incisor',  roots: 1 },
  canine:    { w: 26, h: 100, type: 'canine',    name: 'Canine',           roots: 1 },
  premolar1: { w: 26, h: 84,  type: 'premolar1', name: 'First Premolar',   roots: 2 },
  premolar2: { w: 26, h: 82,  type: 'premolar',  name: 'Second Premolar',  roots: 1 },
  molar1:    { w: 38, h: 88,  type: 'molarU',    name: 'First Molar',      roots: 3 },
  molar2:    { w: 36, h: 84,  type: 'molarU',    name: 'Second Molar',     roots: 3 },
  wisdom:    { w: 30, h: 70,  type: 'wisdomU',   name: 'Third Molar',      roots: 2 },
};

const QUADRANT = ['central','lateral','canine','premolar1','premolar2','molar1','molar2','wisdom'];

function buildArch(jaw) {
  const right = [...QUADRANT].reverse();
  const left  = [...QUADRANT];
  const order = [...right, ...left];

  const fdi = jaw === 'upper'
    ? [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
    : [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

  const universal = jaw === 'upper'
    ? [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]
    : [32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17];

  // Lower has slightly different proportions: thinner roots, narrower crowns for incisors.
  const lowerOverrides = {
    central:   { w: 18, h: 80 },
    lateral:   { w: 20, h: 80 },
    canine:    { w: 22, h: 96 },
    premolar1: { w: 22, h: 80, type: 'premolar' },  // lower premolars typically single root
    premolar2: { w: 22, h: 80 },
    molar1:    { w: 36, h: 86, type: 'molarL' },    // lower molars: 2 roots
    molar2:    { w: 34, h: 82, type: 'molarL' },
    wisdom:    { w: 28, h: 66, type: 'wisdomL' },
  };

  return order.map((key, i) => {
    const base = TOOTH_TYPES[key];
    const o = jaw === 'lower' ? (lowerOverrides[key] || {}) : {};
    return {
      key,
      jaw,
      fdi: fdi[i],
      universal: universal[i],
      side: i < 8 ? 'right' : 'left',
      ...base,
      ...o,
      id: `${jaw}-${fdi[i]}`,
    };
  });
}

const UPPER = buildArch('upper');
const LOWER = buildArch('lower');

// Lay teeth out along a subtle arch curve (parabolic).
function layoutArch(arch, centerX, scale, opts = {}) {
  const gap = opts.gap ?? 4;
  const archDepth = opts.archDepth ?? 26;     // how much the back teeth sit further from bite line
  const tiltScale = opts.tilt ?? 1;

  const widths = arch.map(t => t.w * scale);
  const totalW = widths.reduce((a,b) => a+b, 0) + gap * (arch.length - 1);
  let cursor = centerX - totalW / 2;
  return arch.map((t, i) => {
    const w = widths[i];
    const cx = cursor + w / 2;
    cursor += w + gap;
    const fromCenter = Math.abs(i - 7.5);
    // Outward tilt: incisors straight, back teeth angle outward
    const tiltMag = Math.pow(fromCenter / 7.5, 1.5) * 7 * tiltScale;
    const dir = i < 8 ? -1 : 1;
    const tilt = tiltMag * dir;
    // Subtle arch curve: back teeth pull AWAY from bite line (root further from center)
    const curveOffset = Math.pow(fromCenter / 7.5, 1.8) * archDepth;
    return { ...t, cx, tilt, yOffset: curveOffset };
  });
}

// =========================================================================
// Outline generators — outlined anatomical style
// =========================================================================

function incisorOutline(w, h) {
  return `
    M ${w*0.42} ${-h*0.012}
    C ${w*0.495} ${-h*0.018} ${w*0.505} ${-h*0.12} ${w*0.48} ${-h*0.24}
    C ${w*0.46} ${-h*0.30} ${w*0.42} ${-h*0.33} ${w*0.38} ${-h*0.35}
    C ${w*0.28} ${-h*0.44} ${w*0.18} ${-h*0.60} ${w*0.04} ${-h*0.94}
    C ${w*0.02} ${-h*0.98} ${-w*0.02} ${-h*0.98} ${-w*0.04} ${-h*0.94}
    C ${-w*0.18} ${-h*0.60} ${-w*0.28} ${-h*0.44} ${-w*0.38} ${-h*0.35}
    C ${-w*0.42} ${-h*0.33} ${-w*0.46} ${-h*0.30} ${-w*0.48} ${-h*0.24}
    C ${-w*0.505} ${-h*0.12} ${-w*0.495} ${-h*0.018} ${-w*0.42} ${-h*0.012}
    C ${-w*0.16} ${-h*0.008} ${w*0.16} ${-h*0.008} ${w*0.42} ${-h*0.012}
    Z
  `;
}

function incisorCervical(w, h) {
  const ny = -h * 0.34;
  return `M ${-w*0.40} ${ny} Q 0 ${ny - h*0.055} ${w*0.40} ${ny}`;
}

function canineOutline(w, h) {
  return `
    M ${w*0.42} ${-h*0.012}
    C ${w*0.50} ${-h*0.018} ${w*0.51} ${-h*0.12} ${w*0.49} ${-h*0.25}
    C ${w*0.47} ${-h*0.31} ${w*0.43} ${-h*0.34} ${w*0.39} ${-h*0.36}
    C ${w*0.28} ${-h*0.46} ${w*0.18} ${-h*0.60} ${w*0.04} ${-h*0.94}
    C ${w*0.02} ${-h*0.98} ${-w*0.02} ${-h*0.98} ${-w*0.04} ${-h*0.94}
    C ${-w*0.18} ${-h*0.60} ${-w*0.28} ${-h*0.46} ${-w*0.39} ${-h*0.36}
    C ${-w*0.43} ${-h*0.34} ${-w*0.47} ${-h*0.31} ${-w*0.49} ${-h*0.25}
    C ${-w*0.51} ${-h*0.12} ${-w*0.50} ${-h*0.018} ${-w*0.42} ${-h*0.012}
    C ${-w*0.18} ${-h*0.008} ${w*0.18} ${-h*0.008} ${w*0.42} ${-h*0.012}
    Z
  `;
}

function canineCervical(w, h) {
  const ny = -h * 0.34;
  return `M ${-w*0.40} ${ny} Q 0 ${ny - h*0.062} ${w*0.40} ${ny}`;
}

// Premolar with a single root (lower / 2nd upper).
function premolarOutline(w, h) {
  return `
    M ${w*0.44} ${-h*0.012}
    C ${w*0.51} ${-h*0.02} ${w*0.52} ${-h*0.14} ${w*0.50} ${-h*0.27}
    C ${w*0.48} ${-h*0.32} ${w*0.44} ${-h*0.36} ${w*0.40} ${-h*0.38}
    C ${w*0.30} ${-h*0.46} ${w*0.20} ${-h*0.60} ${w*0.04} ${-h*0.94}
    C ${w*0.02} ${-h*0.98} ${-w*0.02} ${-h*0.98} ${-w*0.04} ${-h*0.94}
    C ${-w*0.20} ${-h*0.60} ${-w*0.30} ${-h*0.46} ${-w*0.40} ${-h*0.38}
    C ${-w*0.44} ${-h*0.36} ${-w*0.48} ${-h*0.32} ${-w*0.50} ${-h*0.27}
    C ${-w*0.52} ${-h*0.14} ${-w*0.51} ${-h*0.02} ${-w*0.44} ${-h*0.012}
    C ${-w*0.20} ${-h*0.009} ${w*0.20} ${-h*0.009} ${w*0.44} ${-h*0.012}
    Z
  `;
}

// Premolar with bifurcated root (1st upper premolar).
function premolarBifurcOutline(w, h) {
  return `
    M ${w*0.44} ${-h*0.012}
    C ${w*0.51} ${-h*0.02} ${w*0.52} ${-h*0.14} ${w*0.50} ${-h*0.27}
    C ${w*0.48} ${-h*0.32} ${w*0.44} ${-h*0.36} ${w*0.40} ${-h*0.38}
    C ${w*0.32} ${-h*0.46} ${w*0.28} ${-h*0.54} ${w*0.22} ${-h*0.80}
    C ${w*0.18} ${-h*0.94} ${w*0.12} ${-h*0.94} ${w*0.10} ${-h*0.80}
    C ${w*0.08} ${-h*0.68} ${w*0.04} ${-h*0.60} ${0} ${-h*0.58}
    C ${-w*0.04} ${-h*0.60} ${-w*0.08} ${-h*0.68} ${-w*0.10} ${-h*0.80}
    C ${-w*0.12} ${-h*0.94} ${-w*0.18} ${-h*0.94} ${-w*0.22} ${-h*0.80}
    C ${-w*0.28} ${-h*0.54} ${-w*0.32} ${-h*0.46} ${-w*0.40} ${-h*0.38}
    C ${-w*0.44} ${-h*0.36} ${-w*0.48} ${-h*0.32} ${-w*0.50} ${-h*0.27}
    C ${-w*0.52} ${-h*0.14} ${-w*0.51} ${-h*0.02} ${-w*0.44} ${-h*0.012}
    C ${-w*0.20} ${-h*0.009} ${w*0.20} ${-h*0.009} ${w*0.44} ${-h*0.012}
    Z
  `;
}

function premolarCervical(w, h) {
  const ny = -h * 0.36;
  return `M ${-w*0.42} ${ny} Q 0 ${ny - h*0.065} ${w*0.42} ${ny}`;
}

// Upper molar — wisdom-style mesial/distal roots with a palatal root from the furcation.
function molarUOutline(w, h) {
  const ch = h * 0.40;
  const ny = -ch;
  const nw = w * 0.84;
  const furcation = {
    meetY: 0.505,
    innerX: 0.122,
    innerY: 0.695,
    neckX: 0.084,
    neckY: 0.585,
    midX: 0.043,
    midY: 0.770,
    apexX: 0.016,
    apexY: 0.895,
    shoulderX: 0.040,
    shoulderY: 0.535
  };
  return `
    M ${w*0.48} ${-ch*0.02}
    C ${w*0.52} ${-ch*0.4}, ${w*0.52} ${-ch*0.85}, ${nw*0.50} ${ny}
    C ${w*0.40} ${-ch - h*0.10}, ${w*0.34} ${-h*0.5}, ${w*0.24} ${-h*0.86}
    C ${w*0.20} ${-h*0.96}, ${w*0.14} ${-h*0.96}, ${w*0.12} ${-h*0.86}
    C ${w*0.154} ${-h*0.792}, ${w*furcation.innerX} ${-h*furcation.innerY}, ${w*furcation.shoulderX} ${-h*furcation.shoulderY}
    C ${w*0.026} ${-h*(furcation.meetY + 0.012)}, ${w*0.010} ${-h*(furcation.meetY + 0.004)}, 0 ${-h*furcation.meetY}
    C ${w*0.026} ${-h*(furcation.meetY + 0.012)}, ${w*furcation.neckX} ${-h*furcation.neckY}, ${w*(furcation.neckX * 0.88)} ${-h*(furcation.neckY + 0.070)}
    C ${w*furcation.midX} ${-h*furcation.midY}, ${w*(furcation.apexX + 0.018)} ${-h*(furcation.apexY - 0.012)}, ${w*furcation.apexX} ${-h*furcation.apexY}
    C ${w*(furcation.apexX * 0.36)} ${-h*(furcation.apexY + 0.018)}, ${-w*(furcation.apexX * 0.36)} ${-h*(furcation.apexY + 0.018)}, ${-w*furcation.apexX} ${-h*furcation.apexY}
    C ${-w*(furcation.apexX + 0.018)} ${-h*(furcation.apexY - 0.012)}, ${-w*furcation.midX} ${-h*furcation.midY}, ${-w*(furcation.neckX * 0.88)} ${-h*(furcation.neckY + 0.070)}
    C ${-w*furcation.neckX} ${-h*furcation.neckY}, ${-w*0.026} ${-h*(furcation.meetY + 0.012)}, 0 ${-h*furcation.meetY}
    C ${-w*0.010} ${-h*(furcation.meetY + 0.004)}, ${-w*0.026} ${-h*(furcation.meetY + 0.012)}, ${-w*furcation.shoulderX} ${-h*furcation.shoulderY}
    C ${-w*furcation.innerX} ${-h*furcation.innerY}, ${-w*0.154} ${-h*0.792}, ${-w*0.12} ${-h*0.86}
    C ${-w*0.14} ${-h*0.96}, ${-w*0.20} ${-h*0.96}, ${-w*0.24} ${-h*0.86}
    C ${-w*0.34} ${-h*0.5}, ${-w*0.40} ${-ch - h*0.10}, ${-nw*0.50} ${ny}
    C ${-w*0.52} ${-ch*0.85}, ${-w*0.52} ${-ch*0.4}, ${-w*0.48} ${-ch*0.02}
    C ${-w*0.10} ${ch*0.18} ${w*0.10} ${ch*0.18} ${w*0.48} ${-ch*0.02}
    Z
  `;
}

// Lower molar — 2 diverging roots (mesial + distal).
function molarLOutline(w, h) {
  const ch = h * 0.40;
  const ny = -ch;
  const nw = w * 0.86;
  return `
    M ${w*0.48} ${-ch*0.02}
    C ${w*0.54} ${-ch*0.4}, ${w*0.52} ${-ch*0.85}, ${nw*0.50} ${ny}
    C ${w*0.46} ${-ch - h*0.10}, ${w*0.46} ${-h*0.5}, ${w*0.38} ${-h*0.85}
    C ${w*0.32} ${-h*1.0}, ${w*0.24} ${-h*1.0}, ${w*0.22} ${-h*0.98}
    C ${w*0.18} ${-h*0.92}, ${w*0.16} ${-h*0.75}, ${w*0.14} ${-h*0.60}
    C ${w*0.10} ${-h*0.50}, ${w*0.06} ${-h*0.50}, 0 ${-h*0.50}
    C ${-w*0.06} ${-h*0.50}, ${-w*0.10} ${-h*0.50}, ${-w*0.14} ${-h*0.60}
    C ${-w*0.16} ${-h*0.75}, ${-w*0.18} ${-h*0.92}, ${-w*0.22} ${-h*0.98}
    C ${-w*0.24} ${-h*1.0}, ${-w*0.32} ${-h*1.0}, ${-w*0.38} ${-h*0.85}
    C ${-w*0.46} ${-h*0.5}, ${-w*0.46} ${-ch - h*0.10}, ${-nw*0.50} ${ny}
    C ${-w*0.52} ${-ch*0.85}, ${-w*0.54} ${-ch*0.4}, ${-w*0.48} ${-ch*0.02}
    C ${-w*0.10} ${ch*0.18} ${w*0.10} ${ch*0.18} ${w*0.48} ${-ch*0.02}
    Z
  `;
}

function molarCervical(w, h) {
  const ch = h * 0.40;
  const ny = -ch;
  const nw = w * 0.84;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

// Upper wisdom — small, slightly twisted roots (2-3).
// Crown corners rounded with r≈0.10 cubic Bézier fillets (de Casteljau split).
function wisdomUOutline(w, h) {
  return `
    M ${w*0.161} ${-h*0.014}
    C ${w*0.405} ${-h*0.018} ${w*0.487} ${-h*0.053} ${w*0.496} ${-h*0.108}
    C ${w*0.51} ${-h*0.214} ${w*0.509} ${-h*0.316} ${w*0.485} ${-h*0.384}
    C ${w*0.449} ${-h*0.426} ${w*0.398} ${-h*0.499} ${w*0.371} ${-h*0.547}
    C ${w*0.34} ${-h*0.587} ${w*0.297} ${-h*0.656} ${w*0.24} ${-h*0.86}
    C ${w*0.2} ${-h*0.96} ${w*0.14} ${-h*0.96} ${w*0.12} ${-h*0.86}
    C ${w*0.1} ${-h*0.74} ${w*0.06} ${-h*0.62} 0 ${-h*0.6}
    C ${-w*0.06} ${-h*0.62} ${-w*0.1} ${-h*0.74} ${-w*0.12} ${-h*0.86}
    C ${-w*0.14} ${-h*0.96} ${-w*0.2} ${-h*0.96} ${-w*0.24} ${-h*0.86}
    C ${-w*0.296} ${-h*0.656} ${-w*0.34} ${-h*0.587} ${-w*0.371} ${-h*0.547}
    C ${-w*0.398} ${-h*0.499} ${-w*0.449} ${-h*0.426} ${-w*0.485} ${-h*0.384}
    C ${-w*0.509} ${-h*0.316} ${-w*0.51} ${-h*0.214} ${-w*0.496} ${-h*0.108}
    C ${-w*0.487} ${-h*0.053} ${-w*0.423} ${-h*0.02} ${-w*0.223} ${-h*0.014}
    C ${w*0.017} ${-h*0.009} ${w*0.263} ${-h*0.017} ${w*0.014} ${-h*0.01}
    C ${w*0.014} ${-h*0.01} ${-w*0.368} ${-h*0.016} ${w*0.014} ${-h*0.01}
    Z
  `;
}

// Lower wisdom — 2 small curved roots.
function wisdomLOutline(w, h) {
  const ch = h * 0.46;
  const ny = -ch;
  const nw = w * 0.86;
  return `
    M ${w*0.48} ${-ch*0.02}
    C ${w*0.54} ${-ch*0.45}, ${w*0.52} ${-ch*0.92}, ${nw*0.50} ${ny}
    C ${w*0.44} ${-ch - h*0.10}, ${w*0.40} ${-h*0.55}, ${w*0.30} ${-h*0.86}
    C ${w*0.24} ${-h*0.96}, ${w*0.16} ${-h*0.96}, ${w*0.14} ${-h*0.86}
    C ${w*0.10} ${-h*0.65}, ${w*0.04} ${-h*0.55}, 0 ${-h*0.55}
    C ${-w*0.04} ${-h*0.55}, ${-w*0.10} ${-h*0.65}, ${-w*0.14} ${-h*0.86}
    C ${-w*0.16} ${-h*0.96}, ${-w*0.24} ${-h*0.96}, ${-w*0.30} ${-h*0.86}
    C ${-w*0.40} ${-h*0.55}, ${-w*0.44} ${-ch - h*0.10}, ${-nw*0.50} ${ny}
    C ${-w*0.52} ${-ch*0.92}, ${-w*0.54} ${-ch*0.45}, ${-w*0.48} ${-ch*0.02}
    C ${-w*0.10} ${ch*0.18} ${w*0.10} ${ch*0.18} ${w*0.48} ${-ch*0.02}
    Z
  `;
}

function wisdomCervical(w, h) {
  const ch = h * 0.46;
  const ny = -ch;
  const nw = w * 0.84;
  return `M ${-nw*0.48} ${ny} Q 0 ${ny - ch*0.18} ${nw*0.48} ${ny}`;
}

function toothPaths(type, w, h) {
  switch (type) {
    case 'incisor':   return { outline: incisorOutline(w, h),       cervical: incisorCervical(w, h) };
    case 'canine':    return { outline: canineOutline(w, h),        cervical: canineCervical(w, h) };
    case 'premolar':  return { outline: premolarOutline(w, h),      cervical: premolarCervical(w, h) };
    case 'premolar1': return { outline: premolarBifurcOutline(w, h),cervical: premolarCervical(w, h) };
    case 'molarU':    return { outline: molarUOutline(w, h),        cervical: molarCervical(w, h) };
    case 'molarL':    return { outline: molarLOutline(w, h),        cervical: molarCervical(w, h) };
    case 'wisdomU':   return { outline: wisdomUOutline(w, h),       cervical: wisdomCervical(w, h) };
    case 'wisdomL':   return { outline: wisdomLOutline(w, h),       cervical: wisdomCervical(w, h) };
    default:          return { outline: incisorOutline(w, h),       cervical: incisorCervical(w, h) };
  }
}

Object.assign(window, {
  TOOTH_TYPES, QUADRANT, UPPER, LOWER, layoutArch, toothPaths,
});

export { TOOTH_TYPES, QUADRANT, UPPER, LOWER, layoutArch, toothPaths };
