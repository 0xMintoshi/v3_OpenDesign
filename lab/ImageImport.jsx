import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  drawToCanvas,
  applyThreshold,
  applyPolygonMask,
  parseSvgPath,
  normalizeSegments,
  fitToBoundingBox,
} from './trace-pipeline.js';
import { fetchAiRoi } from './ai-roi.js';

const DEFAULT_THRESHOLD = 0.5;

/**
 * Image import panel for the Shape Lab.
 * Two modes:
 *   clean — potrace straight on the thresholded image (dental atlas diagrams)
 *   ai    — Claude vision API returns tooth polygon → mask → potrace (X-rays / photos)
 *
 * Props:
 *   onTrace(segments) — called with the resulting segment array
 *   onClose()         — called when user dismisses the panel
 */
export function ImageImport({ onTrace, onClose }) {
  const [mode,      setMode     ] = useState('clean'); // 'clean' | 'ai'
  const [imgSrc,    setImgSrc   ] = useState(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [invert,    setInvert   ] = useState(false);
  const [fitBox,    setFitBox   ] = useState(true);
  const [polygon,   setPolygon  ] = useState(null);   // Array<{x,y}> percentages, from AI
  const [status,    setStatus   ] = useState('');
  const [aiStatus,  setAiStatus ] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const previewRef = useRef(null);   // visible preview canvas
  const overlayRef = useRef(null);   // polygon overlay canvas (ai mode)
  const workRef    = useRef(null);   // offscreen work canvas (for potrace)
  const imgRef     = useRef(null);   // hidden <img> element

  // Redraw preview whenever threshold/invert/image changes
  useEffect(() => {
    if (!imgSrc || !previewRef.current || !imgRef.current) return;
    const img = imgRef.current;
    if (!img.complete) return;
    drawToCanvas(img, previewRef.current);
    applyThreshold(previewRef.current, threshold, invert);
  }, [imgSrc, threshold, invert]);

  // Redraw polygon overlay whenever polygon changes
  const drawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const preview = previewRef.current;
    if (!overlay || !preview) return;
    overlay.width  = preview.width;
    overlay.height = preview.height;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!polygon || polygon.length < 3) return;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.fillStyle   = 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    polygon.forEach(({ x, y }, i) => {
      const px = (x / 100) * overlay.width;
      const py = (y / 100) * overlay.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Vertex dots
    polygon.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc((x / 100) * overlay.width, (y / 100) * overlay.height, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
    });
  }, [polygon]);

  useEffect(() => { drawOverlay(); }, [drawOverlay]);

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setStatus('');
    setAiStatus('');
    setPolygon(null);
    const url = URL.createObjectURL(file);
    setImgSrc(url);
  }

  function handleInputChange(e) { loadFile(e.target.files[0]); }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    loadFile(e.dataTransfer.files[0]);
  }

  async function handleGetRoi() {
    if (!imgRef.current || !imgRef.current.complete) return;
    setAiStatus('Calling Claude vision API…');
    setPolygon(null);
    try {
      // Convert current (downsampled) preview canvas to data URL for the API
      const work = workRef.current;
      drawToCanvas(imgRef.current, work);
      const dataUrl = work.toDataURL('image/png');
      const pts = await fetchAiRoi(dataUrl);
      setPolygon(pts);
      setAiStatus(`AI ROI ready — ${pts.length} vertices. Adjust threshold then click Trace.`);
    } catch (err) {
      setAiStatus(`AI error: ${err.message}`);
    }
  }

  async function handleTrace() {
    if (!imgRef.current || !imgRef.current.complete) return;

    const work = workRef.current;
    drawToCanvas(imgRef.current, work);

    if (mode === 'ai' && polygon) {
      applyPolygonMask(work, polygon);
    }

    applyThreshold(work, threshold, invert);

    setStatus('Tracing…');
    try {
      const { loadFromCanvas } = await import('potrace-wasm');
      const svgString = await loadFromCanvas(work);
      const rawSegs   = parseSvgPath(svgString);
      if (!rawSegs) { setStatus('No outline found — try adjusting threshold.'); return; }

      let segs = normalizeSegments(rawSegs, work.width, work.height);
      if (fitBox) segs = fitToBoundingBox(segs);

      const count = segs.filter(s => s.type !== 'Z' && s.type !== 'M').length;
      setStatus(`Done — ${count} segments.`);
      onTrace(segs);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  const dropZoneStyle = {
    border: `2px dashed ${isDragOver ? '#3b82f6' : '#ccc'}`,
    borderRadius: 8,
    padding: 20,
    textAlign: 'center',
    cursor: 'pointer',
    background: isDragOver ? '#eff6ff' : '#fafafa',
    color: '#666',
    fontSize: 13,
  };

  const modeTabStyle = (m) => ({
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
    borderRadius: 4,
    border: 'none',
    background: mode === m ? '#3b82f6' : '#e5e7eb',
    color: mode === m ? '#fff' : '#374151',
    fontWeight: mode === m ? 600 : 400,
  });

  return (
    <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fd', borderRadius: 8, padding: 16, marginTop: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Import from Image</strong>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' }}
        >
          ✕
        </button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }} data-testid="mode-toggle">
        <button style={modeTabStyle('clean')} onClick={() => { setMode('clean'); setPolygon(null); setAiStatus(''); }}>
          Clean trace
        </button>
        <button style={modeTabStyle('ai')} onClick={() => setMode('ai')}>
          AI-assisted (X-ray)
        </button>
      </div>

      {mode === 'ai' && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
          Uses Claude vision to detect the tooth region, then traces it. Requires{' '}
          <code>VITE_ANTHROPIC_API_KEY</code> in <code>.env.local</code>.
        </div>
      )}

      {/* Drop zone */}
      {!imgSrc ? (
        <div
          style={dropZoneStyle}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('img-file-input').click()}
        >
          Drop an image here or click to browse
          <br />
          <span style={{ fontSize: 11, color: '#999' }}>PNG, JPG — max 1024px (auto-downsampled)</span>
          <input
            id="img-file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Preview + overlay */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas
              ref={previewRef}
              style={{ border: '1px solid #ccc', borderRadius: 4, maxWidth: 240, maxHeight: 200, imageRendering: 'pixelated', display: 'block' }}
            />
            {mode === 'ai' && (
              <canvas
                ref={overlayRef}
                style={{ position: 'absolute', top: 0, left: 0, maxWidth: 240, maxHeight: 200, pointerEvents: 'none' }}
              />
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
            <label style={{ fontSize: 12 }}>
              Threshold: {Math.round(threshold * 100)}%
              <input
                type="range" min={0} max={100} value={Math.round(threshold * 100)}
                onChange={e => setThreshold(+e.target.value / 100)}
                style={{ width: '100%' }}
              />
            </label>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={invert} onChange={e => setInvert(e.target.checked)} />
              Invert (dark background / light outline)
            </label>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={fitBox} onChange={e => setFitBox(e.target.checked)} />
              Fit to bounding box
            </label>

            {/* AI-mode extra: Get ROI button */}
            {mode === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  data-testid="get-roi-btn"
                  onClick={handleGetRoi}
                  style={{ padding: '5px 14px', cursor: 'pointer', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12 }}
                >
                  Get AI ROI
                </button>
                {aiStatus && (
                  <span
                    data-testid="ai-status"
                    style={{ fontSize: 11, color: aiStatus.startsWith('AI error') ? '#dc2626' : '#6d28d9' }}
                  >
                    {aiStatus}
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                data-testid="trace-btn"
                onClick={handleTrace}
                style={{ padding: '5px 14px', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4 }}
              >
                Trace
              </button>
              <button
                onClick={() => { setImgSrc(null); setStatus(''); setAiStatus(''); setPolygon(null); }}
                style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
              >
                Clear
              </button>
            </div>
            {status && (
              <span style={{ fontSize: 11, color: status.startsWith('Error') ? '#dc2626' : '#16a34a' }}>
                {status}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hidden image element for drawToCanvas */}
      {imgSrc && (
        <img
          ref={imgRef}
          src={imgSrc}
          style={{ display: 'none' }}
          onLoad={() => {
            if (previewRef.current) {
              drawToCanvas(imgRef.current, previewRef.current);
              applyThreshold(previewRef.current, threshold, invert);
            }
          }}
        />
      )}
      {/* Offscreen work canvas */}
      <canvas ref={workRef} style={{ display: 'none' }} />
    </div>
  );
}
