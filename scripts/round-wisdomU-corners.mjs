/**
 * Computes Bézier-fillet corners for wisdomUOutline.
 * Run with: node scripts/round-wisdomU-corners.mjs
 * Outputs the new template-string body for wisdomUOutline (w=1,h=1 check).
 */

const R = 0.10; // fillet radius in normalized units

// --- de Casteljau helpers ---
function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

function cubicAt(P0, P1, P2, P3, t) {
  const A = lerp(P0, P1, t), B = lerp(P1, P2, t), C = lerp(P2, P3, t);
  const D = lerp(A, B, t),   E = lerp(B, C, t);
  return lerp(D, E, t);
}

function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

/**
 * Split cubic at parameter t.
 * Returns { first: [P0,A,D,F], second: [F,E,C,P3] }
 */
function splitAt(P0, P1, P2, P3, t) {
  const A = lerp(P0, P1, t), B = lerp(P1, P2, t), C = lerp(P2, P3, t);
  const D = lerp(A, B, t),   E = lerp(B, C, t);
  const F = lerp(D, E, t);
  return { first: [P0, A, D, F], second: [F, E, C, P3] };
}

/**
 * Find t on cubic such that the point is exactly `r` away from one of its endpoints.
 * fromEnd=true → distance from P3; fromEnd=false → distance from P0.
 */
function findTAtDist(P0, P1, P2, P3, r, fromEnd) {
  const ref = fromEnd ? P3 : P0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const pt = cubicAt(P0, P1, P2, P3, mid);
    if (dist(pt, ref) < r) {
      if (fromEnd) hi = mid; else lo = mid;
    } else {
      if (fromEnd) lo = mid; else hi = mid;
    }
  }
  return (lo + hi) / 2;
}

function fmt(n) { return (Math.round(n * 10000) / 10000).toString(); }
function fmtPt(p) { return `${fmt(p.x)} ${fmt(p.y)}`; }

/**
 * Build a cubic fillet from point A to point B curving around vertex V.
 * α = 0.5523 gives closest approximation to a circular arc.
 */
function fillet(A, V, B, alpha = 0.5523) {
  const cp1 = { x: A.x + alpha * (V.x - A.x), y: A.y + alpha * (V.y - A.y) };
  const cp2 = { x: B.x + alpha * (V.x - B.x), y: B.y + alpha * (V.y - B.y) };
  return { A, cp1, cp2, B };
}

// --- wisdomU geometry (w=1, h=1) ---
const ch = 0.46, ny = -ch, nw = 0.84;

// Current segments (P0, P1, P2, P3):
// M: start point (disto-occlusal corner)
const M  = { x:  0.48,        y: -ch * 0.02   };  // = (0.48, -0.0092)
const C1 = [M,
             { x:  0.52,      y: -ch * 0.45   },   // (0.52, -0.207)
             { x:  0.52,      y: -ch * 0.92   },   // (0.52, -0.4232)
             { x:  nw * 0.50, y:  ny          }];  // (0.42, -0.46) disto-cervical

const C2 = [C1[3],
             { x:  0.40,      y: -ch - 0.10   },   // (0.40, -0.56)
             { x:  0.34,      y: -0.5         },
             { x:  0.24,      y: -0.86        }];

const C3 = [C2[3],
             { x:  0.20,      y: -0.96        },
             { x:  0.14,      y: -0.96        },
             { x:  0.12,      y: -0.86        }];

const C4 = [C3[3],
             { x:  0.10,      y: -0.74        },
             { x:  0.06,      y: -0.62        },
             { x:  0,         y: -0.60        }];

const C5 = [C4[3],
             { x: -0.06,      y: -0.62        },
             { x: -0.10,      y: -0.74        },
             { x: -0.12,      y: -0.86        }];

const C6 = [C5[3],
             { x: -0.14,      y: -0.96        },
             { x: -0.20,      y: -0.96        },
             { x: -0.24,      y: -0.86        }];

const C7 = [C6[3],
             { x: -0.34,      y: -0.5         },
             { x: -0.40,      y: -ch - 0.10   },   // (-0.40, -0.56)
             { x: -nw * 0.50, y:  ny          }];  // (-0.42, -0.46) mesio-cervical

const C8 = [C7[3],
             { x: -0.52,      y: -ch * 0.92   },   // (-0.52, -0.4232)
             { x: -0.52,      y: -ch * 0.45   },   // (-0.52, -0.207)
             { x: -0.48,      y: -ch * 0.02   }];  // mesio-occlusal

const C9 = [C8[3],
             { x: -0.10,      y:  ch * 0.18   },   // (-0.10, 0.0828)
             { x:  0.10,      y:  ch * 0.18   },   // ( 0.10, 0.0828)
             M];

// ── Fillet each of the 4 corners ──

// 1. Disto-occlusal: between C9 (incoming) and C1 (outgoing), vertex = M = (0.48, -0.009)
const V_do = M;
const t9   = findTAtDist(...C9, R, true);   // backoff from end of C9
const t1s  = findTAtDist(...C1, R, false);  // backoff from start of C1
const c9_split  = splitAt(...C9, t9);       // keep c9_split.first
const c1_split  = splitAt(...C1, t1s);      // keep c1_split.second
const A_do = c9_split.first[3];             // offset point on C9
const B_do = c1_split.second[0];            // offset point on C1
const f_do = fillet(A_do, V_do, B_do);

// 2. Disto-cervical: between C1 (incoming) and C2 (outgoing), vertex = C1[3] = (0.42, -0.46)
const V_dc = C1[3];
const t1e  = findTAtDist(...C1, R, true);
const t2s  = findTAtDist(...C2, R, false);
// We need the portion of C1 from its backoff-from-start (t1s) to backoff-from-end (t1e)
// But C1 is now also split at t1s for the disto-occlusal fillet.
// The portion we keep of C1 is: from B_do (t=t1s on original C1) to the split at t1e.
// Re-split the second half of c1_split at a new parameter for t1e.
const c1_mid_end = c1_split.second; // [B_do, cp1_new, cp2_new, V_dc]
// Find t on the remaining sub-cubic such that dist from V_dc = R
const t1e_sub = findTAtDist(...c1_mid_end, R, true);
const c1_me_split = splitAt(...c1_mid_end, t1e_sub);
const A_dc = c1_me_split.first[3];
const c2_split = splitAt(...C2, t2s);
const B_dc = c2_split.second[0];
const f_dc = fillet(A_dc, V_dc, B_dc);

// 3. Mesio-cervical: between C7 (incoming) and C8 (outgoing), vertex = C7[3] = (-0.42, -0.46)
const V_mc = C7[3];
const t7e  = findTAtDist(...C7, R, true);
const t8s  = findTAtDist(...C8, R, false);
const c7_split  = splitAt(...C7, t7e);
const c8_split  = splitAt(...C8, t8s);
const A_mc = c7_split.first[3];
const B_mc = c8_split.second[0];
const f_mc = fillet(A_mc, V_mc, B_mc);

// 4. Mesio-occlusal: between C8 (incoming) and C9 (outgoing), vertex = C8[3] = (-0.48, -0.009)
const V_mo = C8[3];
// C8 is now split for the mesio-cervical fillet; keep c8_split.second
const c8_mid = c8_split.second; // [B_mc, ..., V_mo]
const t8e_sub = findTAtDist(...c8_mid, R, true);
const c8_me_split = splitAt(...c8_mid, t8e_sub);
const A_mo = c8_me_split.first[3];
const t9s  = findTAtDist(...C9, R, false);
const c9_start_split = splitAt(...C9, t9s);
const B_mo = c9_start_split.second[0];
const f_mo = fillet(A_mo, V_mo, B_mo);

// The middle portion of C9 (between the two occlusal fillets)
// Goes from B_mo to A_do.
// B_mo = c9_start_split.second[0], A_do = c9_split.first[3]
// We need the sub-cubic of C9 between t9s and t9.
// Split C9 at t9s → keep second half; then split that at rescaled t9.
const c9_after_mo = c9_start_split.second; // from B_mo to M
// Find t on c9_after_mo such that dist from M = R (same R)
const t9_sub = findTAtDist(...c9_after_mo, R, true);
const c9_mid_split = splitAt(...c9_after_mo, t9_sub);
const c9_mid = c9_mid_split.first; // [B_mo, cp1, cp2, A_do]

// ── Assemble the path ──
// Start from B_do (after disto-occlusal fillet)
// → trimmed C1 middle → A_dc
// → fillet disto-cervical → B_dc
// → C2 remainder → C2[3]
// → C3 (unchanged) → C3[3]
// → C4 (unchanged) → C4[3]
// → C5 (unchanged) → C5[3]
// → C6 (unchanged) → C6[3]
// → trimmed C7 → A_mc
// → fillet mesio-cervical → B_mc
// → trimmed C8 middle → A_mo
// → fillet mesio-occlusal → B_mo
// → trimmed C9 middle → A_do
// → fillet disto-occlusal back to B_do ... wait, path must close at start

// Start from A_do (on C9 before disto-occlusal fillet)
// M A_do
// → fillet_do → B_do
// → c1 middle (c1_me_split.first, minus end) → A_dc
// → fillet_dc → B_dc
// → c2 second half → C2[3]
// → C3 → C4 → C5 → C6
// → c7 first half → A_mc
// → fillet_mc → B_mc
// → c8 middle (c8_me_split.first, minus end) → A_mo
// → fillet_mo → B_mo
// → c9_mid → A_do (= start)
// Z

const path = [];

function seg(label, pts) {
  // pts = [P0, P1, P2, P3] = cubic; we emit C P1 P2 P3
  path.push(`    C ${fmtPt(pts[1])} ${fmtPt(pts[2])} ${fmtPt(pts[3])}`);
}

// Start
path.push(`    M ${fmtPt(A_do)}`);

// Fillet at disto-occlusal
path.push(`    C ${fmtPt(f_do.cp1)} ${fmtPt(f_do.cp2)} ${fmtPt(f_do.B)}`);

// Middle portion of C1 (from B_do to A_dc)
// c1_me_split.first goes from B_do to A_dc
seg('c1_middle', c1_me_split.first);

// Fillet at disto-cervical
path.push(`    C ${fmtPt(f_dc.cp1)} ${fmtPt(f_dc.cp2)} ${fmtPt(f_dc.B)}`);

// Remainder of C2 (from B_dc to C2[3])
seg('c2_end', c2_split.second);

// C3, C4, C5, C6 unchanged
seg('C3', C3); seg('C4', C4); seg('C5', C5); seg('C6', C6);

// First portion of C7 (from C6[3] to A_mc)
seg('c7_start', c7_split.first);

// Fillet at mesio-cervical
path.push(`    C ${fmtPt(f_mc.cp1)} ${fmtPt(f_mc.cp2)} ${fmtPt(f_mc.B)}`);

// Middle portion of C8 (from B_mc to A_mo)
seg('c8_middle', c8_me_split.first);

// Fillet at mesio-occlusal
path.push(`    C ${fmtPt(f_mo.cp1)} ${fmtPt(f_mo.cp2)} ${fmtPt(f_mo.B)}`);

// Middle of C9 (from B_mo to A_do)
seg('c9_mid', c9_mid);

path.push(`    Z`);

console.log('=== New wisdomUOutline path (w=1, h=1) ===\n');
console.log(path.join('\n'));
console.log('\n=== Corner verification ===');
console.log('A_do (on C9, before DO fillet):', fmtPt(A_do));
console.log('B_do (on C1, after DO fillet):', fmtPt(B_do));
console.log('A_dc (on C1, before DC fillet):', fmtPt(A_dc));
console.log('B_dc (on C2, after DC fillet):', fmtPt(B_dc));
console.log('A_mc (on C7, before MC fillet):', fmtPt(A_mc));
console.log('B_mc (on C8, after MC fillet):', fmtPt(B_mc));
console.log('A_mo (on C8, before MO fillet):', fmtPt(A_mo));
console.log('B_mo (on C9, after MO fillet):', fmtPt(B_mo));
console.log('\nExpected fillet radii ≈', R);
console.log('DO: incoming dist', fmt(dist(A_do, V_do)), 'outgoing dist', fmt(dist(B_do, V_do)));
console.log('DC: incoming dist', fmt(dist(A_dc, V_dc)), 'outgoing dist', fmt(dist(B_dc, V_dc)));
console.log('MC: incoming dist', fmt(dist(A_mc, V_mc)), 'outgoing dist', fmt(dist(B_mc, V_mc)));
console.log('MO: incoming dist', fmt(dist(A_mo, V_mo)), 'outgoing dist', fmt(dist(B_mo, V_mo)));
