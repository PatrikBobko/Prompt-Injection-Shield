// Pure "is this effectively invisible to a human?" logic.
// Input is a StyleSnapshot (+ optional Rect) produced by the content script;
// this module never touches the DOM, so every branch is unit-testable.

import { parseColor, contrastRatio } from './color.js';

/** Tunable thresholds, kept in one place. */
export const VISIBILITY_THRESHOLDS = {
  tinyFontPx: 1, // font-size <= this is considered hidden
  minContrast: 1.5, // WCAG ratio below this counts as same-color camouflage
  offscreenPx: 999, // text-indent / left / top this negative => off-screen
};

/**
 * Decide whether a styled element is visually hidden, returning the list of
 * reasons. Empty array means "visible".
 * @param {import('./types.js').StyleSnapshot} style
 * @param {Partial<import('./types.js').Rect>} [rect]
 * @returns {string[]}
 */
export function detectHidden(style, rect) {
  const reasons = [];
  if (!style) return reasons;
  const T = VISIBILITY_THRESHOLDS;

  if (style.display === 'none') reasons.push('display: none');
  if (style.visibility === 'hidden' || style.visibility === 'collapse') {
    reasons.push(`visibility: ${style.visibility}`);
  }
  if (Number(style.opacity) === 0) reasons.push('opacity: 0');

  if (Number.isFinite(style.fontSize) && style.fontSize <= T.tinyFontPx) {
    reasons.push(`tiny font-size (${style.fontSize}px)`);
  }

  // Same-ish text/background color. Only meaningful when both colors are opaque;
  // a transparent background tells us nothing about the painted color behind it.
  const fg = parseColor(style.color);
  const bg = parseColor(style.backgroundColor);
  if (fg && bg && fg.a > 0 && bg.a > 0) {
    const ratio = contrastRatio(fg, bg);
    if (ratio < T.minContrast) {
      reasons.push(`low contrast (ratio ${ratio.toFixed(2)})`);
    }
  }

  if (Number.isFinite(style.textIndent) && style.textIndent <= -T.offscreenPx) {
    reasons.push(`text-indent off-screen (${style.textIndent}px)`);
  }

  // Off-screen via absolute/fixed positioning.
  if (style.position === 'absolute' || style.position === 'fixed') {
    if (Number.isFinite(style.left) && style.left <= -T.offscreenPx) {
      reasons.push(`positioned off-screen (left ${style.left}px)`);
    }
    if (Number.isFinite(style.top) && style.top <= -T.offscreenPx) {
      reasons.push(`positioned off-screen (top ${style.top}px)`);
    }
    if (rect && isRectOffViewport(rect)) {
      reasons.push('rendered outside the viewport');
    }
  }

  if (isCollapsedClip(style.clip) || isCollapsedClipPath(style.clipPath)) {
    reasons.push('clipped to nothing');
  }

  // Zero-size box that hides overflowing text.
  if (style.overflow === 'hidden') {
    const w = rect ? rect.width : undefined;
    const h = rect ? rect.height : undefined;
    if (w === 0 || h === 0) {
      reasons.push('zero-size box with overflow hidden');
    }
  }

  if (style.ariaHidden) reasons.push('aria-hidden="true"');

  return reasons;
}

/** True if the element's box is entirely outside the viewport. */
function isRectOffViewport(rect) {
  const { top, left, width, height, viewportWidth, viewportHeight } = rect;
  if (![top, left, width, height].every(Number.isFinite)) return false;
  const right = left + width;
  const bottom = top + height;
  const vw = Number.isFinite(viewportWidth) ? viewportWidth : Infinity;
  const vh = Number.isFinite(viewportHeight) ? viewportHeight : Infinity;
  return right <= 0 || bottom <= 0 || left >= vw || top >= vh;
}

/** clip: rect(0,0,0,0) (the classic visually-hidden pattern). */
function isCollapsedClip(clip) {
  if (!clip || clip === 'auto') return false;
  const m = clip.match(/^rect\(([^)]+)\)$/);
  if (!m) return false;
  const nums = m[1].split(/[,\s]+/).map((n) => parseFloat(n));
  // rect(top right bottom left): collapses when right<=left and bottom<=top.
  if (nums.length === 4 && nums.every(Number.isFinite)) {
    const [t, r, b, l] = nums;
    return r - l <= 0 || b - t <= 0;
  }
  return false;
}

/** clip-path that collapses the box, e.g. inset(100%), circle(0). */
function isCollapsedClipPath(clipPath) {
  if (!clipPath || clipPath === 'none') return false;
  const cp = clipPath.toLowerCase();
  if (/inset\(\s*(100%|50%\s+50%\s+50%\s+50%)/.test(cp)) return true;
  if (/circle\(\s*0(px|%)?\s*[)\s]/.test(cp)) return true;
  return false;
}
