import React from 'react';
import { __TWEAKS_STYLE } from './tweaks-panel.jsx';
import { buildPanelSections } from '../core/treatment-panel-order.js';

// Pill sits above the Tweaks pill (which is at bottom:86px).
const PANEL_PILL_BOTTOM = 124;
// Open panel anchors above both pills so neither is covered.
const PANEL_OPEN_BOTTOM = 164;
const PANEL_RIGHT = 40;
const PAD = 16;

const TRX_STYLE = `
  .trx-panel{position:fixed;right:${PANEL_RIGHT}px;bottom:${PANEL_OPEN_BOTTOM}px;z-index:2147483645;width:280px;
    max-height:calc(100vh - ${PANEL_OPEN_BOTTOM + 16}px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .trx-pill{position:fixed;right:${PANEL_RIGHT}px;bottom:${PANEL_PILL_BOTTOM}px;z-index:2147483645;
    appearance:none;border:.5px solid rgba(255,255,255,.7);border-radius:999px;
    height:32px;padding:0 12px;background:rgba(250,249,247,.88);color:#29261b;
    -webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 10px 28px rgba(0,0,0,.16);
    font:11.5px/1.2 ui-sans-serif,system-ui,-apple-system,sans-serif;font-weight:600;
    cursor:default;transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right}
  .trx-pill:hover{background:rgba(255,255,255,.92)}
  .trx-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .trx-sect:first-child{padding-top:0}
  .trx-card{background:rgba(255,255,255,.45);border:.5px solid rgba(0,0,0,.07);border-radius:9px;
    overflow:hidden;margin-bottom:4px}
  .trx-card:last-child{margin-bottom:0}
  .trx-card-hd{font-size:11px;font-weight:600;padding:5px 10px 4px;
    border-bottom:.5px solid rgba(0,0,0,.06);color:rgba(41,38,27,.6)}
  .trx-row{display:flex;align-items:center;justify-content:space-between;
    padding:4px 10px;gap:8px}
  .trx-row:hover{background:rgba(0,0,0,.03)}
  .trx-row-lbl{flex:1;min-width:0;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .trx-rmv{appearance:none;border:0;background:transparent;padding:2px 4px;
    color:rgba(41,38,27,.35);font-size:13px;line-height:1;cursor:default;border-radius:4px}
  .trx-rmv:hover{background:rgba(0,0,0,.07);color:#29261b}
  .trx-empty{padding:20px 14px;text-align:center;color:rgba(41,38,27,.42);font-size:11px}
`;

export function TreatmentPanel({
  open,
  onOpen,
  onClose,
  treatments,
  allTeeth,
  accent,
  txLabel,
  onRemoveTooth,
  onRemoveSpan,
  onRemoveOther,
  onHoverTargets,
}) {
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({ x: PANEL_RIGHT, y: PANEL_OPEN_BOTTOM });

  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const handleRemove = (row) => {
    const { txId, scope, targets } = row;
    if (scope === 'tooth' && targets.length === 1) {
      onRemoveTooth(targets[0], txId);
    } else if (scope === 'tooth' && targets.length > 1) {
      onRemoveSpan(txId, targets);
    } else {
      targets.forEach((t) => onRemoveOther(txId, t));
    }
  };

  const sections = React.useMemo(
    () => buildPanelSections(treatments, allTeeth, txLabel),
    [treatments, allTeeth, txLabel],
  );

  if (!open) {
    return (
      <>
        <style>{__TWEAKS_STYLE}{TRX_STYLE}</style>
        <button
          type="button"
          className="trx-pill"
          aria-label="Open Treatment Plan"
          onClick={onOpen}
        >
          Treatments
        </button>
      </>
    );
  }

  return (
    <>
      <style>{__TWEAKS_STYLE}{TRX_STYLE}</style>
      <div
        ref={dragRef}
        className="trx-panel"
        data-noncommentable=""
        style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
      >
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>Treatment Plan</b>
        </div>
        <div className="twk-body">
          {sections.length === 0 ? (
            <div className="trx-empty">No treatments planned</div>
          ) : (
            sections.map((section) => (
              <div key={section.key}>
                <div className="trx-sect">{section.label}</div>
                {section.cards.map((card) => (
                  <div key={card.key} className="trx-card">
                    {card.heading && (
                      <div className="trx-card-hd">{card.heading}</div>
                    )}
                    {card.rows.map((row, i) => (
                      <div
                        key={`${row.txId}-${i}`}
                        className="trx-row"
                        onMouseEnter={() => onHoverTargets(card.toothIds.length > 0 ? card.toothIds : row.targets)}
                        onMouseLeave={() => onHoverTargets([])}
                      >
                        <span className="trx-row-lbl">{row.label}</span>
                        <button
                          type="button"
                          className="trx-rmv"
                          aria-label={`Remove ${row.label}`}
                          onClick={() => handleRemove(row)}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="twk-ft">
          <button
            className="twk-collapse"
            aria-label="Collapse Treatment Panel"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
          />
        </div>
      </div>
    </>
  );
}
