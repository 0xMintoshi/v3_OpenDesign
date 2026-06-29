import React from 'react';
import {
  ARC_CX, ARC_CY, ARC_RX, ARC_RY,
  arcPoint, fdiToZone, connectorPath,
} from '../core/label-connector.js';
import { crownDepth } from '../core/arch-math.js';
import { FAN_POSITIONS, assignLabelSlots, upperBandY, lowerBandY } from '../core/label-slots.js';
import { registryFor } from '../core/treatment-registry.js';

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
                          onRemoveTooth, onRemoveOther, onRemoveSpan,
                          manualPlacementMode = false, txLabel = {} }) {
  const LABEL_W = 150;

  const [persistentPositions, setPersistentPositions] = React.useState(() => {
    try { localStorage.removeItem('labelPositions'); } catch (_e) { /* ignore */ }
    return {};
  });

  const [sessionPositions, setSessionPositions] = React.useState({});

  const dragRef = React.useRef({ key: null, dx: 0, dy: 0, pid: null });

  const labelKeyFor = (l) => {
    if (l.kind === 'tooth') return `tooth-${l.toothId}`;
    if (l.kind === 'span') return `span-${[...l.targets].sort().join('-')}`;
    if (l.kind === 'sinus') return `sinus-${l.target}`;
    if (l.kind === 'arch') return `arch-${l.txId}-${l.target}`;
    if (l.kind === 'full-mouth') return `full-mouth`;
    return `label-${l.zone || l.kind}`;
  };

  // Treatment-specific anchor Y — connector points at the anatomy, not the bite line.
  const archAnchorY = (txId, arch) => {
    const up = arch === 'upper';
    if (txId === 'alveolectomy')          return up ? upperBiteY - 80  : lowerBiteY + 15;
    if (txId === 'complete-denture')      return up ? upperBiteY - 120 : lowerBiteY + 120;
    if (txId === 'partial-denture-upper') return upperBiteY - 80;
    if (txId === 'partial-denture-lower') return lowerBiteY + 80;
    return up ? upperBiteY - 30 : lowerBiteY + 30;
  };

  const effectivePositionForKey = (k) => {
    if (sessionPositions && sessionPositions[k]) return { ...sessionPositions[k] };
    if (persistentPositions && persistentPositions[k]) return { ...persistentPositions[k] };
    return undefined;
  };

  React.useEffect(() => {
    _api = {
      exportLabelPositions: () => {
        const merged = {};
        positioned.forEach(p => {
          const k = labelKeyFor(p);
          merged[k] = { cx: p.cx, cy: p.cy, locked: !!p._locked };
        });
        Object.entries(persistentPositions || {}).forEach(([k, v]) => { merged[k] = { ...(v || {}) }; });
        Object.entries(sessionPositions || {}).forEach(([k, v]) => { merged[k] = { ...(v || {}) }; });
        return merged;
      },
      setLabelPositions: (obj) => {
        try {
          const raw = obj || {};
          setPersistentPositions(raw);
          try { localStorage.setItem('labelPositions', JSON.stringify(raw)); } catch (_e) { /* ignore */ }
        } catch (_e) { /* ignore */ }
      },
    };
    return () => { _api = null; };
  }, [persistentPositions, sessionPositions]);

  // ── 1. Build label specs ──────────────────────────────────────────────────

  const labels = [];

  // Per-tooth labels — skip span treatments (bridge-span, implant-bridge-span);
  // those get their own consolidated cards below.
  const isSpanTx = (id) => id === 'bridge-span' || id === 'implant-bridge-span';

  const byTooth = {};
  for (const tx of treatments) {
    if (tx.scope === 'tooth' && !isSpanTx(tx.id)) {
      for (const id of tx.targets) {
        (byTooth[id] = byTooth[id] || []).push(tx.id);
      }
    }
  }
  Object.entries(byTooth).forEach(([toothId, items]) => {
    const tooth = allTeeth.find(x => x.id === toothId);
    if (!tooth) return;
    const isUpper = tooth.jaw === 'upper';
    const fdi = tooth.fdi;
    labels.push({
      kind: 'tooth', toothId, items,
      anchor: (() => {
        const tiltRad = ((tooth.tilt || 0) * Math.PI) / 180;
        const anchorDepth = crownDepth(tooth.type, tooth.h) + 0.07 * tooth.h;
        return {
          x: tooth.cx + anchorDepth * Math.sin(tiltRad),
          y: isUpper
            ? upperBiteY + (tooth.yOffset || 0) - anchorDepth
            : lowerBiteY - (tooth.yOffset || 0) + anchorDepth,
        };
      })(),
      zone: fdiToZone(fdi),
      fdi,
      jaw: tooth.jaw,
    });
  });

  // Consolidated span labels — one card per bridge / implant-bridge treatment,
  // anchored at the starting (left-most) tooth, showing the FDI range.
  treatments.filter(t => t.scope === 'tooth' && isSpanTx(t.id)).forEach(tx => {
    const span = tx.targets
      .map(id => allTeeth.find(x => x.id === id))
      .filter(Boolean)
      .sort((a, b) => a.cx - b.cx);
    if (span.length < 2) return;
    const start = span[0];
    const end = span[span.length - 1];
    const isUpper = start.jaw === 'upper';
    const tiltRad = ((start.tilt || 0) * Math.PI) / 180;
    const anchorDepth = crownDepth(start.type, start.h) + 0.07 * start.h;
    labels.push({
      kind: 'span', txId: tx.id, targets: tx.targets, items: [tx.id],
      leftFdi: start.fdi, rightFdi: end.fdi,
      anchor: {
        x: start.cx + anchorDepth * Math.sin(tiltRad),
        y: isUpper
          ? upperBiteY + (start.yOffset || 0) - anchorDepth
          : lowerBiteY - (start.yOffset || 0) + anchorDepth,
      },
      zone: fdiToZone(start.fdi),
      jaw: start.jaw,
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

  treatments.filter(t => t.scope === 'arch').forEach(tx =>
    tx.targets.forEach(arch => {
      const archTeeth = allTeeth.filter(t => t.jaw === arch);
      const midX = archTeeth.length
        ? archTeeth.reduce((s, t) => s + t.cx, 0) / archTeeth.length : ARC_CX;
      labels.push({
        kind: 'arch', target: arch, txId: tx.id, items: [tx.id],
        anchor: { x: midX, y: archAnchorY(tx.id, arch) },
        zone: 'arch-' + arch,
      });
    })
  );

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

  // ── 2. Safe-band row-packing positioning ────────────────────────────────
  // All tooth/span labels packed into clear horizontal bands:
  //   upper → above the maxillary sinus  (y ≈ upperBiteY − UPPER_CLEAR)
  //   lower → below the IDN canal        (y ≈ lowerBiteY + LOWER_CLEAR)
  // Labels are sorted by tooth anchor.x and packed left-to-right, wrapping
  // to new rows (stepping away from the arch) when the band is full.

  const toLabelH = (l) => 18 + l.items.length * 19 + 10;
  const VIEW_W = 1600, VIEW_H = 800, PAD = 8;
  const clampCx = (x) => Math.max(LABEL_W / 2 + PAD, Math.min(VIEW_W - LABEL_W / 2 - PAD, x));
  const clampCy = (y) => Math.max(PAD, Math.min(VIEW_H - PAD, y));

  const labeledLabels = labels.map(l => ({ ...l, key: labelKeyFor(l) }));

  // Build stacked card positions for per-treatment arch labels (x=1455, stacked by index).
  const localFanPositions = { ...FAN_POSITIONS };
  const archCounters = { upper: 0, lower: 0 };
  const ARCH_CARD_STEP = 50;
  labeledLabels.filter(l => l.kind === 'arch').forEach(l => {
    if (localFanPositions[l.key]) return; // manual override already present
    const base = FAN_POSITIONS[`arch-${l.target}`] || { cx: 1455, cy: l.target === 'upper' ? 309 : 495 };
    const idx = archCounters[l.target]++;
    localFanPositions[l.key] = { cx: base.cx, cy: base.cy + idx * ARCH_CARD_STEP };
  });

  const slotMap = assignLabelSlots(labeledLabels, upperBiteY, lowerBiteY, localFanPositions);

  const positioned = labeledLabels.map(l => {
    const pos = slotMap.get(l.key) || { cx: l.anchor.x, cy: l.anchor.y };
    return { ...l, cx: clampCx(pos.cx), cy: pos.cy, height: toLabelH(l) };
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
              {/* Safe-band row guide lines */}
              <line x1={0} x2={VIEW_W} y1={upperBandY(upperBiteY)} y2={upperBandY(upperBiteY)}
                    stroke="rgba(34,139,230,0.22)" strokeWidth="1" strokeDasharray="6 4" />
              <line x1={0} x2={VIEW_W} y1={lowerBandY(lowerBiteY)} y2={lowerBandY(lowerBiteY)}
                    stroke="rgba(34,139,230,0.22)" strokeWidth="1" strokeDasharray="6 4" />
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
            {/* Airy leader line */}
            <path d={path} stroke={accent} strokeWidth="0.9" fill="none"
                  opacity="0.28" strokeLinejoin="round" strokeLinecap="round" />
            {/* Ring-style anchor dot — outer ring + inner fill */}
            <circle cx={l.anchor.x} cy={l.anchor.y} r="3.5"
                    fill="none" stroke={accent} strokeWidth="1.3" opacity="0.65" />
            <circle cx={l.anchor.x} cy={l.anchor.y} r="1.2" fill={accent} />
          </g>
        );
      })}

      {/* Label cards */}
      {finalPositioned.map((l, i) => {
        const x = l.cx - LABEL_W / 2;
        const y = l.cy - l.height / 2;
        const h = l.height;
        return (
          <g key={`lab-${i}`}
             transform={`translate(${x}, ${y})`}
             onDoubleClick={() => toggleLock(l._labelKey)}
             style={{ pointerEvents: manualPlacementMode ? 'all' : 'auto', cursor: manualPlacementMode ? (l._locked ? 'not-allowed' : 'grab') : 'default' }}>

            {/* Card body — full border, editorial shadow */}
            <rect x="0" y="0" width={LABEL_W} height={h}
                  rx="8"
                  fill="var(--card-bg)"
                  stroke="var(--card-border)" strokeWidth="0.8"
                  onPointerDown={(e) => startDrag(e, l._labelKey, l.cx, l.cy)}
                  style={{ touchAction: 'none', filter: 'drop-shadow(0 6px 20px rgba(18,28,48,0.09)) drop-shadow(0 1px 3px rgba(18,28,48,0.05))' }} />

            {/* Tooth / scope identifier — DM Sans, # + FDI notation */}
            <text x="12" y="20" fontSize="13" fill="var(--ink)"
                  fontFamily="var(--sans)" fontWeight="600"
                  pointerEvents="none">
              {l.kind === 'tooth'  ? `#${l.fdi}` :
               l.kind === 'span'   ? `#${l.leftFdi}–${l.rightFdi}` :
               l.kind === 'sinus'  ? `Sinus · ${l.target === 'right' ? 'R' : 'L'}` :
               l.kind === 'arch'   ? (l.target === 'upper' ? 'Maxilla' : 'Mandible') :
                                     'Full mouth'}
            </text>

            {/* Hairline divider */}
            <line x1="12" y1="28" x2={LABEL_W - 12} y2="28"
                  stroke="var(--card-border)" strokeWidth="0.8" />

            {l.items.map((txId, j) => {
              const yy = 42 + j * 19;
              const itemText = l.kind === 'span'
                ? (txId === 'implant-bridge-span' ? 'Implant bridge' : 'Bridge')
                : (txLabel[txId] || txId);
              return (
                <g key={j}>
                  <text x="12" y={yy} fontSize="12" fill="var(--ink)"
                        fontFamily="var(--sans)" fontWeight="400" pointerEvents="none">
                    {itemText}
                  </text>
                  <g style={{ cursor: 'pointer' }}
                     onClick={(e) => {
                       e.stopPropagation();
                       if (l.kind === 'tooth')      onRemoveTooth(l.toothId, txId);
                       else if (l.kind === 'span')  onRemoveSpan && onRemoveSpan(l.txId, l.targets);
                       else if (l.kind === 'sinus') onRemoveOther(txId, l.target);
                       else if (l.kind === 'arch')  onRemoveOther(txId, l.target);
                       else                         onRemoveOther(txId, 'both');
                     }}>
                    <circle cx={LABEL_W - 13} cy={yy - 4} r="9" fill="transparent" />
                    <line x1={LABEL_W - 17} y1={yy - 8} x2={LABEL_W - 9} y2={yy}
                          stroke="var(--ink-faint)" strokeWidth="1.3" strokeLinecap="round" />
                    <line x1={LABEL_W - 9} y1={yy - 8} x2={LABEL_W - 17} y2={yy}
                          stroke="var(--ink-faint)" strokeWidth="1.3" strokeLinecap="round" />
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
