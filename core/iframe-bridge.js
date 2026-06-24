// Sends postMessage events to the parent window when the chart is embedded as an iframe.
// All emits are no-ops when the chart is loaded standalone (window.self === window.top).

const inIframe = () => window.self !== window.top;

export function emit(type, payload) {
  if (!inIframe()) return;
  // Use origin so patient data never leaks to a cross-origin parent.
  const origin = window.location.origin || '*';
  window.parent.postMessage({ version: 1, type, payload }, origin);
}
