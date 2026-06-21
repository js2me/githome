import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { handleGitlabProxyRequest } from "./gitlab-proxy";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

const getContentType = (filePath: string) =>
  MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

const resolveStaticPath = (distPath: string, requestPath: string) => {
  const pathname = decodeURIComponent(requestPath.split("?")[0] ?? "/");
  const relativePath =
    pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const normalizedDist = path.resolve(distPath);
  const absolutePath = path.resolve(normalizedDist, relativePath);

  if (
    absolutePath !== normalizedDist &&
    !absolutePath.startsWith(`${normalizedDist}${path.sep}`)
  ) {
    return null;
  }

  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    return absolutePath;
  }

  const indexFallback = path.join(normalizedDist, "index.html");
  return existsSync(indexFallback) ? indexFallback : null;
};

export const startAppServer = async (distPath: string) => {
  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    if (handleGitlabProxyRequest(req, res, url)) {
      return;
    }

    const filePath = resolveStaticPath(distPath, url.split("?")[0] ?? "/");
    if (!filePath) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    res.setHeader("Content-Type", getContentType(filePath));
    createReadStream(filePath).pipe(res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start GitHome app server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};
