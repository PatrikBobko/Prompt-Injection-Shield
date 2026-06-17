// Content-script entry point (injected as a classic script per manifest).
// It dynamically imports the ES-module scanner (allowed via web_accessible_
// resources), runs a scan on load, caches results, and answers messages.
//
// Live element references are kept in a page-side registry so later steps
// (highlighting) can resolve a finding id back to its DOM node. Only the
// serializable view of each finding ever crosses the messaging boundary.

(async () => {
  const url = (p) => chrome.runtime.getURL(p);
  const { scanPage } = await import(url('src/content/scanner.js'));
  const { summarize } = await import(url('src/core/score.js'));
  const { highlightElement, removeHighlight } = await import(url('src/content/highlight.js'));

  /** @type {Map<number, Element>} id -> element */
  const elementRegistry = new Map();
  /** @type {object[]} cached serializable findings from the last scan */
  let lastFindings = [];

  function runScan() {
    removeHighlight(); // clear any stale outline from a previous scan
    const findings = scanPage(document);
    elementRegistry.clear();
    lastFindings = findings.map((f) => {
      if (f.element) elementRegistry.set(f.id, f.element);
      const { element, ...serializable } = f; // drop the live DOM ref
      return serializable;
    });
    const counts = summarize(lastFindings);
    console.info(
      `[Prompt Injection Shield] ${counts.total} findings — HIGH ${counts.HIGH}, MEDIUM ${counts.MEDIUM}, LOW ${counts.LOW}`,
    );
    updateBadge(counts.HIGH);
    return counts;
  }

  /** Report the HIGH count to the background worker for the toolbar badge. */
  function updateBadge(high) {
    try {
      chrome.runtime.sendMessage({ type: 'SET_BADGE', high });
    } catch {
      // Background may be momentarily unavailable; the next scan will retry.
    }
  }

  // Expose for manual poking from the page console during development.
  window.__promptInjectionShield = { runScan, getFindings: () => lastFindings, registry: elementRegistry };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg && msg.type) {
      case 'RESCAN': {
        const counts = runScan();
        sendResponse({ ok: true, counts, findings: lastFindings });
        return false; // synchronous response
      }
      case 'GET_FINDINGS': {
        sendResponse({ ok: true, counts: summarize(lastFindings), findings: lastFindings });
        return false;
      }
      case 'HIGHLIGHT': {
        const el = elementRegistry.get(msg.id);
        const result = el ? highlightElement(el) : { ok: false, reason: 'finding not found' };
        sendResponse(result);
        return false;
      }
      default:
        return false;
    }
  });

  // Initial scan once the DOM has settled (manifest runs us at document_idle).
  runScan();
})();
