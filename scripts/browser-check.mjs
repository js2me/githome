/**
 * Headless smoke check for Suspense navigation + GitlabAvatar sibling lists
 * (mobx-view-model integration; no real GitLab needed).
 *
 * Prereq: dev server running (`pnpm dev`, vite on 1420).
 * Usage:  node scripts/browser-check.mjs
 * Env:    BASE=http://localhost:1420  CHROME_PATH=/usr/bin/google-chrome
 *
 * How it works: injects a fake connection into localStorage
 * (`githome:connections` -> gitlab.mock) and intercepts all
 * `/git-proxy/gitlab.mock/*` requests with mock JSON (projects, readme,
 * merge requests with 5 distinct authors).
 *
 * Checks:
 * - home -> project (lazy page under Suspense) -> Merge requests -> back -> forward
 * - exactly one visible avatar per author on every MR-list mount
 * - open multiple MR tabs across repositories, switch between them, and close one
 * - open the sticky workspace picker by pointer and keyboard without shifting the page
 * - scroll and select files in a 255-file merge request
 * - compare PNG and JPEG revisions and open either side in the zoom viewer
 * - submit a file-level comment and render the new thread on the file
 * - copy the GitLab URL from the MR header and open an MR by a pasted URL
 * - avatar titles map to the right authors, zero page/console errors
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE ?? 'http://localhost:1420';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

const AUTHORS = ['Alice Smith', 'Bob Jones', 'Carol White', 'Dave Black', 'Eve Green'];

const failures = [];
const check = (label, ok, details = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${details ? ` — ${details}` : ''}`);
  if (!ok) failures.push(label);
};

// ---------------------------------------------------------------- mock data

const user = (id, name) => ({
  id,
  name,
  username: name.toLowerCase().replace(/\s+/g, '.'),
  state: 'active',
  avatar_url: null,
  web_url: `https://gitlab.mock/${name}`,
});

const project = (id, name) => ({
  id,
  name,
  path: name,
  name_with_namespace: `group / ${name}`,
  path_with_namespace: `group/${name}`,
  description: `Mock project ${name}`,
  avatar_url: null,
  star_count: id,
  forks_count: 0,
  open_issues_count: 3,
  last_activity_at: '2026-07-27T10:00:00.000Z',
  created_at: '2025-01-01T10:00:00.000Z',
  default_branch: 'main',
  visibility: 'private',
  web_url: `https://gitlab.mock/group/${name}`,
  namespace: { id: 100, name: 'group', path: 'group', kind: 'group', avatar_url: null },
});

const mr = (iid, title, authorName) => ({
  id: 1000 + iid,
  iid,
  project_id: 1,
  title,
  description: `desc ${title}`,
  state: 'opened',
  draft: false,
  has_conflicts: false,
  source_branch: `feature/${iid}`,
  target_branch: 'main',
  author: user(200 + iid, authorName),
  assignees: [user(200 + iid, authorName)],
  reviewers: [user(300 + iid, `Reviewer ${iid}`)],
  upvotes: 0,
  downvotes: 0,
  user_notes_count: iid,
  created_at: '2026-07-20T10:00:00.000Z',
  updated_at: '2026-07-27T10:00:00.000Z',
  merged_at: null,
  closed_at: null,
  web_url: `https://gitlab.mock/group/alpha/-/merge_requests/${iid}`,
  references: { short: `!${iid}`, full: `group/alpha!${iid}` },
  labels: [],
  milestone: null,
  merge_status: 'can_be_merged',
  detailed_merge_status: 'mergeable',
  sha: 'abc123',
});

const projects = [project(1, 'alpha'), project(2, 'beta'), project(3, 'gamma')];
const mrs = AUTHORS.map((name, i) => mr(i + 1, `Mock MR #${i + 1}`, name));

const largeMrChanges = Array.from({ length: 255 }, (_, index) => {
  const directory = String(Math.floor(index / 17)).padStart(2, '0');
  const path = `packages/feature-${directory}/file-${String(index).padStart(3, '0')}.ts`;
  return {
    old_path: path,
    new_path: path,
    diff: `@@ -1 +1 @@\n-const value = 0;\n+const value = ${index + 1};\n`,
  };
});

const imageMrChanges = [
  {
    old_path: 'assets/old screenshot.PNG',
    new_path: 'assets/new screenshot.png',
    renamed_file: true,
    diff: '@@ -1 +1 @@\n-binary old data\n+binary new data\n',
  },
  { old_path: 'assets/added.JPG', new_path: 'assets/added.JPG', new_file: true },
  { old_path: 'assets/deleted.png', new_path: 'assets/deleted.png', deleted_file: true },
];
const pngBefore = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAEElEQVR42mP8z4AATAy4OAAmdgEFDPIXWgAAAABJRU5ErkJggg==', 'base64',
);
const pngAfter = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAFCAIAAAD38zoCAAAAE0lEQVR42mNkaGDACpgYGGguAQBAbgCKK+jhvAAAAABJRU5ErkJggg==', 'base64',
);
const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/' +
  '2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAGAAcDASIAAhEBAxEB/' +
  '8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABQf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCOALiMf//Z',
  'base64',
);
const imageResponses = new Map([
  ['base-sha:assets/old screenshot.PNG', pngBefore],
  ['head-sha:assets/new screenshot.png', pngAfter],
  ['head-sha:assets/added.JPG', jpeg],
  ['base-sha:assets/deleted.png', pngBefore],
]);
const imageRequests = [];
const imageMrDiffRefs = { base_sha: 'base-sha', start_sha: 'incorrect-parent', head_sha: 'head-sha' };
const fileDiscussionPath = '/git-proxy/gitlab.mock/api/v4/projects/1/merge_requests/156/discussions';
const isFileDiscussionPost = (req) =>
  req.method() === 'POST' && new URL(req.url()).pathname === fileDiscussionPath;

const route = (url) => {
  const p = new URL(url).pathname.replace('/git-proxy/gitlab.mock', '');
  if (p === '/api/v4/user') return user(1, 'Test User');
  if (/^\/api\/v4\/projects\/\d+$/.test(p)) {
    const id = Number(p.split('/').pop());
    return projects.find((pr) => pr.id === id) ?? projects[0];
  }
  if (p.endsWith('/diffs_batch.json')) {
    if (p.includes('/155/')) return { diff_files: largeMrChanges };
    return { diff_files: p.includes('/156/') ? imageMrChanges : [] };
  }
  if (p.endsWith('/merge_requests/155')) return mr(155, 'Large MR', AUTHORS[0]);
  if (p.endsWith('/merge_requests/156')) {
    return {
      ...mr(156, 'Image MR', AUTHORS[0]),
      diff_refs: imageMrDiffRefs,
    };
  }
  if (/merge_requests\/\d+\/(versions|discussions|reviewers)$/.test(p)) return [];
  if (/merge_requests\/\d+\/approvals$/.test(p)) return { approved_by: [] };
  if (/merge_requests\/\d+/.test(p)) {
    const iid = Number(p.match(/merge_requests\/(\d+)/)[1]);
    return mrs.find((m) => m.iid === iid) ?? mrs[0];
  }
  if (p.includes('merge_requests')) return mrs;
  if (p.includes('/repository/readme')) {
    return { file_name: 'README.md', file_path: 'README.md', content: '# alpha\n\nmock readme content' };
  }
  if (p.includes('/repository/branches')) {
    return [
      {
        name: 'main',
        default: true,
        merged: false,
        protected: true,
        web_url: 'https://gitlab.mock/group/alpha/-/tree/main',
        commit: {
          id: 'commit1',
          short_id: 'commit1',
          title: 'init',
          message: 'init',
          author_name: 'Alice Smith',
          authored_date: '2026-07-01T00:00:00Z',
          created_at: '2026-07-01T00:00:00Z',
        },
      },
    ];
  }
  if (/\/repository\/(tree|commits|tags|contributors)/.test(p)) return [];
  if (p.includes('/languages')) return { TypeScript: 80.0, CSS: 20.0 };
  if (/\/(members|milestones|labels|releases|pipelines|issues|events|hooks|approvals)\b/.test(p)) return [];
  if (p.includes('projects')) return projects;
  if (p.includes('graphql')) return { data: {} };
  return null; // fallback: []
};

// ---------------------------------------------------------------- run

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
const pageErrors = [];
const consoleErrors = [];

page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error') consoleErrors.push(text);
});

await page.evaluateOnNewDocument(() => {
  localStorage.setItem(
    'githome:connections',
    JSON.stringify({
      items: [{ id: 'test-conn', gitlabUrl: 'https://gitlab.mock', gitToken: 'fake-token' }],
      activeId: 'test-conn',
    }),
  );
});

await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('/git-proxy/')) {
    const requestUrl = new URL(url);
    if (isFileDiscussionPost(req)) {
      const { body, position } = JSON.parse(req.postData() ?? '{}');
      req.respond({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'file-thread',
          individual_note: false,
          notes: [{ id: 1, body, position, author: user(1, 'Test User'), created_at: new Date().toISOString() }],
        }),
      });
      return;
    }
    const imagePath = requestUrl.pathname.match(/\/repository\/files\/([^/]+)\/raw$/)?.[1];
    if (imagePath && decodeURIComponent(imagePath).startsWith('assets/')) {
      const key = `${requestUrl.searchParams.get('ref')}:${decodeURIComponent(imagePath)}`;
      imageRequests.push(key);
      const body = imageResponses.get(key);
      req.respond({ status: body ? 200 : 404, contentType: 'application/octet-stream', body });
      return;
    }
    req.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(route(url) ?? []),
    });
  } else {
    req.continue();
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const avatarTitles = () =>
  page.evaluate((names) =>
    [...document.querySelectorAll('[title]')]
      .map((el) => el.getAttribute('title'))
      .filter((t) => names.includes(t)),
  AUTHORS);

const clickByText = async (text) =>
  page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let best = null;
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.childElementCount === 0 && el.textContent?.trim() === t) best = el;
    }
    if (!best) return false;
    let target = best;
    while (target && target !== document.body) {
      if (target.matches('a,button,[role="link"],[role="button"],[class*="cursor-pointer"]')) break;
      target = target.parentElement;
    }
    (target && target !== document.body ? target : best).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    return true;
  }, text);

const checkMrList = async (label) => {
  const titles = await avatarTitles();
  const hasOneAvatarPerAuthor = AUTHORS.every(
    (author) => titles.filter((title) => title === author).length === 1,
  );
  check(`${label}: one visible avatar per author`, hasOneAvatarPerAuthor, titles.join(', '));
  check(
    `${label}: all authors rendered correctly`,
    AUTHORS.every((a) => titles.includes(a)),
    titles.join(', '),
  );
};

console.log(`\n== githome browser check @ ${BASE} ==`);

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(4500);
check('home: projects rendered', (await page.evaluate(() => document.body.innerText)).includes('group/alpha'));

check('click project card', await clickByText('alpha'));
await sleep(4000);
check('repository page opened', page.url().includes('/repository/1'));

check('click "Merge requests"', await clickByText('Merge requests'));
await sleep(4000);
await checkMrList('MR list');

await page.goBack({ waitUntil: 'domcontentloaded' });
await sleep(2500);
await page.goForward({ waitUntil: 'domcontentloaded' });
await sleep(3000);
await checkMrList('MR list after back/forward');

const workspace = 'aside[aria-label="Рабочая область"]';
const workspaceTrigger = `${workspace} button[aria-expanded]`;
const workspaceTree = `${workspace} nav[aria-label="Навигационное дерево"]`;
const waitForWorkspace = (expanded) => page.waitForSelector(
  `${workspace}[data-expanded="${expanded}"]`, { timeout: 3000 },
);
const leaveWorkspace = () => page.mouse.move(page.viewport().width - 20, 60);
const openWorkspace = async () => {
  await leaveWorkspace();
  await page.hover(workspaceTrigger);
  await waitForWorkspace(true);
};

const openMrFromProject = async (projectId, iid) => {
  await page.goto(`${BASE}/repository/${projectId}/merge-requests`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(3500);
  const title = `Mock MR #${iid}`;
  const clicked = await clickByText(title);
  if (!clicked) return false;
  const detailPath = `/repository/${projectId}/merge-requests/${iid}`;
  await page.waitForFunction((path, expectedTitle) => location.pathname === path &&
    [...document.querySelectorAll('main h2')].some(heading => heading.textContent === expectedTitle),
  { timeout: 5000 }, detailPath, title);
  await page.waitForSelector(workspaceTrigger, { timeout: 3000 });
  return page.$eval(workspaceTrigger, trigger => trigger.getAttribute('aria-expanded') === 'false');
};

check('open MR tab from first repository with the workspace picker collapsed', await openMrFromProject(1, 1));
check('open another MR in the first repository with the workspace picker collapsed', await openMrFromProject(1, 3));
check('open MR tab from second repository with the workspace picker collapsed', await openMrFromProject(2, 2));

await page.setViewport({ width: 980, height: 640, deviceScaleFactor: 1.5 });
const mainLayout = () => page.$eval('main', main => {
  const { x, y, width } = main.getBoundingClientRect();
  return { x, y, width };
});
const mainBeforeOpening = await mainLayout();
await openWorkspace();
const workspaceOpen = await page.$eval(workspace, (aside) => {
  const nav = aside.querySelector('nav[aria-label="Навигационное дерево"]');
  const withinColumn = (elements) => {
    const rows = [...elements].map((element) => element.getBoundingClientRect());
    return rows.every((row, index) => index === 0 || (
      Math.abs(row.left - rows[0].left) < 1 && row.top >= rows[index - 1].bottom - 1
    ));
  };
  const trigger = aside.querySelector('button[aria-expanded]');
  const sections = [...nav.querySelectorAll('section')];
  return {
    expanded: trigger.getAttribute('aria-expanded') === 'true',
    position: getComputedStyle(aside).position,
    opensDown: nav.getBoundingClientRect().top >= trigger.getBoundingClientRect().bottom - 1,
    navWidth: nav.clientWidth,
    navScrollWidth: nav.scrollWidth,
    verticalGroups: sections.length === 2 && withinColumn(sections),
    verticalTabs: sections.some((section) => section.querySelectorAll('li').length >= 2) &&
      sections.every((section) => withinColumn(section.querySelectorAll('li'))),
  };
});

check(
  'hover reveals the sticky workspace list below the trigger at 980px',
  workspaceOpen.expanded && workspaceOpen.position === 'sticky' && workspaceOpen.opensDown,
  JSON.stringify(workspaceOpen),
);
const mainWhileOpen = await mainLayout();
check('opening the workspace picker does not move the page',
  Object.entries(mainBeforeOpening).every(([key, value]) => Math.abs(mainWhileOpen[key] - value) < 1),
  JSON.stringify({ before: mainBeforeOpening, open: mainWhileOpen }),
);
check(
  'workspace groups and all MR tabs form one column without horizontal scrolling at 980px',
  workspaceOpen.verticalGroups && workspaceOpen.verticalTabs && workspaceOpen.navScrollWidth <= workspaceOpen.navWidth,
);

await leaveWorkspace();
await waitForWorkspace(false);
check('workspace closes when the pointer leaves', true);

await page.focus(workspaceTrigger);
await page.keyboard.press('Enter');
await waitForWorkspace(true);
await page.keyboard.press('Tab');
check('keyboard users can open the workspace picker and reach the list',
  await page.$eval(workspaceTree, nav => nav.contains(document.activeElement)),
);
await page.keyboard.press('Escape');
await waitForWorkspace(false);
check('Escape closes the workspace and returns focus to its trigger',
  await page.$eval(workspaceTrigger, trigger => document.activeElement === trigger),
);

await openWorkspace();
await page.click(`${workspaceTree} button[aria-label="Закрыть Mock MR #3"]`);
await openWorkspace();

const sidebarState = await page.evaluate(() => {
  const sidebar = document.querySelector('nav[aria-label="Навигационное дерево"]');
  return {
    titles: [...(sidebar?.querySelectorAll('button[title]') ?? [])]
      .map((button) => button.getAttribute('title')),
    groups: [...(sidebar?.querySelectorAll('h3') ?? [])]
      .map((heading) => heading.textContent?.trim()),
    text: sidebar?.textContent ?? '',
  };
});
check(
  'both MR tabs persist and are grouped by repository',
  sidebarState.titles.includes('Mock MR #1') &&
    sidebarState.titles.includes('Mock MR #2') &&
    sidebarState.groups.includes('group/alpha') &&
    sidebarState.groups.includes('group/beta'),
  JSON.stringify(sidebarState),
);
check('MR numbers are not displayed in the sidebar', !sidebarState.text.includes('!1') && !sidebarState.text.includes('!2'));

const alphaRepositoryGroup = await page.$('nav[aria-label="Навигационное дерево"] button[title="group/alpha"]');
check('repository group is clickable', Boolean(alphaRepositoryGroup));
if (alphaRepositoryGroup) {
  await alphaRepositoryGroup.click();
  await sleep(1000);
  check('clicking a repository group opens that repository', page.url().endsWith('/repository/1'));
}

await openWorkspace();
const firstMrTab = await page.$('nav[aria-label="Навигационное дерево"] button[title="Mock MR #1"]');
check('switch to the first MR tab', Boolean(firstMrTab));
if (firstMrTab) {
  await firstMrTab.click();
  await sleep(1000);
  check('first MR tab becomes active', page.url().endsWith('/repository/1/merge-requests/1'));

  await openWorkspace();
  const closeFirstMrTab = await page.$('nav[aria-label="Навигационное дерево"] button[aria-label="Закрыть Mock MR #1"]');
  check('close the active MR tab', Boolean(closeFirstMrTab));
  if (closeFirstMrTab) {
    await closeFirstMrTab.click();
    await sleep(1000);
    check('closing the active tab switches to the remaining MR', page.url().endsWith('/repository/2/merge-requests/2'));
  }
}

// Use a real wheel event and pointer click so scroll capture and hit testing
// run exactly as they do in the application.
try {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/repository/1/merge-requests/155`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.git-diff > article').length === 255);
  const tree = '.changes-file-tree__nav';
  await page.waitForSelector(`${tree} [data-changes-file-id]`);
  const mountedRows = await page.$$eval(`${tree} .changes-file-tree__row`, rows => rows.length);
  check('large MR mounts only nearby tree rows', mountedRows < 60, `${mountedRows} rows in the DOM`);

  await waitForWorkspace(false);
  const workspaceTopAtPageStart = await page.$eval(workspace, aside => aside.getBoundingClientRect().top);

  // Start where the sticky tree and diff cards are visible together.
  await page.$eval('.git-diff', diff => window.scrollTo(0, diff.getBoundingClientRect().top + window.scrollY));
  check('the workspace trigger sticks near the top while scrolling an MR',
    await page.$eval(workspace, (aside, initialTop) => {
      const { top } = aside.getBoundingClientRect();
      const stickyTop = Number.parseFloat(getComputedStyle(aside).top);
      return window.scrollY > 0 && top < initialTop && Math.abs(top - stickyTop) < 1;
    }, workspaceTopAtPageStart),
  );
  const point = await page.$eval(tree, nav => {
    const rect = nav.getBoundingClientRect();
    return { x: rect.left + 35, y: rect.top + 70 };
  });
  await sleep(200);
  const pageOffset = await page.evaluate(() => window.scrollY);
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel({ deltaY: 4900 });
  await page.waitForFunction(selector => (document.querySelector(selector)?.scrollTop ?? 0) > 1000, {}, tree);
  await sleep(100);
  check('scrolling the files tree leaves the diff fixed', (await page.evaluate(() => window.scrollY)) === pageOffset);

  const selectedPath = await page.$eval(tree, nav => {
    const rect = nav.getBoundingClientRect();
    return document.elementFromPoint(rect.left + 90, rect.top + 140)
      ?.closest('[data-changes-file-id]')?.title;
  });
  if (!selectedPath) throw new Error('No visible file at the click position');
  const row = `${tree} [title="${selectedPath}"]`;
  await page.click(row);
  const cardId = `diff-file-${encodeURIComponent(`${selectedPath}\0${selectedPath}`)}`;
  await page.waitForFunction((id, rowSelector) => {
    const card = document.getElementById(id);
    return card && Math.abs(card.getBoundingClientRect().top - 16) < 2 &&
      document.querySelector(rowSelector)?.getAttribute('aria-current') === 'true';
  }, { timeout: 6000 }, cardId, row);
  await sleep(200);
  check('click jumps to the exact diff and retains selection', await page.$eval(
    row, button => button.getAttribute('aria-current') === 'true',
  ));

  await page.mouse.move(1150, 420);
  await page.mouse.wheel({ deltaY: 900 });
  await page.waitForFunction(selector => {
    const current = document.querySelector('.changes-file-tree__nav [aria-current="true"]');
    return current && current !== document.querySelector(selector);
  }, { timeout: 6000 }, row);
  check('scrolling the diff updates the active tree row', true);

  const lastPath = largeMrChanges.at(-1).new_path;
  await page.type('.changes-file-tree__search-input', lastPath.split('/').at(-1));
  const lastRow = `${tree} [title="${lastPath}"]`;
  await page.waitForSelector(lastRow);
  await page.click(lastRow);
  await sleep(200);
  check('search and click preserve the last file selection at the bottom', await page.$eval(
    lastRow, button => button.getAttribute('aria-current') === 'true' &&
      document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 2,
  ));
} catch (error) {
  check('large MR tree navigation', false, String(error));
}

try {
  await page.goto(`${BASE}/repository/1/merge-requests/156`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.git-diff > article').length === 3);
  const getImagePanels = async (index, widths) => {
    const selector = `.git-diff > article:nth-child(${index + 1})`;
    await page.$eval(selector, card => card.scrollIntoView({ block: 'center' }));
    await page.waitForFunction((selector, widths) => {
      const figures = [...document.querySelectorAll(`${selector} figure`)];
      const labels = figures.map(figure => figure.querySelector('figcaption')?.textContent);
      if (labels.join(',') !== 'Было,Стало') return false;
      return figures.every((figure, side) => widths[side]
        ? figure.querySelector('img')?.naturalWidth === widths[side]
        : figure.textContent.includes('Файл отсутствует'));
    }, { timeout: 6000 }, selector, widths);
    return page.$eval(selector, card => !card.querySelector('[data-diff-row-id]'));
  };

  check('renamed PNG compares both GitLab snapshots with no binary diff lines', await getImagePanels(0, [4, 8]));
  check('added JPEG shows only the new snapshot', await getImagePanels(1, [null, 7]));
  check('deleted PNG shows only the old snapshot', await getImagePanels(2, [4, null]));
  check('image diff fetches only existing paths at the correct SHAs', imageRequests.length === 4 &&
    imageRequests.every(key => imageResponses.has(key)), imageRequests.join(', '));

  const firstImageDiff = '.git-diff > article:first-child';
  const beforeButton = `${firstImageDiff} button[aria-label="Открыть изображение «Было»"]`;
  const afterButton = `${firstImageDiff} button[aria-label="Открыть изображение «Стало»"]`;
  const viewer = 'dialog[open][aria-label^="Было"]';
  await page.$eval(firstImageDiff, card => card.scrollIntoView({ block: 'center' }));
  await waitForWorkspace(false);
  await page.click(`${beforeButton} img`);
  await page.waitForSelector(`${viewer} button[aria-label="Приблизить"]:enabled`);
  const viewedImage = () => page.$eval(`${viewer} img`, image => ({
    url: image.src, width: image.getBoundingClientRect().width,
  }));
  const initial = await viewedImage();
  check('click opens the original before image', initial.url === await page.$eval(`${beforeButton} img`, image => image.src));
  await page.click(`${viewer} button[aria-label="Приблизить"]`);
  await page.waitForFunction(selector => document.querySelector(`${selector} output`)?.textContent === '125%', {}, viewer);
  check('zoom button enlarges the image itself', (await viewedImage()).width > initial.width);
  const center = await page.$eval(`${viewer} [role="region"]`, region => {
    const rect = region.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel({ deltaY: -120 });
  await page.waitForFunction(selector => document.querySelector(`${selector} output`)?.textContent === '156%', {}, viewer);
  await page.click(`${viewer} button[aria-label="Исходный размер"]`);
  await page.waitForFunction(selector => document.querySelector(`${selector} output`)?.textContent === '100%', {}, viewer);
  check('wheel zoom and original image scale work', true);
  await page.keyboard.press('Escape');
  await page.waitForSelector(viewer, { hidden: true });
  check('Escape closes the viewer and returns focus to the preview', await page.$eval(
    beforeButton, button => button === document.activeElement,
  ));
  await page.click(`${afterButton} img`);
  const afterViewer = 'dialog[open][aria-label^="Стало"]';
  await page.waitForSelector(afterViewer);
  check('the other side opens the after image', await page.$eval(`${afterViewer} img`, image => image.src) ===
    await page.$eval(`${afterButton} img`, image => image.src));
  await page.click(`${afterViewer} button[aria-label="Закрыть изображение"]`);
  await page.waitForSelector(afterViewer, { hidden: true });
} catch (error) {
  check('image diff previews', false, String(error));
}

try {
  const card = '.git-diff > article:first-child';
  const editor = `${card} textarea[placeholder="Оставьте комментарий к файлу"]`;
  const submit = `${card} ::-p-xpath(.//button[normalize-space(.)="Отправить"])`;
  const body = 'Looks good at file level';
  await page.click(`${card} header ::-p-xpath(.//button[normalize-space(.)="Комментарий к файлу"])`);
  await page.waitForSelector(editor, { timeout: 3000 });
  check('file comment cannot be submitted while empty', await page.$eval(submit, button => button.disabled));
  await page.type(editor, body);
  check('typing enables the submit button', await page.$eval(submit, button => !button.disabled));
  const [request] = await Promise.all([
    page.waitForRequest(isFileDiscussionPost, { timeout: 3000 }),
    page.click(submit),
  ]);
  const payload = JSON.parse(request.postData() ?? '{}');
  check('submit sends a file-level discussion on the renamed file',
    payload.body === body && payload.position?.position_type === 'file' &&
    payload.position.old_path === 'assets/old screenshot.PNG' &&
    payload.position.new_path === 'assets/new screenshot.png' &&
    Object.entries(imageMrDiffRefs).every(([key, value]) => payload.position[key] === value) &&
    !('old_line' in payload.position) && !('new_line' in payload.position),
  );
  await page.waitForFunction((selector, text) =>
    document.querySelector(selector)?.textContent?.includes(text), { timeout: 3000 }, card, body);
  await page.waitForSelector(editor, { hidden: true, timeout: 3000 });
  check('the new comment appears on the file and closes the form', true);
} catch (error) {
  check('submitting a file-level comment', false, String(error));
}

try {
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: async (text) => { window.copiedMergeRequestUrl = text; },
    });
  });
  const copy = await page.waitForSelector('button[aria-label="Скопировать ссылку на MR"]', { timeout: 3000 });
  await copy.click();
  await page.waitForFunction(button => button.textContent.includes('Скопировано'), { timeout: 3000 }, copy);
  check('MR header copies the GitLab URL', await page.evaluate(() => window.copiedMergeRequestUrl) ===
    mr(156, 'Image MR', AUTHORS[0]).web_url);
} catch (error) {
  check('copying the MR link', false, String(error));
}

try {
  const dialog = 'dialog[open][aria-labelledby="open-mr-title"]';
  await page.click('button[aria-label="Открыть MR"]');
  await page.waitForSelector(dialog);
  check('open MR dialog focuses the link field', await page.$eval(
    dialog + ' input', input => input === document.activeElement,
  ));
  await page.keyboard.type('https://gitlab.mock/group/alpha/-/merge_requests/3/diffs#note_42');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.pathname === '/repository/1/merge-requests/3' &&
    [...document.querySelectorAll('main h2')].some(heading => heading.textContent === 'Mock MR #3'));
  check('pasted GitLab link opens its MR inside GitHome', !(await page.$(dialog)));
} catch (error) {
  check('opening a GitLab MR by URL', false, String(error));
}

check('no page errors', pageErrors.length === 0, pageErrors[0]?.slice(0, 150));
check('no console errors', consoleErrors.length === 0, consoleErrors[0]?.slice(0, 150));

await browser.close();

console.log(failures.length ? `\nFAILED: ${failures.length} check(s)` : '\nOK: all checks passed');
process.exitCode = failures.length ? 1 : 0;
