import React, { useRef, useState, useEffect } from 'react';
import { toothPaths, UPPER, LOWER, layoutArch } from '../layout/teeth-data.jsx';
import { shapeToPath } from '../treatment-overlays/shapes.jsx';
import { useShapeEditor } from './useShapeEditor.js';
import { ControlPoint } from './ControlPoint.jsx';
import { nearestOnSegments } from './bezier-utils.js';
import { ImageImport } from './ImageImport.jsx';

// Shape catalog — id → { label, loader, w, h, toothRef?, ghostContext? }
// w/h: display pixel dimensions in the lab canvas.
// toothRef: single tooth ghost behind crown shapes.
// ghostContext: richer ghost context for bridge/dentures.
const ANATOMY_ARCH_SHAPES = {
  'arch-maxilla': {
    label: 'Maxilla (Upper Jaw)',
    loader: () => import('../shapes-data/anatomy/arch-maxilla.json'),
    w: 800, h: 400,
  },
  'arch-mandible': {
    label: 'Mandible (Lower Jaw)',
    loader: () => import('../shapes-data/anatomy/arch-mandible.json'),
    w: 800, h: 400,
  },
  'arch-sinus-right': {
    label: 'Sinus (Patient Right)',
    loader: () => import('../shapes-data/anatomy/arch-sinus-right.json'),
    w: 800, h: 400,
  },
  'arch-sinus-left': {
    label: 'Sinus (Patient Left)',
    loader: () => import('../shapes-data/anatomy/arch-sinus-left.json'),
    w: 800, h: 400,
  },
};

const ANATOMY_TEETH_SHAPES = {
  'incisor':   { label: 'Incisor',             loader: () => import('../shapes-data/anatomy/teeth/incisor.json'),   w: 28, h: 88,  isTwoPath: true },
  'canine':    { label: 'Canine',               loader: () => import('../shapes-data/anatomy/teeth/canine.json'),    w: 26, h: 100, isTwoPath: true },
  'premolar':  { label: 'Premolar (1 root)',    loader: () => import('../shapes-data/anatomy/teeth/premolar.json'),  w: 26, h: 82,  isTwoPath: true },
  'premolar1': { label: 'Premolar (2 roots)',   loader: () => import('../shapes-data/anatomy/teeth/premolar1.json'), w: 26, h: 84,  isTwoPath: true },
  'molarU':    { label: 'Upper Molar',          loader: () => import('../shapes-data/anatomy/teeth/molarU.json'),    w: 38, h: 88,  isTwoPath: true },
  'molarL':    { label: 'Lower Molar',          loader: () => import('../shapes-data/anatomy/teeth/molarL.json'),    w: 36, h: 86,  isTwoPath: true },
  'wisdomU':   { label: 'Upper Wisdom Tooth',   loader: () => import('../shapes-data/anatomy/teeth/wisdomU.json'),   w: 30, h: 70,  isTwoPath: true },
  'wisdomL':   { label: 'Lower Wisdom Tooth',   loader: () => import('../shapes-data/anatomy/teeth/wisdomL.json'),   w: 28, h: 66,  isTwoPath: true },
};

const TREATMENT_SHAPES = {
  'crown-molar-upper': {
    label: 'Upper Molar Crown',
    loader: () => import('../shapes-data/treatments/crown-molar-upper.json'),
    w: 38, h: 88,
    toothRef: 'molarU',
    jaw: 'upper',
  },
  'crown-molar-lower': {
    label: 'Lower Molar Crown',
    loader: () => import('../shapes-data/treatments/crown-molar-lower.json'),
    w: 36, h: 86,
    toothRef: 'molarL',
    jaw: 'lower',
  },
  'crown-premolar-upper': {
    label: 'Upper Premolar Crown',
    loader: () => import('../shapes-data/treatments/crown-premolar-upper.json'),
    w: 26, h: 82,
    toothRef: 'premolar',
    jaw: 'upper',
  },
  'crown-incisor-upper': {
    label: 'Upper Incisor Crown',
    loader: () => import('../shapes-data/treatments/crown-incisor-upper.json'),
    w: 28, h: 88,
    toothRef: 'incisor',
    jaw: 'upper',
  },
  'bridge-span': {
    label: 'Bridge Span (pontic)',
    loader: () => import('../shapes-data/treatments/bridge-span.json'),
    w: 76, h: 88,
    jaw: 'upper',
    ghostContext: { teeth: ['molarU', 'premolar', 'molarU'], arch: null },
  },
  'partial-denture-upper': {
    label: 'Partial Denture (Upper)',
    loader: () => import('../shapes-data/treatments/partial-denture-upper.json'),
    w: 800, h: 400,
    jaw: 'upper',
    ghostContext: { teeth: null, arch: 'arch-maxilla' },
  },
  'partial-denture-lower': {
    label: 'Partial Denture (Lower)',
    loader: () => import('../shapes-data/treatments/partial-denture-lower.json'),
    w: 800, h: 400,
    jaw: 'lower',
    ghostContext: { teeth: null, arch: 'arch-mandible' },
  },
};

const ALL_SHAPES = { ...ANATOMY_ARCH_SHAPES, ...ANATOMY_TEETH_SHAPES, ...TREATMENT_SHAPES };

const ARCH_SHAPE_IDS = new Set(Object.keys(ANATOMY_ARCH_SHAPES));
const TOOTH_SHAPE_IDS = new Set(Object.keys(ANATOMY_TEETH_SHAPES));

const ARCH_JAW = {
  'arch-maxilla':     'upper',
  'arch-sinus-right': 'upper',
  'arch-sinus-left':  'upper',
  'arch-mandible':    'lower',
};

function buildArchTeethGhosts(jaw, W, H, CX, CY) {
  const arch = jaw === 'upper' ? UPPER : LOWER;
  const biteY = jaw === 'upper' ? CY + H * 0.83 : CY + H * 0.17;
  const scale = 0.85;
  const laid = layoutArch(arch, CX + W / 2, scale, { gap: 3, archDepth: 20 });
  return laid.map(t => {
    const tw = t.w * scale, th = t.h * scale;
    const paths = toothPaths(t.type, tw, th);
    const tx = t.cx;
    const ty = biteY + t.yOffset;
    const scaleY = jaw === 'lower' ? -1 : 1;
    const scaleX = t.side === 'left' ? -1 : 1;
    return { outline: paths.outline, cervical: paths.cervical, tx, ty, tilt: t.tilt, scaleX, scaleY };
  });
}

const DEFAULT_SHAPE_ID = 'crown-molar-upper';
const LOADING_SHAPE = { id: 'loading', label: 'Loading…', segments: [] };

const MIN_ZOOM = 0.5, MAX_ZOOM = 5.0, ZOOM_STEP = 0.25;

export default function ShapeLab() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);
  const [selectedId, setSelectedId] = useState(DEFAULT_SHAPE_ID);
  const [initialShape, setInitialShape] = useState(null);
  const [phantomPoint, setPhantomPoint] = useState(null);
  const [selectedSegIdx, setSelectedSegIdx] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showPoints, setShowPoints] = useState(true);

  // For two-path tooth templates
  const [activePath, setActivePath] = useState('outline'); // 'outline' | 'cervical'
  const [fullToothShape, setFullToothShape] = useState(null);

  // Ghost anatomy shapes for composite view (arch/sinus editing)
  const [archGhosts, setArchGhosts] = useState({});  // id → shape JSON

  const meta = ALL_SHAPES[selectedId];
  const W = meta.w;
  const H = meta.h;

  const isArch = ARCH_SHAPE_IDS.has(selectedId);
  const isTooth = TOOTH_SHAPE_IDS.has(selectedId);
  const isTreatment = !isArch && !isTooth;
  // Arch and treatment shapes use arch-sized canvas so anatomy context fits.
  const CANVAS_W = (isArch || isTreatment) ? 840 : 400;
  const CANVAS_H = (isArch || isTreatment) ? 440 : 380;
  const CX = isArch ? 20 : (isTreatment ? 20 : 200);
  const CY = isArch ? 20 : (isTreatment ? 20 : 130);

  // Load the selected shape
  useEffect(() => {
    setInitialShape(null);
    setPhantomPoint(null);
    setSelectedSegIdx(null);
    setActivePath('outline');
    setFullToothShape(null);
    meta.loader().then(m => {
      const loaded = m.default ?? m;
      if (isTooth) {
        setFullToothShape(loaded);
        // Expose the outline segments as the editable shape
        setInitialShape({ ...loaded, segments: loaded.outline.segments });
      } else {
        setInitialShape(loaded);
      }
    });
  }, [selectedId]);

  // Load all arch ghosts on mount for composite view
  useEffect(() => {
    Promise.all(
      Object.entries(ANATOMY_ARCH_SHAPES).map(([id, s]) =>
        s.loader().then(m => [id, m.default ?? m])
      )
    ).then(entries => {
      setArchGhosts(Object.fromEntries(entries));
    });
  }, []);

  const [shape, setShape, { onPointerDown, onPointerMove, onPointerUp, insertPoint, deletePoint, isDragging, undo }] =
    useShapeEditor(initialShape ?? LOADING_SHAPE, W, H);

  useEffect(() => {
    if (initialShape) setShape(initialShape);
  }, [initialShape]);

  // Sync active path edits back into fullToothShape
  useEffect(() => {
    if (!isTooth || !fullToothShape || !shape.segments.length) return;
    setFullToothShape(prev => ({
      ...prev,
      [activePath]: { segments: shape.segments },
    }));
  }, [shape.segments]);

  // Path selector tab switch — save current path, load the other
  function switchPath(newPath) {
    if (newPath === activePath) return;
    setActivePath(newPath);
    setSelectedSegIdx(null);
    setPhantomPoint(null);
    // Load the other path's segments into the editor
    if (fullToothShape) {
      const pathShape = { ...fullToothShape, segments: fullToothShape[newPath].segments };
      setInitialShape(pathShape);
    }
  }

  // Ctrl-Z / Cmd-Z undo + Delete key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedSegIdx !== null) {
        e.preventDefault();
        deletePoint(selectedSegIdx);
        setSelectedSegIdx(null);
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
        setSelectedSegIdx(null);
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setShowPoints(v => !v);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSegIdx, deletePoint, undo]);

  // Single tooth ghost reference (crown shapes)
  const toothRef = meta.toothRef ? toothPaths(meta.toothRef, W, H) : null;

  const shapePath = shape.segments.length ? shapeToPath(shape, W, H) : '';

  // Ghost tooth paths for bridge-span (3 teeth)
  function bridgeGhostPaths() {
    if (!meta.ghostContext?.teeth) return null;
    const types = meta.ghostContext.teeth;
    return types.map((type, i) => {
      const tw = W / 3;
      const paths = toothPaths(type, tw, H);
      const tx = CX + i * tw;
      return { outline: paths.outline, cervical: paths.cervical, tx, ty: CY };
    });
  }

  const bridgeGhosts = meta.ghostContext?.teeth ? bridgeGhostPaths() : null;

  // Arch ghost for partial denture context
  const archGhostShape = meta.ghostContext?.arch ? archGhosts[meta.ghostContext.arch] : null;

  // Inactive path ghost for tooth template two-path editing
  function inactivePathGhost() {
    if (!isTooth || !fullToothShape) return null;
    const inactivePath = activePath === 'outline' ? 'cervical' : 'outline';
    const inactiveSegs = fullToothShape[inactivePath]?.segments;
    if (!inactiveSegs?.length) return null;
    return shapeToPath({ segments: inactiveSegs }, W, H);
  }

  const ghostPath = inactivePathGhost();

  // Ctrl+scroll zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleWheel(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
        z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))));
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  function svgCoords(e) {
    const r = svgRef.current.getBoundingClientRect();
    return [(e.clientX - r.left) / zoom, (e.clientY - r.top) / zoom];
  }

  function handleDown(segIdx, xField, yField) {
    return (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const [sx, sy] = svgCoords(e);
      onPointerDown(segIdx, xField, yField, sx, sy);
      if (xField === 'x') setSelectedSegIdx(segIdx);
    };
  }

  function handlePointerMove(e) {
    const [sx, sy] = svgCoords(e);
    onPointerMove(sx, sy);
    if (!isDragging() && showPoints) {
      const hit = nearestOnSegments(shape.segments, sx, sy, W, H, CX, CY);
      setPhantomPoint(hit);
    } else {
      setPhantomPoint(null);
    }
  }

  function handlePointerUp() { onPointerUp(); }

  function handleSVGClick() {
    if (phantomPoint && !isDragging()) {
      insertPoint(phantomPoint.segIdx, phantomPoint.t);
      setPhantomPoint(null);
    }
  }

  function handleContextMenuOnPoint(segIdx) {
    return (e) => {
      e.preventDefault();
      const seg = shape.segments[segIdx];
      if (seg?.type === 'M' || seg?.type === 'Z') return;
      deletePoint(segIdx);
      setSelectedSegIdx(null);
    };
  }

  function toSVG(nx, ny) { return [CX + nx * W, CY + ny * H]; }

  function segHandles(seg) {
    if (seg.type === 'Z') return [];
    const h = [{ xField: 'x', yField: 'y', isAnchor: true }];
    if (seg.x1 !== undefined) h.push({ xField: 'x1', yField: 'y1', isAnchor: false });
    if (seg.x2 !== undefined) h.push({ xField: 'x2', yField: 'y2', isAnchor: false });
    return h;
  }

  function handleLines() {
    return shape.segments.flatMap((seg, idx) => {
      if (!seg.x1) return [];
      const [ax, ay] = toSVG(seg.x, seg.y);
      const lines = [];
      if (seg.x1 !== undefined) {
        const [hx, hy] = toSVG(seg.x1, seg.y1);
        lines.push(<line key={`${idx}-h1`} x1={ax} y1={ay} x2={hx} y2={hy} stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 2" />);
      }
      if (seg.x2 !== undefined) {
        const [hx, hy] = toSVG(seg.x2, seg.y2);
        lines.push(<line key={`${idx}-h2`} x1={ax} y1={ay} x2={hx} y2={hy} stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 2" />);
      }
      return lines;
    });
  }

  function handleTrace(segments) {
    if (!window.confirm(`Replace current shape with ${segments.filter(s => s.type !== 'Z' && s.type !== 'M').length} traced segments?`)) return;
    setShape(prev => ({ ...prev, segments }));
    setSelectedSegIdx(null);
    setPhantomPoint(null);
    setShowImport(false);
  }

  function downloadJSON() {
    // For two-path tooth templates, download the full tooth shape (both paths).
    const toSave = isTooth && fullToothShape ? fullToothShape : shape;
    const blob = new Blob([JSON.stringify(toSave, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${toSave.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const loaded = JSON.parse(evt.target.result);
        if (isTooth && loaded.outline) {
          setFullToothShape(loaded);
          setShape({ ...loaded, segments: loaded[activePath].segments });
        } else {
          setShape(loaded);
        }
      } catch { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  }

  // Download JSON for the active path only (for debugging)
  const jsonPreview = isTooth && fullToothShape ? fullToothShape : shape;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, fontFamily: 'monospace', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Shape Lab</h2>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{ padding: '4px 8px', fontSize: 14 }}
        >
          <optgroup label="Base Anatomy — Arches &amp; Sinuses">
            {Object.entries(ANATOMY_ARCH_SHAPES).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </optgroup>
          <optgroup label="Base Anatomy — Teeth (templates)">
            {Object.entries(ANATOMY_TEETH_SHAPES).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </optgroup>
          <optgroup label="Treatments">
            {Object.entries(TREATMENT_SHAPES).map(([id, s]) => (
              <option key={id} value={id}>{s.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Path selector tabs for two-path tooth templates */}
      {isTooth && (
        <div style={{ display: 'flex', gap: 6 }}>
          {['outline', 'cervical'].map(p => (
            <button
              key={p}
              onClick={() => switchPath(p)}
              style={{
                padding: '4px 14px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: 'none',
                background: activePath === p ? '#3b82f6' : '#e5e7eb',
                color: activePath === p ? '#fff' : '#374151',
                fontWeight: activePath === p ? 600 : 400,
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <span style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>
            Editing {activePath} — other path shown as ghost
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
          <strong>Edit:</strong> Drag handles.&nbsp;
          <strong>Insert:</strong> Hover edge → click phantom dot.&nbsp;
          <strong>Delete:</strong> Right-click or select (gold) + Delete.&nbsp;
          <strong>Undo:</strong> Ctrl-Z.
        </span>
        <button
          onClick={() => setShowPoints(v => !v)}
          style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 12, background: showPoints ? undefined : '#374151', color: showPoints ? undefined : '#fff', borderRadius: 4 }}
          title="Toggle control point dots (H)"
        >
          {showPoints ? 'Hide Dots' : 'Show Dots'}
        </button>
        <button
          onClick={() => setShowImport(v => !v)}
          style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 12, background: showImport ? '#3b82f6' : undefined, color: showImport ? '#fff' : undefined, borderRadius: 4 }}
        >
          {showImport ? 'Hide Import' : 'Import Image…'}
        </button>
      </div>

      {showImport && (
        <ImageImport onTrace={handleTrace} onClose={() => setShowImport(false)} />
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                    style={{ padding: '2px 10px', cursor: 'pointer', fontSize: 14 }}>−</button>
            <span style={{ fontSize: 12, minWidth: 36, textAlign: 'center' }}>{zoom.toFixed(2)}×</span>
            <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                    style={{ padding: '2px 10px', cursor: 'pointer', fontSize: 14 }}>+</button>
            <button onClick={() => setZoom(1.0)}
                    style={{ padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: '#666' }}>Reset</button>
          </div>
          <div ref={containerRef} style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '80vh' }}>
          <svg
            ref={svgRef}
            width={CANVAS_W * zoom} height={CANVAS_H * zoom}
            style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 8, display: 'block',
                     transform: `scale(${zoom})`, transformOrigin: 'top left',
                     width: CANVAS_W * zoom, height: CANVAS_H * zoom }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleSVGClick}
            onPointerLeave={() => setPhantomPoint(null)}
          >
            {/* Composite arch ghost — other 3 anatomy shapes when editing an arch/sinus shape */}
            {isArch && Object.entries(archGhosts)
              .filter(([id]) => id !== selectedId)
              .map(([id, gs]) => {
                const path = gs?.segments?.length ? shapeToPath(gs, W, H) : '';
                return path ? (
                  <path key={id} d={path} fill="none" stroke="#ccc" strokeWidth={1} opacity={0.5}
                    transform={`translate(${CX}, ${CY})`} />
                ) : null;
              })
            }

            {/* Teeth ghosts for arch/sinus editing */}
            {isArch && (() => {
              const jaw = ARCH_JAW[selectedId];
              return buildArchTeethGhosts(jaw, W, H, CX, CY).map((g, i) => (
                <g key={i} transform={`translate(${g.tx},${g.ty}) rotate(${g.tilt}) scale(${g.scaleX},${g.scaleY})`}>
                  <path d={g.outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={0.8} opacity={0.3} />
                  <path d={g.cervical} fill="none"    stroke="#99b" strokeWidth={0.6} opacity={0.3} />
                </g>
              ));
            })()}

            {/* Full anatomy background for crown/bridge/treatment editing */}
            {isTreatment && !meta.ghostContext?.arch && (() => {
              const jaw = meta.jaw;
              if (!jaw) return null;
              const archId = jaw === 'upper' ? 'arch-maxilla' : 'arch-mandible';
              const sinusIds = jaw === 'upper' ? ['arch-sinus-right', 'arch-sinus-left'] : [];
              const archW = 800, archH = 400, archCX = 20, archCY = 20;
              return (<>
                {[archId, ...sinusIds].map(id => {
                  const gs = archGhosts[id];
                  const path = gs?.segments?.length ? shapeToPath(gs, archW, archH) : '';
                  return path ? (
                    <path key={id} d={path} fill="none" stroke="#ccc" strokeWidth={1} opacity={0.4}
                      transform={`translate(${archCX},${archCY})`} />
                  ) : null;
                })}
                {buildArchTeethGhosts(jaw, archW, archH, archCX, archCY).map((g, i) => (
                  <g key={i} transform={`translate(${g.tx},${g.ty}) rotate(${g.tilt}) scale(${g.scaleX},${g.scaleY})`}>
                    <path d={g.outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={0.8} opacity={0.25} />
                    <path d={g.cervical} fill="none"    stroke="#99b" strokeWidth={0.6} opacity={0.25} />
                  </g>
                ))}
              </>);
            })()}

            {/* Arch ghost behind partial denture */}
            {archGhostShape && (() => {
              const archPath = archGhostShape.segments?.length ? shapeToPath(archGhostShape, W, H) : '';
              return archPath ? (
                <path d={archPath} fill="none" stroke="#aac" strokeWidth={1} opacity={0.4}
                  transform={`translate(${CX}, ${CY})`} />
              ) : null;
            })()}

            {/* Ghost tooth reference — single tooth (crown shapes) */}
            {toothRef && (
              <g transform={`translate(${CX}, ${CY})`}>
                <path d={toothRef.outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={1} opacity={0.5} />
                <path d={toothRef.cervical} fill="none"    stroke="#99b" strokeWidth={0.8} opacity={0.5} />
              </g>
            )}

            {/* Ghost teeth for bridge span (3 adjacent teeth) */}
            {bridgeGhosts && bridgeGhosts.map((gt, i) => (
              <g key={i} transform={`translate(${gt.tx}, ${gt.ty})`}>
                <path d={gt.outline}  fill="#e8f0ff" stroke="#aac" strokeWidth={1} opacity={0.4} />
                <path d={gt.cervical} fill="none"    stroke="#99b" strokeWidth={0.8} opacity={0.4} />
              </g>
            ))}

            {/* Inactive path ghost for tooth templates */}
            {ghostPath && (
              <path d={ghostPath} fill="none" stroke="#a78bfa" strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
                transform={`translate(${CX}, ${CY})`} />
            )}

            {/* Active shape path */}
            {shapePath && (
              <path
                d={shapePath}
                fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round"
                transform={`translate(${CX}, ${CY})`}
              />
            )}

            {/* Bezier handle lines */}
            {showPoints && handleLines()}

            {/* Draggable control points */}
            {showPoints && shape.segments.flatMap((seg, idx) =>
              segHandles(seg).map(({ xField, yField, isAnchor }) => {
                const [sx, sy] = toSVG(seg[xField], seg[yField]);
                return (
                  <ControlPoint
                    key={`${idx}-${xField}`}
                    svgX={sx} svgY={sy} isAnchor={isAnchor}
                    selected={isAnchor && idx === selectedSegIdx}
                    onPointerDown={handleDown(idx, xField, yField)}
                    onContextMenu={isAnchor ? handleContextMenuOnPoint(idx) : undefined}
                  />
                );
              })
            )}

            {/* Phantom insertion dot */}
            {showPoints && phantomPoint && (
              <circle
                cx={phantomPoint.px} cy={phantomPoint.py} r={5}
                fill="rgba(34,197,94,0.6)" stroke="#16a34a" strokeWidth={1.5}
                style={{ cursor: 'copy', pointerEvents: 'none' }}
              />
            )}
          </svg>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ margin: '0 0 8px' }}>
            Shape JSON — {jsonPreview.label}
            {isTooth && <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}> ({activePath} active)</span>}
          </h3>
          <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12, maxHeight: 420 }}>
            {JSON.stringify(jsonPreview, null, 2)}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(jsonPreview, null, 2))}
                    style={{ padding: '6px 14px', cursor: 'pointer' }}>Copy JSON</button>
            <button onClick={downloadJSON}
                    style={{ padding: '6px 14px', cursor: 'pointer' }}>Download JSON</button>
            <label style={{ fontSize: 12, color: '#555' }}>
              Load: <input type="file" accept=".json" onChange={importFile} />
            </label>
          </div>
          {isArch ? (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Arch shape — viewBox 1600×800, displayed at {W}×{H}px.<br/>
              Drag control points to edit. Download JSON and replace<br/>
              shapes-data/anatomy/{selectedId}.json to persist edits.
            </p>
          ) : isTooth ? (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Tooth template — two paths (outline + cervical).<br/>
              Download saves both paths together as {selectedId}.json.<br/>
              Replace shapes-data/anatomy/teeth/{selectedId}.json to persist.<br/>
              This template applies to all FDI positions that use it.<br/>
              Left-side FDI positions are rendered as a mirror at runtime.
            </p>
          ) : (
            <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
              Inkscape: draw at {W}×{H} px → Save Plain SVG<br/>
              node scripts/normalize-svg.mjs shape.svg {W} {H} {selectedId}<br/>
              &gt; shapes-data/treatments/{selectedId}.json — then load here to fine-tune.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
