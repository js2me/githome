(async () => {
  const { origin, auto } = await chrome.storage.local.get(['origin', 'auto']);
  if (!origin || origin !== location.origin || auto === false) return;

  // The path alone can't distinguish a project from a GitLab group.
  const { page, projectId, projectFullPath } = document.body?.dataset ?? {};
  if (page !== 'projects:show' || !/^[1-9][0-9]*$/.test(projectId ?? '') || !projectFullPath) return;

  const pathname = decodeURIComponent(location.pathname).replace(/\/$/, '');
  if (!pathname.endsWith(`/${projectFullPath}`)) return;

  location.href = `githome://open-project?url=${encodeURIComponent(location.href)}`;
})().catch(() => {});
