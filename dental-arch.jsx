const { useState, useEffect, useMemo, useCallback } = React;

// ====================================================================
// Tooth — outlined anatomical style
// ====================================================================
function Tooth({
  tooth, jawFlip, accent, isHovered, isSelected, isInDrag,
  presence, onHover, onSelect, showNumber, stage, hasTreatment
}) {
  const { cx, h, w, type, fdi, tilt = 0, yOffset = 0 } = tooth;

  const flipY = jawFlip ? -1 : 1;
  const paths = window.toothPaths(type, w, h);
  const numberY = jawFlip ? -(h + 16) : -(h + 10);

  const baseTransform = `translate(${cx}, ${yOffset * flipY}) scale(1, ${flipY}) rotate(${tilt})`;

  const missing = presence === 'missing';

  let liftY = 0;
  if (isHovered && !missing && stage === 'baseline') liftY = -3;
  if (isSelected) liftY = -5;

  // Determine fill color based on state
  let fillColor = 'var(--tooth-fill)';
  let strokeColor = 'var(--tooth-stroke)';
  let strokeW = 1.4;

  if (missing) {
    fillColor = 'transparent';
    strokeColor = 'var(--tooth-missing-stroke)';
    strokeW = 1.0;
  }
  if (isInDrag) {
    fillColor = accent;
  }
  if (isSelected) {
    fillColor = accent;
    strokeColor = accent;
  }
  if (isHovered && !missing && !isSelected) {
    fillColor = 'var(--tooth-hover-fill)';
  }

  return (
    <g
      transform={baseTransform}
      style={{ cursor: 'pointer', transition: 'transform 200ms cubic-bezier(.2,.7,.2,1)' }}
      onMouseEnter={() => onHover(tooth.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => onSelect({ kind: 'tooth', id: tooth.id }, e, 'click')}
      onContextMenu={(e) => onSelect({ kind: 'tooth', id: tooth.id }, e, 'context')}
      data-tooth-id={tooth.id}
      data-tooth-fdi={fdi}>
      
      <g
        style={{
          transform: `translateY(${liftY}px)`,
          transition: 'transform 280ms cubic-bezier(.2,.7,.2,1)'
        }}>
        
        {/* Tooth body — fade between present/missing */}
        <g
          className="tooth-body"
          style={{
            opacity: missing ? 0.35 : 1,
            transition: 'opacity 220ms ease'
          }}>
          
          <path
            d={paths.outline}
            fill={fillColor}
            fillOpacity={isInDrag ? 0.18 : isSelected ? 0.18 : 1}
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={missing ? '3 3' : '0'} />
          {isSelected &&
          <path
            d={paths.outline}
            fill="none"
            stroke={accent}
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.16"
            style={{ pointerEvents: 'none' }} />
          }
          
          {!missing &&
          <path
            d={paths.cervical}
            fill="none"
            stroke={isSelected ? accent : 'var(--tooth-stroke)'}
            strokeWidth={isSelected ? 1.2 : 1.0}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={isSelected ? 0.9 : 0.7} />

          }
        </g>

        {/* Treatment dot — small accent badge if this tooth has a treatment */}
        {hasTreatment &&
        <circle cx={w * 0.30} cy={-h * 0.96} r="2.4" fill={accent}
        stroke="var(--bg-0)" strokeWidth="0.8" />
        }

        {/* Number badge */}
        {(showNumber || isHovered || isSelected) &&
        <g transform={`translate(0, ${numberY}) rotate(${-tilt}) scale(1, ${flipY})`}>
            <text
            x="0"
            y="0"
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--sans)"
            fontWeight="500"
            fill={isHovered || isSelected ? accent : 'var(--ink-faint)'}
            style={{ pointerEvents: 'none', letterSpacing: '0.06em' }}>
            
              {fdi}
            </text>
          </g>
        }
      </g>
    </g>);

}

// ====================================================================
// Bone outline helpers — bone bottom edge follows tooth cervical line
// ====================================================================
const ANATOMY_INFO = {
  'sinus-right': { name: 'Right Maxillary Sinus', side: 'right', code: 'MS-R' },
  'sinus-left': { name: 'Left Maxillary Sinus', side: 'left', code: 'MS-L' }
};

function chRatioFor(type) {
  if (type === 'wisdomU' || type === 'wisdomL') return 0.46;
  if (type === 'molarU' || type === 'molarL') return 0.40;
  if (type === 'premolar' || type === 'premolar1') return 0.36;
  return 0.34;
}

// Cervical (crown–root junction) screen-y for each tooth in the arch.
// Accounts for per-tooth yOffset (arch curvature) and jaw orientation.
function cervicalPoints(teeth, biteY, jaw) {
  const sorted = [...teeth].sort((a, b) => a.cx - b.cx);
  return sorted.map((t) => {
    const ch = t.h * chRatioFor(t.type);
    const yo = t.yOffset || 0;
    const y = jaw === 'upper' ? biteY + yo - ch : biteY - yo + ch;
    return { x: t.cx, y, w: t.w, fdi: t.fdi };
  });
}

// Build a bone outline path. Bottom (maxilla) / top (mandible) edge scallops
// along the cervical line of every tooth; far edge is a soft rectangle.
function bonePath(cervical, jaw, farY) {
  if (!cervical.length) return '';
  const peakDir = jaw === 'upper' ? -1 : 1; // gap dip direction (away from bite)
  const peakDepth = 4;
  const overhang = 14;
  const cornerR = 24;
  const first = cervical[0];
  const last = cervical[cervical.length - 1];
  const leftX = first.x - first.w * 0.5 - overhang;
  const rightX = last.x + last.w * 0.5 + overhang;

  // Scallop segment generators
  const scallopRL = () => {
    let s = '';
    for (let i = cervical.length - 2; i >= 0; i--) {
      const p = cervical[i],n = cervical[i + 1];
      const mx = (p.x + n.x) / 2;
      const my = (p.y + n.y) / 2 + peakDir * peakDepth;
      s += `Q ${mx} ${my} ${p.x} ${p.y} `;
    }
    return s;
  };
  const scallopLR = () => {
    let s = '';
    for (let i = 1; i < cervical.length; i++) {
      const p = cervical[i],pr = cervical[i - 1];
      const mx = (p.x + pr.x) / 2;
      const my = (p.y + pr.y) / 2 + peakDir * peakDepth;
      s += `Q ${mx} ${my} ${p.x} ${p.y} `;
    }
    return s;
  };

  if (jaw === 'upper') {
    const leftFloor = first.y;
    const rightFloor = last.y;
    return `
      M ${leftX} ${farY + 28}
      Q ${leftX + 2} ${farY + 4} ${leftX + 32} ${farY}
      L ${rightX - 32} ${farY}
      Q ${rightX - 2} ${farY + 4} ${rightX} ${farY + 28}
      L ${rightX - 2} ${rightFloor - 7}
      Q ${rightX - 8} ${rightFloor + 2} ${last.x + last.w * 0.5} ${rightFloor}
      L ${last.x} ${last.y}
      ${scallopRL()}
      L ${first.x - first.w * 0.5} ${leftFloor}
      Q ${leftX + 8} ${leftFloor + 2} ${leftX} ${leftFloor - 7}
      Z
    `;
  }
  // Mandible — rounded bottom corners.
  return `
    M ${leftX} ${first.y}
    L ${first.x - first.w * 0.5} ${first.y}
    ${scallopLR()}
    L ${last.x + last.w * 0.5} ${last.y}
    L ${rightX} ${last.y}
    L ${rightX} ${farY - cornerR}
    Q ${rightX} ${farY} ${rightX - cornerR} ${farY}
    L ${leftX + cornerR} ${farY}
    Q ${leftX} ${farY} ${leftX} ${farY - cornerR}
    Z
  `;
}

// Build a sinus shape contained within the maxilla, sitting above a span of
// posterior teeth. Floor follows the cervical line of those teeth (with
// clearance); ceiling arcs up toward the top of the maxilla.
function buildSinus(cervical, startIdx, endIdx, ceilingY) {
  const teeth = cervical.slice(startIdx, endIdx + 1);
  if (!teeth.length) return null;
  const leftX = teeth[0].x - teeth[0].w * 0.45 + 6;
  const rightX = teeth[teeth.length - 1].x + teeth[teeth.length - 1].w * 0.45 - 6;
  const maxCerv = Math.max(...teeth.map((t) => t.y)); // deepest cervical (closest to bite)
  const floorY = maxCerv - 26; // floor sits in bone, above teeth
  const midX = (leftX + rightX) / 2;
  const midCY = (floorY + ceilingY) / 2;
  const cy = midCY + (floorY - midCY) * 0.15; // label slightly below midline
  const bottomLeftX = leftX - 12;
  const bottomRightX = rightX + 12;
  const path = `
    M ${bottomLeftX + 10} ${floorY + 1}
    Q ${midX} ${floorY + 8} ${bottomRightX - 10} ${floorY + 1}
    Q ${bottomRightX + 2} ${floorY - 1} ${bottomRightX} ${floorY - 12}
    Q ${rightX + 8} ${ceilingY + 10} ${rightX - 28} ${ceilingY}
    L ${leftX + 28} ${ceilingY}
    Q ${leftX - 8} ${ceilingY + 10} ${bottomLeftX} ${floorY - 12}
    Q ${bottomLeftX - 2} ${floorY - 1} ${bottomLeftX + 10} ${floorY + 1}
    Z
  `;
  return { path, leftX, rightX, floorY, ceilingY, cx: midX, cy };
}

// ====================================================================
// Anatomy background — bone outlines + sinus zones inside maxilla + IDN
// ====================================================================
function AnatomyBackground({
  accent, hoveredId, onHover, onSelect, showSinus, showIDN,
  stage, onArchClick, upperTeeth, lowerTeeth, upperBiteY, lowerBiteY
}) {
  const isHov = (id) => hoveredId === id;
  const sinusActive = stage === 'treatment';

  const upperCerv = useMemo(
    () => cervicalPoints(upperTeeth, upperBiteY, 'upper'),
    [upperTeeth, upperBiteY]
  );
  const lowerCerv = useMemo(
    () => cervicalPoints(lowerTeeth, lowerBiteY, 'lower'),
    [lowerTeeth, lowerBiteY]
  );

  const maxillaTop = 110;
  const mandibleBottom = 740;
  const sinusCeilingY = maxillaTop + 36;

  const maxilla = bonePath(upperCerv, 'upper', maxillaTop);
  const mandible = bonePath(lowerCerv, 'lower', mandibleBottom);

  // Right sinus: posterior right (FDI 14–18, leftmost 5 on screen, indices 0..4)
  // Left sinus:  posterior left  (FDI 24–28, rightmost 5 on screen, indices 11..15)
  const sinusRight = buildSinus(upperCerv, 0, 4, sinusCeilingY);
  const sinusLeft = buildSinus(upperCerv, 11, 15, sinusCeilingY);

  return (
    <g className="anatomy-layer">
      {/* Maxilla bone outline */}
      <g style={{ pointerEvents: 'none' }}>
        <path d={maxilla}
        fill="var(--bg-1)"
        stroke="var(--anatomy-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.9" />
      </g>

      {/* Mandible bone outline */}
      <g style={{ pointerEvents: 'none' }}>
        <path d={mandible}
        fill="var(--bg-1)"
        stroke="var(--anatomy-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.9" />
      </g>

      {/* Sinus zones — inner shapes within maxilla */}
      {showSinus && [
      { id: 'sinus-right', side: 'right', shape: sinusRight },
      { id: 'sinus-left', side: 'left', shape: sinusLeft }].
      map((z) => {
        if (!z.shape) return null;
        const hov = isHov(z.id);
        return (
          <g key={z.id}
          data-anatomy-id={z.id}
          style={{ cursor: sinusActive ? 'pointer' : 'default' }}
          onMouseEnter={() => sinusActive && onHover(z.id)}
          onMouseLeave={() => sinusActive && onHover(null)}
          onClick={(e) => {if (sinusActive) {e.stopPropagation();onSelect({ kind: 'anatomy', id: z.id }, e);}}}>
            <path d={z.shape.path}
            fill={hov ? accent : 'var(--bg-0)'}
            fillOpacity={hov ? 0.09 : 0.55}
            stroke={hov ? accent : 'var(--anatomy-stroke)'}
            strokeWidth={hov ? 1.4 : 1.0}
            strokeDasharray="5 4"
            opacity={hov ? 0.95 : 0.7} style={{ opacity: "0.87" }} />
          </g>);

      })}

      {/* IDN nerve — inside mandible */}
      {showIDN && ['right', 'left'].map((side) => {
        const path = window.idnSchematicPath(side);
        return (
          <g key={`idn-${side}`} style={{ pointerEvents: 'none' }}>
            <path d={path} stroke="var(--anatomy-stroke)" strokeWidth="3.5" fill="none"
            opacity="0.30" strokeLinecap="round" />
            <path d={path} stroke="var(--anatomy-stroke)" strokeWidth="1.6" fill="none"
            opacity="0.6" strokeLinecap="round" strokeDasharray="5 4" />
          </g>);

      })}
      {showIDN && window.mentalForamenCenters().map(({ cx, cy, side }) =>
      <circle key={`foramen-${side}`} cx={cx} cy={cy} r="3.5"
      fill="var(--bg-0)" stroke="var(--anatomy-stroke)" strokeWidth="1.1"
      opacity="0.85" style={{ pointerEvents: 'none' }} />
      )}

      {/* Arch hit-areas — on top of bone, invisible until hover */}
      <g style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover('arch-upper')}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {e.stopPropagation();onArchClick('upper', e);}}>
        <rect x="100" y={maxillaTop - 18} width="1400" height="46" fill="transparent" />
        {isHov('arch-upper') &&
        <g pointerEvents="none">
            <rect x="220" y={maxillaTop - 14} width="1160" height="38" rx="19"
          fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />
            <text x="800" y={maxillaTop + 9} textAnchor="middle" fontSize="11" fill={accent}
          style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }} fontWeight="500">
              Maxilla · Upper Arch
            </text>
          </g>
        }
      </g>

      <g style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover('arch-lower')}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {e.stopPropagation();onArchClick('lower', e);}}>
        <rect x="100" y={mandibleBottom - 28} width="1400" height="46" fill="transparent" />
        {isHov('arch-lower') &&
        <g pointerEvents="none">
            <rect x="220" y={mandibleBottom - 24} width="1160" height="38" rx="19"
          fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="4 4" opacity="0.7" />
            <text x="800" y={mandibleBottom + 1} textAnchor="middle" fontSize="11" fill={accent}
          style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }} fontWeight="500">
              Mandible · Lower Arch
            </text>
          </g>
        }
      </g>
    </g>);

}

// ====================================================================
// ====================================================================
// ====================================================================
// Main hero
// ====================================================================
const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "flat",
  "accent": "#2A6FDB",
  "showSinus": true,
  "showIDN": true,
  "showNumbering": true,
  "showLeaders": true,
  "showLayoutGuides": false,
  "manualPlacementMode": false,
  "archDepth": 0
} /*EDITMODE-END*/;

function DentalHero() {
  const [t, setTweak] = window.useTweaks(DEFAULT_TWEAKS);
  const [hoveredId, setHoveredId] = useState(null);

  // ---- Workflow state ----
  const [stage, setStage] = useState('baseline');
  const [presence, setPresence] = useState({}); // toothId -> 'missing'
  const [treatments, setTreatments] = useState([]); // [{ id, scope, targets }]
  const [selection, setSelection] = useState([]);
  const [popover, setPopover] = useState(null);
  const [confirmWipe, setConfirmWipe] = useState(null);
  const [exportJson, setExportJson] = useState(null);

  const scale = 2.2;
  const biteCenter = 410;
  const archGap = 50;
  const upperBiteY = biteCenter - archGap / 2;
  const lowerBiteY = biteCenter + archGap / 2;

  const upper = useMemo(() => window.layoutArch(window.UPPER, 800, scale, { archDepth: t.archDepth }), [t.archDepth]);
  const lower = useMemo(() => window.layoutArch(window.LOWER, 800, scale, { archDepth: t.archDepth }), [t.archDepth]);

  const scaledUpper = upper.map((x) => ({ ...x, w: x.w * scale, h: x.h * scale }));
  const scaledLower = lower.map((x) => ({ ...x, w: x.w * scale, h: x.h * scale }));
  const archWidth = scaledUpper.reduce((a, b) => a + b.w, 0);
  const allTeeth = [...scaledUpper, ...scaledLower];

  const archEdentulous = useMemo(() => ({
    upper: scaledUpper.every((x) => presence[x.id] === 'missing'),
    lower: scaledLower.every((x) => presence[x.id] === 'missing')
  }), [presence]);
  const fullyEdentulous = archEdentulous.upper && archEdentulous.lower;

  const treatedTeeth = useMemo(() => {
    const s = new Set();
    treatments.forEach((tx) => {
      if (tx.scope === 'tooth') tx.targets.forEach((id) => s.add(id));
    });
    return s;
  }, [treatments]);

  const selectedTeeth = useMemo(
    () => selection.map((tid) => allTeeth.find((x) => x.id === tid)).filter(Boolean),
    [selection, allTeeth]
  );

  const selectionStats = useMemo(() => {
    const missing = selectedTeeth.filter((tooth) => presence[tooth.id] === 'missing').length;
    const present = selectedTeeth.length - missing;
    return {
      present,
      missing,
      label: selectedTeeth.slice(0, 5).map((tooth) => tooth.fdi).join(', ')
    };
  }, [selectedTeeth, presence]);

  const openTreatmentForTeeth = useCallback((toothIds, anchor) => {
    const target = toothIds.map((tid) => allTeeth.find((x) => x.id === tid)).filter(Boolean);
    if (target.length === 0) return;
    setPopover({
      mode: 'tooth',
      target,
      anchor,
      multi: target.length > 1
    });
  }, [allTeeth]);

  const openTreatmentForSelection = useCallback(() => {
    openTreatmentForTeeth(selection, {
      x: window.innerWidth / 2,
      y: Math.max(120, window.innerHeight - 190)
    });
  }, [selection, openTreatmentForTeeth]);

  // ---- Tooth click handler ----
  const handleToothSelect = useCallback((ref, evt, gesture) => {
    if (stage === 'baseline') {
      if (gesture === 'context') evt.preventDefault();
      const id = ref.id;
      const wasPresent = !presence[id];
      const willBecomeMissing = wasPresent;
      if (willBecomeMissing && treatedTeeth.has(id)) {
        setConfirmWipe({ toothId: id });
      } else {
        setPresence((p) => {
          const next = { ...p };
          if (next[id] === 'missing') delete next[id];else
          next[id] = 'missing';
          return next;
        });
      }
      return;
    }

    evt.stopPropagation();
    const id = ref.id;
    const isMultiGesture = gesture === 'context' || evt.ctrlKey || evt.metaKey;
    if (gesture === 'context') evt.preventDefault();

    if (isMultiGesture) {
      setPopover(null);
      setSelection((prev) => {
        const isSelected = prev.includes(id);
        return isSelected ? prev.filter((tid) => tid !== id) : [...prev, id];
      });
      return;
    }

    setSelection([id]);
    openTreatmentForTeeth([id], { x: evt.clientX, y: evt.clientY });
  }, [stage, presence, treatedTeeth, openTreatmentForTeeth]);

  const handleAnatomySelect = useCallback((ref, evt) => {
    if (stage !== 'treatment') return;
    const side = ref.id === 'sinus-right' ? 'right' : 'left';
    setSelection([]);
    setPopover({
      mode: 'sinus',
      target: { id: ref.id, side },
      anchor: { x: evt.clientX, y: evt.clientY }
    });
  }, [stage]);

  const handleArchClick = useCallback((arch, evt) => {
    if (stage === 'baseline') {
      const teeth = arch === 'upper' ? scaledUpper : scaledLower;
      const allMissing = teeth.every((x) => presence[x.id] === 'missing');
      setPresence((p) => {
        const next = { ...p };
        teeth.forEach((x) => {
          if (allMissing) delete next[x.id];else
          next[x.id] = 'missing';
        });
        return next;
      });
    } else {
      setSelection([]);
      setPopover({
        mode: 'arch',
        target: { arch, edentulous: archEdentulous[arch] },
        anchor: { x: evt.clientX, y: evt.clientY }
      });
    }
  }, [stage, presence, scaledUpper, scaledLower, archEdentulous]);

  // ---- Apply treatment ----
  const handleApplyTreatment = useCallback((txId, scope) => {
    const orthoIds = ['ortho-brackets', 'ortho-aligners'];
    if (scope === 'full-mouth' && orthoIds.includes(txId) && fullyEdentulous) {
      setPopover(null);
      setSelection([]);
      return;
    }
    const autoMissing = ['extraction'];
    if (autoMissing.includes(txId) && popover.mode === 'tooth') {
      setPresence((p) => {
        const next = { ...p };
        popover.target.forEach((t) => {next[t.id] = 'missing';});
        return next;
      });
    }
    setTreatments((prev) => {
      let next = [...prev];
      if (popover.mode === 'tooth') {
        const targets = popover.target.map((t) => t.id);
        const exclusive = txId === 'implant-only' || txId === 'implant-crown' ?
        ['implant-only', 'implant-crown'] :
        [txId];
        next = next.map((tx) => {
          if (tx.scope !== 'tooth' || !exclusive.includes(tx.id)) return tx;
          return { ...tx, targets: tx.targets.filter((id) => !targets.includes(id)) };
        }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0);
        const existingIdx = next.findIndex((tx) => tx.id === txId && tx.scope === 'tooth');
        if (existingIdx >= 0) {
          const merged = new Set([...next[existingIdx].targets, ...targets]);
          next[existingIdx] = { ...next[existingIdx], targets: [...merged] };
        } else {
          next.push({ id: txId, scope: 'tooth', targets });
        }
      } else if (popover.mode === 'sinus') {
        const side = popover.target.side;
        const idx = next.findIndex((tx) => tx.id === txId && tx.scope === 'sinus');
        if (idx >= 0) {
          const merged = new Set([...next[idx].targets, side]);
          next[idx] = { ...next[idx], targets: [...merged] };
        } else {
          next.push({ id: txId, scope: 'sinus', targets: [side] });
        }
      } else if (popover.mode === 'arch') {
        const arch = popover.target.arch;
        if (scope === 'full-mouth') {
          next = next.filter((tx) => !orthoIds.includes(tx.id));
          next.push({ id: txId, scope: 'full-mouth', targets: ['both'] });
        } else {
          const idx = next.findIndex((tx) => tx.id === txId && tx.scope === 'arch');
          if (idx >= 0) {
            const merged = new Set([...next[idx].targets, arch]);
            next[idx] = { ...next[idx], targets: [...merged] };
          } else {
            next.push({ id: txId, scope: 'arch', targets: [arch] });
          }
        }
      }
      return next;
    });
    setPopover(null);
    setSelection([]);
  }, [popover, fullyEdentulous]);

  // ---- Remove a single treatment (used by label cards) ----
  const removeTreatmentForTooth = (toothId, txId) => {
    setTreatments((prev) => prev.map((tx) => {
      if (tx.scope !== 'tooth' || tx.id !== txId) return tx;
      return { ...tx, targets: tx.targets.filter((id) => id !== toothId) };
    }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0));
    if (txId === 'extraction') {
      setPresence((prev) => {
        const next = { ...prev };
        delete next[toothId];
        return next;
      });
    }
  };
  const removeNonToothTreatment = (txId, target) => {
    setTreatments((prev) => prev.map((tx) => {
      if (tx.id !== txId) return tx;
      if (tx.scope === 'full-mouth') return null;
      return { ...tx, targets: tx.targets.filter((x) => x !== target) };
    }).filter(Boolean).filter((tx) => tx.scope === 'full-mouth' || tx.targets.length > 0));
  };

  const handleConfirmWipe = () => {
    const id = confirmWipe.toothId;
    setPresence((p) => ({ ...p, [id]: 'missing' }));
    setTreatments((prev) => prev.map((tx) => {
      if (tx.scope !== 'tooth') return tx;
      return { ...tx, targets: tx.targets.filter((t) => t !== id) };
    }).filter((tx) => tx.scope !== 'tooth' || tx.targets.length > 0));
    setConfirmWipe(null);
  };

  const handleAdvance = () => {setStage('treatment');setSelection([]);setPopover(null);};
  const handleBack = () => {setStage('baseline');setSelection([]);setPopover(null);};

  useEffect(() => {
    if (stage !== 'treatment') return undefined;
    const onKeyDown = (evt) => {
      if (evt.key !== 'Escape') return;
      setSelection([]);
      setPopover(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage]);

  const handleBulkArch = (arch, missing) => {
    const teeth = arch === 'upper' ? scaledUpper : scaledLower;
    setPresence((p) => {
      const next = { ...p };
      teeth.forEach((x) => {
        if (missing) next[x.id] = 'missing';else
        delete next[x.id];
      });
      return next;
    });
  };

  const handleExportLabelPositions = useCallback(async () => {
    try {
      // Prefer the in-page API when available; fall back to localStorage.
      let p = {};
      if (window.exportLabelPositions) {
        try { p = window.exportLabelPositions(); } catch (e) { p = {}; }
      } else {
        try { p = JSON.parse(localStorage.getItem('labelPositions') || '{}'); } catch (e) { p = {}; }
      }
      const txt = JSON.stringify(p, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(txt); } catch (e) { /* ignore */ }
      }
      try {
        const blob = new Blob([txt], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'label-positions.json';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      } catch (e) { /* ignore */ }
      console.log('Exported label positions:', p);
      setExportJson(txt);
      alert('Label positions exported (copied to clipboard if available, and downloaded).');
    } catch (e) {
      console.warn('Export failed', e);
      alert('Export failed - see console');
    }
  }, []);

  // Theme variables
  const themeVars = t.theme === 'dark' ? darkTheme() : flatTheme();

  return (
    <div className="hero" style={themeVars}>
      <div className="ambient">
        <div className="ambient-grid" />
      </div>

      <div className="stage-hint">
        {stage === 'baseline' ? (
          <>
            <span className="wf-step">STAGE 1</span>
            <span className="wf-sep">/</span>
            <span className="wf-help">
              {Object.keys(presence).length > 0
                ? `${Object.keys(presence).length} ${Object.keys(presence).length === 1 ? 'tooth' : 'teeth'} marked missing`
                : 'Click any tooth to toggle present ↔ missing'}
            </span>
          </>
        ) : (
          <>
            <span className="wf-step">STAGE 2</span>
            <span className="wf-sep">/</span>
            <span className="wf-help">Left-click opens treatment. Ctrl+L-click or right-click selects multiple.</span>
          </>
        )}
      </div>

      <div className="stage">
        <svg
          className="arch-svg"
          viewBox="0 0 1600 800"
          preserveAspectRatio="xMidYMid meet"
          onClick={() => {
            if (stage === 'treatment') {
              setSelection([]);
              setPopover(null);
            }
          }}
          style={{ height: "988px" }}>
          
          {/* Anatomy: maxilla + mandible bone outlines, sinus zones inside maxilla, IDN, arch hit-areas */}
          <AnatomyBackground
            accent={t.accent}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={handleAnatomySelect}
            showSinus={t.showSinus}
            showIDN={t.showIDN}
            stage={stage}
            onArchClick={handleArchClick}
            upperTeeth={scaledUpper}
            lowerTeeth={scaledLower}
            upperBiteY={upperBiteY}
            lowerBiteY={lowerBiteY} />
          
        

          {/* Bite plane indicator */}
          <line
            x1={800 - archWidth / 2 - 30} y1={biteCenter}
            x2={800 + archWidth / 2 + 30} y2={biteCenter}
            stroke="var(--ink-faint)" strokeWidth="0.6" strokeDasharray="2 4" />
          

          {/* Upper arch */}
          <g>
            {scaledUpper.map((tooth) =>
            <g key={tooth.id} transform={`translate(0, ${upperBiteY})`}>
                <Tooth
                tooth={tooth}
                jawFlip={false}
                accent={t.accent}
                isHovered={hoveredId === tooth.id}
                isSelected={selection.includes(tooth.id)}
                isInDrag={false}
                presence={presence[tooth.id] === 'missing' ? 'missing' : 'present'}
                onHover={setHoveredId}
                onSelect={handleToothSelect}
                showNumber={t.showNumbering}
                stage={stage}
                hasTreatment={treatedTeeth.has(tooth.id)} />
              
              </g>
            )}
          </g>

          {/* Lower arch */}
          <g>
            {scaledLower.map((tooth) =>
            <g key={tooth.id} transform={`translate(0, ${lowerBiteY})`}>
                <Tooth
                tooth={tooth}
                jawFlip={true}
                accent={t.accent}
                isHovered={hoveredId === tooth.id}
                isSelected={selection.includes(tooth.id)}
                isInDrag={false}
                presence={presence[tooth.id] === 'missing' ? 'missing' : 'present'}
                onHover={setHoveredId}
                onSelect={handleToothSelect}
                showNumber={t.showNumbering}
                stage={stage}
                hasTreatment={treatedTeeth.has(tooth.id)} />
              
              </g>
            )}
          </g>

          {/* Treatment overlays (Stage 2) */}
          {stage === 'treatment' &&
          <window.TreatmentLayer
            treatments={treatments}
            allTeeth={allTeeth}
            upperBiteY={upperBiteY}
            lowerBiteY={lowerBiteY}
            archWidth={archWidth}
            accent={t.accent} />

          }

          {/* Treatment labels with leader lines (Stage 2) */}
           {stage === 'treatment' && t.showLeaders &&
            <window.TreatmentLabels
             treatments={treatments}
             allTeeth={allTeeth}
             upperBiteY={upperBiteY}
             lowerBiteY={lowerBiteY}
             accent={t.accent}
             debugGuides={t.showLayoutGuides}
             manualPlacementMode={t.manualPlacementMode}
             onRemoveTooth={removeTreatmentForTooth}
             onRemoveOther={removeNonToothTreatment} />

          }
        </svg>
      </div>

      {stage === 'treatment' && selection.length > 0 && !popover &&
      <SelectionActionBar
        accent={t.accent}
        count={selection.length}
        stats={selectionStats}
        onApply={openTreatmentForSelection}
        onClear={() => {setSelection([]);setPopover(null);}} />
      }

      <footer className={`footer workflow-footer ${stage === 'baseline' ? 'baseline-footer' : ''}`}>
        {stage === 'baseline' ?
        <BaselineFooter
          accent={t.accent}
          archEdentulous={archEdentulous}
          onGreyArch={(arch) => handleBulkArch(arch, !archEdentulous[arch])}
          onAdvance={handleAdvance}
          missingCount={Object.keys(presence).length} /> :


        <TreatmentFooter
          accent={t.accent}
          treatments={treatments}
          onBack={handleBack}
          onClear={() => setTreatments([])}
          showLeaders={t.showLeaders}
          onToggleLeaders={() => setTweak('showLeaders', !t.showLeaders)}
          selectionCount={selection.length}
          selectionStats={selectionStats} />

        }
      </footer>

      <window.TreatmentPopover
        open={!!popover}
        anchor={popover ? popover.anchor : { x: 0, y: 0 }}
        mode={popover ? popover.mode : null}
        target={popover ? popover.target : null}
        archEdentulous={archEdentulous}
        allPresent={popover && popover.mode === 'tooth'
          ? popover.target.every(t => presence[t.id] !== 'missing')
          : false}
        allMissing={popover && popover.mode === 'tooth'
          ? popover.target.every(t => presence[t.id] === 'missing')
          : false}
        fullyEdentulous={fullyEdentulous}
        onApply={handleApplyTreatment}
        onClose={() => {setPopover(null);setSelection([]);}} />
      

      <window.ConfirmDialog
        open={!!confirmWipe}
        accent={t.accent}
        title="Remove planned treatments?"
        body={confirmWipe ? `Marking tooth ${confirmWipe.toothId.split('-')[1]} as missing will wipe its planned treatments. Continue?` : ''}
        confirmLabel="Mark missing + wipe"
        onConfirm={handleConfirmWipe}
        onCancel={() => setConfirmWipe(null)} />
      

      <window.TweaksPanel>
        <window.TweakSection label="Display">
          <window.TweakRadio label="Theme" value={t.theme} onChange={(v) => setTweak('theme', v)}
          options={[
          { value: 'flat', label: 'Flat' },
          { value: 'dark', label: 'Dark' }]
          } />
          <window.TweakColor label="Accent" value={t.accent} onChange={(v) => setTweak('accent', v)}
          options={['#2A6FDB', '#1F8A5B', '#D97757', '#8B5CF6', '#0F172A']} />
          <window.TweakToggle label="Show FDI Numbers" value={t.showNumbering} onChange={(v) => setTweak('showNumbering', v)} />
          <div className="twk-row twk-row-actions">
            <div className="twk-lbl"><span>Manual Placement Mode</span></div>
            <div className="twk-attached">
              <window.TweakButton label="Export" secondary={true} className="twk-btn-export" onClick={handleExportLabelPositions} />
              <button type="button" className="twk-toggle" data-on={t.manualPlacementMode ? '1' : '0'}
                role="switch" aria-checked={!!t.manualPlacementMode}
                onClick={() => setTweak('manualPlacementMode', !t.manualPlacementMode)}><i /></button>
            </div>
          </div>
        </window.TweakSection>
        <window.TweakSection label="Anatomy">
          <window.TweakToggle label="Sinus Zones" value={t.showSinus} onChange={(v) => setTweak('showSinus', v)} />
          <window.TweakToggle label="ID Nerve" value={t.showIDN} onChange={(v) => setTweak('showIDN', v)} />
        </window.TweakSection>
      </window.TweaksPanel>
      {exportJson && (
        <>
          <div className="popover-veil" onClick={() => setExportJson(null)} />
          <div className="export-modal" style={{
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: 12, zIndex: 1200,
            width: 'min(880px, 92%)', maxHeight: '80vh', overflow: 'auto', borderRadius: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>Exported label positions</strong>
              <div>
                <button className="btn-ghost" onClick={async () => {
                  try { await navigator.clipboard.writeText(exportJson); alert('Copied to clipboard'); } catch (e) { alert('Copy failed — check console'); }
                }}>Copy JSON</button>
                <button className="btn-ghost" onClick={() => setExportJson(null)} style={{ marginLeft: 8 }}>Close</button>
              </div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.4 }}>{exportJson}</pre>
          </div>
        </>
      )}
    </div>);

}

// ====================================================================
// Footers
// ====================================================================
function BaselineFooter({ accent, archEdentulous, onGreyArch, onAdvance, missingCount }) {
  return (
    <>
      <div className="wf-left">
        <span className="wf-step">STAGE 1</span>
        <span className="wf-sep">/</span>
        <span className="wf-help">
          {missingCount > 0 ?
          `${missingCount} ${missingCount === 1 ? 'tooth' : 'teeth'} marked missing` :
          'Click any tooth to toggle present ↔ missing'}
        </span>
      </div>
      <div className="wf-right">
        <button className={`btn-ghost footer-btn arch-btn ${archEdentulous.upper ? 'on' : ''}`}
        onClick={() => onGreyArch('upper')}>
          <span className="arch-glyph">⌒</span>
          {archEdentulous.upper ? 'Restore Upper' : 'Upper Edentulous'}
        </button>
        <button className={`btn-ghost footer-btn arch-btn ${archEdentulous.lower ? 'on' : ''}`}
        onClick={() => onGreyArch('lower')}>
          <span className="arch-glyph">⌣</span>
          {archEdentulous.lower ? 'Restore Lower' : 'Lower Edentulous'}
        </button>
        <button className="btn-primary footer-btn advance-btn" style={{ background: accent }} onClick={onAdvance}>
          Stage 2 <span className="arrow">-&gt;</span>
        </button>
      </div>
    </>);

}

function SelectionActionBar({ accent, count, stats, onApply, onClear }) {
  const detail = stats && count > 0
    ? `${stats.label}${count > 5 ? ', +' + (count - 5) : ''} - ${stats.present} present / ${stats.missing} missing`
    : '';
  return (
    <div className="selection-action-bar" role="status" aria-live="polite">
      <div className="selection-copy">
        <span className="selection-count">{count}</span>
        <span>{count === 1 ? 'tooth selected' : 'teeth selected'}</span>
        {detail && <span className="selection-detail">{detail}</span>}
      </div>
      <div className="selection-actions">
        <button className="btn-ghost" onClick={onClear}>Clear</button>
        <button className="btn-primary" style={{ background: accent }} onClick={onApply}>
          Apply treatment <span className="arrow">-&gt;</span>
        </button>
      </div>
    </div>);

}

function TreatmentFooter({ accent, treatments, onBack, onClear, showLeaders, onToggleLeaders, selectionCount, selectionStats }) {
  const count = treatments.reduce((sum, tx) => {
    if (tx.scope === 'full-mouth') return sum + 1;
    return sum + tx.targets.length;
  }, 0);
  return (
    <>
      <div className="wf-left">
        <button className="btn-primary footer-btn" style={{ background: accent }} onClick={onBack}>
          <span className="arrow">←</span> Stage 1
        </button>
      </div>
      <div className="wf-right">
        <button className={`btn-ghost footer-btn leader-toggle ${showLeaders ? 'on' : ''}`} onClick={onToggleLeaders}>
          {showLeaders ? 'Hide Labels' : 'Show Labels'}
        </button>
        {treatments.length > 0 &&
        <button className="btn-ghost footer-btn" onClick={onClear}>Clear Plan</button>
        }
        <button className="btn-primary footer-btn" style={{ background: accent }}>
          Export Plan <span className="arrow">→</span>
        </button>
      </div>
    </>);

}

// ====================================================================
// Themes
// ====================================================================
function flatTheme() {
  return {
    '--bg-0': '#fafaf8',
    '--bg-1': '#f3f3ef',
    '--ink': '#1a1f2e',
    '--ink-muted': 'rgba(26,31,46,0.62)',
    '--ink-faint': 'rgba(26,31,46,0.32)',
    '--tooth-fill': '#ffffff',
    '--tooth-stroke': '#1a1f2e',
    '--tooth-hover-fill': 'rgba(42,111,219,0.06)',
    '--tooth-missing-stroke': 'rgba(26,31,46,0.5)',
    '--anatomy-stroke': 'rgba(26,31,46,0.45)',
    '--card-bg': '#ffffff',
    '--card-border': 'rgba(26,31,46,0.12)',
    '--card-shadow': '0 8px 30px rgba(20,30,50,0.08)'
  };
}
function darkTheme() {
  return {
    '--bg-0': '#0e1322',
    '--bg-1': '#181f33',
    '--ink': '#eef2f8',
    '--ink-muted': 'rgba(238,242,248,0.62)',
    '--ink-faint': 'rgba(238,242,248,0.32)',
    '--tooth-fill': 'rgba(20,28,46,0.4)',
    '--tooth-stroke': '#dde4f0',
    '--tooth-hover-fill': 'rgba(125,217,224,0.10)',
    '--tooth-missing-stroke': 'rgba(238,242,248,0.42)',
    '--anatomy-stroke': 'rgba(238,242,248,0.45)',
    '--card-bg': 'rgba(20,28,46,0.92)',
    '--card-border': 'rgba(238,242,248,0.14)',
    '--card-shadow': '0 12px 40px rgba(0,0,0,0.5)'
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(<DentalHero />);
