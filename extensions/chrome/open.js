import { appLink, escapeRegex, isMergeRequest } from './links.js';

const prefix = `${chrome.runtime.getURL('open.html')}?url=`;
const raw = location.href.startsWith(prefix) ? location.href.slice(prefix.length) : '';
const status = document.querySelector('#status');
const { origin } = await chrome.storage.local.get('origin');

if (!isMergeRequest(raw, origin)) {
  status.textContent = 'Эта ссылка не ведёт на MR в настроенном GitLab.';
} else {
  const target = new URL(raw);
  const app = document.querySelector('#open');
  const browser = document.querySelector('#browser');
  const link = appLink(target.href);
  app.href = link;
  document.querySelector('#target').textContent = `${target.host}${target.pathname}`;
  document.querySelector('#actions').hidden = false;

  browser.addEventListener('click', async () => {
    browser.disabled = true;
    try {
      const tab = await chrome.tabs.getCurrent();
      if (!tab?.id) throw new Error('No tab');
      const urlWithoutHash = target.href.split('#', 1)[0];
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [tab.id],
        addRules: [{
          id: tab.id,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            regexFilter: `^${escapeRegex(urlWithoutHash)}(?:#.*)?$`,
            resourceTypes: ['main_frame'],
            tabIds: [tab.id],
            isUrlFilterCaseSensitive: true,
          },
        }],
      });
      location.replace(target.href);
    } catch {
      status.textContent = 'Не удалось открыть ссылку в GitLab. Попробуйте снова.';
      browser.disabled = false;
    }
  });

}
