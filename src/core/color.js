// Pure color parsing + WCAG contrast math. No DOM access.

/** Minimal set of CSS named colors we might see in test fixtures / inline styles. */
const NAMED = {
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  red: { r: 255, g: 0, b: 0, a: 1 },
  green: { r: 0, g: 128, b: 0, a: 1 },
  blue: { r: 0, g: 0, b: 255, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

/**
 * Parse a CSS color string into an {r,g,b,a} object, or null if unparseable.
 * Handles the forms getComputedStyle actually emits (rgb/rgba) plus hex and a
 * few named colors for convenience in tests and inline styles.
 * @param {string} input
 * @returns {import('./types.js').Rgba | null}
 */
export function parseColor(input) {
  if (input == null) return null;
  const str = String(input).trim().toLowerCase();
  if (str === '') return null;

  if (Object.prototype.hasOwnProperty.call(NAMED, str)) {
    return { ...NAMED[str] };
  }

  // #rgb / #rgba / #rrggbb / #rrggbbaa
  if (str[0] === '#') {
    const hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return anyNaN(r, g, b) ? null : { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return anyNaN(r, g, b) ? null : { r, g, b, a };
    }
    return null;
  }

  // rgb(...) / rgba(...) — tolerant of comma- or space-separated, percentages ignored.
  const m = str.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
    return anyNaN(r, g, b, a) ? null : { r: clamp255(r), g: clamp255(g), b: clamp255(b), a };
  }

  return null;
}

/**
 * Relative luminance per WCAG 2.x.
 * @param {import('./types.js').Rgba} c
 * @returns {number} 0..1
 */
export function relativeLuminance(c) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

/**
 * WCAG contrast ratio between two opaque colors. Returns a number in [1, 21].
 * @param {import('./types.js').Rgba} c1
 * @param {import('./types.js').Rgba} c2
 * @returns {number}
 */
export function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function clamp255(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function anyNaN(...nums) {
  return nums.some((n) => Number.isNaN(n));
}
