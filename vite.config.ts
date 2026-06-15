import path from "node:path";
import react from "@vitejs/plugin-react";
import { mobxVmVitePlugin } from "mobx-view-model-vite-plugin";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";

  return {
    plugins: [
      mobxVmVitePlugin({
        autoDisplayName: isDev,
        devtools: isDev,
        hmr: isDev,
      }),
      react(),
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
