#!/usr/bin/env node
/**
 * CLI wrapper for the trace pipeline.
 * Usage: node scripts/trace-image.mjs --image <path> --shape <slug> [--threshold 0.5] [--invert] [--no-fit]
 *
 * Writes (or overwrites) shapes-data/<slug>.json with the traced segments.
 * Reads existing JSON to preserve id/label/metadata if present.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createCanvas, loadImage } from 'canvas';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Parse args
const { values } = parseArgs({
  options: {
    image:     { type: 'string' },
    shape:     { type: 'string' },
    threshold: { type: 'string', default: '0.5' },
    invert:    { type: 'boolean', default: false },
    'no-fit':  { type: 'boolean', default: false },
  },
});

if (!values.image || !values.shape) {
  console.error('Usage: node scripts/trace-image.mjs --image <path> --shape <slug>');
  process.exit(1);
}

const threshold = parseFloat(values.threshold);
const invert = values.invert;
const fitBox = !values['no-fit'];

// Dynamic import of trace-pipeline (ESM in Vite project — import directly)
const { applyThreshold, parseSvgPath, normalizeSegments, fitToBoundingBox } = await import('../lab/trace-pipeline.js');

// Load image with node-canvas
const imgPath = path.resolve(values.image);
const img = await loadImage(imgPath);

const MAX_SIDE = 1024;
let w = img.width, h = img.height;
if (Math.max(w, h) > MAX_SIDE) {
  if (w >= h) { h = Math.round((h / w) * MAX_SIDE); w = MAX_SIDE; }
  else        { w = Math.round((w / h) * MAX_SIDE); h = MAX_SIDE; }
}

const canvas = createCanvas(w, h);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, w, h);

// applyThreshold works with node-canvas ctx (same getImageData/putImageData API)
applyThreshold(canvas, threshold, invert);

// potrace-wasm loadFromCanvas also works with node-canvas (it reads RGBA pixel data)
const { loadFromCanvas } = (await import('potrace-wasm')).default ?? await import('potrace-wasm');
const svgString = await loadFromCanvas(canvas);

const rawSegs = parseSvgPath(svgString);
if (!rawSegs) {
  console.error('No outline found — try adjusting --threshold or --invert.');
  process.exit(1);
}

let segments = normalizeSegments(rawSegs, w, h);
if (fitBox) segments = fitToBoundingBox(segments);

// Read existing shape JSON to preserve metadata, or scaffold a new one
const outPath = path.join(ROOT, 'shapes-data', `${values.shape}.json`);
let shape = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { id: values.shape, label: values.shape };

shape.segments = segments;
shape.source = { image: path.relative(ROOT, imgPath), threshold, invert, tracedAt: new Date().toISOString() };

writeFileSync(outPath, JSON.stringify(shape, null, 2));
const count = segments.filter(s => s.type !== 'Z' && s.type !== 'M').length;
console.log(`Traced ${count} segments → ${path.relative(ROOT, outPath)}`);
