import React from 'react';
import { __TWEAKS_STYLE, PILL_BOTTOM, PILL_H, UNDO_CLEARANCE } from './tweaks-panel.jsx';
import { buildPanelSections } from '../core/treatment-panel-order.js';
import { MEDISAVE_BUNDLE_IDS, isBundleable, getConflictingTreatmentIds } from '../core/conflict-rules.js';
import { txRef as txRefOf } from '../core/mv-sessions.js';

// Fixed geometry — pills own the bottom-right corner; both panels open directly
// above the pills. Nothing is draggable.
const DOCK_RIGHT = 40;
const PANEL_BOTTOM = PILL_BOTTOM + PILL_H + 18;

export const __PANEL_ANCHOR = { right: DOCK_RIGHT, bottom: PANEL_BOTTOM };

const DOCK_STYLE = `
  .pnl-dock{position:fixed;right:${DOCK_RIGHT}px;bottom:${PILL_BOTTOM}px;z-index:2147483645;
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
    max-height:calc(100vh - ${PANEL_BOTTOM + 16 + UNDO_CLEARANCE}px);display:flex;flex-direction:column;
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
  .trx-empty{padding:22px 16px;text-align:center;color:var(--ink-muted);font-size:12px;line-height:1.5}
  .trx-add{appearance:none;border:0;background:transparent;padding:2px 4px;
    color:rgba(41,38,27,.35);font-size:13px;line-height:1;cursor:default;border-radius:4px}
  .trx-add:hover{background:rgba(0,0,0,.07);color:#29261b}
  .trx-add[data-on="1"]{background:rgba(0,0,0,.07);color:#29261b}
  .trx-chev{display:inline-block;width:6px;height:6px;border-right:1.5px solid currentColor;
    border-bottom:1.5px solid currentColor;transform:translateY(1px) rotate(-135deg)}
  .trx-visit{display:inline-flex;align-items:center;gap:3px;flex:0 0 auto;
    height:15px;padding:0 5px;border-radius:7px;
    background:rgba(41,38,27,.08);color:rgba(41,38,27,.62);
    font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
    white-space:nowrap}
  .trx-visit-x{appearance:none;border:0;background:transparent;padding:0;margin:0 -1px 0 0;
    color:inherit;font-size:10px;line-height:1;cursor:default;opacity:.6}
  .trx-visit-x:hover{opacity:1}
  .trx-menu{margin:0 10px 6px;padding:5px 0;border-radius:8px;
    background:rgba(255,255,255,.72);border:.5px solid rgba(0,0,0,.08)}
  .trx-card-num+.trx-card-rows .trx-menu{margin-left:0}
  .trx-menu-hd{padding:4px 9px 3px;font-size:8.5px;font-weight:700;letter-spacing:.09em;
    text-transform:uppercase;color:rgba(41,38,27,.38)}
  .trx-menu-it{display:block;width:100%;text-align:left;appearance:none;border:0;
    background:transparent;padding:4px 9px;font:inherit;font-size:10.5px;line-height:1.35;
    color:#29261b;cursor:default;border-radius:5px}
  .trx-menu-it:hover{background:rgba(0,0,0,.06)}
  .trx-menu-none{padding:4px 9px;font-size:10px;color:rgba(41,38,27,.4);line-height:1.35}
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
  onAddToVisit,
  onJoinVisit,
  onLeaveVisit,
}) {
  // Which row's + menu is open, addressed by `${ref}|${txId}` so two rows of the same
  // treatment on different teeth do not share one open menu.
  const [menuKey, setMenuKey] = React.useState(null);
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

  // "Visit 1" reads as a clinic appointment; the stored tag is "s1".
  const visitLabel = (session) => `Visit ${String(session).replace(/^s/, '')}`;

  // MediSave treatments that can be added to this row's teeth. A treatment that would
  // conflict with the row's own is excluded rather than offered and then silently
  // stripped — getConflictingTreatmentIds is the same rule the chart applies on apply,
  // so the menu cannot drift from it.
  const addOptionsFor = (row) => MEDISAVE_BUNDLE_IDS.filter((id) => {
    if (id === row.txId) return false;
    if (getConflictingTreatmentIds(id).includes(row.txId)) return false;
    // Spans need a contiguous multi-tooth selection; a panel row cannot supply one.
    if (id === 'implant-bridge-span') return false;
    return true;
  });

  // Other MediSave entries in the plan that this row could join. Same-bundle rows are
  // left out; a row in a DIFFERENT bundle stays in, because joining merges the two.
  const joinOptionsFor = (row) => {
    const seen = new Set([row.ref]);
    const out = [];
    for (const tx of treatments) {
      if (!isBundleable(tx.id) || seen.has(txRefOf(tx))) continue;
      if (row.session && tx.session === row.session) continue;
      seen.add(txRefOf(tx));
      out.push(tx);
    }
    return out;
  };

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
            <div className="trx-empty">Click a tooth to add a treatment.</div>
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
                      {card.rows.map((row, i) => {
                        // Card-scoped: a cross-jaw entry gives two cards from ONE ref,
                        // so `${row.ref}|${row.txId}` alone opened both menus at once.
                        const rowKey = `${card.key}|${row.ref}|${row.txId}`;
                        const bundleable = isBundleable(row.txId);
                        const addOpts = bundleable ? addOptionsFor(row) : [];
                        const joinOpts = bundleable ? joinOptionsFor(row) : [];
                        return (
                        <React.Fragment key={`${row.txId}-${i}`}>
                        <div
                          className="trx-row"
                          onMouseEnter={() => onHoverTargets(card.toothIds.length > 0 ? card.toothIds : row.targets)}
                          onMouseLeave={() => onHoverTargets([])}
                        >
                          <span className="trx-row-lbl">{row.label}</span>
                          {row.session && (
                            <span className="trx-visit" title="Shares one $830 consumable">
                              {visitLabel(row.session)}
                              <button
                                type="button"
                                className="trx-visit-x"
                                aria-label={`Remove ${row.label} from ${visitLabel(row.session)}`}
                                onClick={() => onLeaveVisit(row.ref)}
                              >✕</button>
                            </span>
                          )}
                          {bundleable && (
                            <button
                              type="button"
                              className="trx-add"
                              data-on={menuKey === rowKey ? '1' : '0'}
                              aria-expanded={menuKey === rowKey}
                              aria-label={menuKey === rowKey
                                ? `Close the visit menu for ${row.label}`
                                : `Add to the same visit as ${row.label}`}
                              onClick={() => setMenuKey((k) => (k === rowKey ? null : rowKey))}
                            >{menuKey === rowKey ? <i className="trx-chev" /> : '+'}</button>
                          )}
                          <button
                            type="button"
                            className="trx-rmv"
                            aria-label={`Remove ${row.label}`}
                            onClick={() => handleRemove(row)}
                          >✕</button>
                        </div>
                        {menuKey === rowKey && (
                          <div className="trx-menu">
                            <div className="trx-menu-hd">Add Another MediSave Procedure</div>
                            {addOpts.length === 0 ? (
                              <div className="trx-menu-none">Nothing else applies here.</div>
                            ) : addOpts.map((id) => (
                              <button
                                type="button"
                                key={id}
                                className="trx-menu-it"
                                onClick={() => { onAddToVisit(id, row.targets, row.ref); setMenuKey(null); }}
                              >{txLabel[id] ?? id}</button>
                            ))}
                            {joinOpts.length > 0 && (
                              <div className="trx-menu-hd">Join</div>
                            )}
                            {joinOpts.map((tx) => (
                              <button
                                type="button"
                                key={txRefOf(tx)}
                                className="trx-menu-it"
                                onClick={() => { onJoinVisit(row.ref, txRefOf(tx)); setMenuKey(null); }}
                              >{txLabel[tx.id] ?? tx.id}{tx.session ? ` · ${visitLabel(tx.session)}` : ''}</button>
                            ))}
                          </div>
                        )}
                        </React.Fragment>
                        );
                      })}
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
