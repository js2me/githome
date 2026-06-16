import type { BundledLanguage } from "shiki/bundle/web";
import { bundledLanguages } from "shiki/bundle/web";

const GITLAB_LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  coffee: "coffee",
  css: "css",
  csv: "csv",
  gql: "graphql",
  graphql: "graphql",
  haml: "haml",
  handlebars: "handlebars",
  hbs: "handlebars",
  html: "html",
  imba: "imba",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  json5: "json5",
  jsonc: "jsonc",
  jsx: "jsx",
  less: "less",
  markdown: "markdown",
  md: "markdown",
  mdc: "mdc",
  mdx: "mdx",
  php: "php",
  postcss: "postcss",
  py: "python",
  python: "python",
  sass: "sass",
  scss: "scss",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  sql: "sql",
  styl: "stylus",
  stylus: "stylus",
  svelte: "svelte",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript",
  vue: "vue",
  wasm: "wasm",
  wgsl: "wgsl",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: "zsh",
};

const isBundledLanguage = (lang: string): lang is BundledLanguage =>
  lang in bundledLanguages;

export const resolveGitlabLanguage = (
  className: string,
): BundledLanguage | null => {
  const match = className.match(/\blanguage-([a-z0-9#+._-]+)/i);
  if (!match) {
    return null;
  }

  const raw = match[1].toLowerCase();
  if (raw === "plaintext" || raw === "text" || raw === "none") {
    return null;
  }

  if (isBundledLanguage(raw)) {
    return raw;
  }

  return GITLAB_LANGUAGE_ALIASES[raw] ?? null;
};
