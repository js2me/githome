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
 * - exactly ONE GitlabAvatarVM per author on every MR-list mount
 *   (guards the sibling cross-claim bug: claim key VM class+parentId is shared
 *    by same-class siblings; payload must discriminate)
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

const route = (url) => {
  const p = new URL(url).pathname.replace('/git-proxy/gitlab.mock', '');
  if (p === '/api/v4/user') return user(1, 'Test User');
  if (/^\/api\/v4\/projects\/\d+$/.test(p)) {
    const id = Number(p.split('/').pop());
    return projects.find((pr) => pr.id === id) ?? projects[0];
  }
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
const vmLogs = [];

page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error') consoleErrors.push(text);
  if (/\[(useCreateVM|withVM|pendingVM)\]/.test(text)) vmLogs.push(text);
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
let mark = 0;
const vmStats = () => {
  const slice = vmLogs.slice(mark);
  mark = vmLogs.length;
  const byVm = {};
  for (const l of slice) {
    const m = l.match(/INSTANTIATE (\S+)/);
    if (m) byVm[m[1]] = (byVm[m[1]] ?? 0) + 1;
  }
  return byVm;
};

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
  const byVm = vmStats();
  const titles = await avatarTitles();
  check(`${label}: one GitlabAvatarVM per author`, byVm.GitlabAvatarVM === AUTHORS.length, JSON.stringify(byVm));
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
vmStats();

check('click project card', await clickByText('alpha'));
await sleep(4000);
check('repository page opened', page.url().includes('/repository/1'));
vmStats();

check('click "Merge requests"', await clickByText('Merge requests'));
await sleep(4000);
await checkMrList('MR list');

await page.goBack({ waitUntil: 'domcontentloaded' });
await sleep(2500);
vmStats();
await page.goForward({ waitUntil: 'domcontentloaded' });
await sleep(3000);
await checkMrList('MR list after back/forward');

check('no page errors', pageErrors.length === 0, pageErrors[0]?.slice(0, 150));
check('no console errors', consoleErrors.length === 0, consoleErrors[0]?.slice(0, 150));

await browser.close();

console.log(failures.length ? `\nFAILED: ${failures.length} check(s)` : '\nOK: all checks passed');
process.exitCode = failures.length ? 1 : 0;
