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
  const comments = { github: [], bitbucket: [] };
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
    else if (path === commentsPath) {
      if (request.method() === 'POST') {
        const payload = JSON.parse(request.postData());
        const body = github ? payload.body : payload.content.raw;
        const id = comments[provider].length + 1;
        response = github
          ? { id, body, user, created_at: '2026-01-01' }
          : { id, content: { raw: body }, user, created_on: '2026-01-01' };
        comments[provider].push(response);
      } else {
        response = github ? comments[provider] : { values: comments[provider] };
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
    const message = `Comment for ${provider}`;
    await page.waitForSelector('main textarea', { visible: true, timeout: 8_000 });
    await page.type('main textarea', message);
    await byText('//main//button', 'Post comment').click();
    await byText('//main//li//p', message).wait();
    assert.equal(comments[provider].length, 1);
    console.log(`✓ ${provider}: connection, repository pagination, pull request and comment`);
  }
  await page.reload();
  await byText('//main//button', 'team/first').wait();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
