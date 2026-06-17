// Background service worker (MV3, module). Its only job for now is the toolbar
// badge: the content script reports the HIGH-severity count for its tab after
// each scan, and we reflect that on the action badge for that specific tab.

const BADGE_COLOR = '#b00020';

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'SET_BADGE') return false;
  // Per-tab badge: only meaningful when the message came from a tab.
  const tabId = sender && sender.tab && sender.tab.id;
  if (tabId == null) return false;

  const high = Number(msg.high) || 0;
  chrome.action.setBadgeText({ tabId, text: high > 0 ? String(high) : '' });
  if (high > 0) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
  }
  return false; // no async response
});

// Clear the badge when a tab navigates, so a stale HIGH count doesn't linger
// before the new page's content script reports in.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});
