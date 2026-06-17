// Popup controller. Talks to the active tab's content script over messaging,
// renders findings, and asks the content script to highlight one on click.
//
// SECURITY: findings contain attacker-controlled text. Every value is inserted
// via textContent / createElement — never innerHTML — so a malicious snippet
// can't run script inside the popup.

const SEV_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const SEV_CLASS = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

const els = {
  rescan: document.getElementById('rescan'),
  status: document.getElementById('status'),
  list: document.getElementById('findings'),
  cHigh: document.getElementById('c-high'),
  cMed: document.getElementById('c-med'),
  cLow: document.getElementById('c-low'),
};

/** Resolve the active tab (id only — works under "activeTab", no "tabs" perm). */
function activeTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) return reject(new Error('No active tab.'));
      resolve(tab);
    });
  });
}

/** Send a message to the content script, rejecting on connection errors. */
function sendToContent(tabId, msg) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve(resp);
    });
  });
}

function setStatus(text) {
  if (!text) {
    els.status.hidden = true;
    els.status.textContent = '';
  } else {
    els.status.hidden = false;
    els.status.textContent = text;
  }
}

function renderCounts(counts) {
  els.cHigh.textContent = counts.HIGH || 0;
  els.cMed.textContent = counts.MEDIUM || 0;
  els.cLow.textContent = counts.LOW || 0;
}

function renderFindings(findings, tabId) {
  els.list.replaceChildren();
  const sorted = [...findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  for (const f of sorted) {
    const li = document.createElement('li');
    li.className = `finding ${SEV_CLASS[f.severity] || ''}`;
    li.tabIndex = 0;

    const head = document.createElement('div');
    head.className = 'finding-head';
    const tag = document.createElement('span');
    tag.className = `sev-tag ${SEV_CLASS[f.severity] || ''}`;
    tag.textContent = f.severity;
    head.appendChild(tag);
    if (f.channel) {
      const ch = document.createElement('span');
      ch.className = 'channel';
      ch.textContent = f.channel;
      head.appendChild(ch);
    }
    li.appendChild(head);

    const snippet = document.createElement('div');
    snippet.className = 'snippet';
    snippet.textContent = f.snippet || '';
    li.appendChild(snippet);

    if (f.reasons && f.reasons.length) {
      const reasons = document.createElement('div');
      reasons.className = 'reasons';
      reasons.textContent = f.reasons.join(' · ');
      li.appendChild(reasons);
    }

    if (f.cssPath) {
      const path = document.createElement('div');
      path.className = 'csspath';
      path.textContent = f.cssPath;
      li.appendChild(path);
    }

    const activate = () => highlight(tabId, f.id);
    li.addEventListener('click', activate);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });

    els.list.appendChild(li);
  }
}

/** Ask the content script to outline + scroll to a finding (implemented in step 5). */
async function highlight(tabId, id) {
  try {
    const resp = await sendToContent(tabId, { type: 'HIGHLIGHT', id });
    // The element may exist but have no rendered box (e.g. display:none) — there's
    // nothing to outline, so let the user know rather than appearing to do nothing.
    if (resp && resp.ok === false) {
      setStatus(resp.reason ? `Can't outline: ${resp.reason}` : 'Could not highlight that element.');
    } else {
      setStatus('');
    }
  } catch {
    setStatus('Could not reach the page to highlight this finding.');
  }
}

/** Render a {counts, findings} response, or an empty/clean state. */
function render(resp, tabId) {
  const findings = (resp && resp.findings) || [];
  const counts = (resp && resp.counts) || { HIGH: 0, MEDIUM: 0, LOW: 0 };
  renderCounts(counts);
  renderFindings(findings, tabId);
  setStatus(findings.length ? '' : 'This page looks clean — no hidden or injection threats detected.');
}

async function load(rescan = false) {
  els.rescan.disabled = true;
  setStatus(rescan ? 'Scanning…' : 'Loading…');
  els.list.replaceChildren();
  try {
    const tab = await activeTab();
    const resp = await sendToContent(tab.id, { type: rescan ? 'RESCAN' : 'GET_FINDINGS' });
    render(resp, tab.id);
  } catch (err) {
    renderCounts({ HIGH: 0, MEDIUM: 0, LOW: 0 });
    // Most common cause: a page the content script can't run on (chrome://,
    // the Web Store, PDF viewer) or the tab hasn't been scanned yet.
    setStatus(`Can't scan this page. (${err.message})`);
  } finally {
    els.rescan.disabled = false;
  }
}

els.rescan.addEventListener('click', () => load(true));
load(false);
