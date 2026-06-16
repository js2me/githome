import type { BundledLanguage } from "shiki/bundle/web";

const EXTENSION_TO_LANGUAGE: Record<string, BundledLanguage> = {
  astro: "astro",
  bash: "bash",
  c: "c",
  cc: "cpp",
  cjs: "javascript",
  coffee: "coffee",
  cpp: "cpp",
  css: "css",
  csv: "csv",
  cxx: "cpp",
  gql: "graphql",
  graphql: "graphql",
  h: "c",
  haml: "haml",
  handlebars: "handlebars",
  hbs: "handlebars",
  hpp: "cpp",
  html: "html",
  htm: "html",
  imba: "imba",
  java: "java",
  js: "javascript",
  json: "json",
  json5: "json5",
  jsonc: "jsonc",
  jsx: "jsx",
  less: "less",
  lit: "lit",
  markdown: "markdown",
  md: "markdown",
  mdc: "mdc",
  mdx: "mdx",
  mjs: "javascript",
  mts: "typescript",
  php: "php",
  postcss: "postcss",
  py: "python",
  sass: "sass",
  scss: "scss",
  sh: "bash",
  sql: "sql",
  styl: "stylus",
  stylus: "stylus",
  svelte: "svelte",
  svg: "xml",
  ts: "typescript",
  tsx: "tsx",
  vue: "vue",
  wasm: "wasm",
  wgsl: "wgsl",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: "zsh",
};

const FILENAME_TO_LANGUAGE: Record<string, BundledLanguage> = {};

export const getLanguageFromPath = (
  filePath: string,
): BundledLanguage | null => {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const fileName = normalizedPath.split("/").pop()?.toLowerCase() ?? "";

  if (fileName in FILENAME_TO_LANGUAGE) {
    return FILENAME_TO_LANGUAGE[fileName];
  }

  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return null;
  }

  const extension = fileName.slice(dotIndex + 1);
  return EXTENSION_TO_LANGUAGE[extension] ?? null;
};
