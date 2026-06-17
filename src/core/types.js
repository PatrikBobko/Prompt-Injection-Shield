// Shared type definitions for the pure detection core.
// These are JSDoc-only — no runtime code — so they impose no cost and stay
// usable from plain JS without a build step.

/**
 * @typedef {'HIGH'|'MEDIUM'|'LOW'} Severity
 */

/**
 * An RGB(A) color with channels in 0..255 and alpha in 0..1.
 * @typedef {{ r: number, g: number, b: number, a: number }} Rgba
 */

/**
 * A flat snapshot of the computed style values the detectors care about.
 * The content script produces this from getComputedStyle so that the pure
 * visibility logic never touches the DOM.
 * @typedef {Object} StyleSnapshot
 * @property {number} fontSize        Resolved font-size in px.
 * @property {string} color           e.g. "rgb(0, 0, 0)".
 * @property {string} backgroundColor e.g. "rgba(0, 0, 0, 0)".
 * @property {number} opacity         0..1.
 * @property {string} visibility      "visible" | "hidden" | "collapse".
 * @property {string} display         e.g. "block" | "none".
 * @property {number} textIndent      Resolved text-indent in px.
 * @property {string} position        "static" | "absolute" | "fixed" | ...
 * @property {number} left            Resolved left in px (NaN if "auto").
 * @property {number} top             Resolved top in px (NaN if "auto").
 * @property {string} clip            e.g. "rect(0px, 0px, 0px, 0px)" | "auto".
 * @property {string} clipPath        e.g. "inset(100%)" | "none".
 * @property {string} overflow        e.g. "visible" | "hidden".
 * @property {boolean} ariaHidden     True if the element (or an ancestor) is aria-hidden.
 */

/**
 * Element geometry, as returned by getBoundingClientRect plus the viewport size.
 * Any field may be NaN/undefined when geometry is unavailable (e.g. display:none).
 * @typedef {Object} Rect
 * @property {number} top
 * @property {number} left
 * @property {number} width
 * @property {number} height
 * @property {number} viewportWidth
 * @property {number} viewportHeight
 */

/**
 * A single detected problem on the page. Assembled by the content script from
 * the pure detectors below; severity comes from score.js.
 * @typedef {Object} Finding
 * @property {Severity} severity
 * @property {string} snippet        Short human-readable excerpt.
 * @property {string[]} reasons      Why it was flagged (visibility + channel + injection).
 * @property {string} [cssPath]      Selector path to the element (added by the scanner).
 * @property {string} [channel]      Where it came from: "text" | "comment" | "attr:title" | ...
 */

export {}; // marks this file as an ES module
