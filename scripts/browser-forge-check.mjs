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
    const pull = github
      ? {
          number: 7, title: 'Common review', html_url: link, body: 'Description',
          state: 'open', user, head: { ref: 'feature' }, base: { ref: 'main' },
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
    await byText('//main//button', '#7 Common review').click();
    await byText('//main//h1', '#7 Common review').wait();
    assert.match(new URL(page.url()).pathname, new RegExp(`/forge/[^/]+/${slug}/demo/pull-requests/7$`));
    const message = `Comment for ${provider}`;
    await byText('//main//li//p', 'Existing comment 1').wait();
    await page.type('main textarea', message);
    await byText('//main//button', 'Post comment').click();
    await byText('//main//li//p', message).wait();
    assert.deepEqual(commentPages[provider], [1]);
    assert.equal(posted[provider].length, 1);

    await byText('//main//button', 'Load more').click();
    await byText('//main//li//p', 'Second page comment').wait();
    const bodies = await page.$$eval('main li p', (nodes) => nodes.map((node) => node.textContent));
    assert.equal(bodies.filter((body) => body === message).length, 1);
    assert.equal(bodies.some((body) => /inline (root|reply)/i.test(body)), false);

    await page.reload();
    await byText('//main//h1', '#7 Common review').wait();
    await byText('//main//button', 'Back').click();
    await byText('//main//button', '#7 Common review').wait();
    assert.match(new URL(page.url()).pathname, new RegExp(`/forge/[^/]+/${slug}/demo$`));
    await page.reload();
    await byText('//main//h1', `${slug}/demo`).wait();
    await byText('//main//button', 'Back').click();
    await byText('//main//button', `${slug}/first`).wait();
    assert.equal(new URL(page.url()).pathname, '/');
    console.log(`✓ ${provider}: connection, pagination, comment deduplication and deep links`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
