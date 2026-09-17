# Panel card collapse for non-MediSave entries, and a both-arch alveolectomy bundle

**Status:** SHIPPED 2026-09-17. All three parts built, tested and browser-verified.
**Decisions taken by Minzhe 2026-09-17**, recorded below with what they rule out.

Two unrelated complaints, investigated together because both land in the
Treatment Plan panel.

---

## A. Non-MediSave entries do not collapse

### What was actually wrong

Selecting 11 teeth and applying Extraction produced 11 cards. The believed rule
— "more than 3 teeth collapses" — **does not exist anywhere in the code.** The
real condition is `core/treatment-panel-order.js:198`:

```js
if ((isBundleable(tx.id) || AREA_IDS.has(tx.id)) && tx.targets.length > 1)
```

Two conditions: more than **one** target, and the treatment must be
**bundleable**, which means MediSave. Plain `extraction` is in `EXTRACTION_IDS`
but not in `SESSION_SPLIT_IDS`, so `isBundleable('extraction')` is `false` and
the collapse branch never runs.

Measured 2026-09-17 with a throwaway vitest probe, one entry, 16 targets:

| id | isBundleable | cards |
|---|---|---|
| `extraction` | false | **16** |
| `simple-surgical-extraction` | true | **1** — `#11–18, #21–28` |

**The multi-select was never the problem.** Plain extraction is not in
`SESSION_SPLIT_IDS`, so it takes the merge path and one apply produces **one
entry with 11 targets**. The data was already grouped; only the display split it.

Root cause: the collapse is gated on *bundleability*, a billing property, when
what it is trying to express is *one apply = one entry = one card*, a display
property. The comment above that line reasons entirely about MediSave claims —
non-MediSave multi-tooth entries were never considered.

### Decided

**Two thresholds, because there are two different reasons.**

| Treatment | Collapses at | Why |
|---|---|---|
| Bundleable (MediSave) + `AREA_IDS` | **> 1 target** — unchanged | Billing honesty. One entry is one claim; showing two cards states two procedures about something CPF pays as one. |
| Everything else | **>= 4 targets** (new `COLLAPSE_MIN`) | Display tidiness only. No shared consumable, nothing is misstated either way. |

A single threshold was rejected: applying `>= 4` universally would split a
two-tooth surgical extraction into two cards and reintroduce exactly the
misstatement the MediSave rule exists to prevent.

**Removal on a collapsed non-MediSave card removes the whole entry**, matching
collapsed MediSave cards. Accepted cost: per-tooth removal is lost at 4+ teeth.
Ctrl+Z undoes it, and the chart remains the per-tooth surface. An expandable
card was considered and rejected as a new control for a rare correction.

### Changes

**`core/treatment-panel-order.js`**

1. Add beside `AREA_IDS`:
   ```js
   // Non-MediSave entries collapse only past this many teeth. MediSave entries
   // collapse at 2 and do not consult this: theirs is a billing rule (one entry
   // is one claim), this is a display rule (16 identical rows is noise). Same
   // mechanism, different reasons, so deliberately different numbers.
   export const COLLAPSE_MIN = 4;
   ```
2. Replace the line 198 condition with:
   ```js
   const collapsible = isBundleable(tx.id) || AREA_IDS.has(tx.id);
   if (tx.targets.length > (collapsible ? 1 : COLLAPSE_MIN - 1)) {
   ```
   Everything inside the branch is unchanged — `splitRuns`, `quadrantRuns`,
   per-jaw cards, `collapse: true`, the `entry-${txRef(tx)}-${jaw}` key.

No change in `app/treatment-panel.jsx`. `handleRemove`'s `collapse` branch
already does the right thing for this case.

### Tests — `core/treatment-panel-order.test.js`

Each must be seen to fail before the fix lands.

- `extraction` with 3 targets -> **3** cards (below the threshold, unchanged)
- `extraction` with 4 targets -> **1** card, heading formatted by `quadrantRuns`
- `extraction` with 16 targets -> **1** card, heading `#11–18, #21–28`
- `simple-surgical-extraction` with 2 targets -> **1** card (proves the MediSave
  threshold did not move — this is the regression guard for the rejected option)
- `crown` with 4 targets -> 1 card (a non-extraction, non-MediSave treatment
  takes the same path)
- A collapsed non-MediSave card carries `collapse: true` and all target ids, so
  `handleRemove` removes the entry

---

## B. Both arches' alveolectomy cannot share a visit

### What was actually wrong

Clinically: both arches done in one sitting, one $830 consumable. **The data
model already supports this exactly.** `alveolectomy` is in `SESSION_SPLIT_IDS`
and therefore `MEDISAVE_BUNDLE_IDS`; `joinSessions()` would tag two alveolectomy
entries into one visit; the parent's bundle branch (`v3/js/main.js:3719`) is
scope-agnostic and would emit one `getMvBundleLine` with a single ward fee.
**No parent change is needed.** Only the chart cannot express it.

Two independent blocks:

1. **`app/treatment-panel.jsx:205`** — `if (row.scope !== 'tooth') return false;`
   An arch row offers no add menu. Deliberate: `addToVisit` builds the added
   entry with `scope:'tooth'` and the *host's* targets, so adding from an arch
   row would write `targets:['upper']` onto a tooth-scoped treatment.
2. **Join was removed 2026-09-13.** The only route into a bundle is the `+` menu
   applying a procedure to the host's own teeth. Two arches are different areas
   by definition, so host-and-guest can never express them.

**A note on the standing rule.** `v3/chart/CLAUDE.md` says joining two existing
entries is "NOT coming back", and commit `b72f7c5` gives the reason: the plan
that would have restored it was shelved when cross-avenue bundling was ruled
out on 2026-09-14. That decision was about a visit record spanning **the chart
and the sidebar**. This request is two chart entries — one avenue. The rule as
written is broader than the decision that produced it. It is not being changed
here, because the chosen option does not need joining, but it should not be
cited as settling the within-chart case.

### Decided

**A "Both arches" choice in the arch popover.** One apply, two entries — one per
arch, preserving one-entry-per-arch — already carrying a shared `session`.

Rejected: auto-bundling whenever a second arch is applied, because two arches
may genuinely be months apart and the app must not assume otherwise. This is the
same reasoning that made `area-apply.js` push one entry per arch in the first
place. The operator declares the visit; the app never infers it.

### Changes

**`app/dental-arch.jsx`**

1. The arch click handler (~line 947) currently sets
   `target: { arch, edentulous: archEdentulous[arch] }` — **unchanged.** Part C
   removes alveolectomy's edentulous requirement, so the popover no longer needs
   to know the other arch's dentition to decide whether to offer the choice.
2. `handleApplyTreatment` gains a third argument, `bothArches`, defaulting to
   `false`. In the `popover.mode === 'arch'` branch, replace the single
   `addAreaEntry` call with:
   ```js
   } else if (bothArches) {
     const session = nextSessionId(next);
     // One entry per arch, tagged as one visit at birth. Two entries rather
     // than one spanning both is the rule area-apply.js exists to hold: an
     // entry covering two areas cannot honestly carry a visit tag. The tag is
     // safe here precisely because the operator asked for both in one action.
     for (const a of ['upper', 'lower']) {
       const before = next;
       next = addAreaEntry(next, txId, 'arch', a);
       // addAreaEntry is a no-op when that arch already has this treatment;
       // tagging the pre-existing entry would silently move it into a visit
       // the operator did not declare for it.
       if (next !== before) {
         next = next.map((tx, i) =>
           i === next.length - 1 ? { ...tx, session } : tx);
       }
     }
   ```
   Import `nextSessionId` from `../core/mv-sessions.js`.
3. Pass `bothArches` from the popover's apply callback (~line 1697 area).

**`app/treatments.jsx`**

4. In the `mode === 'arch'` branch, render a "Both arches" affordance on an item
   only when `isBundleable(item.id)`. Gating on `isBundleable` rather than naming
   `alveolectomy` means a future bundleable arch treatment inherits it, and
   `complete-denture` — which is not MediSave, and whose session tag
   `pruneSessions` would strip on the next render — never offers it.
5. The tile's apply call passes `bothArches` through.

### Tests

**`core/area-apply.test.js` / a new `dental-arch.apply` case** — the apply path
lives in a React callback, so the pure part is what vitest reaches. Each seen to
fail first:

- Both-arch apply on a clean list -> two entries, `targets:['upper']` and
  `targets:['lower']`, **same** `session`
- Both-arch apply when upper already exists untagged -> upper is **untouched and
  still untagged**, lower is added; no visit is invented for the pre-existing one
- Both-arch apply when both already exist -> no change, original array reference
- `pruneSessions` leaves the pair alone (two members, both bundleable)
- Single-arch apply is unchanged and emits no `session`

**`core/treatment-panel-order.test.js`** — two tagged arch entries produce two
cards, one in Maxilla and one in Mandible, both rows carrying the same `session`
so `groupRows` draws the bundle brace.

**Parent parity, `tests/mv-session-v3.test.js` (parent repo)** — two
alveolectomy members in one bundle claim `2 x SB813M + one $830`, not two. This
asserts the claim that no parent change is needed; if it fails, this plan is
wrong about `main.js:3719`.

---

## Verification

- `npx vitest run` inside `v3/chart` — green
- `npx vitest run` in the parent — 605 local
- `npm run build` in `v3/chart`, then `node scripts/sync-chart-dist.mjs` from the
  parent, and commit `v3/chart-dist/`. **The iframe serves the built bundle;
  source edits are invisible until this runs.**
- Browser, both avenues: select 4 teeth -> one card; select 3 -> three cards;
  apply Alveolectomy with "Both arches" -> two rows joined by the bundle brace,
  and the quote shows one $830.

---

## C. Alveolectomy is restricted to edentulous arches

### Decided 2026-09-17

Remove the restriction. An alveolectomy is performed on arches that still carry
teeth, so the gate was wrong clinically.

**Selection only. The overlay is unchanged** — it draws the same ridge band and
scallop it draws today, on whatever arch it is applied to.

### Changes

**`app/treatments.jsx`** — in `ARCH_GROUPS`, drop `requires: 'edentulous-arch'`
from the `alveolectomy` item. `complete-denture` keeps it: a complete denture on
a dentate arch is a different claim.

No change to `handleArchClick`. In Stage 2 it already opens the arch popover for
any arch regardless of dentition; `requires` was the only gate.

No change to `isAvailable`'s `edentulous-arch` branch — `complete-denture` still
uses it.

### Tests — `app/treatments.test.jsx` or the popover's existing suite

- Alveolectomy is offered on a **dentate** arch (the failing case today)
- Alveolectomy is still offered on an edentulous arch
- Complete Denture is still **not** offered on a dentate arch — the regression
  guard proving the gate was removed from one item, not from `isAvailable`

---

## Out of scope

- Reviving Join. Not needed for this, and it carries its own decision.
- Any change to `splitByArch` in `main.js:3658`. It is now near-dead — every
  alveolectomy entry has one target since 2026-09-14 — but it still catches
  legacy restored data holding both arches in one entry. Leave it.
- `dental_tool_context.md`, still stale, still its own session.
