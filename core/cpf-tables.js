// CPF TOSP surgical table codes — the dropdown's option list for a manual MediSave
// procedure. Codes ONLY, deliberately: every dollar amount lives in the parent app's
// `v3/data/tosptables.js`, which is the single source for what a table pays.
//
// Two lists of the same codes in two repos is the drift this project keeps re-learning,
// so a parent test (`tests/mv-session-v3.test.js`) asserts this array equals
// `Object.keys(TOSP_TABLE_LIMITS)` exactly, order included. Adding a code here without
// adding it there fails that test rather than silently offering a table the parent
// cannot price.
//
// Posting the list into the iframe instead was considered and rejected: the chart runs
// standalone in its own dev server and its own test suite, so it would still need a
// fallback copy, and the dropdown would be empty on first paint until the message landed.

export const CPF_TABLE_CODES = [
  '1A', '1B', '1C',
  '2A', '2B', '2C',
  '3A', '3B', '3C',
  '4A', '4B', '4C',
  '5A', '5B', '5C',
  '6A', '6B', '6C',
  '7A', '7B', '7C',
];

/** True for a code this app can price. The parent guards again; both sides check. */
export function isCpfTable(code) {
  return CPF_TABLE_CODES.includes(code);
}
