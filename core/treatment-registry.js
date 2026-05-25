// Pure data — no React, no imports from other layers (core boundary rule).
// Maps treatment ID → { scope, category, label, shapeId }
export const VISUAL_REGISTRY = {
  // ── tooth-scoped ──────────────────────────────────────────────────────────
  extraction:           { scope: 'tooth',      category: 'tooth',      label: 'Extraction',              shapeId: null },
  'implant-crown':      { scope: 'tooth',      category: 'tooth',      label: 'Implant + Crown',          shapeId: 'crown-molar-upper' },
  'implant-only':       { scope: 'tooth',      category: 'tooth',      label: 'Implant Only',             shapeId: null },
  crown:                { scope: 'tooth',      category: 'tooth',      label: 'Crown',                    shapeId: 'crown-molar-upper' },
  'socket-preservation':{ scope: 'tooth',      category: 'tooth',      label: 'Socket Preservation',      shapeId: null },
  'simultaneous-graft': { scope: 'tooth',      category: 'tooth',      label: 'Simultaneous Bone Graft',  shapeId: null },
  gbr:                  { scope: 'tooth',      category: 'tooth',      label: 'GBR',                      shapeId: null },
  // ── span (multi-tooth, uses tooth scope state model) ─────────────────────
  'bridge-span':        { scope: 'tooth',      category: 'span',       label: 'Bridge',                   shapeId: 'bridge-span' },
  // ── sinus-scoped ──────────────────────────────────────────────────────────
  'sinus-lift':         { scope: 'sinus',      category: 'sinus',      label: 'Complex Sinus Lift',       shapeId: null },
  // ── arch-scoped ───────────────────────────────────────────────────────────
  alveolectomy:         { scope: 'arch',       category: 'arch',       label: 'Alveolectomy',             shapeId: null },
  'complete-denture':   { scope: 'arch',       category: 'arch',       label: 'Complete Denture',         shapeId: null },
  'partial-denture-upper': { scope: 'arch',    category: 'arch',       label: 'Partial Denture (Upper)',  shapeId: 'partial-denture-upper' },
  'partial-denture-lower': { scope: 'arch',    category: 'arch',       label: 'Partial Denture (Lower)',  shapeId: 'partial-denture-lower' },
  // ── full-mouth-scoped ─────────────────────────────────────────────────────
  'ortho-brackets':     { scope: 'full-mouth', category: 'full-mouth', label: 'Brackets + Archwire',      shapeId: null },
  'ortho-aligners':     { scope: 'full-mouth', category: 'full-mouth', label: 'Clear Aligners',           shapeId: null },
};

/** @returns {object|null} */
export function registryFor(id) {
  return VISUAL_REGISTRY[id] ?? null;
}
