import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import dotenv from 'dotenv';
import { defineConfig, type Plugin } from 'vite';
import electron from 'vite-plugin-electron/simple';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { handleGitlabProxyRequest } from './electron/gitlab-proxy';

const gitlabProxyPlugin = (): Plugin => ({
  name: 'gitlab-proxy',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      if (
        handleGitlabProxyRequest(
          req as IncomingMessage,
          res as ServerResponse,
          url,
        )
      ) {
        return;
      }

      next();
    });
  },
});

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig(({ mode, command }) => {
  const isElectron =
    process.env.ELECTRON === '1' ||
    (command === 'build' && process.env.WEB_ONLY !== '1');

  dotenv.config();

  return {
    // Linked worktrees can share node_modules. Keep lazy chunks local to the running app.
    cacheDir: `.vite/${mode}/${isElectron ? 'electron' : 'web'}`,
    plugins: [
      gitlabProxyPlugin(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/material-icon-theme/icons/*.svg',
            dest: 'file-icons',
          },
          {
            src: 'node_modules/material-icon-theme/LICENSE',
            dest: 'file-icons',
          },
        ],
      }),
      tailwindcss(),
      react({
        useAtYourOwnRisk_mutateSwcOptions(options) {
          options.jsc!.parser!.decorators = true;
          options.jsc!.transform!.decoratorVersion = '2022-03';
        },
        plugins: [],
      }),
      ...(isElectron
        ? [
            electron({
              main: {
                entry: 'electron/main.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      external: ['electron', 'electron-updater'],
                    },
                  },
                },
              },
              preload: {
                input: 'electron/preload.ts',
                vite: {
                  build: {
                    outDir: 'dist-electron',
                    rollupOptions: {
                      output: { entryFileNames: 'preload.cjs' },
                    },
                  },
                },
              },
            }),
          ]
        : []),
    ],
    define: {
      'import.meta.env.VITE_ELECTRON': JSON.stringify(isElectron),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(
        process.env.GITHOME_RELEASE_VERSION ?? version,
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
    },
  };
});
