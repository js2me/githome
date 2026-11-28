import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.BASE ?? 'http://localhost:1420';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage();
  const errors = [];
  const posted = { github: [], bitbucket: [] };
  const commentPages = { github: [], bitbucket: [] };
  const githubWrites = [];
  let viewed = false;
  let resolved = false;
  page.on('pageerror', (error) => errors.push(error));
  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    const url = new URL(request.url());
    const match = /^\/forge-proxy\/(github|bitbucket)(\/.*)$/.exec(url.pathname);
    if (!match) {
      await request.continue();
      return;
    }

    const [, provider, path] = match;
    const github = provider === 'github';
    const slug = github ? 'octo' : 'team';
    const auth = github
      ? 'Bearer test-github'
      : `Basic ${Buffer.from('work@example.com:test-bitbucket').toString('base64')}`;
    if (request.headers().authorization !== auth) {
      errors.push(new Error(`Missing authentication for ${provider}`));
      await request.respond({ status: 401 });
      return;
    }

    const link = github
      ? 'https://github.com/octo/demo/pull/7'
      : 'https://bitbucket.org/team/demo/pull-requests/7';
    const user = github
      ? { login: slug, name: 'GitHub Test' }
      : { nickname: slug, display_name: 'Bitbucket Test' };
    const author = { login: 'other', name: 'Other Author' };
    const pull = github
      ? {
          number: 7, title: 'Common review', html_url: link, body: 'Description',
          state: 'open', user: author, node_id: 'github-pr-node', changed_files: 1, updated_at: '2026-02-20T00:00:00Z',
          head: { ref: 'feature', sha: 'headsha', repo: { full_name: 'octo/demo' } },
          base: { ref: 'main', sha: 'basesha' },
        }
      : {
          id: 7, title: 'Common review', links: { html: { href: link } },
          description: 'Description', state: 'OPEN', author: user,
          source: { branch: { name: 'feature' } }, destination: { branch: { name: 'main' } },
        };
    const reposPath = github ? '/user/repos' : '/2.0/repositories/team';
    const pullsPath = github
      ? '/repos/octo/demo/pulls'
      : '/2.0/repositories/team/demo/pullrequests';
    const commentsPath = github
      ? '/repos/octo/demo/issues/7/comments'
      : `${pullsPath}/7/comments`;

    const makeComment = (id, body, extra = {}) =>
      github
        ? { id, body, user, created_at: '2026-01-01', ...extra }
        : { id, content: { raw: body }, user, created_on: '2026-01-01', ...extra };
    const inline = makeComment(101, 'Inline root', { inline: { path: 'src/demo.js', to: 3 } });
    const reply = makeComment(102, 'Inline reply', { parent: { id: 101 } });
    let response;
    const headers = {};
    if (path === (github ? '/user' : '/2.0/user')) response = user;
    else if (github && path === '/graphql') {
      const { query, variables } = JSON.parse(request.postData());
      const pageInfo = { endCursor: null, hasNextPage: false };
      const status = () => ({ isResolved: resolved, viewerCanResolve: !resolved, viewerCanUnresolve: resolved });
      if (query.includes('query ViewedFiles')) {
        assert.equal(variables.id, 'github-pr-node');
        response = { data: { node: { files: { pageInfo, nodes: [
          { path: 'src/demo.js', viewerViewedState: viewed ? 'VIEWED' : 'UNVIEWED' },
        ] } } } };
      } else if (query.includes('query SearchPullRequests')) {
        assert.match(variables.search, /repo:octo\/demo is:pr is:open .*in:title "Common review"/);
        response = { data: { search: { pageInfo, nodes: [{
          id: 'github-pr-node', number: 7, title: 'Common review', body: 'Description', url: link, state: 'OPEN',
          author, headRefName: 'feature', baseRefName: 'main', updatedAt: '2026-02-20T00:00:00Z',
        }] } } };
      } else if (query.includes('query ReviewThreads')) {
        response = { data: { node: { reviewThreads: { pageInfo, nodes: [
          { id: 'thread-300', ...status(), comments: { nodes: [{ databaseId: 300 }] } },
        ] } } } };
      } else if (query.includes('mutation FileViewed')) {
        assert.deepEqual(variables, { id: 'github-pr-node', path: 'src/demo.js' });
        viewed = !query.includes('unmarkFileAsViewed');
        response = { data: { [viewed ? 'markFileAsViewed' : 'unmarkFileAsViewed']: { clientMutationId: null } } };
      } else if (query.includes('mutation ThreadResolved')) {
        assert.equal(variables.id, 'thread-300');
        resolved = !query.includes('unresolveReviewThread');
        response = { data: { [resolved ? 'resolveReviewThread' : 'unresolveReviewThread']: { thread: status() } } };
      }
    }
    else if (path === reposPath) {
      const next = github
        ? 'https://api.github.com/user/repos?page=2'
        : 'https://api.bitbucket.org/2.0/repositories/team?page=2';
      const second = url.searchParams.get('page') === '2';
      const name = second ? 'demo' : 'first';
      const repo = {
        name, full_name: `${slug}/${name}`,
        ...(github ? { html_url: link } : { links: { html: { href: link } } }),
      };
      if (github && !second) headers.link = `<${next}>; rel="next"`;
      response = github ? [repo] : { values: [repo], next: second ? undefined : next };
    } else if (github && path === '/repos/octo/demo') response = { default_branch: 'main' };
    else if (github && path === '/repos/octo/demo/branches') {
      const second = url.searchParams.get('page') === '2';
      if (!second) headers.link = '<https://api.github.com/repos/octo/demo/branches?page=2>; rel="next"';
      response = second ? [{ name: 'feature/preview', commit: { sha: 'headsha' } }] : [{ name: 'main', commit: { sha: 'basesha' } }];
    } else if (github && path.startsWith('/repos/octo/demo/branches/')) {
      const branch = decodeURIComponent(path.split('/branches/')[1]);
      response = { name: branch, commit: { sha: branch === 'main' ? 'basesha' : 'headsha' } };
    } else if (github && path.startsWith('/repos/octo/demo/git/commits/')) {
      response = { tree: { sha: path.endsWith('basesha') ? 'base-tree' : 'head-tree' } };
    } else if (github && path.startsWith('/repos/octo/demo/git/trees/')) {
      response = { tree: path.endsWith('src-tree') ? [
        { path: 'demo.js', sha: 'text-blob', type: 'blob', mode: '100644', size: 23 },
      ] : path.endsWith('base-tree') ? [
        { path: 'src', sha: 'src-tree', type: 'tree', mode: '040000' },
      ] : [
        { path: 'feature.js', sha: 'feature-blob', type: 'blob', mode: '100644', size: 25 },
      ] };
    } else if (github && path.startsWith('/repos/octo/demo/git/blobs/')) {
      const content = path.endsWith('text-blob') ? 'export const value = 1;' : 'export const feature = 2;';
      response = { encoding: 'base64', size: content.length, content: Buffer.from(content).toString('base64') };
    } else if (github && path === `${pullsPath}/7/files`) {
      response = [{ filename: 'src/demo.js', status: 'modified', additions: 1, deletions: 1,
        patch: '@@ -1 +1 @@\n-export const value = 1;\n+export const value = 2;' }];
    } else if (github && path === `${pullsPath}/7/comments`) {
      if (request.method() === 'POST') {
        const payload = JSON.parse(request.postData());
        githubWrites.push(payload);
        response = makeComment(301, payload.body, { path: payload.path, side: payload.side, line: payload.line });
      } else response = [makeComment(300, 'Existing inline review', { path: 'src/demo.js', side: 'RIGHT', line: 1 })];
    } else if (github && path === `${pullsPath}/7/comments/300/replies`) {
      const payload = JSON.parse(request.postData());
      githubWrites.push(payload);
      response = makeComment(302, payload.body, { in_reply_to_id: 300, path: 'src/demo.js' });
    } else if (github && path === `${pullsPath}/7/reviews`) {
      if (request.method() === 'POST') {
        const payload = JSON.parse(request.postData());
        githubWrites.push(payload);
        response = { id: 401, user, state: 'APPROVED', body: payload.body };
      } else response = [];
    } else if (path === pullsPath) response = github ? [pull] : { values: [pull] };
    else if (path === `${pullsPath}/7`) response = pull;
    else if (!github && path === `${commentsPath}/101`) response = inline;
    else if (!github && path === `${commentsPath}/102`) response = reply;
    else if (path === commentsPath) {
      if (request.method() === 'POST') {
        const payload = JSON.parse(request.postData());
        const body = github ? payload.body : payload.content.raw;
        response = makeComment(201 + posted[provider].length, body);
        posted[provider].push(response);
      } else {
        const second = url.searchParams.get('page') === '2';
        commentPages[provider].push(second ? 2 : 1);
        const origin = github ? 'https://api.github.com' : 'https://api.bitbucket.org';
        const next = `${origin}${commentsPath}?page=2`;
        const values = second
          ? [
              makeComment(40, 'Second page comment'),
              ...(github ? [] : [makeComment(103, 'Nested inline reply', { parent: { id: 102 } })]),
              ...posted[provider],
            ]
          : [
              ...Array.from({ length: github ? 30 : 28 }, (_, i) => makeComment(i + 1, `Existing comment ${i + 1}`)),
              ...(github ? [] : [inline, reply]),
            ];
        if (github && !second) headers.link = `<${next}>; rel="next"`;
        response = github ? values : { values, next: second ? undefined : next };
      }
    }
    if (response === undefined) errors.push(new Error(`Unexpected endpoint ${path}`));
    await request.respond({
      status: response === undefined ? 404 : 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? {}),
      headers,
    });
  });

  await page.goto(base);
  const picker = 'header button[aria-controls="workbench-connections-dialog"]';
  const dialog = '#workbench-connections-dialog';
  const byText = (xpath, text) =>
    page.locator(`::-p-xpath(${xpath}[normalize-space(.)=${JSON.stringify(text)}])`);
  for (const [provider, account, slug] of [
    ['github', 'GitHub Test', 'octo'],
    ['bitbucket', 'Bitbucket Test', 'team'],
  ]) {
    await page.locator(picker).click();
    if (provider === 'bitbucket') {
      await byText('//dialog[@id="workbench-connections-dialog"]//button', 'New connection').click();
    }
    await page.select(`${dialog} select`, provider);
    if (provider === 'bitbucket') {
      await page.type(`${dialog} input[type="email"]`, 'work@example.com');
      await page.type(`${dialog} input[type="text"]`, slug);
    }
    await page.type(`${dialog} input[type="password"]`, `test-${provider}`);
    await page.locator(`${dialog} button[type="submit"]`).click();
    await page.waitForFunction(
      (selector, account) => document.querySelector(selector)?.textContent.includes(account),
      {},
      picker,
      account,
    );
    await byText('//main//button', 'Load more').click();
    await byText('//main//button', `${slug}/demo`).click();
    if (provider === 'github') {
      await byText('//main//button', 'Files').click();
      await byText('//main//button', 'src').click();
      await byText('//main//button', 'demo.js').click();
      await byText('//main//pre', 'export const value = 1;').wait();
      await byText('//main//button', 'Load more branches').click();
      await page.waitForSelector('main option[value="feature/preview"]');
      await page.select('main select', 'feature/preview');
      await byText('//main//button', 'feature.js').click();
      await byText('//main//pre', 'export const feature = 2;').wait();
      await page.reload();
      await byText('//main//pre', 'export const feature = 2;').wait();
      await byText('//main//button', 'Pull requests').click();
      const search = page.locator('main input[name="q"]');
      await search.fill('Common review');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => new URLSearchParams(location.search).get('q') === 'Common review');
      await page.locator('main button[aria-label="#7 Common review"]').wait();
      await page.locator('main button[aria-label="Clear search"]').click();
    }
    const row = provider === 'github'
      ? page.locator('main button[aria-label="#7 Common review"]')
      : byText('//main//button', '#7 Common review');
    await row.click();
    await byText('//main//h1', '#7 Common review').wait();
    assert.match(new URL(page.url()).pathname, new RegExp(`/forge/[^/]+/${slug}/demo/pull-requests/7$`));
    const message = `Comment for ${provider}`;
    await byText('//main//li//p', 'Existing comment 1').wait();
    await page.locator('::-p-xpath(//main//form[.//button[normalize-space(.)="Post comment"]]//textarea)').fill(message);
    await byText('//main//button', 'Post comment').click();
    await byText('//main//li//p', message).wait();
    assert.deepEqual(commentPages[provider], [1]);
    assert.equal(posted[provider].length, 1);

    await byText('//main//button', 'Load more').click();
    await byText('//main//li//p', 'Second page comment').wait();
    const bodies = await page.$$eval('main li p', (nodes) => nodes.map((node) => node.textContent));
    assert.equal(bodies.filter((body) => body === message).length, 1);
    assert.equal(bodies.some((body) => /inline (root|reply)/i.test(body)), false);

    if (provider === 'github') {
      await byText('//main//button', 'Changes').click();
      await page.waitForSelector('main .git-diff');
      await byText('//main//div[contains(@class,"whitespace-pre-wrap")]', 'Existing inline review').wait();
      await page.hover("main .git-diff-code--added");
      await page.locator('main [data-diff-row-id]:has(.git-diff-code--added) button[title="Add a comment"]').click();
      await page.locator('main textarea[placeholder="Write a comment…"]').fill('New inline review');
      await byText('//main//button', 'Comment').click();
      await byText('//main//div[contains(@class,"whitespace-pre-wrap")]', 'New inline review').wait();
      await byText('//main//button', 'Reply').click();
      await page.locator('main textarea[placeholder="Write a reply…"]').fill('Thread response');
      await page.locator('::-p-xpath(//textarea[@placeholder="Write a reply…"]/ancestor::div[.//button[normalize-space(.)="Reply"]][1]//button[normalize-space(.)="Reply"])').click();
      await byText('//main//div[contains(@class,"whitespace-pre-wrap")]', 'Thread response').wait();
      await byText('//main//button', 'Resolve thread').click();
      await page.waitForFunction(() => document.querySelector('.git-diff-line-thread-avatars button'));
      assert.equal(resolved, true);
      await page.locator('main button[aria-label="Mark as viewed"]').click();
      await page.waitForSelector('main [data-diff-reviewed]');
      assert.equal(viewed, true);
      await byText('//main//button', 'Approve').click();
      await byText('//main//span', '· Approved').wait();
      assert.deepEqual(githubWrites, [
        { body: 'New inline review', path: 'src/demo.js', commit_id: 'headsha', side: 'RIGHT', line: 1 },
        { body: 'Thread response' },
        { event: 'APPROVE', commit_id: 'headsha' },
      ]);
    }
    await page.reload();
    await byText('//main//h1', '#7 Common review').wait();
    if (provider === 'github') {
      await page.waitForSelector('main [data-diff-reviewed]');
      assert.match(page.url(), /[?&]view=changes/);
    }
    await byText('//main//button', 'Back').click();
    await row.wait();
    assert.match(new URL(page.url()).pathname, new RegExp(`/forge/[^/]+/${slug}/demo$`));
    await page.reload();
    await byText('//main//h1', `${slug}/demo`).wait();
    await byText('//main//button', 'Back').click();
    await byText('//main//button', `${slug}/first`).wait();
    assert.equal(new URL(page.url()).pathname, '/');
    console.log(`✓ ${provider}: connection, pagination, comment deduplication and deep links${provider === 'github' ? ', branches, source, changes and review' : ''}`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
