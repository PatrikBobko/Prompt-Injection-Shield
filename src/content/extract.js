// DOM extraction of "hidden-channel" content that isn't rendered as body text:
// HTML comments, instruction-bearing attributes, <meta> tags, hidden inputs.
// Each returned item is a plain { text, element, channel, channelLabel } record
// that the scanner feeds through the pure detectors.

/** Tunables for how much attribute/comment text is worth surfacing. */
export const EXTRACT_THRESHOLDS = {
  minChannelTextLength: 24, // ignore short, almost-certainly-benign strings
};

/** Attributes that can carry human-or-AI-readable text. */
const TEXT_ATTRS = ['title', 'alt', 'aria-label', 'placeholder'];

/**
 * @param {Document|Element} [root]
 * @returns {{ text: string, element: Element, channel: string, channelLabel: string }[]}
 */
export function extractChannels(root = document) {
  const items = [];
  const minLen = EXTRACT_THRESHOLDS.minChannelTextLength;
  const doc = root.ownerDocument || (root.nodeType === 9 ? root : document);
  const scope = root.nodeType === 9 ? root.documentElement || root.body || root : root;

  // --- HTML comments ---
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_COMMENT);
  let c;
  while ((c = walker.nextNode())) {
    const text = (c.nodeValue || '').trim();
    if (text.length >= minLen) {
      items.push({
        text,
        element: c.parentElement || scope,
        channel: 'comment',
        channelLabel: 'HTML comment',
      });
    }
  }

  // --- attributes (title / alt / aria-label / placeholder / data-*) ---
  const all = scope.querySelectorAll('*');
  for (const el of all) {
    for (const name of TEXT_ATTRS) {
      const v = el.getAttribute(name);
      if (v && v.trim().length >= minLen) {
        items.push({ text: v.trim(), element: el, channel: `attr:${name}`, channelLabel: `@${name}` });
      }
    }
    // data-* attributes
    if (el.attributes) {
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-') && attr.value && attr.value.trim().length >= minLen) {
          items.push({
            text: attr.value.trim(),
            element: el,
            channel: `attr:${attr.name}`,
            channelLabel: `@${attr.name}`,
          });
        }
      }
    }
  }

  // --- <meta> content ---
  for (const meta of scope.querySelectorAll('meta[content]')) {
    const v = meta.getAttribute('content');
    if (v && v.trim().length >= minLen) {
      const key = meta.getAttribute('name') || meta.getAttribute('property') || 'meta';
      items.push({ text: v.trim(), element: meta, channel: `meta:${key}`, channelLabel: `<meta ${key}>` });
    }
  }

  // --- hidden inputs ---
  for (const input of scope.querySelectorAll('input[type="hidden"]')) {
    const v = input.getAttribute('value');
    if (v && v.trim().length >= minLen) {
      items.push({ text: v.trim(), element: input, channel: 'hidden-input', channelLabel: 'hidden <input>' });
    }
  }

  return items;
}
