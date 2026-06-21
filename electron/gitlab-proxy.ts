import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import https from "node:https";

export const GIT_PROXY_PREFIX = "/git-proxy";

export const proxyGitlabRequest = (
  req: IncomingMessage,
  res: ServerResponse,
  target: URL,
) => {
  const headers = { ...req.headers };
  delete headers["x-gitlab-proxy-protocol"];
  delete headers["x-gitlab-proxy-host"];
  headers.host = target.host;

  const client = target.protocol === "https:" ? https : http;
  const proxyReq = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers,
      rejectUnauthorized: false,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end(`GitLab proxy error: ${error.message}`);
    }
  });

  req.pipe(proxyReq);
};

export const handleGitlabProxyRequest = (
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
): boolean => {
  if (!url.startsWith(`${GIT_PROXY_PREFIX}/`)) {
    return false;
  }

  const match = url.match(/^\/git-proxy\/([^/?#]+)(\/.*)?$/);
  if (!match) {
    res.statusCode = 400;
    res.end("GitLab proxy error: invalid target");
    return true;
  }

  const proxyHost = decodeURIComponent(match[1]!);
  const proxyPath = match[2] || "/";
  const protocol =
    (req.headers["x-gitlab-proxy-protocol"] as string | undefined) ?? "https";

  try {
    const target = new URL(`${protocol}://${proxyHost}${proxyPath}`);
    proxyGitlabRequest(req, res, target);
  } catch (error) {
    res.statusCode = 400;
    res.end(
      `GitLab proxy error: ${
        error instanceof Error ? error.message : "invalid target"
      }`,
    );
  }

  return true;
};
