/**
 * Headless smoke check for Suspense navigation + GitlabAvatar sibling lists
 * (mobx-view-model integration; no real GitLab needed).
 *
 * Run against the dev server (`pnpm dev`, port 1420) or the desktop renderer
 * (`pnpm build:app && pnpm preview`, set BASE=http://localhost:4173).
 * Usage:  node scripts/browser-check.mjs
 * Env:    BASE=http://localhost:1420  CHROME_PATH=/usr/bin/google-chrome
 *
 * How it works: injects a fake connection into localStorage
 * (`githome:connections` -> gitlab.mock) and intercepts all
 * `/git-proxy/gitlab.mock/*` requests with mock JSON (projects, readme,
 * merge requests by the current user and five other authors).
 *
 * Checks:
 * - home -> project (lazy page under Suspense) -> Merge requests -> back -> forward
 * - repository breadcrumbs open nested groups and link back to the repository
 * - exactly one visible avatar per author on every MR-list mount
 * - the «Мои» filter includes the user's open, merged and closed MRs and supports search
 * - review badges reflect approval and discussion states on desktop and mobile
 * - long MR titles wrap beside their numbers without overflowing
 * - capped pages share the same maximum width without overflowing on mobile
 * - open multiple MR tabs across repositories, switch between them, and close one
 * - open the sticky workspace picker by pointer and keyboard without shifting the page
 * - scroll and select files in a 255-file merge request
 * - retain TSX token colors on changed words and newly added lines in small and large MRs
 * - compare PNG and JPEG revisions and open either side in the zoom viewer
 * - submit a file-level comment and render the new thread on the file
 * - copy the GitLab URL from the MR header and open an MR by a pasted URL
 * - follow Jira references from the MR overview with the keyboard and copy each branch
 * - identify and switch between two GitLab users on the same host
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
const oneui = { id: 401, name: 'oneui', full_path: 'oneui' };
const frontend = { id: 402, name: 'frontend', full_path: 'oneui/frontend' };
const nova = {
  ...project(4, 'nova'),
  path_with_namespace: 'oneui/frontend/nova',
  web_url: 'https://gitlab.mock/oneui/frontend/nova',
};
const mrs = AUTHORS.map((name, i) => mr(i + 1, `Mock MR #${i + 1}`, name));
const longMrTitle = `Refactor the shared libraries for the microfrontend host and application ${'LongIdentifier'.repeat(12)}`;
const currentUser = user(1, 'Test User');
const secondUser = user(2, 'Mira Rivera');
const primaryConnection = { id: 'test-conn', gitlabUrl: 'https://gitlab.mock', gitToken: 'fake-token' };
const secondConnection = { ...primaryConnection, id: 'second-conn', gitToken: 'fake-second-token' };
const profile = user => ({ ...user, avatar_url: `https://gitlab.mock/uploads/avatars/${user.id}.png` });
const accountProfiles = new Map([
  [primaryConnection.gitToken, profile(currentUser)],
  [secondConnection.gitToken, profile(secondUser)],
]);
const projectMrs = [
  ...mrs.map(item => item.iid === 4 ? { ...item, title: longMrTitle } : item),
  { ...mr(11, 'Refine navigation', currentUser.name), author: currentUser, draft: true },
  { ...mr(12, 'Update release notes', currentUser.name), author: currentUser, state: 'merged' },
  { ...mr(13, 'Replace sidebar', currentUser.name), author: currentUser, state: 'closed' },
  { ...mr(14, 'Archive release notes', AUTHORS[1]), state: 'closed' },
];

const approver = { user: currentUser, approved_at: '2026-07-27T08:00:00Z' };
const completeApproval = { approvals_required: 1, approvals_left: 0, approved: true, approved_by: [approver] };
const approvalsByIid = new Map([
  [1, completeApproval],
  [2, { approvals_required: 2, approvals_left: 1, approved: false, approved_by: [approver] }],
  [3, completeApproval],
  [4, { approvals_required: 1, approvals_left: 1, approved: false, approved_by: [] }],
]);
const discussionCounts = [
  { iid: '1', resolvableDiscussionsCount: 2, resolvedDiscussionsCount: 2 },
  { iid: '2', resolvableDiscussionsCount: 3, resolvedDiscussionsCount: 2 },
  { iid: '3', resolvableDiscussionsCount: 0, resolvedDiscussionsCount: 0 },
  { iid: '4', resolvableDiscussionsCount: 1, resolvedDiscussionsCount: 1 },
  { iid: '11', resolvableDiscussionsCount: 2, resolvedDiscussionsCount: 0 },
];

const betaRequest = {
  ...mr(1, 'Review the beta deployment', AUTHORS[1]),
  id: 2001, project_id: 2, detailed_merge_status: 'requested_changes',
  references: { short: '!1', full: 'group/beta!1' },
};
const pipeline = {
  id: 4821, iid: 31, project_id: 1, status: 'success', ref: 'refs/merge-requests/156/head',
  source: 'merge_request_event', sha: 'a12bc3456789', duration: 82,
  web_url: 'https://gitlab.mock/group/alpha/-/pipelines/4821', created_at: '2026-07-27T08:00:00Z',
};
const pipelineJobs = Array.from({ length: 125 }, (_, index) => ({
  id: 700 + index, name: index === 0 ? 'typecheck' : `test-${index}`,
  stage: index === 0 ? 'build' : 'test', status: 'success',
  web_url: `https://gitlab.mock/group/alpha/-/jobs/${700 + index}`,
})).reverse();

const tsxChange = {
  old_path: 'packages/feature-14/summary.tsx',
  new_path: 'packages/feature-14/summary.tsx',
  diff: [
    '@@ -1,3 +1,4 @@',
    ' import { Badge } from "./badge";',
    '-const badge = <Badge state="draft" />;',
    '+const badge = <Badge state="ready" />;',
    ' export default badge;',
    '+export const highlightLabel = "visible";',
  ].join('\n'),
};

const generatedPath = 'packages/feature-14/__generated__/schema.ts';
const generatedChange = {
  old_path: generatedPath,
  new_path: generatedPath,
  diff: '@@ -1 +1 @@\n-export const schemaVersion = 1;\n+export const schemaVersion = 2;\n',
  generated_file: true,
};

const largeMrChanges = Array.from({ length: 255 }, (_, index) => {
  if (index === 254) return tsxChange;
  const directory = String(Math.floor(index / 17)).padStart(2, '0');
  const path = `packages/feature-${directory}/file-${String(index).padStart(3, '0')}.ts`;
  return {
    old_path: path,
    new_path: path,
    diff: `@@ -1 +1 @@\n-const value = 0;\n+const value = ${index + 1};\n`,
  };
});

const longDiffLines = Array.from({ length: 180 }, (_, index) =>
  `+export const ${index === 165 ? 'virtualSearchTarget' : `line${index}`} = ${index};`,
);
const longDiffChange = {
  old_path: 'long-diff.ts',
  new_path: 'long-diff.ts',
  new_file: true,
  diff: ['@@ -0,0 +1,180 @@', ...longDiffLines].join('\n'),
};

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
const jiraBrowseUrl = 'https://tracker.example/jira/browse/';
const jiraProjectUrl = jiraBrowseUrl + 'NOVASUP';
const titleIssue = 'NOVASUP-1215';
const branchIssue = 'NOVASUP-1216';
const unlinkedIssue = 'NOVASUP-1217';
const unlinkedTitle = `${unlinkedIssue}: Refresh the preview`;
const issueUrl = key => jiraBrowseUrl + key;
const externalIssueHtml = key =>
  `<a data-reference-type="external_issue" data-external-issue="${key}" href="${issueUrl(key)}">${key}</a>`;
const imageMr = {
  ...mr(156, `${titleIssue}: Compare image revisions`, AUTHORS[0]),
  description: 'Show both versions of a renamed file.',
  source_branch: `feature/${titleIssue}-${branchIssue}-image-diffs`,
  diff_refs: imageMrDiffRefs,
  head_pipeline: pipeline,
};
const fileDiscussionPath = '/git-proxy/gitlab.mock/api/v4/projects/1/merge_requests/156/discussions';
const isFileDiscussionPost = (req) =>
  req.method() === 'POST' && new URL(req.url()).pathname === fileDiscussionPath;

const route = (url, postData, token) => {
  const { pathname, searchParams } = new URL(url);
  const p = pathname.replace('/git-proxy/gitlab.mock', '');
  if (p === '/api/v4/user') return accountProfiles.get(token) ?? {};
  if (p === '/api/v4/groups/oneui') return oneui;
  if (p === '/api/v4/groups/oneui%2Ffrontend') return frontend;
  if (p === '/api/v4/groups/401/subgroups') return [frontend];
  if (p === '/api/v4/groups/402/projects') return [nova];
  if (p === '/api/v4/projects/4') return nova;
  if (p === '/api/v4/merge_requests') {
    return searchParams.get('scope') === 'created_by_me' ? [projectMrs.find(item => item.iid === 11)] : [mrs[0], betaRequest];
  }
  if (p === '/api/v4/projects/1/pipelines') return [pipeline];
  if (p === '/api/v4/projects/1/pipelines/4821') return pipeline;
  if (p === '/api/v4/projects/1/pipelines/4821/jobs') {
    const page = Number(searchParams.get('page') ?? 1);
    const size = Number(searchParams.get('per_page') ?? 20);
    return pipelineJobs.slice((page - 1) * size, page * size);
  }
  if (p === '/api/v4/markdown') {
    const { text = '', project, gfm } = JSON.parse(postData ?? '{}');
    if (text === unlinkedIssue) return { html: '' };
    const rendered = project === 'group/alpha' && gfm && text.includes(branchIssue)
      ? externalIssueHtml(branchIssue)
      : text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return { html: `<p>${rendered}</p>` };
  }
  if (p === '/api/v4/projects/1/merge_requests') {
    const state = searchParams.get('state');
    const iid = searchParams.get('iids[]');
    const search = searchParams.get('search')?.toLowerCase();
    return projectMrs.filter(item =>
      (!state || state === 'all' || item.state === state) &&
      (searchParams.get('scope') !== 'created_by_me' || item.author.id === accountProfiles.get(token)?.id) &&
      (!iid || String(item.iid) === iid) &&
      (!search || item.title.toLowerCase().includes(search)),
    );
  }
  if (/^\/api\/v4\/projects\/\d+$/.test(p)) {
    const id = Number(p.split('/').pop());
    return projects.find((pr) => pr.id === id) ?? projects[0];
  }
  if (p.endsWith('/diffs_batch.json')) {
    if (p.includes('/155/')) return { diff_files: largeMrChanges };
    if (p.includes('/157/')) return { diff_files: [tsxChange, generatedChange] };
    if (p.includes('/159/')) return { diff_files: [longDiffChange] };
    return { diff_files: p.includes('/156/') ? imageMrChanges : [] };
  }
  if (p.endsWith('/merge_requests/155')) return mr(155, 'Large MR', AUTHORS[0]);
  if (p.endsWith('/merge_requests/157')) return mr(157, 'TSX MR', AUTHORS[0]);
  if (p.endsWith('/merge_requests/159')) {
    return {
      ...mr(159, 'Long diff', AUTHORS[0]),
      diff_refs: { base_sha: 'base-sha', start_sha: 'start-sha', head_sha: 'head-sha' },
    };
  }
  if (p.endsWith('/merge_requests/158')) {
    return { ...mr(158, unlinkedTitle, AUTHORS[0]), description: '', title_html: unlinkedTitle };
  }
  if (p.endsWith('/merge_requests/156')) {
    return searchParams.get('render_html') === 'true'
      ? { ...imageMr, title_html: imageMr.title.replace(titleIssue, externalIssueHtml(titleIssue)) }
      : imageMr;
  }
  if (/merge_requests\/\d+\/(versions|discussions|reviewers)$/.test(p)) return [];
  const approvals = p.match(/^\/api\/v4\/projects\/(\d+)\/merge_requests\/(\d+)\/approvals$/);
  if (approvals) return approvals[1] === '1' ? approvalsByIid.get(Number(approvals[2])) ?? {} : {};
  if (/merge_requests\/\d+/.test(p)) {
    const iid = Number(p.match(/merge_requests\/(\d+)/)[1]);
    return projectMrs.find((m) => m.iid === iid) ?? mrs[0];
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
  if (p === '/api/graphql') {
    const { query, variables } = JSON.parse(postData ?? '{}');
    if (query?.includes('MergeRequestDiscussionSummaries')) {
      const nodes = variables.projectPath === 'group/alpha'
        ? discussionCounts.filter(node => variables.iids.includes(node.iid))
        : [];
      return { data: { project: { mergeRequests: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } } };
    }
    return { data: {} };
  }
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

const { identifier: connectionSetup } = await page.evaluateOnNewDocument(connection => {
  if (!localStorage.getItem('githome:connections')) {
    localStorage.setItem('githome:connections', JSON.stringify({ items: [connection], activeId: connection.id }));
  }
}, primaryConnection);

await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('/git-proxy/')) {
    const requestUrl = new URL(url);
    const token = req.headers()['private-token'];
    if (requestUrl.pathname.includes('/uploads/avatars/')) {
      const account = accountProfiles.get(token);
      const permitted = account?.avatar_url && requestUrl.pathname.endsWith(`/uploads/avatars/${account.id}.png`);
      const image = account?.id === currentUser.id ? pngBefore : pngAfter;
      req.respond({ status: 200, contentType: 'image/png', body: permitted ? image : Buffer.alloc(0) });
      return;
    }
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
      body: JSON.stringify(route(url, req.postData(), token) ?? []),
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

try {
  const rows = '.home-request-row';
  await page.waitForFunction(selector => {
    const cards = Array.from(document.querySelectorAll(selector), row => row.innerText);
    return cards.some(text => text.includes('group/alpha') && text.includes('Approved') && text.includes('Resolved 2/2')) &&
      cards.some(text => text.includes('group/beta') && text.includes('Requested') && !text.includes('Approved'));
  }, { timeout: 5000 }, rows);
  check('home review badges distinguish identical MR numbers in different projects', true);
  await page.click('button::-p-text(Мои MR)');
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].some(row =>
    row.innerText.includes('Refine navigation') && row.innerText.includes('Unresolved')), { timeout: 5000 }, rows);
  check('authored MRs on the dashboard also show review badges', true);
} catch (error) {
  check('review badges in both dashboard tabs', false, String(error));
}

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

const listViewport = page.viewport();
try {
  const expectedStatuses = {
    1: ['Approved · 1', 'Resolved 2/2'],
    2: ['Одобрений 1', 'Unresolved · 1'],
    3: ['Approved · 1'],
    4: ['Одобрений 0', 'Resolved 1/1'],
    5: [],
    11: ['Unresolved · 2'],
  };
  for (const width of [1280, 320]) {
    await page.setViewport({ width, height: 800 });
    await page.waitForFunction((expected) => Object.entries(expected).every(([iid, statuses]) => {
      const row = document.querySelector(`main button[aria-label^="Открыть !${iid} "]`);
      const summary = document.getElementById(row?.getAttribute('aria-describedby') ?? '');
      if (!summary || !row.contains(summary)) return false;
      const visible = [...summary.children]
        .map(badge => badge.innerText.trim().replace(/\s+/g, ' '))
        .filter(text => /^(?:Approved|Resolved|Unresolved|Одобрений)(?:\s|$)/.test(text));
      const bounds = row.getBoundingClientRect();
      return visible.length === statuses.length && statuses.every(status => visible.includes(status)) &&
        bounds.left >= 0 && bounds.right <= window.innerWidth && row.scrollWidth <= row.clientWidth;
    }), { timeout: 5000 }, expectedStatuses);
    check(`MR rows show accurate review statuses within the ${width}px viewport`, true);
    check(`Long MR title wraps beside its number at ${width}px`, await page.$eval(
      'main button[aria-label^="Открыть !4 "]',
      (row, expectedTitle) => {
        const number = row.querySelector('span');
        const title = number?.nextElementSibling;
        if (number?.textContent !== '!4' || title?.textContent !== expectedTitle) return false;
        const range = document.createRange();
        range.selectNodeContents(title);
        const lines = [...range.getClientRects()];
        const numberRect = number.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        return lines.length > 1 && numberRect.right <= lines[0].left &&
          numberRect.top < lines[0].bottom && lines[0].top < numberRect.bottom &&
          lines.every(line => line.right <= titleRect.right + 1);
      },
      longMrTitle,
    ));
  }
  check('MR list displays open and draft states in Russian',
    await page.$eval('main button[aria-label^="Открыть !1 "]', row => row.innerText.includes('Открыт')) &&
    await page.$eval('main button[aria-label^="Открыть !11 "]', row => row.innerText.includes('Черновик')));
} catch (error) {
  check('review statuses in the MR list', false, String(error));
} finally {
  await page.setViewport(listViewport);
}

try {
  const search = 'main input[aria-label="Поиск merge requests по названию или номеру"]';
  const clearSearch = 'main button[aria-label="Очистить поиск"]';
  const waitForRows = (iids) => page.waitForFunction((expected) => {
    const ids = [...document.querySelectorAll('main button[aria-label^="Открыть !"]')]
      .map(button => Number(button.getAttribute('aria-label').match(/!(\d+)/)[1]));
    return ids.length === expected.length && expected.every(id => ids.includes(id));
  }, { timeout: 5000 }, iids);

  await Promise.all([
    page.waitForRequest(req => {
      const { pathname, searchParams } = new URL(req.url());
      return pathname.endsWith('/api/v4/projects/1/merge_requests') &&
        searchParams.get('scope') === 'created_by_me' && [null, 'all'].includes(searchParams.get('state'));
    }, { timeout: 5000 }),
    page.click('main ::-p-aria(Мои[role="button"])'),
  ]);
  await waitForRows([11, 12, 13]);
  check('Мои shows only authored MRs across all states', true);

  await page.type(search, 'release notes');
  await waitForRows([12]);
  check('title search on Мои excludes a matching MR by another author', true);

  await page.click(clearSearch);
  await page.type(search, '!13');
  await waitForRows([13]);
  await page.click(clearSearch);
  await page.type(search, '!2');
  await page.waitForFunction(() => document.querySelector('main')?.innerText.includes('По вашему запросу ничего не найдено'), { timeout: 5000 });
  await page.click('main ::-p-aria(Открытые[role="button"])');
  await waitForRows([2]);
  await page.click(clearSearch);
  await waitForRows([1, 2, 3, 4, 5, 11]);
  check('IID search stays scoped until switching back to Открытые', true);
} catch (error) {
  check('authored MR filter and search', false, String(error));
}

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

const checkTsxColors = async (cardSelector, label, search = false) => {
  const result = await page.waitForFunction((selector, searching) => {
    const card = document.querySelector(selector);
    if (!card) return false;
    const rows = [...card.querySelectorAll('.git-diff-code code')];
    const countColors = (row) => {
      const colors = new Set();
      const text = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      while (text.nextNode()) {
        const parent = text.currentNode.parentElement;
        if (text.currentNode.textContent.trim() && !parent.closest('mark')) {
          colors.add(getComputedStyle(parent).color);
        }
      }
      return colors.size;
    };
    const context = rows.find(row => row.textContent.startsWith('import '));
    const added = rows.find(row => row.textContent.startsWith('export const highlightLabel'));
    const before = rows.find(row => row.textContent.includes('state="draft"'));
    const after = rows.find(row => row.textContent.includes('state="ready"'));
    // Tokenization is lazy. Wait for the grammar to reach this visible file.
    if (!context || countColors(context) < 3 || !added || !before || !after) return false;
    if (searching && !added.querySelector('mark')) return false;
    return {
      added: countColors(added),
      before: countColors(before),
      after: countColors(after),
      removedWord: before.querySelector('.git-diff-inline-removed')?.textContent,
      addedWord: after.querySelector('.git-diff-inline-added')?.textContent,
    };
  }, { timeout: 8000 }, cardSelector, search);
  const colors = await result.jsonValue();
  await result.dispose();
  check(label, colors.added >= 3 && colors.before >= 3 && colors.after >= 3 &&
    colors.removedWord === 'draft' && colors.addedWord === 'ready', JSON.stringify(colors));
};

try {
  // An MR without changed files opens a hidden find bar via the shortcut.
  await page.goto(`${BASE}/repository/1/merge-requests/158`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('main h2');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.down('Control');
  await page.keyboard.press('f');
  await page.keyboard.up('Control');
  const fullSearch = 'input[placeholder="Поиск по файлам и коду..."]';
  await page.waitForFunction(selector =>
    document.activeElement === document.querySelector(selector) &&
    document.querySelectorAll('input[aria-label="Поиск по файлам и коду"]').length === 1,
  { timeout: 5000 }, fullSearch);
  await page.keyboard.type('focus');
  check('Ctrl+F keeps keyboard input in the main search bar when the floating input disappears',
    await page.$eval(fullSearch, input => input.value === 'focus'));

  await page.goto(`${BASE}/repository/1/merge-requests/157`, { waitUntil: 'domcontentloaded' });
  const card = '.git-diff > article:first-child';
  const generatedCard = '.git-diff > article:nth-child(2)';
  const expandButton = `${generatedCard} button[aria-busy="false"]`;
  const copyContentButton = `${card} button[aria-label="копировать содержимое"]`;
  await page.waitForSelector(card);
  await page.waitForSelector(expandButton);
  await page.$eval(card, element => element.scrollIntoView({ block: 'center' }));
  await checkTsxColors(card, 'TSX additions and changed words retain their syntax colors');
  for (const theme of ['dark', 'light']) {
    await page.mouse.move(0, 0);
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: theme },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
    await page.waitForFunction(dark => document.documentElement.classList.contains('dark') === dark, {}, theme === 'dark');
    const measureContrast = () => page.$eval(card, (element, expandSelector) => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const luminance = (...colors) => {
        ctx.clearRect(0, 0, 1, 1);
        for (const color of colors) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
        }
        const rgb = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => {
          const s = value / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      };
      const contrast = (bg, fg) => (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
      const styles = [...element.querySelectorAll('.git-diff-code .git-diff-token, .git-diff-line-num, .git-diff-prefix')]
        .filter(node => node.textContent.trim());
      const minimumContrast = Math.min(...styles.map(node => {
        const style = getComputedStyle(node);
        const bg = style.backgroundColor === 'rgba(0, 0, 0, 0)'
          ? getComputedStyle(node.closest('.git-diff-code')).backgroundColor : style.backgroundColor;
        return contrast(luminance(bg), luminance(style.color));
      }));
      const button = document.querySelector(expandSelector);
      const style = getComputedStyle(button);
      const surface = getComputedStyle(button.parentElement).backgroundColor;
      const header = element.querySelector('header');
      const headerSurface = getComputedStyle(header).backgroundColor;
      const getCopyIconContrast = copyButton => contrast(
          luminance(headerSurface, getComputedStyle(copyButton).backgroundColor),
          luminance(getComputedStyle(copyButton.querySelector('svg')).stroke),
      );
      const copyButtons = [...header.querySelectorAll('button[aria-label^="копировать"]')];
      const hoveredCopyButton = copyButtons.find(copyButton => copyButton.matches(':hover'));
      return {
        minimumContrast,
        copyIconContrast: Math.min(...copyButtons.map(getCopyIconContrast)),
        hoveredCopyContrast: hoveredCopyButton ? getCopyIconContrast(hoveredCopyButton) : 0,
        buttonContrast: contrast(luminance(surface, style.backgroundColor), luminance(style.color)),
      };
    }, expandButton);
    const { minimumContrast, buttonContrast, copyIconContrast } = await measureContrast();
    check(`diff text, change markers and line numbers retain contrast in ${theme} mode`,
      minimumContrast >= 4.5 && Number.isFinite(minimumContrast), minimumContrast.toFixed(2));
    check(`expand button text is readable in ${theme} mode`,
      buttonContrast >= 4.5, buttonContrast.toFixed(2));
    await page.hover(copyContentButton);
    const hoverContrast = (await measureContrast()).hoveredCopyContrast;
    check(`diff copy icons stay readable in ${theme} mode, including on hover`,
      Math.min(copyIconContrast, hoverContrast) >= 4.5,
      `${copyIconContrast.toFixed(2)} / ${hoverContrast.toFixed(2)}`);
  }
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const originalViewport = page.viewport();
  await page.setViewport({ ...originalViewport, width: 320 });
  check('generated notice keeps the expand button visible without horizontal scrolling at 320px',
    await page.$eval(expandButton, button => {
      const scroll = button.closest('.git-diff-body-scroll');
      const viewport = scroll.getBoundingClientRect();
      const bounds = button.getBoundingClientRect();
      return scroll.scrollWidth === scroll.clientWidth &&
        bounds.left >= viewport.left && bounds.right <= viewport.right;
    }));
  await page.setViewport(originalViewport);
  await page.$eval(expandButton, button => button.focus());
  await page.keyboard.press('Enter');
  await page.waitForSelector(`${generatedCard} .git-diff-code`);
  check('generated file expands from the banner button via the keyboard', !(await page.$(expandButton)));
  await page.$eval(card, element => element.scrollIntoView({ block: 'center' }));
  await page.keyboard.down('Control');
  await page.keyboard.press('f');
  await page.keyboard.up('Control');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Поиск по файлам и коду');
  await page.keyboard.type('highlightLabel');
  await checkTsxColors(card, 'a search result preserves syntax colors around the matched text', true);
} catch (error) {
  check('small TSX diff highlighting', false, String(error));
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
  for (const [kind, row] of [['folder', 'button[aria-expanded]'], ['file', '[data-changes-file-id]']]) {
    const icon = await page.$eval(`${tree} ${row} .changes-file-tree__row-icon img`, async image => {
      await image.decode().catch(() => {});
      return { loaded: image.naturalWidth > 0, url: image.currentSrc };
    });
    check(`${kind} icon renders on a nested MR route`, icon.loaded, icon.url);
  }

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
  await checkTsxColors('.git-diff > article:last-child', 'TSX colors appear at the bottom of a 255-file MR');
} catch (error) {
  check('large MR tree navigation', false, String(error));
}

try {
  await page.goto(`${BASE}/repository/1/merge-requests/159`, { waitUntil: 'domcontentloaded' });
  const viewport = '.diff-viewport';
  await page.waitForSelector(`${viewport} [data-index="0"]`);
  const target = `${viewport} [data-index="166"]`;
  check('long diff initially mounts only nearby lines', !(await page.$(target)));

  await page.keyboard.down('Control');
  await page.keyboard.press('f');
  await page.keyboard.up('Control');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Поиск по файлам и коду');
  await page.keyboard.type('virtualSearchTarget');
  await page.waitForFunction(selector => {
    const item = document.querySelector(selector);
    const rect = item?.getBoundingClientRect();
    return item?.textContent.includes('virtualSearchTarget') && rect.top > 0 && rect.bottom < innerHeight;
  }, { timeout: 6000 }, target);
  check('diff search scrolls to a line outside the mounted range', true);

  await page.$eval(`${target} button[title="Оставить комментарий"]`, button => button.click());
  await page.waitForFunction(() => {
    const editor = document.querySelector('.diff-viewport textarea[placeholder="Напишите комментарий..."]');
    const rect = editor?.getBoundingClientRect();
    return rect && rect.top >= 0 && rect.bottom <= innerHeight;
  }, { timeout: 6000 });
  check('inline comment editor scrolls into view in a virtualized diff', true);
} catch (error) {
  check('virtualized diff navigation', false, String(error));
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
      value: async (text) => { window.copiedText = text; },
    });
  });
  const copy = await page.waitForSelector('button[aria-label="Скопировать ссылку на MR"]', { timeout: 3000 });
  await copy.click();
  await page.waitForFunction(button => button.textContent.includes('Скопировано'), { timeout: 3000 }, copy);
  check('MR header copies the GitLab URL', await page.evaluate(() => window.copiedText) === imageMr.web_url);
} catch (error) {
  check('copying the MR link', false, String(error));
}

try {
  const overview = 'header[aria-label="Сводка merge request"]';
  const links = [
    `${overview} h2 a[href="${issueUrl(titleIssue)}"]`,
    `${overview} a[href="${issueUrl(branchIssue)}"]`,
    `${overview} a[href="${jiraProjectUrl}"]`,
  ];
  await Promise.all(links.map(selector => page.waitForSelector(selector, { visible: true, timeout: 5000 })));
  check('MR heading preserves the title and links only its Jira issue key',
    await page.$eval(links[0], (link, issue, title) =>
      link.innerText.trim() === issue && link.closest('h2').innerText.trim() === title, titleIssue, imageMr.title));
  check('branch-only Jira issue and project have separate links in the overview',
    await page.$eval(links[1], (link, issue) =>
      link.innerText.includes(issue) && !link.closest('h2, button'), branchIssue) &&
    await page.$eval(links[2], link => !link.closest('h2, button')));

  const controls = await page.$$(`${overview} :is(a[href], button:enabled)`);
  await controls[0].focus();
  const visited = new Set();
  for (let index = 0; index < controls.length; index++) {
    if (index) await page.keyboard.press('Tab');
    const focused = await page.evaluate(selectors =>
      selectors.find(selector => document.activeElement?.matches(selector)), links);
    if (focused) visited.add(focused);
    if (visited.size === links.length) break;
  }
  check('Tab reaches the Jira links in the title and overview', visited.size === links.length);

  for (const [label, branch] of [
    ['Скопировать исходную ветку', imageMr.source_branch],
    ['Скопировать целевую ветку', imageMr.target_branch],
  ]) {
    const copy = `${overview} button[aria-label="${label} ${branch}"]`;
    await page.focus(copy);
    await page.keyboard.press('Enter');
    await page.waitForFunction(value => window.copiedText === value, { timeout: 3000 }, branch);
    check(`${label}: keyboard copies the full branch separately from Jira`,
      await page.$eval(copy, button => !button.closest('a') && !button.querySelector('a')));
  }

  const viewport = page.viewport();
  try {
    await page.setViewport({ ...viewport, width: 320 });
    check('MR state and actions including Jira fit without overlap at 320px',
      await page.$eval(overview, (header, projectUrl) => {
        const state = [...header.querySelectorAll('span')].find(span => span.innerText === 'Открыт');
        const actions = header.querySelector(`a[href="${projectUrl}"]`)?.parentElement;
        if (!state || !actions) return false;
        const badge = state.getBoundingClientRect();
        return [...actions.querySelectorAll('a, button')].every(control => {
          const rect = control.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth &&
            (rect.left >= badge.right || rect.right <= badge.left || rect.top >= badge.bottom || rect.bottom <= badge.top);
        });
      }, jiraProjectUrl));
  } finally {
    await page.setViewport(viewport);
  }
} catch (error) {
  check('Jira links and branch copy controls in the MR overview', false, String(error));
}

try {
  const navigation = await page.waitForSelector('nav[aria-label="Разделы merge request"]');
  const files = await navigation.$('::-p-text(Файлы)');
  await files.click();
  check('the overview opens the changes section with keyboard focus', await page.evaluate(
    () => document.activeElement?.matches('h3') && document.activeElement.textContent.includes('Изменения'),
  ));
  const comments = await navigation.$('::-p-text(Комментарии)');
  await comments.click();
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-expanded') === 'true' &&
    document.activeElement.textContent.includes('Активность'), { timeout: 3000 });
  check('the overview opens and focuses the discussion', true);
} catch (error) {
  check('MR overview shortcuts', false, String(error));
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

try {
  const overview = 'header[aria-label="Сводка merge request"]';
  const openUnlinkedMr = () => page.goto(`${BASE}/repository/1/merge-requests/158`, { waitUntil: 'networkidle0' });
  await Promise.all([
    page.waitForResponse(response => {
      const request = response.request();
      return new URL(request.url()).pathname.endsWith('/api/v4/markdown') &&
        JSON.parse(request.postData() ?? '{}').text === unlinkedIssue;
    }, { timeout: 5000 }),
    openUnlinkedMr(),
  ]);
  check('unknown Jira host leaves the original MR title as plain text',
    await page.$eval(overview, (header, title) =>
      header.querySelector('h2')?.innerText.trim() === title && !header.querySelector('h2 a, a[aria-label$="в Jira"]'),
    unlinkedTitle));

  const configuredUrl = 'https://alternate.example:8443/context/jira';
  await page.evaluate(url => {
    const connection = JSON.parse(localStorage.getItem('githome:connections'));
    connection.items.find(item => item.id === connection.activeId).jiraUrl = url;
    localStorage.setItem('githome:connections', JSON.stringify(connection));
  }, configuredUrl);
  await openUnlinkedMr();
  const issueLink = `${overview} h2 a[href="${configuredUrl}/browse/${unlinkedIssue}"]`;
  await page.waitForSelector(issueLink, { visible: true, timeout: 3000 });
  check('configured Jira URL supplies the issue and project links when GitLab returns none',
    await page.$eval(issueLink, (link, issue) => link.innerText.trim() === issue, unlinkedIssue) &&
    Boolean(await page.$(`${overview} a[href="${configuredUrl}/browse/NOVASUP"]`)));
} catch (error) {
  check('Jira links with and without a configured fallback', false, String(error));
}

try {
  const trigger = 'header button[aria-haspopup="dialog"][aria-label^="Подключения GitLab"]';
  const dialog = 'dialog[open][aria-labelledby="connections-title"]';
  const row = user => `${dialog} button[aria-label="${user.name} · gitlab.mock"]`;
  const waitForIdentity = (selector, name, avatarWidth) => page.waitForFunction((selector, name, avatarWidth) => {
    const button = document.querySelector(selector);
    const image = button?.querySelector('img');
    const text = button?.innerText;
    return text?.includes(name) && text.includes('gitlab.mock') && image?.naturalWidth === avatarWidth &&
      image.getBoundingClientRect().width > 0;
  }, { timeout: 5000 }, selector, name, avatarWidth);

  await page.evaluate((first, second) => {
    localStorage.setItem('githome:connections', JSON.stringify({ items: [first, second], activeId: first.id }));
  }, primaryConnection, secondConnection);
  await page.goto(`${BASE}/repository/1`, { waitUntil: 'domcontentloaded' });
  await waitForIdentity(trigger, currentUser.name, 4);
  check('account button shows the active GitLab name, host and private avatar', true);

  await page.click(trigger);
  await Promise.all([
    waitForIdentity(row(currentUser), currentUser.name, 4),
    waitForIdentity(row(secondUser), secondUser.name, 8),
  ]);
  check('account picker distinguishes both tokens on the same host',
    await page.$eval(row(currentUser), button => button.getAttribute('aria-pressed') === 'true') &&
    await page.$eval(row(secondUser), button => button.getAttribute('aria-pressed') === 'false'));
  await page.click(row(secondUser));
  await waitForIdentity(trigger, secondUser.name, 8);
  await page.keyboard.press('Escape');
  await page.waitForSelector(dialog, { hidden: true });
  check('switching accounts updates the header and persisted active connection',
    await page.evaluate(id => JSON.parse(localStorage.getItem('githome:connections')).activeId === id, secondConnection.id));

  await page.setViewport({ width: 320, height: 760 });
  await waitForIdentity(trigger, secondUser.name, 8);
  check('name, host and avatar remain inside the 320px header',
    await page.$eval(trigger, button => {
      const bounds = button.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth &&
        [...button.querySelectorAll('span:not(:has(span))')].every(span => span.clientWidth >= span.scrollWidth);
    }));

  accountProfiles.set(secondConnection.gitToken, secondUser);
  await page.reload({ waitUntil: 'networkidle0' });
  check('an account without a photo displays its initial next to its name',
    await page.$eval(trigger, (button, name) =>
      button.innerText.includes(name) && button.querySelector(`[title="${name}"]`)?.innerText === name[0] &&
      !button.querySelector('img'), secondUser.name));
  accountProfiles.delete(secondConnection.gitToken);
  await page.reload({ waitUntil: 'networkidle0' });
  check('missing profile details fall back to the host and keep the picker usable',
    await page.$eval(trigger, button => button.innerText.trim().endsWith('gitlab.mock') && !button.disabled &&
      !button.innerText.includes('Mira Rivera')));
  await page.click(trigger);
  await waitForIdentity(row(currentUser), currentUser.name, 4);
  await page.click(row(currentUser));
  await waitForIdentity(trigger, currentUser.name, 4);
  check('another account remains selectable when profile details are missing', true);
} catch (error) {
  check('GitLab account identities and switching', false, String(error));
}

try {
  for (const { path, trigger, width } of [
    { path: '/repository/1/merge-requests/156', trigger: 'section[aria-label="Последний пайплайн"] button[aria-haspopup="dialog"]', width: 1280 },
    { path: '/repository/1/pipelines', trigger: 'button[aria-label="Открыть пайплайн #4821"]', width: 320 },
  ]) {
    await page.setViewport({ width, height: 640 });
    await page.goto(BASE + path, { waitUntil: 'networkidle0' });
    const button = await page.waitForSelector(trigger, { visible: true, timeout: 5000 });
    const before = await button.boundingBox();
    await button.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('dialog[open] a[href$="/jobs/700"]', { timeout: 5000 });
    const fits = await page.$eval('dialog[open]', dialog => {
      const bounds = dialog.getBoundingClientRect();
      return dialog.innerText.includes('Пайплайн #4821') && dialog.innerText.includes('typecheck') &&
        dialog.querySelectorAll('li').length === 125 &&
        bounds.left >= 0 && bounds.right <= innerWidth && bounds.height <= innerHeight &&
        [...dialog.querySelectorAll('div')].some(div => div.scrollHeight > div.clientHeight &&
          getComputedStyle(div).overflowY === 'auto');
    });
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { hidden: true, timeout: 3000 });
    const after = await button.boundingBox();
    check(`pipeline details scroll inside a dialog and return focus on ${path}`, fits &&
      await button.evaluate(el => el === document.activeElement) && before.height === after.height);
  }
} catch (error) {
  check('pipeline detail dialogs', false, String(error));
}

try {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/repository/4`, { waitUntil: 'domcontentloaded' });
  const repoCrumbs = 'nav[aria-label="Путь к проекту"]';
  const groupCrumbs = 'nav[aria-label="Путь к группе"]';
  const rootLink = 'a[href="/group/oneui"]';
  const nestedLink = 'a[href="/group/oneui%2Ffrontend"]';
  const repoLink = 'main a[href="/repository/4"]';
  await page.waitForSelector(`${repoCrumbs} ${nestedLink}`);
  check('breadcrumb separates both groups and places the icon before nova',
    await page.$eval(repoCrumbs, nav => {
      const [root, nested, repo] = nav.querySelectorAll('a, button');
      return root.textContent === 'oneui' && nested.textContent === 'frontend' &&
        repo.textContent.endsWith('nova') && repo.firstElementChild?.nextElementSibling?.textContent === 'nova';
    }));
  await page.click(`${repoCrumbs} ${nestedLink}`);
  await page.waitForSelector(repoLink);
  check('frontend opens its own page with the nova repository',
    new URL(page.url()).pathname === '/group/oneui%2Ffrontend');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector(repoLink);
  await page.click(`${groupCrumbs} ${rootLink}`);
  await page.waitForSelector(`main ${nestedLink}`);
  check('oneui opens the parent group with a frontend subgroup',
    new URL(page.url()).pathname === '/group/oneui');
  await page.click(`main ${nestedLink}`);
  await page.waitForSelector(repoLink);
  await page.click(repoLink);
  await page.waitForSelector(`${repoCrumbs} ${rootLink}`);
  await page.click(`${repoCrumbs} ${rootLink}`);
  await page.waitForSelector(`main ${nestedLink}`);
  check('oneui also opens directly from the repository breadcrumb',
    new URL(page.url()).pathname === '/group/oneui');
} catch (error) {
  check('group breadcrumb navigation', false, String(error));
}

try {
  for (const [path, selector] of [
    ['/', '.home-dashboard'],
    ['/repository/1', 'main section:has(nav[aria-label="Разделы проекта"])'],
    ['/repository/1/merge-requests', 'section[aria-labelledby="mr-list-heading"]'],
    ['/repository/1/pipelines', 'section[aria-labelledby="pipelines-heading"]'],
    ['/', '.home-welcome'],
  ]) {
    if (selector === '.home-welcome') {
      await page.removeScriptToEvaluateOnNewDocument(connectionSetup);
      await page.evaluate(() => localStorage.removeItem('githome:connections'));
    }
    await page.setViewport({ width: 1920, height: 800 });
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    const container = await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    const desktop = await container.boundingBox();
    await page.setViewport({ width: 320, height: 800 });
    const mobile = await container.boundingBox();
    check(`Page width stays centered and responsive for ${selector}`,
      desktop?.width === 1440 && desktop.x === 240 &&
      mobile?.width === 296 && mobile.x === 12);
  }
} catch (error) {
  check('shared maximum page width', false, String(error));
}

check('no page errors', pageErrors.length === 0, pageErrors[0]?.slice(0, 150));
check('no console errors', consoleErrors.length === 0, consoleErrors[0]?.slice(0, 150));

await browser.close();

console.log(failures.length ? `\nFAILED: ${failures.length} check(s)` : '\nOK: all checks passed');
process.exitCode = failures.length ? 1 : 0;
