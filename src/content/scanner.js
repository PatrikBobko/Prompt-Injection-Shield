// The DOM scanner: walks the page, produces StyleSnapshot/Rect inputs for the
// pure core, and assembles Finding objects. This is the only place that reads
// computed styles and geometry; all judgement calls live in core/.

import { detectHidden } from '../core/visibility.js';
import { scanUnicode } from '../core/unicode.js';
import { detectInjection } from '../core/injection.js';
import { scoreFinding } from '../core/score.js';
import { parseColor } from '../core/color.js';
import { extractChannels } from './extract.js';
import { cssPath } from './cssPath.js';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
const SNIPPET_MAX = 140;

/**
 * Scan a document (or subtree) and return findings.
 * Each finding carries a live `element` reference for highlighting; the caller
 * is responsible for stripping it before sending across the messaging boundary.
 * @param {Document|Element} [root]
 * @returns {import('../core/types.js').Finding[]}
 */
export function scanPage(root = document) {
  const findings = [];
  let id = 0;
  const push = (f) => {
    if (f) {
      f.id = id++;
      findings.push(f);
    }
  };

  // 1) Rendered text nodes.
  for (const { node, text } of walkTextNodes(root)) {
    const el = node.parentElement;
    if (!el) continue;
    const snapshot = buildStyleSnapshot(el);
    const rect = buildRect(el);
    const hiddenReasons = detectHidden(snapshot, rect);
    push(makeFinding({ text, hiddenReasons, element: el, channel: 'text' }));
  }

  // 2) Hidden-channel content (comments, attrs, meta, hidden inputs).
  // Like hidden text, these only surface when they carry injection phrasing or
  // steganography — scoreFinding() suppresses plain hidden content globally.
  for (const item of extractChannels(root)) {
    push(
      makeFinding({
        text: item.text,
        hiddenReasons: [`hidden channel: ${item.channelLabel}`],
        element: item.element,
        channel: item.channel,
      }),
    );
  }

  return findings;
}

/**
 * Build one finding from a piece of text + its visibility reasons, running the
 * pure unicode/injection detectors and the severity matrix. Returns null when
 * there's nothing worth reporting.
 */
function makeFinding({ text, hiddenReasons, element, channel }) {
  const uni = scanUnicode(text);
  const inj = detectInjection(text);

  const hidden = hiddenReasons.length > 0;
  const stego = uni.reasons.length > 0;
  const injection = inj.length > 0;
  const severity = scoreFinding({ hidden, injection, stego });
  if (!severity) return null;

  const reasons = [...hiddenReasons, ...uni.reasons, ...inj.map((m) => m.label)];

  let snippet = collapse(text).slice(0, SNIPPET_MAX);
  if (uni.decodedTags) snippet += `  [decoded tags: "${uni.decodedTags}"]`;

  return {
    severity,
    snippet,
    reasons,
    channel,
    cssPath: cssPath(element),
    element, // live ref; stripped before messaging
  };
}

/** Yield non-empty text nodes, skipping script/style/noscript/template subtrees. */
function* walkTextNodes(root) {
  const doc = root.ownerDocument || (root.nodeType === 9 ? root : document);
  const scope = root.nodeType === 9 ? root.body || root.documentElement || root : root;
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p || SKIP_TAGS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) {
    yield { node: n, text: n.nodeValue };
  }
}

/**
 * Snapshot the computed-style fields the core cares about, resolving the
 * *effective* background color by walking ancestors (so transparent backgrounds
 * don't defeat the contrast check).
 * @param {Element} el
 * @returns {import('../core/types.js').StyleSnapshot}
 */
function buildStyleSnapshot(el) {
  const cs = getComputedStyle(el);
  return {
    fontSize: parseFloat(cs.fontSize),
    color: cs.color,
    backgroundColor: effectiveBackground(el),
    opacity: parseFloat(cs.opacity),
    visibility: cs.visibility,
    display: cs.display,
    textIndent: parseFloat(cs.textIndent),
    position: cs.position,
    left: parseFloat(cs.left), // NaN when "auto"
    top: parseFloat(cs.top),
    clip: cs.clip,
    clipPath: cs.clipPath,
    overflow: cs.overflow,
    ariaHidden: !!el.closest('[aria-hidden="true"]'),
  };
}

/** First opaque background-color walking up from el; defaults to white. */
function effectiveBackground(el) {
  let node = el;
  while (node && node.nodeType === 1) {
    const bg = getComputedStyle(node).backgroundColor;
    const c = parseColor(bg);
    if (c && c.a > 0) return bg;
    node = node.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

/**
 * @param {Element} el
 * @returns {import('../core/types.js').Rect}
 */
function buildRect(el) {
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function collapse(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}
