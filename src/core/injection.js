// Pure prompt-injection heuristic runner. No DOM access.
// Applies the configurable pattern list to a piece of text and reports matches.

import { INJECTION_PATTERNS } from './injection-patterns.js';

/**
 * @typedef {Object} InjectionMatch
 * @property {string} id
 * @property {string} label
 * @property {number} weight
 * @property {string} match   The actual substring that matched.
 */

/**
 * Run the injection patterns over a string.
 * @param {string} text
 * @param {{ id: string, regex: RegExp, label: string, weight: number }[]} [patterns]
 * @returns {InjectionMatch[]}
 */
export function detectInjection(text, patterns = INJECTION_PATTERNS) {
  const matches = [];
  if (!text) return matches;
  for (const p of patterns) {
    const m = p.regex.exec(text);
    if (m) {
      matches.push({ id: p.id, label: p.label, weight: p.weight, match: m[0].trim() });
    }
  }
  return matches;
}

/**
 * Convenience boolean.
 * @param {string} text
 * @param {{ id: string, regex: RegExp, label: string, weight: number }[]} [patterns]
 * @returns {boolean}
 */
export function hasInjection(text, patterns = INJECTION_PATTERNS) {
  return detectInjection(text, patterns).length > 0;
}
