import type { ClientRequest, IncomingMessage, ServerResponse } from 'node:http';
import { request, type RequestOptions } from 'node:https';
import { CLOUD_API, CLOUD_PROXY_PREFIX } from '../src/shared/api/forge/cloud-origins';

const forwardedHeaders = [
  'accept',
  'authorization',
  'content-type',
  'content-length',
  'x-github-api-version',
] as const;

export const resolveCloudProxyTarget = (url: string): URL | null => {
  const match = /^\/forge-proxy\/(github|bitbucket)(\/[^#]*)$/.exec(url);
  if (!match) return null;
  const { origin, prefix } = match[1] === 'github' ? CLOUD_API.github : CLOUD_API.bitbucket;
  const target = new URL(origin + match[2]);
  return target.origin === origin && target.pathname.startsWith(prefix) ? target : null;
};

type UpstreamRequest = (
  target: URL,
  options: RequestOptions,
  onResponse: (response: IncomingMessage) => void,
) => ClientRequest;

export const createForgeProxyHandler = (
  version: string,
  requestUpstream: UpstreamRequest = request,
) => (
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
): boolean => {
  if (!url.startsWith(`${CLOUD_PROXY_PREFIX}/`)) return false;
  const target = resolveCloudProxyTarget(url);

  if (!target || (req.method !== 'GET' && req.method !== 'POST')) {
    res.writeHead(target ? 405 : 400).end();
    return true;
  }

  const headers = {
    ...Object.fromEntries(
      forwardedHeaders.flatMap((name) => req.headers[name] ? [[name, req.headers[name]]] : []),
    ),
    'user-agent': `GitHome/${version}`,
  };
  const upstream = requestUpstream(target, { method: req.method, headers }, (response) => {
    const status = response.statusCode ?? 502;
    // Never serve an upstream redirect or arbitrary non-API content on the app origin.
    if (status >= 300 && status < 400) {
      response.resume();
      res.writeHead(502).end();
      return;
    }
    res.writeHead(status, {
      'content-type': 'application/json',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
      ...(response.headers.link && { link: response.headers.link }),
    });
    response.on('error', () => res.destroy());
    response.pipe(res);
  });
  upstream.on('error', () => {
    if (res.headersSent) res.destroy();
    else res.writeHead(502).end();
  });
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
  return true;
};
