import React from 'react';
import {
  ARC_CX, ARC_CY, ARC_RX, ARC_RY,
  arcPoint, fdiToZone, connectorPath,
} from '../core/label-connector.js';

// Zone-based treatment label cards + orthogonal leader lines (SVG-native).
// Extracted from app/treatments.jsx — pure rendering, no catalog knowledge.
// txLabel: { [id]: string } lookup map passed from the app layer.

let _api = null;

export function exportLabelPositions() {
  if (!_api) throw new Error('TreatmentLabels is not mounted');
  return _api.exportLabelPositions();
}

export function setLabelPositions(obj) {
  if (!_api) throw new Error('TreatmentLabels is not mounted');
  return _api.setLabelPositions(obj);
}

export function TreatmentLabels({ treatments, allTeeth, upperBiteY, lowerBiteY, accent,
                          debugGuides = false, debugMirrorAxis = false,
                          onRemoveTooth, onRemoveOther,
                          manualPlacementMode = false, txLabel = {} }) {
  const LABEL_W = 150;

  const DEFAULT_LABEL_POSITIONS = {
    "tooth-upper-17": { "cx": 231.59215898513787, "cy": 155.21578979492188, "locked": true },
    "tooth-upper-16": { "cx": 389.34824157714837, "cy": 98.66664123535156, "locked": true },
    "tooth-upper-18": { "cx": 141.77100402832025, "cy": 243.68623733520508, "locked": true },
    "tooth-upper-14": { "cx": 567.9059326171874, "cy": 16.54902935028076, "locked": true },
    "tooth-upper-15": { "cx": 413.98885864257807, "cy": 15.294124603271484, "locked": true },
    "tooth-upper-13": { "cx": 549.9755456542969, "cy": 99.92150688171387, "locked": true },
    "tooth-upper-12": { "cx": 704.5947497558593, "cy": 118.82353210449219, "locked": true },
    "tooth-upper-11": { "cx": 723.056513671875, "cy": 34.666643142700195, "locked": true },

    "sinus-right": { "cx": 470.66656494140625, "cy": -52.90190887451172, "locked": true },

    "tooth-upper-21": { "cx": 876.943486328125, "cy": 42.470603942871094, "locked": true },
    "tooth-upper-22": { "cx": 894.5177368164061, "cy": 125.92157936096191, "locked": true },
    "tooth-upper-23": { "cx": 1050.7529663085936, "cy": 107.72551727294922, "locked": true },
    "tooth-upper-24": { "cx": 1050.753088378906, "cy": 27.411767959594727, "locked": true },
    "tooth-upper-25": { "cx": 1208.8708251953124, "cy": 28.666690826416016, "locked": true },
    "tooth-upper-26": { "cx": 1235.8512939453124, "cy": 105.84311103820801, "locked": true },
    "tooth-upper-27": { "cx": 1360.9133544921874, "cy": 193.21571350097656, "locked": true },
    "tooth-upper-28": { "cx": 1444.3645263671874, "cy": 283.5686721801758, "locked": true },

    "sinus-left": { "cx": 1129.3334350585938, "cy": -52.90190887451172, "locked": true },

    "arch-upper": { "cx": 1509.6471557617188, "cy": 353.6470413208008, "locked": true },
    "arch-lower": { "cx": 1509.6469116210938, "cy": 459.56858825683594, "locked": true },
    "full-mouth": { "cx": 1449.6470947265625, "cy": 430.07843017578125, "locked": true },

    "tooth-lower-48": { "cx": 155.87058105468748, "cy": 515.0979919433594, "locked": true },
    "tooth-lower-47": { "cx": 228.19216613769532, "cy": 604.8234252929688, "locked": true },
    "tooth-lower-46": { "cx": 355.9020690917969, "cy": 692.3920288085938, "locked": true },
    "tooth-lower-45": { "cx": 405.39619750976556, "cy": 781.568603515625, "locked": true },
    "tooth-lower-44": { "cx": 517.5184301757812, "cy": 699.3726806640625, "locked": true },
    "tooth-lower-43": { "cx": 562.7336022949219, "cy": 790.6923828125, "locked": true },
    "tooth-lower-42": { "cx": 678.0325244140624, "cy": 705.0194091796875, "locked": true },
    "tooth-lower-41": { "cx": 720.12853515625, "cy": 793.41162109375, "locked": true },

    "tooth-lower-38": { "cx": 1444.1294, "cy": 515.098, "locked": true },
    "tooth-lower-37": { "cx": 1371.8078338623047, "cy": 604.8234252929688, "locked": true },
    "tooth-lower-36": { "cx": 1244.0979309082031, "cy": 692.3920288085938, "locked": true },
    "tooth-lower-35": { "cx": 1194.6038, "cy": 781.5686, "locked": true },
    "tooth-lower-34": { "cx": 1082.4815698242187, "cy": 699.3726806640625, "locked": true },
    "tooth-lower-33": { "cx": 1036.6388952636719, "cy": 790.6923828125, "locked": true },
    "tooth-lower-32": { "cx": 921.9674755859376, "cy": 705.0194091796875, "locked": true },
    "tooth-lower-31": { "cx": 874.2244, "cy": 794.0391, "locked": true }
  };

  (function enforceMirrors() {
    const MIRROR_AXIS = 1600;
    for (let n = 11; n <= 18; n++) {
      const rightKey = `tooth-upper-${n}`;
      const leftKey = `tooth-upper-${n + 10}`;
      if (DEFAULT_LABEL_POSITIONS[rightKey]) {
        const r = DEFAULT_LABEL_POSITIONS[rightKey];
        DEFAULT_LABEL_POSITIONS[leftKey] = { cx: MIRROR_AXIS - r.cx, cy: r.cy, locked: true };
      }
    }
    for (let n = 41; n <= 48; n++) {
      const rightKey = `tooth-lower-${n}`;
      const leftKey = `tooth-lower-${n - 10}`;
      if (DEFAULT_LABEL_POSITIONS[rightKey]) {
        const r = DEFAULT_LABEL_POSITIONS[rightKey];
        DEFAULT_LABEL_POSITIONS[leftKey] = { cx: MIRROR_AXIS - r.cx, cy: r.cy, locked: true };
      }
    }
    if (DEFAULT_LABEL_POSITIONS['sinus-right'] && !DEFAULT_LABEL_POSITIONS['sinus-left']) {
      const r = DEFAULT_LABEL_POSITIONS['sinus-right'];
      DEFAULT_LABEL_POSITIONS['sinus-left'] = { cx: MIRROR_AXIS - r.cx, cy: r.cy, locked: true };
    }
  })();

  const [persistentPositions, setPersistentPositions] = React.useState(() => {
    try { localStorage.removeItem('labelPositions'); } catch (_e) { /* ignore */ }
    return {};
  });

  const [sessionPositions, setSessionPositions] = React.useState({});

  React.useEffect(() => {
    setSessionPositions((prev = {}) => {
      const next = { ...prev };
      Object.keys(DEFAULT_LABEL_POSITIONS).forEach((k) => { if (k in next) delete next[k]; });
      return next;
    });
  }, []);

  const dragRef = React.useRef({ key: null, dx: 0, dy: 0, pid: null });

  const labelKeyFor = (l) => {
    if (l.kind === 'tooth') return `tooth-${l.toothId}`;
    if (l.kind === 'sinus') return `sinus-${l.target}`;
    if (l.kind === 'arch') return `arch-${l.target}`;
    if (l.kind === 'full-mouth') return `full-mouth`;
    return `label-${l.zone || l.kind}`;
  };

  const effectivePositionForKey = (k) => {
    if (sessionPositions && sessionPositions[k]) return { ...sessionPositions[k] };
    if (persistentPositions && persistentPositions[k]) return { ...persistentPositions[k] };
    if (k in DEFAULT_LABEL_POSITIONS) return { ...DEFAULT_LABEL_POSITIONS[k] };
    return undefined;
  };

  React.useEffect(() => {
    _api = {
      exportLabelPositions: () => {
        const merged = {};
        Object.entries(DEFAULT_LABEL_POSITIONS).forEach(([k, v]) => { merged[k] = { ...v }; });
        Object.entries(persistentPositions || {}).forEach(([k, v]) => { merged[k] = { ...(v || {}) }; });
        Object.entries(sessionPositions || {}).forEach(([k, v]) => { merged[k] = { ...(v || {}) }; });
        positioned.forEach(p => {
          const k = labelKeyFor(p);
          if (!(k in merged)) merged[k] = { cx: p.cx, cy: p.cy, locked: !!p._locked };
        });
        return merged;
      },
      setLabelPositions: (obj) => {
        try {
          const raw = obj || {};
          const filtered = Object.fromEntries(Object.entries(raw).filter(([k]) => !(k in DEFAULT_LABEL_POSITIONS)));
          setPersistentPositions(filtered);
          try { localStorage.setItem('labelPositions', JSON.stringify(filtered)); } catch (_e) { /* ignore */ }
        } catch (_e) { /* ignore */ }
      },
    };
    return () => { _api = null; };
  }, [persistentPositions, sessionPositions]);

  // ── 1. Build label specs ──────────────────────────────────────────────────

  const labels = [];

  const byTooth = {};
  for (const tx of treatments) {
    if (tx.scope === 'tooth') {
      for (const id of tx.targets) {
        (byTooth[id] = byTooth[id] || []).push(tx.id);
      }
    }
  }
  Object.entries(byTooth).forEach(([toothId, items]) => {
    const tooth = allTeeth.find(x => x.id === toothId);
    if (!tooth) return;
    const isUpper = tooth.jaw === 'upper';
    const fdi = parseInt(toothId.split('-')[1]);
    labels.push({
      kind: 'tooth', toothId, items,
      anchor: {
        x: tooth.cx,
        y: isUpper ? upperBiteY - tooth.h * 0.55 + (tooth.yOffset || 0)
                   : lowerBiteY + tooth.h * 0.55 - (tooth.yOffset || 0),
      },
      zone: fdiToZone(fdi),
      fdi,
      jaw: tooth.jaw,
    });
  });

  treatments.filter(t => t.scope === 'sinus').forEach(tx =>
    tx.targets.forEach(side => {
      labels.push({
        kind: 'sinus', target: side, items: [tx.id],
        anchor: { x: side === 'right' ? 460 : 1140, y: 200 },
        zone: 'sinus-' + side,
      });
    })
  );

  const archByArch = { upper: [], lower: [] };
  treatments.filter(t => t.scope === 'arch').forEach(tx =>
    tx.targets.forEach(arch => archByArch[arch].push(tx.id))
  );
  ['upper', 'lower'].forEach(arch => {
    if (archByArch[arch].length === 0) return;
    const archTeeth = allTeeth.filter(t => t.jaw === arch);
    const midX = archTeeth.length
      ? archTeeth.reduce((s, t) => s + t.cx, 0) / archTeeth.length : ARC_CX;
    labels.push({
      kind: 'arch', target: arch, items: archByArch[arch],
      anchor: { x: midX, y: arch === 'upper' ? upperBiteY - 8 : lowerBiteY + 8 },
      zone: 'arch-' + arch,
    });
  });

  const fmItems = treatments.filter(t => t.scope === 'full-mouth').map(t => t.id);
  if (fmItems.length > 0) {
    const upperTeeth = allTeeth.filter(t => t.jaw === 'upper');
    const rightmost = upperTeeth.reduce((a, b) => (b.cx > a.cx ? b : a), upperTeeth[0]);
    labels.push({
      kind: 'full-mouth', items: fmItems,
      anchor: { x: rightmost ? rightmost.cx : ARC_CX + 580, y: upperBiteY + 36 },
      zone: 'ortho',
    });
  }

  // ── 2. Fan boxes along outer arc per zone ─────────────────────────────────

  const zoneBuckets = {};
  labels.forEach(l => { (zoneBuckets[l.zone] = zoneBuckets[l.zone] || []).push(l); });

  const positioned = [];

  const sinusReservedXs = [];
  (zoneBuckets['sinus-right'] || []).forEach(s => sinusReservedXs.push(s.anchor.x));
  (zoneBuckets['sinus-left'] || []).forEach(s => sinusReservedXs.push(s.anchor.x));

  const VIEW_W = 1600, PAD = 8;
  const clampCx = (x) => Math.max(LABEL_W / 2 + PAD, Math.min(VIEW_W - LABEL_W / 2 - PAD, x));

  const INNER_HALF_X = 420;
  const INNER_HALF_Y_FALLBACK = 300;
  const OUTER_OFFSET_X = 100;
  const OUTER_OFFSET_Y = 80;
  const SIDE_PAD = 28;

  function assignToNearestSlots(items, start, end, capacity, axisAccessor, opts = {}) {
    if (capacity <= 0) return { assigned: [], remaining: items.slice() };
    if (items.length === 0) return { assigned: [], remaining: [] };
    const n = Math.max(1, capacity);
    const span = end - start;
    const step = n === 1 ? 0 : span / (n - 1);
    const slots = new Array(n).fill(null).map((_, i) => start + i * step);
    const used = new Array(n).fill(false);
    let sorted = items.slice();
    if (opts.preferFDI) {
      sorted.sort((a, b) => {
        const af = a.fdi || 0; const bf = b.fdi || 0;
        return af - bf;
      });
    } else {
      sorted.sort((a, b) => axisAccessor(a) - axisAccessor(b));
    }
    if (opts.reservedXs && opts.reservedXs.length) {
      const thresh = opts.reservedThreshold || (LABEL_W + 8);
      for (let i = 0; i < slots.length; i++) {
        for (const rx of opts.reservedXs) {
          if (Math.abs(slots[i] - rx) < thresh) { used[i] = true; break; }
        }
      }
    }
    const assigned = [];
    const remaining = [];
    for (const item of sorted) {
      const desired = axisAccessor(item);
      let bestIdx = -1, bestDist = Infinity;
      for (let i = 0; i < slots.length; i++) {
        if (used[i]) continue;
        const d = Math.abs(slots[i] - desired);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx >= 0) {
        used[bestIdx] = true;
        assigned.push({ item, coord: slots[bestIdx], slotIndex: bestIdx });
      } else {
        remaining.push(item);
      }
    }
    return { assigned, remaining };
  }

  const marginFromBite = 84;
  const extraSafety = 48;

  const toothLabels = labels.filter(l => l.kind === 'tooth');
  toothLabels.forEach(l => { l._h = 14 + l.items.length * 18 + 10; });

  let minToothY = Infinity, maxToothY = -Infinity, minToothX = Infinity, maxToothX = -Infinity;
  toothLabels.forEach(t => {
    const ay = t.anchor && t.anchor.y;
    const ax = t.anchor && t.anchor.x;
    if (typeof ay === 'number') {
      if (ay < minToothY) minToothY = ay;
      if (ay > maxToothY) maxToothY = ay;
    }
    if (typeof ax === 'number') {
      if (ax < minToothX) minToothX = ax;
      if (ax > maxToothX) maxToothX = ax;
    }
  });

  const minTopCandidate = (minToothY === Infinity) ? (ARC_CY - INNER_HALF_Y_FALLBACK) : (minToothY - marginFromBite - extraSafety);
  const maxBottomCandidate = (maxToothY === -Infinity) ? (ARC_CY + INNER_HALF_Y_FALLBACK) : (maxToothY + marginFromBite + extraSafety);
  const minLeftCandidate = (minToothX === Infinity) ? (ARC_CX - INNER_HALF_X) : (minToothX - marginFromBite - extraSafety);
  const maxRightCandidate = (maxToothX === -Infinity) ? (ARC_CX + INNER_HALF_X) : (maxToothX + marginFromBite + extraSafety);

  const innerTop = Math.min(ARC_CY - INNER_HALF_Y_FALLBACK, minTopCandidate);
  const innerBottom = Math.max(ARC_CY + INNER_HALF_Y_FALLBACK, maxBottomCandidate);
  const innerLeft = Math.min(ARC_CX - INNER_HALF_X, minLeftCandidate);
  const innerRight = Math.max(ARC_CX + INNER_HALF_X, maxRightCandidate);

  const outerLeft = innerLeft - OUTER_OFFSET_X;
  const outerRight = innerRight + OUTER_OFFSET_X;
  const outerTop = innerTop - OUTER_OFFSET_Y;
  const outerBottom = innerBottom + OUTER_OFFSET_Y;

  let sideBuckets = { top: [], right: [], bottom: [], left: [] };
  toothLabels.forEach(l => {
    const ax = l.anchor.x, ay = l.anchor.y;
    const spanX = Math.max(1, innerRight - innerLeft);
    const spanY = Math.max(1, innerBottom - innerTop);

    const allowed = (function() {
      if (l.fdi && Number.isFinite(l.fdi)) {
        const q = Math.floor(l.fdi / 10);
        if (q === 1) return ['top', 'right'];
        if (q === 2) return ['top', 'left'];
        if (q === 3) return ['bottom', 'left'];
        if (q === 4) return ['bottom', 'right'];
      }
      if (!l.jaw) return ['top','right','bottom','left'];
      const isUpper = l.jaw === 'upper';
      const isRightSide = ax >= ARC_CX;
      if (isUpper && isRightSide) return ['top','right'];
      if (isUpper && !isRightSide) return ['top','left'];
      if (!isUpper && isRightSide) return ['bottom','right'];
      return ['bottom','left'];
    })();

    const d = {
      top:    Math.abs(ay - innerTop) / spanY,
      bottom: Math.abs(ay - innerBottom) / spanY,
      left:   Math.abs(ax - innerLeft) / spanX,
      right:  Math.abs(ax - innerRight) / spanX,
    };
    let bestSide = allowed[0];
    let bestVal = Infinity;
    for (const s of allowed) {
      if (d[s] < bestVal) { bestVal = d[s]; bestSide = s; }
    }
    sideBuckets[bestSide].push(l);
  });

  (['top', 'bottom']).forEach((hb) => {
    const list = sideBuckets[hb];
    if (!list || !list.length) return;
    const widthSpan = Math.max(1, innerRight - innerLeft);
    const leftCut = innerLeft + widthSpan * 0.22;
    const rightCut = innerRight - widthSpan * 0.22;
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      const ax = l.anchor.x;
      if (ax <= leftCut) {
        const allowed = (function() {
          if (l.fdi && Number.isFinite(l.fdi)) {
            const q = Math.floor(l.fdi / 10);
            if (q === 1) return ['top','right'];
            if (q === 2) return ['top','left'];
            if (q === 3) return ['bottom','left'];
            if (q === 4) return ['bottom','right'];
          }
          if (!l.jaw) return ['top','right','bottom','left'];
          const isUpper = l.jaw === 'upper';
          const isRightSide = ax >= ARC_CX;
          if (isUpper && isRightSide) return ['top','right'];
          if (isUpper && !isRightSide) return ['top','left'];
          if (!isUpper && isRightSide) return ['bottom','right'];
          return ['bottom','left'];
        })();
        if (allowed.includes('left')) {
          list.splice(i, 1);
          sideBuckets.left.push(l);
        }
      } else if (ax >= rightCut) {
        const allowed = (function() {
          if (l.fdi && Number.isFinite(l.fdi)) {
            const q = Math.floor(l.fdi / 10);
            if (q === 1) return ['top','right'];
            if (q === 2) return ['top','left'];
            if (q === 3) return ['bottom','left'];
            if (q === 4) return ['bottom','right'];
          }
          if (!l.jaw) return ['top','right','bottom','left'];
          const isUpper = l.jaw === 'upper';
          const isRightSide = ax >= ARC_CX;
          if (isUpper && isRightSide) return ['top','right'];
          if (isUpper && !isRightSide) return ['top','left'];
          if (!isUpper && isRightSide) return ['bottom','right'];
          return ['bottom','left'];
        })();
        if (allowed.includes('right')) {
          list.splice(i, 1);
          sideBuckets.right.push(l);
        }
      }
    }
  });

  Object.entries(sideBuckets).forEach(([side, list]) => {
    if (!list.length) return;
    const span = (innerRight - innerLeft) - SIDE_PAD * 2;
    const slot = LABEL_W + 8;
    const capacityInner = Math.max(1, Math.floor(span / slot));
    let assignedInner;
    let remaining = [];
    if (side === 'top' || side === 'bottom') {
      const y = side === 'top' ? innerTop : innerBottom;
      const xStart = innerLeft + SIDE_PAD + LABEL_W / 2;
      const xEnd = innerRight - SIDE_PAD - LABEL_W / 2;
      const { assigned, remaining: rem } = assignToNearestSlots(list, xStart, xEnd, capacityInner, l => l.anchor.x,
                                                               { preferFDI: true, reservedXs: sinusReservedXs, reservedThreshold: LABEL_W + 16 });
      assignedInner = assigned; remaining = rem;
      const staggerY = 10;
      assignedInner.forEach(a => {
        const parity = a.slotIndex % 2 === 0 ? -1 : 1;
        const cyOffset = parity * staggerY;
        positioned.push({ ...a.item, cx: clampCx(a.coord), cy: y + cyOffset, height: a.item._h });
      });
    }

    const outer = remaining.length ? remaining : [];

    if (outer.length > 0) {
      if (side === 'top' || side === 'bottom') {
        const y = side === 'top' ? outerTop : outerBottom;
        const xStart = outerLeft + SIDE_PAD + LABEL_W / 2;
        const xEnd = outerRight - SIDE_PAD - LABEL_W / 2;
        const capacityOuter = Math.max(1, Math.floor((outerRight - outerLeft - SIDE_PAD * 2) / slot));
        const { assigned: assignedO, remaining: remO } = assignToNearestSlots(outer, xStart, xEnd, capacityOuter, l => l.anchor.x,
                                                                          { preferFDI: true, reservedXs: sinusReservedXs, reservedThreshold: LABEL_W + 16 });
        const outerStaggerY = 12;
        assignedO.forEach((a) => {
          const parity = a.slotIndex % 2 === 0 ? -1 : 1;
          const cyOffset = parity * outerStaggerY;
          positioned.push({ ...a.item, cx: clampCx(a.coord), cy: y + cyOffset, height: a.item._h });
        });
        remO.forEach((l, i) => {
          const xx = clampCx(xStart + ((i % capacityOuter) * (LABEL_W / 2)));
          positioned.push({ ...l, cx: xx, cy: y + Math.floor(i / capacityOuter) * (l._h + 6), height: l._h });
        });
      }
    }
  });

  ['left', 'right'].forEach((side) => {
    const list = sideBuckets[side];
    if (!list.length) return;
    const maxH = Math.max(...list.map(l => l._h || 36));
    const extraVertGap = 12;
    const slotV = Math.max(36, Math.round(maxH + extraVertGap));
    const spanY = (innerBottom - innerTop) - SIDE_PAD * 2;
    const capacityInnerV = Math.max(1, Math.floor(spanY / slotV));

    const yStart = innerTop + SIDE_PAD + slotV / 2;
    const yEnd = innerBottom - SIDE_PAD - slotV / 2;
    const { assigned: assignedV, remaining: remV } = assignToNearestSlots(list, yStart, yEnd, capacityInnerV, l => l.anchor.y, { preferFDI: false });
    const staggerX = Math.round(LABEL_W * 0.12);
    assignedV.forEach(a => {
      const baseX = side === 'left' ? innerLeft : innerRight;
      const dirSign = side === 'left' ? -1 : 1;
      const parity = a.slotIndex % 2 === 0 ? 0 : 1;
      const x = baseX + dirSign * (parity * staggerX);
      positioned.push({ ...a.item, cx: clampCx(x), cy: a.coord, height: a.item._h });
    });

    if (remV.length > 0) {
      const yStartO = outerTop + SIDE_PAD + slotV / 2;
      const yEndO = outerBottom - SIDE_PAD - slotV / 2;
      const capacityOuterV = Math.max(1, Math.floor((outerBottom - outerTop - SIDE_PAD * 2) / slotV));
      const { assigned: assignedVO, remaining: remVO } = assignToNearestSlots(remV, yStartO, yEndO, capacityOuterV, l => l.anchor.y, { preferFDI: false });
      assignedVO.forEach((a, i) => {
        const colIndex = Math.floor(i / capacityOuterV);
        const baseX = side === 'left' ? outerLeft : outerRight;
        const dirSign = side === 'left' ? -1 : 1;
        const baseColX = baseX + dirSign * (colIndex * (LABEL_W / 2 + 6));
        const nudge = (i % 2 === 0) ? 0 : dirSign * Math.round(LABEL_W * 0.08);
        const x = baseColX + nudge;
        positioned.push({ ...a.item, cx: clampCx(x), cy: a.coord, height: a.item._h });
      });
      remVO.forEach((l, i) => {
        const colIndex = Math.floor(i / capacityOuterV) + Math.ceil(assignedVO.length / capacityOuterV);
        const baseX = side === 'left' ? outerLeft : outerRight;
        const dirSign = side === 'left' ? -1 : 1;
        const baseColX = baseX + dirSign * (colIndex * (LABEL_W / 2 + 6));
        const nudge = (i % 2 === 0) ? 0 : dirSign * Math.round(LABEL_W * 0.08);
        const x = baseColX + nudge;
        const yy = yStartO + (i % capacityOuterV) * (l._h + 6) + Math.floor(i / capacityOuterV) * 6;
        positioned.push({ ...l, cx: clampCx(x), cy: yy, height: l._h });
      });
    }
  });

  ['sinus-right', 'sinus-left'].forEach(zoneKey => {
    (zoneBuckets[zoneKey] || []).forEach((l, i) => {
      const h = 14 + l.items.length * 18 + 10;
      const baseY = outerTop - 12;
      positioned.push({ ...l, cx: l.anchor.x, cy: baseY - i * (h + 8), height: h });
    });
  });

  ['arch-upper', 'arch-lower'].forEach(zoneKey => {
    (zoneBuckets[zoneKey] || []).forEach((l, i) => {
      const h = 14 + l.items.length * 18 + 10;
      const baseY = zoneKey === 'arch-upper' ? 60 : 730;
      positioned.push({ ...l, cx: ARC_CX, cy: baseY + i * (h + 10), height: h });
    });
  });

  (zoneBuckets['ortho'] || []).forEach((l, i) => {
    const h = 14 + l.items.length * 18 + 10;
    positioned.push({ ...l, cx: 1540, cy: 410 + i * (h + 10), height: h });
  });

  const finalPositioned = positioned.map((l) => {
    const k = labelKeyFor(l);
    const eff = effectivePositionForKey(k);
    if (eff && typeof eff.cx === 'number' && typeof eff.cy === 'number') {
      return { ...l, cx: eff.cx, cy: eff.cy, height: l.height, _locked: !!eff.locked, _labelKey: k };
    }
    return { ...l, _locked: false, _labelKey: k };
  });

  // --- Pointer drag helpers ---
  const getSvgPointFromEvent = (evt) => {
    const el = evt.currentTarget || evt.target;
    const svg = (el && (el.ownerSVGElement || (el.closest && el.closest('svg')))) || document.querySelector('svg.arch-svg');
    if (!svg) return { x: evt.clientX, y: evt.clientY };
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: evt.clientX, y: evt.clientY };
    return pt.matrixTransform(ctm.inverse());
  };

  const startDrag = (evt, key, cx, cy) => {
    if (!manualPlacementMode) return;
    const curLock = (sessionPositions && sessionPositions[key] && sessionPositions[key].locked) ||
                    (persistentPositions && persistentPositions[key] && persistentPositions[key].locked);
    if (curLock) return;
    evt.stopPropagation(); evt.preventDefault();
    const p = getSvgPointFromEvent(evt);
    const el = evt.currentTarget || evt.target;
    dragRef.current = { key, dx: p.x - cx, dy: p.y - cy, pid: evt.pointerId, el };
    try { el && el.setPointerCapture && el.setPointerCapture(evt.pointerId); } catch (_e) { /* ignore */ }
    const move = (ev) => {
      const cur = dragRef.current; if (!cur || cur.key !== key) return;
      const q = getSvgPointFromEvent(ev);
      const nx = q.x - cur.dx; const ny = q.y - cur.dy;
      setSessionPositions((prev) => {
        const next = { ...(prev || {}) };
        next[key] = { ...(next[key] || {}), cx: nx, cy: ny, locked: !!(next[key] && next[key].locked) };
        return next;
      });
    };
    const up = (ev) => {
      try { if (dragRef.current && dragRef.current.el && dragRef.current.el.releasePointerCapture) {
        dragRef.current.el.releasePointerCapture && dragRef.current.el.releasePointerCapture(dragRef.current.pid);
      } } catch (_e) { /* ignore */ }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      dragRef.current = { key: null, dx: 0, dy: 0, pid: null };
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const toggleLock = (key) => {
    if (key in DEFAULT_LABEL_POSITIONS) return;
    setSessionPositions((prev) => {
      const next = { ...(prev || {}) };
      const cur = next[key] || persistentPositions[key] || {};
      next[key] = { ...cur, locked: !cur.locked, cx: cur.cx, cy: cur.cy };
      return next;
    });
  };

  // ── 3. Render ─────────────────────────────────────────────────────────────

  return (
    <g className="label-layer">
      {/* Debug overlay: inner/outer rectangles, sinus reserved lines, mirror axis */}
      {(debugGuides || debugMirrorAxis) && (
        <g pointerEvents="none" opacity="0.9">
          {debugGuides && (
            <>
              {/* Inner rect */}
              <rect x={innerLeft} y={innerTop} width={innerRight - innerLeft} height={innerBottom - innerTop}
                    fill="none" stroke="rgba(34,139,230,0.22)" strokeWidth="2" strokeDasharray="6 4" />
              {/* Outer rect */}
              <rect x={outerLeft} y={outerTop} width={outerRight - outerLeft} height={outerBottom - outerTop}
                    fill="none" stroke="rgba(34,139,70,0.16)" strokeWidth="2" strokeDasharray="4 4" />
              {/* Sinus reserved X guide lines */}
              {sinusReservedXs.map((sx, i) => (
                <line key={`sr-${i}`} x1={sx} x2={sx} y1={0} y2={800} stroke="rgba(180,20,180,0.12)" strokeWidth="1" />
              ))}
              {/* Tooth anchor points */}
              {labels.map((l, i) => (
                <circle key={`a-${i}`} cx={l.anchor.x} cy={l.anchor.y} r="3" fill="rgba(0,0,0,0.12)" />
              ))}
            </>
          )}
          {/* Mirror axis at x=800 */}
          {debugMirrorAxis && (
            <line x1={ARC_CX} x2={ARC_CX} y1={0} y2={800}
                  stroke="rgba(255,120,0,0.7)" strokeWidth="1.5" strokeDasharray="8 5" />
          )}
        </g>
      )}
      {/* Connectors (behind cards) */}
      {finalPositioned.map((l, i) => {
        const { path } = connectorPath(l.cx, l.cy, LABEL_W / 2, l.height / 2, l.anchor.x, l.anchor.y);
        return (
          <g key={`led-${i}`}>
            <path d={path} stroke={accent} strokeWidth="1.1" fill="none"
                  opacity="0.5" strokeLinejoin="round" />
            <circle cx={l.anchor.x} cy={l.anchor.y} r="2.4" fill={accent} />
          </g>
        );
      })}

      {/* Label cards */}
      {finalPositioned.map((l, i) => {
        const x = l.cx - LABEL_W / 2;
        const y = l.cy - l.height / 2;
        return (
           <g key={`lab-${i}`}
              transform={`translate(${x}, ${y})`}
              onDoubleClick={() => toggleLock(l._labelKey)}
              style={{ pointerEvents: manualPlacementMode ? 'all' : 'auto', cursor: manualPlacementMode ? (l._locked ? 'not-allowed' : 'grab') : 'default' }}>
             <rect x="0" y="0" width={LABEL_W} height={l.height}
                   rx="8" fill="var(--card-bg)"
                   stroke="var(--card-border)" strokeWidth="1"
                   onPointerDown={(e) => startDrag(e, l._labelKey, l.cx, l.cy)}
                   style={{ touchAction: 'none', filter: 'drop-shadow(0 6px 16px rgba(20,30,50,0.12))' }} />
            <text x="12" y="16" fontSize="10" fill={accent}
                  fontFamily="var(--sans)" fontWeight="600"
                  pointerEvents="none"
                  style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {l.kind === 'tooth'     ? `Tooth ${l.toothId.split('-')[1]}` :
               l.kind === 'sinus'    ? `Sinus · ${l.target === 'right' ? 'R' : 'L'}` :
               l.kind === 'arch'     ? (l.target === 'upper' ? 'Maxilla' : 'Mandible') :
                                       'Full mouth'}
            </text>
            {l.items.map((txId, j) => {
              const yy = 36 + j * 18;
              return (
                <g key={j}>
                  <text x="12" y={yy} fontSize="12.5" fill="var(--ink)"
                        fontFamily="var(--sans)" pointerEvents="none">
                    {txLabel[txId] || txId}
                  </text>
                  <g style={{ cursor: 'pointer' }}
                     onClick={(e) => {
                       e.stopPropagation();
                       if (l.kind === 'tooth')      onRemoveTooth(l.toothId, txId);
                       else if (l.kind === 'sinus') onRemoveOther(txId, l.target);
                       else if (l.kind === 'arch')  onRemoveOther(txId, l.target);
                       else                         onRemoveOther(txId, 'both');
                     }}>
                    <circle cx={LABEL_W - 14} cy={yy - 4} r="8" fill="transparent" />
                    <line x1={LABEL_W - 18} y1={yy - 8} x2={LABEL_W - 10} y2={yy}
                          stroke="var(--ink-muted)" strokeWidth="1.4" strokeLinecap="round" />
                    <line x1={LABEL_W - 10} y1={yy - 8} x2={LABEL_W - 18} y2={yy}
                          stroke="var(--ink-muted)" strokeWidth="1.4" strokeLinecap="round" />
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
