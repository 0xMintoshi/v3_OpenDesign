import React, { useRef, useState, useEffect } from 'react';
import { drawToCanvas, applyThreshold, parseSvgPath, normalizeSegments, fitToBoundingBox } from './trace-pipeline.js';

const DEFAULT_THRESHOLD = 0.5;

/**
 * Image import panel for the Shape Lab.
 * Accepts an image file via drop or browse, lets user tune threshold,
 * then traces it via potrace-wasm and returns normalized shape segments.
 *
 * Props:
 *   onTrace(segments) — called with the resulting segment array
 *   onClose()         — called when user dismisses the panel
 */
export function ImageImport({ onTrace, onClose }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [, setImgFile] = useState(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [invert, setInvert] = useState(false);
  const [fitBox, setFitBox] = useState(true);
  const [status, setStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const previewRef = useRef(null);   // visible preview canvas
  const workRef    = useRef(null);   // offscreen work canvas (for potrace)
  const imgRef     = useRef(null);   // hidden <img> element

  // Redraw preview whenever threshold/invert/image changes
  useEffect(() => {
    if (!imgSrc || !previewRef.current || !imgRef.current) return;
    const img = imgRef.current;
    if (!img.complete) return;
    const canvas = previewRef.current;
    drawToCanvas(img, canvas);
    applyThreshold(canvas, threshold, invert);
  }, [imgSrc, threshold, invert]);

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setImgFile(file);
    setStatus('');
    const url = URL.createObjectURL(file);
    setImgSrc(url);
  }

  function handleInputChange(e) {
    loadFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    loadFile(file);
  }

  async function handleTrace() {
    if (!imgRef.current || !imgRef.current.complete) return;

    // Build a fresh work canvas with threshold applied
    const work = workRef.current;
    drawToCanvas(imgRef.current, work);
    applyThreshold(work, threshold, invert);

    setStatus('Tracing…');
    try {
      const { loadFromCanvas } = await import('potrace-wasm');
      const svgString = await loadFromCanvas(work);
      const rawSegs = parseSvgPath(svgString);
      if (!rawSegs) { setStatus('No outline found — try adjusting threshold.'); return; }

      let segs = normalizeSegments(rawSegs, work.width, work.height);
      if (fitBox) segs = fitToBoundingBox(segs);

      setStatus(`Done — ${segs.filter(s => s.type !== 'Z' && s.type !== 'M').length} segments.`);
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

  return (
    <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fd', borderRadius: 8, padding: 16, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 13 }}>Import from Image</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666' }}>✕</button>
      </div>

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
          <input id="img-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <canvas
            ref={previewRef}
            style={{ border: '1px solid #ccc', borderRadius: 4, maxWidth: 240, maxHeight: 200, imageRendering: 'pixelated' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
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
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleTrace} style={{ padding: '5px 14px', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4 }}>
                Trace
              </button>
              <button onClick={() => { setImgSrc(null); setImgFile(null); setStatus(''); }}
                      style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>
                Clear
              </button>
            </div>
            {status && <span style={{ fontSize: 11, color: status.startsWith('Error') ? '#dc2626' : '#16a34a' }}>{status}</span>}
          </div>
        </div>
      )}

      {/* Hidden image element for drawing to canvas */}
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
      {/* Offscreen work canvas (not displayed) */}
      <canvas ref={workRef} style={{ display: 'none' }} />
    </div>
  );
}
