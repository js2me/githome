import { createServer, request, type Server } from 'node:http';
import { expect, it } from 'vitest';
import { createForgeProxyHandler } from './forge-proxy';

const listen = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  return `http://127.0.0.1:${address.port}`;
};

const close = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });

it('uses the real proxy handler to forward API requests with the app User-Agent', async () => {
  const calls: object[] = [];
  const upstream = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    calls.push({ method: req.method, url: req.url, headers: req.headers, body });

    if (req.url === '/repos/owner/redirect') {
      res.writeHead(302, { location: '/elsewhere' }).end();
    } else if (req.headers['user-agent'] !== 'GitHome/1.2.3') {
      res.writeHead(403).end();
    } else {
      res.writeHead(req.method === 'POST' ? 201 : 200, {
        link: '<https://api.github.com/repos/owner/repo/pulls?page=2>; rel="next"',
      }).end(JSON.stringify({ ok: true }));
    }
  });
  const api = await listen(upstream);
  const origins: string[] = [];
  const handle = createForgeProxyHandler('1.2.3', (target, options, callback) => {
    origins.push(target.origin);
    return request(new URL(target.pathname + target.search, api), options, callback);
  });
  const proxy = createServer((req, res) => {
    if (!handle(req, res, req.url ?? '/')) res.writeHead(404).end();
  });

  try {
    const origin = await listen(proxy);
    const github = `${origin}/forge-proxy/github`;
    const pulls = await fetch(`${github}/repos/owner/repo/pulls?state=open`, {
      headers: { 'user-agent': 'browser', 'x-github-api-version': '2022-11-28' },
    });
    expect(pulls.status).toBe(200);
    expect(await pulls.json()).toEqual({ ok: true });
    expect(pulls.headers.get('link')).toContain('rel="next"');
    expect(calls[0]).toMatchObject({
      method: 'GET',
      url: '/repos/owner/repo/pulls?state=open',
      headers: {
        'user-agent': 'GitHome/1.2.3',
        'x-github-api-version': '2022-11-28',
      },
    });

    const comment = await fetch(
      `${origin}/forge-proxy/bitbucket/2.0/repositories/team/demo/pullrequests/7/comments`,
      {
        method: 'POST',
        headers: { authorization: 'Basic test', 'content-type': 'application/json' },
        body: '{"content":{"raw":"Done"}}',
      },
    );
    expect(comment.status).toBe(201);
    expect(await comment.json()).toEqual({ ok: true });
    expect(calls[1]).toMatchObject({
      method: 'POST',
      headers: { authorization: 'Basic test', 'content-type': 'application/json' },
      body: '{"content":{"raw":"Done"}}',
    });

    expect((await fetch(`${github}/repos/owner/redirect`)).status).toBe(502);
    expect((await fetch(`${github}/repos/owner/repo`, { method: 'DELETE' })).status).toBe(405);
    expect((await fetch(`${origin}/forge-proxy/bitbucket/user`)).status).toBe(400);
    expect((await fetch(`${origin}/unrelated`)).status).toBe(404);
    expect(origins).toEqual([
      'https://api.github.com',
      'https://api.bitbucket.org',
      'https://api.github.com',
    ]);
  } finally {
    await Promise.all([close(proxy), close(upstream)]);
  }
});
