import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { mobxVmVitePlugin } from "mobx-view-model-vite-plugin";
import electron from "vite-plugin-electron/simple";
import { defineConfig, type Plugin } from "vite";
import { handleGitlabProxyRequest } from "./electron/gitlab-proxy";

const gitlabProxyPlugin = (): Plugin => ({
  name: "gitlab-proxy",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? "";
      if (handleGitlabProxyRequest(req as IncomingMessage, res as ServerResponse, url)) {
        return;
      }

      next();
    });
  },
});

export default defineConfig(({ mode, command }) => {
  const isDev = mode === "development";
  const isElectron =
    process.env.ELECTRON === "1" ||
    (command === "build" && process.env.WEB_ONLY !== "1");

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
      ...(isElectron
        ? [
            electron({
              main: {
                entry: "electron/main.ts",
                vite: {
                  build: {
                    outDir: "dist-electron",
                    rollupOptions: {
                      external: ["electron"],
                    },
                  },
                },
              },
              preload: {
                input: "electron/preload.ts",
                vite: {
                  build: {
                    outDir: "dist-electron",
                  },
                },
              },
            }),
          ]
        : []),
    ],
    define: {
      "import.meta.env.VITE_ELECTRON": JSON.stringify(isElectron),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
    },
  };
});
