// DOM-only highlighting: outline a finding's element and scroll it into view.
// Lives outside core/ because it touches layout and the DOM.

const OVERLAY_ID = '__pis-highlight';

/**
 * Remove any existing highlight overlay.
 */
export function removeHighlight() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();
}

/**
 * Outline an element and scroll to it. Returns a small status object so the
 * caller can report when an element can't be shown (e.g. display:none has no box).
 * @param {Element|null} el
 * @returns {{ ok: boolean, reason?: string }}
 */
export function highlightElement(el) {
  removeHighlight();
  if (!el || el.nodeType !== 1) return { ok: false, reason: 'element not found' };

  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

  const rect = el.getBoundingClientRect();
  const hasBox = rect.width > 0 && rect.height > 0;
  if (!hasBox) {
    // display:none / zero-size elements have no geometry to outline. We still
    // scrolled (a no-op here); tell the caller so the popup can note it.
    return { ok: false, reason: 'element is not rendered (hidden), nothing to outline' };
  }

  // Anchor the overlay in document coordinates so it stays put while scrolling.
  const pad = 3;
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: 'absolute',
    top: `${rect.top + window.scrollY - pad}px`,
    left: `${rect.left + window.scrollX - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
    border: '2px solid #b00020',
    borderRadius: '3px',
    background: 'rgba(176, 0, 32, 0.12)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.04)',
    pointerEvents: 'none',
    zIndex: '2147483647', // max — sit above page chrome
    boxSizing: 'border-box',
  });
  (document.body || document.documentElement).appendChild(overlay);

  // Pulse via the Web Animations API (no injected stylesheet needed).
  if (overlay.animate) {
    overlay.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], {
      duration: 700,
      iterations: 3,
    });
  }

  // Auto-clear so we don't leave a permanent marker on the page.
  setTimeout(() => {
    if (document.getElementById(OVERLAY_ID) === overlay) overlay.remove();
  }, 2600);

  return { ok: true };
}
