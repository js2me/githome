import { gitlabOrigin, mergeRequestFilter, permissionPattern, redirectRuleId } from './links.js';

const form = document.querySelector('form');
const originInput = document.querySelector('#origin');
const autoInput = document.querySelector('#auto');
const disable = document.querySelector('#disable');
const status = document.querySelector('#status');
let saved = {};
let busy = false;

function render() {
  originInput.value = saved.origin ?? '';
  autoInput.checked = saved.auto ?? true;
  disable.hidden = !saved.origin;
}

function setBusy(value) {
  busy = value;
  for (const control of form.elements) control.disabled = value;
}

async function change(origin, auto) {
  const old = saved.origin && permissionPattern(saved.origin);
  const current = origin && permissionPattern(origin);

  if (current && !(await chrome.permissions.request({ origins: [current] }))) {
    status.textContent = 'Разрешите доступ к этому GitLab, чтобы включить расширение.';
    return;
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [redirectRuleId],
      addRules: origin ? [{
        id: redirectRuleId,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { regexSubstitution: `${chrome.runtime.getURL('open.html')}?url=\\0` },
        },
        condition: { regexFilter: mergeRequestFilter(origin), resourceTypes: ['main_frame'], isUrlFilterCaseSensitive: true },
      }] : [],
    });
    await chrome.storage.local.set({ origin, auto });
  } catch (error) {
    if (current && current !== old) await chrome.permissions.remove({ origins: [current] }).catch(() => false);
    throw error;
  }

  saved = { origin, auto };
  render();
  if (old && old !== current) await chrome.permissions.remove({ origins: [old] }).catch(() => false);
  status.textContent = origin ? 'Готово. Откройте ссылку на MR.' : 'Расширение отключено.';
}

async function update(origin, auto) {
  if (busy) return;
  setBusy(true);
  status.textContent = '';
  try {
    await change(origin, auto);
  } catch {
    status.textContent = 'Не удалось сохранить настройки Chrome.';
  } finally {
    setBusy(false);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const origin = gitlabOrigin(originInput.value);
  if (!origin) {
    status.textContent = 'Укажите HTTPS-адрес сервера без пути к проекту.';
    return;
  }
  void update(origin, autoInput.checked);
});

disable.addEventListener('click', () => void update(null, true));

setBusy(true);
try {
  saved = await chrome.storage.local.get(['origin', 'auto']);
  render();
} catch {
  status.textContent = 'Не удалось прочитать настройки Chrome.';
} finally {
  setBusy(false);
}
