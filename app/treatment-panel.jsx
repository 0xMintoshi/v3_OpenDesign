import React from 'react';
import { __TWEAKS_STYLE, PILL_BOTTOM, PILL_H, UNDO_CLEARANCE } from './tweaks-panel.jsx';
import { buildPanelSections } from '../core/treatment-panel-order.js';
import { MEDISAVE_BUNDLE_IDS, isBundleable, getConflictingTreatmentIds, MANUAL_MV_ID } from '../core/conflict-rules.js';
import { CPF_TABLE_CODES } from '../core/cpf-tables.js';

// Fixed geometry — pills own the bottom-right corner; both panels open directly
// above the pills. Nothing is draggable.
const DOCK_RIGHT = 40;
const PANEL_BOTTOM = PILL_BOTTOM + PILL_H + 18;

export const __PANEL_ANCHOR = { right: DOCK_RIGHT, bottom: PANEL_BOTTOM };

const DOCK_STYLE = `
  .pnl-dock{position:fixed;right:${DOCK_RIGHT}px;bottom:${PILL_BOTTOM}px;z-index:2147483645;
    display:flex;gap:8px;transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right}
  .pnl-pill{appearance:none;display:inline-flex;align-items:center;justify-content:center;
    border:.5px solid var(--panel-border,color-mix(in oklch, var(--panel-lift,#fff) 70%, transparent));border-radius:14px;
    height:${PILL_H}px;padding:0 14px;background:var(--panel-pill-bg,rgba(250,249,247,.88));color:var(--panel-ink,#29261b);
    -webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);
    box-shadow:0 1px 0 var(--panel-inset,rgba(255,255,255,.5)) inset,var(--panel-pill-shadow,0 10px 28px rgba(0,0,0,.16));
    font:12px/1 var(--sans,ui-sans-serif,system-ui,-apple-system,sans-serif);font-weight:600;
    cursor:default}
  .pnl-pill:hover{background:var(--panel-pill-hover,color-mix(in oklch, var(--panel-lift,#fff) 92%, transparent))}
  .pnl-pill[data-on="1"]{background:var(--panel-ink,#29261b);color:var(--panel-paper,#faf9f7);border-radius:14px;
    border-color:var(--panel-field-focus,color-mix(in oklch, var(--panel-ink,#000) 25%, transparent));
    box-shadow:0 1px 0 var(--panel-inset,rgba(255,255,255,.12)) inset,var(--panel-pill-shadow,0 10px 28px rgba(0,0,0,.16))}
  .pnl-pill[data-on="1"]:hover{background:#3a362a}
`;

const TRX_STYLE = `
  .trx-panel{position:fixed;right:${DOCK_RIGHT}px;bottom:${PANEL_BOTTOM}px;z-index:2147483645;width:280px;
    max-height:calc(100vh - ${PANEL_BOTTOM + 16 + UNDO_CLEARANCE}px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:var(--panel-bg,rgba(250,249,247,.78));color:var(--panel-ink,#29261b);
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid var(--panel-border,color-mix(in oklch, var(--panel-lift,#fff) 60%, transparent));border-radius:14px;
    box-shadow:0 1px 0 var(--panel-inset,rgba(255,255,255,.5)) inset,var(--panel-shadow,0 12px 40px rgba(0,0,0,.18));
    font:11.5px/1.4 var(--sans,ui-sans-serif,system-ui,-apple-system,sans-serif);overflow:hidden}
  .trx-sect{display:flex;align-items:center;gap:8px;
    font-size:9.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
    color:color-mix(in oklch, var(--panel-ink,#29261b) 38%, transparent);padding:12px 2px 7px}
  .trx-sect::after{content:"";flex:1;height:.5px;background:color-mix(in oklch, var(--panel-ink,#29261b) 16%, transparent)}
  .trx-sect:first-child{padding-top:2px}
  .trx-card{display:flex;align-items:flex-start;
    background:color-mix(in oklch, var(--panel-lift,#fff) 45%, transparent);border:.5px solid color-mix(in oklch, var(--panel-ink,#000) 7.000000000000001%, transparent);border-radius:9px;
    overflow:hidden;margin-bottom:4px}
  .trx-card:last-child{margin-bottom:0}
  .trx-card-num{flex:0 0 auto;min-width:26px;padding:5px 6px 5px 10px;
    font-size:11px;font-weight:700;line-height:1.4;
    color:color-mix(in oklch, var(--panel-ink,#29261b) 55.00000000000001%, transparent);font-variant-numeric:tabular-nums;white-space:nowrap}
  .trx-card-rows{flex:1;min-width:0;display:flex;flex-direction:column}
  .trx-row{display:flex;align-items:center;justify-content:space-between;
    padding:5px 10px;gap:8px}
  .trx-card-num+.trx-card-rows .trx-row{padding-left:0}
  .trx-row+.trx-row{border-top:.5px solid color-mix(in oklch, var(--panel-ink,#000) 5%, transparent)}
  .trx-row:hover{background:color-mix(in oklch, var(--panel-ink,#000) 3%, transparent)}
  .trx-row-lbl{flex:1;min-width:0;font-size:11px;line-height:1.4;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* Which arch this row is. Only a Both Arches card sets it: that card covers two
     places, so its heading cannot name one and the arch has to sit on the row. Same
     small-uppercase idiom as .trx-sect and .trx-bundle-hd. */
  .trx-row-loc{flex:0 0 auto;min-width:34px;font-size:9px;font-weight:700;
    letter-spacing:.07em;text-transform:uppercase;
    color:color-mix(in oklch, var(--panel-ink,#29261b) 42%, transparent)}
  /* "Both Arches" on one line costs 71px of a 251px card, and with an arch column
     beside it the treatment name ellipsised to "Alveolect…". This card is two rows
     tall, so it has vertical room no other card has — spend that instead. Keyed on
     the arch column rather than on a data flag, matching .trx-card:has(.trx-bundle)
     above. */
  .trx-card:has(.trx-row-loc) .trx-card-num{white-space:normal;max-width:52px;line-height:1.25}
  .trx-rmv{appearance:none;border:0;background:transparent;padding:2px 4px;
    color:color-mix(in oklch, var(--panel-ink,#29261b) 35%, transparent);font-size:13px;line-height:1;cursor:default;border-radius:4px}
  .trx-rmv:hover{background:color-mix(in oklch, var(--panel-ink,#000) 7.000000000000001%, transparent);color:#29261b}
  .trx-empty{padding:22px 16px;text-align:center;color:var(--ink-muted);font-size:12px;line-height:1.5}
  .trx-add{appearance:none;border:0;background:transparent;padding:2px 4px;
    color:color-mix(in oklch, var(--panel-ink,#29261b) 35%, transparent);font-size:13px;line-height:1;cursor:default;border-radius:4px}
  .trx-add:hover{background:color-mix(in oklch, var(--panel-ink,#000) 7.000000000000001%, transparent);color:#29261b}
  .trx-add[data-on="1"]{background:color-mix(in oklch, var(--panel-ink,#000) 7.000000000000001%, transparent);color:#29261b}
  .trx-chev{display:inline-block;width:6px;height:6px;border-right:1.5px solid currentColor;
    border-bottom:1.5px solid currentColor;transform:translateY(1px) rotate(-135deg)}
  .trx-man{display:flex;flex-direction:column;gap:4px;padding:4px 8px 7px}
  .trx-man-add{appearance:none;width:100%;height:24px;border:0;border-radius:5px;
    background:color-mix(in oklch, var(--panel-ink,#29261b) 86%, transparent);color:#faf9f7;font-size:11px;font-weight:600;cursor:default}
  .trx-man-add:disabled{background:color-mix(in oklch, var(--panel-ink,#29261b) 18%, transparent);color:color-mix(in oklch, var(--panel-ink,#29261b) 50%, transparent)}
  /* A visit is drawn as a GROUP, not as a tag repeated on every row: a card groups by
     tooth, and one tooth routinely spans two visits (extract + graft today, implant in
     four months), so the rows that share the $830 have to be visibly set apart from the
     ones that do not. Said once per bundle instead of once per row. */
  /* A brace hanging off the tooth number: one continuous stroke, closed top and bottom
     by its corner radii. Arcs alone (no spine) were tried on 2026-09-13 and rejected —
     the two marks drift apart as a bundle grows and stop reading as one enclosure.
     Weight, arm depth and ink here are the three tuning values; change them, not the
     structure. */
  .trx-card:has(.trx-bundle){align-items:stretch}
  .trx-card:has(.trx-bundle) .trx-card-num{display:flex;align-items:center;padding-right:0}
  .trx-bundle{position:relative;margin:6px 6px 6px 8px;padding-left:13px}
  .trx-bundle::before{content:"";position:absolute;left:0;top:3px;bottom:3px;width:9px;
    border:1.5px solid color-mix(in oklch, var(--panel-ink,#29261b) 36%, transparent);border-right:0;border-radius:5px 0 0 5px}
  /* Must out-specify the .trx-card-num+.trx-card-rows .trx-row padding-left:0 rule above
     (3 classes), or the heading keeps its 2px inset while the rows lose theirs and the
     two text left edges disagree by 2px. Hence .trx-card-rows in this selector. */
  .trx-card-rows .trx-bundle .trx-row{padding:4px 2px}
  .trx-bundle .trx-row+.trx-row{border-top:.5px solid color-mix(in oklch, var(--panel-ink,#29261b) 6%, transparent)}
  .trx-bundle-hd{padding:0 0 4px 2px;font-size:8px;font-weight:700;
    letter-spacing:.1em;text-transform:uppercase;color:color-mix(in oklch, var(--panel-ink,#29261b) 42%, transparent)}
  .trx-menu{margin:0 10px 6px;padding:5px 0;border-radius:8px;
    background:color-mix(in oklch, var(--panel-lift,#fff) 72%, transparent);border:.5px solid color-mix(in oklch, var(--panel-ink,#000) 8%, transparent)}
  .trx-card-num+.trx-card-rows .trx-menu{margin-left:0}
  .trx-menu-hd{padding:4px 9px 3px;font-size:8.5px;font-weight:700;letter-spacing:.09em;
    text-transform:uppercase;color:color-mix(in oklch, var(--panel-ink,#29261b) 38%, transparent)}
  .trx-menu-it{display:block;width:100%;text-align:left;appearance:none;border:0;
    background:transparent;padding:4px 9px;font:inherit;font-size:10.5px;line-height:1.35;
    color:var(--panel-ink,#29261b);cursor:default;border-radius:5px}
  .trx-menu-it:hover{background:color-mix(in oklch, var(--panel-ink,#000) 6%, transparent)}
  .trx-menu-none{padding:4px 9px;font-size:10px;color:color-mix(in oklch, var(--panel-ink,#29261b) 40%, transparent);line-height:1.35}
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
  onRemoveManual,
  onHoverTargets,
  onAddToVisit,
  onLeaveVisit,
}) {
  // Which row's + menu is open, addressed by `${card.key}|${ref}|${txId}` so two rows of
  // the same treatment on different teeth do not share one open menu.
  const [menuKey, setMenuKey] = React.useState(null);
  // Which row's manual-procedure form is open, and its draft. Same addressing.
  const [manualKey, setManualKey] = React.useState(null);
  const [manualDraft, setManualDraft] = React.useState({ label: '', table: '' });
  const handleRemove = (row) => {
    const { txId, scope, targets, collapse } = row;
    // Manual procedures share one id, so removeTreatmentForTooth would strip this tooth
    // from EVERY manual entry on it and delete procedures the operator did not click.
    // The ref carries the uid, which is the only thing that tells them apart.
    if (txId === MANUAL_MV_ID) {
      onRemoveManual(row.ref);
    } else if (collapse) {
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

  // The draft is per-open-menu: leaving it mounted would carry a half-typed procedure
  // name from one tooth's menu into the next one the operator opens.
  React.useEffect(() => {
    setManualKey(null);
    setManualDraft({ label: '', table: '' });
  }, [menuKey]);

  const sections = React.useMemo(
    () => buildPanelSections(treatments, allTeeth, txLabel),
    [treatments, allTeeth, txLabel],
  );

  // MediSave treatments that can be added to this row's teeth. A treatment that would
  // conflict with the row's own is excluded rather than offered and then silently
  // stripped — getConflictingTreatmentIds is the same rule the chart applies on apply,
  // so the menu cannot drift from it.
  const addOptionsFor = (row) => MEDISAVE_BUNDLE_IDS.filter((id) => {
    // Nothing may be added from an AREA row (sinus, arch). `addToVisit` builds the new
    // entry with `scope: 'tooth'` and the HOST's targets, so adding from a sinus row
    // would write targets:['right'] onto a tooth-scoped implant — a chargeable summary
    // line whose location is a side, drawn nowhere on the chart. The forward direction
    // (a sinus lift added from an implant row) still works and is the supported one.
    if (row.scope !== 'tooth') return false;
    if (id === row.txId) return false;
    if (getConflictingTreatmentIds(id).includes(row.txId)) return false;
    // Spans need a contiguous multi-tooth selection; a panel row cannot supply one.
    if (id === 'implant-bridge-span') return false;
    return true;
  });

  /**
   * A card's rows split into blocks: each bundle's rows collected into one block at the
   * position of its first member, every unbundled row a block of its own.
   *
   * Grouping is the only thing that marks a visit now, so the members have to be drawn
   * together — the panel's own ordering does not guarantee they are already adjacent.
   */
  const groupRows = (rows) => {
    const blocks = [];
    const bySession = new Map();
    for (const row of rows) {
      if (!row.session) { blocks.push({ session: null, rows: [row] }); continue; }
      const seen = bySession.get(row.session);
      if (seen) { seen.rows.push(row); continue; }
      const block = { session: row.session, rows: [row] };
      bySession.set(row.session, block);
      blocks.push(block);
    }
    return blocks;
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
                      {groupRows(card.rows).map((block, bi) => {
                      const blockBody = block.rows.map((row, i) => {
                        // Card-scoped: a cross-jaw entry gives two cards from ONE ref,
                        // so `${row.ref}|${row.txId}` alone opened both menus at once.
                        const rowKey = `${card.key}|${row.ref}|${row.txId}`;
                        const bundleable = isBundleable(row.txId);
                        const addOpts = bundleable ? addOptionsFor(row) : [];
                        // An area row keeps the button only while it is IN a visit, because
                        // "Remove from this visit" lives inside this menu and would otherwise
                        // be unreachable. It offers nothing to add.
                        const showMenuBtn = bundleable && (row.scope === 'tooth' || !!row.session);
                        return (
                        <React.Fragment key={`${row.txId}-${i}`}>
                        <div
                          className="trx-row"
                          onMouseEnter={() => onHoverTargets(card.toothIds.length > 0 ? card.toothIds : row.targets)}
                          onMouseLeave={() => onHoverTargets([])}
                        >
                          {row.archLabel && (
                            <span className="trx-row-loc">{row.archLabel}</span>
                          )}
                          <span className="trx-row-lbl">{row.label}</span>
                          {showMenuBtn && (
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
                            {/* Hidden on an area row for the same reason as the catalogue
                                options above: it routes through the same `onAddToVisit`
                                and would write the host's side into a tooth-scoped entry. */}
                            {row.scope === 'tooth' && (
                            <button
                              type="button"
                              className="trx-menu-it"
                              aria-expanded={manualKey === rowKey}
                              onClick={() => setManualKey((k) => (k === rowKey ? null : rowKey))}
                            >{manualKey === rowKey ? 'Cancel' : 'Add manually\u2026'}</button>
                            )}
                            {manualKey === rowKey && (
                              <div className="trx-man">
                                <input
                                  className="twk-field"
                                  type="text"
                                  placeholder="Procedure name"
                                  aria-label="Manual MediSave procedure name"
                                  value={manualDraft.label}
                                  onChange={(e) => setManualDraft((d) => ({ ...d, label: e.target.value }))}
                                />
                                <select
                                  className="twk-field"
                                  aria-label="CPF table"
                                  value={manualDraft.table}
                                  onChange={(e) => setManualDraft((d) => ({ ...d, table: e.target.value }))}
                                >
                                  <option value="">CPF table\u2026</option>
                                  {CPF_TABLE_CODES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="trx-man-add"
                                  disabled={!manualDraft.label.trim() || !manualDraft.table}
                                  onClick={() => {
                                    onAddToVisit(MANUAL_MV_ID, row.targets, row.ref,
                                      { label: manualDraft.label.trim(), table: manualDraft.table });
                                    setMenuKey(null);
                                  }}
                                >Add</button>
                              </div>
                            )}
                            {/* Leaving a visit lives in the menu rather than on the row:
                                the group marking replaced the per-row tag that used to
                                carry it, and a second ✕ beside the delete ✕ would be two
                                controls a keystroke apart meaning very different things. */}
                            {row.session && (
                              <button
                                type="button"
                                className="trx-menu-it"
                                onClick={() => { onLeaveVisit(row.ref); setMenuKey(null); }}
                              >Remove from this visit</button>
                            )}
                          </div>
                        )}
                        </React.Fragment>
                        );
                      });
                      return block.session ? (
                        <div key={`b${bi}`} className="trx-bundle">
                          <div className="trx-bundle-hd" title="These share one $830 consumable">Same visit</div>
                          {blockBody}
                        </div>
                      ) : <React.Fragment key={`b${bi}`}>{blockBody}</React.Fragment>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
