// DOM helper: build a reasonably-unique CSS selector path for an element.
// Touches the DOM (nodeName, parent, id) so it lives outside core/.

/** Escape an identifier for use in a selector. */
function esc(s) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/**
 * @param {Element|null} el
 * @returns {string} e.g. "div#main > ul > li:nth-of-type(3) > span"
 */
export function cssPath(el) {
  if (!el || el.nodeType !== 1) return '';

  const parts = [];
  let node = el;
  while (node && node.nodeType === 1) {
    const tag = node.nodeName.toLowerCase();
    if (node.id) {
      // An id is unique enough to anchor the path; stop here.
      parts.unshift(`${tag}#${esc(node.id)}`);
      break;
    }

    let selector = tag;
    const parent = node.parentElement;
    if (parent) {
      const sameTag = Array.from(parent.children).filter((c) => c.nodeName === node.nodeName);
      if (sameTag.length > 1) {
        selector += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(selector);

    if (tag === 'html' || !parent) break;
    node = parent;
  }

  return parts.join(' > ');
}
