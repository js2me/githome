chrome.tabs.onRemoved.addListener((id) => {
  void chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] }).catch(() => {});
});
