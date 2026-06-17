import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { mobxVmVitePlugin } from "mobx-view-model-vite-plugin";
import { defineConfig, type Plugin } from "vite";

const host = process.env.TAURI_DEV_HOST;
const GIT_PROXY_PREFIX = "/git-proxy";

const proxyGitlabRequest = (
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

const gitlabProxyPlugin = (): Plugin => ({
  name: "gitlab-proxy",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? "";
      if (!url.startsWith(`${GIT_PROXY_PREFIX}/`)) {
        next();
        return;
      }

      const match = url.match(/^\/git-proxy\/([^/?#]+)(\/.*)?$/);
      if (!match) {
        next();
        return;
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
    });
  },
});

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      gitlabProxyPlugin(),
      tailwindcss(),
      mobxVmVitePlugin({
        autoDisplayName: isDev,
        devtools: isDev,
        hmr: isDev,
      }),
      react({
        useAtYourOwnRisk_mutateSwcOptions(options) {
          options.jsc!.parser!.decorators = true;
          options.jsc!.transform!.decoratorVersion = "2022-03";
        },
        plugins: [],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
          protocol: "ws",
          host,
          port: 1421,
        }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
