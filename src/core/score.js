// Pure severity scoring. No DOM access.
//
// This is a *prompt-injection* defender, so the thing we report is injection
// phrasing (or invisible-unicode steganography). Hidden-ness raises severity but
// is NOT a finding on its own: plain hidden text — collapsed menus, display:none
// tooltips, screen-reader-only labels, low-contrast UI — is ubiquitous on real
// pages and would bury genuine threats under thousands of false positives.
//
//   injection phrasing + hidden          -> HIGH
//   invisible-unicode steganography      -> HIGH if also injection, else MEDIUM
//   injection phrasing in visible text   -> LOW
//   hidden text, no injection/stego      -> not reported (null)

/**
 * @param {{ hidden?: boolean, injection?: boolean, stego?: boolean }} flags
 *        stego = invisible-unicode steganography (zero-width / Tags / bidi).
 * @returns {import('./types.js').Severity | null} null means "nothing to report".
 */
export function scoreFinding({ hidden = false, injection = false, stego = false }) {
  if (injection && hidden) return 'HIGH';
  if (stego) return injection ? 'HIGH' : 'MEDIUM';
  if (injection) return 'LOW';
  return null;
}

/** Numeric rank for sorting/counting (higher = worse). */
export const SEVERITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/**
 * Summarize a list of findings into per-severity counts.
 * @param {{ severity: import('./types.js').Severity }[]} findings
 * @returns {{ HIGH: number, MEDIUM: number, LOW: number, total: number }}
 */
export function summarize(findings) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };
  for (const f of findings) {
    if (f && counts[f.severity] !== undefined) {
      counts[f.severity] += 1;
      counts.total += 1;
    }
  }
  return counts;
}
