import React from 'react';
import { __TWEAKS_STYLE } from './tweaks-panel.jsx';
import { buildPanelSections } from '../core/treatment-panel-order.js';

// Fixed geometry — pills sit in a dock at the bottom-right corner, above the
// stage footer (whose action buttons occupy the corner itself); both panels
// open at the same anchor directly above the dock. Nothing is draggable.
const DOCK_BOTTOM = 116;
const DOCK_RIGHT = 40;
const PILL_H = 32;
const PANEL_BOTTOM = DOCK_BOTTOM + PILL_H + 18;

export const __PANEL_ANCHOR = { right: DOCK_RIGHT, bottom: PANEL_BOTTOM };

const DOCK_STYLE = `
  .pnl-dock{position:fixed;right:${DOCK_RIGHT}px;bottom:${DOCK_BOTTOM}px;z-index:2147483645;
    display:flex;gap:8px;transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right}
  .pnl-pill{appearance:none;display:inline-flex;align-items:center;justify-content:center;
    border:.5px solid rgba(255,255,255,.7);border-radius:14px;
    height:${PILL_H}px;padding:0 14px;background:rgba(250,249,247,.88);color:#29261b;
    -webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 10px 28px rgba(0,0,0,.16);
    font:12px/1 var(--sans,ui-sans-serif,system-ui,-apple-system,sans-serif);font-weight:600;
    cursor:default}
  .pnl-pill:hover{background:rgba(255,255,255,.92)}
  .pnl-pill[data-on="1"]{background:#29261b;color:#faf9f7;border-radius:14px;
    border-color:rgba(0,0,0,.25);
    box-shadow:0 1px 0 rgba(255,255,255,.12) inset,0 10px 28px rgba(0,0,0,.16)}
  .pnl-pill[data-on="1"]:hover{background:#3a362a}
`;

const TRX_STYLE = `
  .trx-panel{position:fixed;right:${DOCK_RIGHT}px;bottom:${PANEL_BOTTOM}px;z-index:2147483645;width:280px;
    max-height:calc(100vh - ${PANEL_BOTTOM + 16}px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 var(--sans,ui-sans-serif,system-ui,-apple-system,sans-serif);overflow:hidden}
  .trx-sect{display:flex;align-items:center;gap:8px;
    font-size:9.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
    color:rgba(41,38,27,.38);padding:12px 2px 7px}
  .trx-sect::after{content:"";flex:1;height:.5px;background:rgba(41,38,27,.16)}
  .trx-sect:first-child{padding-top:2px}
  .trx-card{display:flex;align-items:flex-start;
    background:rgba(255,255,255,.45);border:.5px solid rgba(0,0,0,.07);border-radius:9px;
    overflow:hidden;margin-bottom:4px}
  .trx-card:last-child{margin-bottom:0}
  .trx-card-num{flex:0 0 auto;min-width:26px;padding:5px 6px 5px 10px;
    font-size:11px;font-weight:700;line-height:1.4;
    color:rgba(41,38,27,.55);font-variant-numeric:tabular-nums;white-space:nowrap}
  .trx-card-rows{flex:1;min-width:0;display:flex;flex-direction:column}
  .trx-row{display:flex;align-items:center;justify-content:space-between;
    padding:5px 10px;gap:8px}
  .trx-card-num+.trx-card-rows .trx-row{padding-left:0}
  .trx-row+.trx-row{border-top:.5px solid rgba(0,0,0,.05)}
  .trx-row:hover{background:rgba(0,0,0,.03)}
  .trx-row-lbl{flex:1;min-width:0;font-size:11px;line-height:1.4;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .trx-rmv{appearance:none;border:0;background:transparent;padding:2px 4px;
    color:rgba(41,38,27,.35);font-size:13px;line-height:1;cursor:default;border-radius:4px}
  .trx-rmv:hover{background:rgba(0,0,0,.07);color:#29261b}
  .trx-empty{padding:20px 14px;text-align:center;color:rgba(41,38,27,.42);font-size:11px}
`;

// Bottom-right pill dock. Owns both pills so they sit side by side in one flex
// row; the panels themselves render nothing when closed. Clicking a pill
// toggles its panel; the host keeps the two mutually exclusive.
export function PanelDock({ showTreatments, openPanel, onToggle }) {
  return (
    <>
      <style>{DOCK_STYLE}</style>
      <div className="pnl-dock" data-noncommentable="">
        {showTreatments && (
          <button
            type="button"
            className="pnl-pill"
            data-on={openPanel === 'treatment' ? '1' : '0'}
            aria-pressed={openPanel === 'treatment'}
            aria-label="Toggle Treatment Plan"
            onClick={() => onToggle('treatment')}
          >
            Treatments
          </button>
        )}
        <button
          type="button"
          className="pnl-pill"
          data-on={openPanel === 'tweaks' ? '1' : '0'}
          aria-pressed={openPanel === 'tweaks'}
          aria-label="Toggle Tweaks"
          onClick={() => onToggle('tweaks')}
        >
          Tweaks
        </button>
      </div>
    </>
  );
}

export function TreatmentPanel({
  open,
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
  const handleRemove = (row) => {
    const { txId, scope, targets, collapse } = row;
    if (collapse) {
      // Area treatment run — remove only this run's targets one-by-one;
      // removeTreatmentForTooth prunes the tx when the last target is gone.
      targets.forEach((t) => onRemoveTooth(t, txId));
    } else if (scope === 'tooth' && targets.length === 1) {
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

  if (!open) return null;

  return (
    <>
      <style>{__TWEAKS_STYLE}{TRX_STYLE}</style>
      <div className="trx-panel" data-noncommentable="">
        <div className="twk-hd">
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
                      <div className="trx-card-num">{card.heading}</div>
                    )}
                    <div className="trx-card-rows">
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
            onClick={onClose}
          />
        </div>
      </div>
    </>
  );
}
