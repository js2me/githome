import { updateLinkHandlers } from './links.js';

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.get(['origin', 'auto'])
    .then(({ origin, auto }) => {
      if (!origin) return;
      return updateLinkHandlers(origin, auto ?? true);
    })
    .catch((error) => console.warn('Could not update the GitHome Chrome rule', error));
});

chrome.tabs.onRemoved.addListener((id) => {
  void chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] }).catch(() => {});
});
