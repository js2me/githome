import type { BundledLanguage } from "shiki/bundle/web";
import { isSupportedSyntaxLanguage } from "./lazy-language-loaders";

export type ExtendedSyntaxLanguage =
  | "clojure"
  | "cmake"
  | "crystal"
  | "csharp"
  | "dart"
  | "docker"
  | "dockerfile"
  | "elixir"
  | "erlang"
  | "fsharp"
  | "gdscript"
  | "go"
  | "groovy"
  | "haskell"
  | "hcl"
  | "ini"
  | "kotlin"
  | "lua"
  | "makefile"
  | "matlab"
  | "nginx"
  | "nim"
  | "nix"
  | "objective-c"
  | "ocaml"
  | "perl"
  | "powershell"
  | "proto"
  | "protobuf"
  | "raku"
  | "ruby"
  | "rust"
  | "scala"
  | "solidity"
  | "swift"
  | "terraform"
  | "toml"
  | "vb"
  | "zig";

export type SyntaxLanguage = BundledLanguage | ExtendedSyntaxLanguage;

const EXTENSION_TO_LANGUAGE: Record<string, SyntaxLanguage> = {
  astro: "astro",
  bash: "bash",
  blade: "blade",
  c: "c",
  cc: "cpp",
  cjs: "javascript",
  clj: "clojure",
  cljc: "clojure",
  cljs: "clojure",
  coffee: "coffee",
  conf: "nginx",
  cpp: "cpp",
  cr: "crystal",
  cs: "csharp",
  csproj: "xml",
  css: "css",
  csv: "csv",
  cxx: "cpp",
  dart: "dart",
  edn: "clojure",
  erl: "erlang",
  ex: "elixir",
  exs: "elixir",
  fs: "fsharp",
  fsx: "fsharp",
  frag: "glsl",
  gd: "gdscript",
  glsl: "glsl",
  go: "go",
  gradle: "groovy",
  groovy: "groovy",
  gql: "graphql",
  graphql: "graphql",
  h: "c",
  haml: "haml",
  handlebars: "handlebars",
  hbs: "handlebars",
  hcl: "hcl",
  hpp: "cpp",
  hrl: "erlang",
  hs: "haskell",
  html: "html",
  htm: "html",
  imba: "imba",
  ini: "ini",
  java: "java",
  j2: "jinja",
  jade: "pug",
  jinja: "jinja",
  jison: "jison",
  jl: "julia",
  js: "javascript",
  json: "json",
  json5: "json5",
  jsonc: "jsonc",
  jsonl: "jsonl",
  jsx: "jsx",
  kt: "kotlin",
  kts: "kotlin",
  less: "less",
  lhs: "haskell",
  lit: "lit",
  lua: "lua",
  m: "objective-c",
  markdown: "markdown",
  mat: "matlab",
  md: "markdown",
  mdc: "mdc",
  mdx: "mdx",
  mjs: "javascript",
  ml: "ocaml",
  mli: "ocaml",
  mm: "objective-c",
  mts: "typescript",
  nim: "nim",
  nix: "nix",
  php: "php",
  pl: "perl",
  pm: "perl",
  postcss: "postcss",
  proto: "proto",
  protobuf: "protobuf",
  ps1: "powershell",
  psm1: "powershell",
  pug: "pug",
  py: "python",
  rakumod: "raku",
  rake: "ruby",
  rb: "ruby",
  rs: "rust",
  sass: "sass",
  sc: "scala",
  scala: "scala",
  scss: "scss",
  sh: "bash",
  sol: "solidity",
  sql: "sql",
  styl: "stylus",
  stylus: "stylus",
  svelte: "svelte",
  svg: "xml",
  swift: "swift",
  tf: "terraform",
  tfvars: "terraform",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  vb: "vb",
  vert: "glsl",
  vue: "vue",
  wasm: "wasm",
  wgsl: "wgsl",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zig: "zig",
  zsh: "zsh",
};

const FILENAME_TO_LANGUAGE: Record<string, SyntaxLanguage> = {
  brewfile: "ruby",
  "cmakelists.txt": "cmake",
  dockerfile: "dockerfile",
  gemfile: "ruby",
  gnumakefile: "makefile",
  makefile: "makefile",
  "nginx.conf": "nginx",
  podfile: "ruby",
  procfile: "yaml",
  rakefile: "ruby",
  vagrantfile: "ruby",
};

const GITLAB_LANGUAGE_ALIASES: Record<string, SyntaxLanguage> = {
  "c#": "csharp",
  "c++": "cpp",
  clojure: "clojure",
  coffeescript: "coffee",
  crystal: "crystal",
  cs: "csharp",
  csharp: "csharp",
  docker: "docker",
  dockerfile: "dockerfile",
  elixir: "elixir",
  erlang: "erlang",
  fsharp: "fsharp",
  gdscript: "gdscript",
  go: "go",
  golang: "go",
  groovy: "groovy",
  haskell: "haskell",
  hcl: "hcl",
  ini: "ini",
  jade: "pug",
  js: "javascript",
  json: "json",
  julia: "julia",
  kotlin: "kotlin",
  kt: "kotlin",
  lua: "lua",
  makefile: "makefile",
  matlab: "matlab",
  md: "markdown",
  nginx: "nginx",
  nim: "nim",
  nix: "nix",
  "objective-c": "objective-c",
  objc: "objective-c",
  ocaml: "ocaml",
  perl: "perl",
  pl: "perl",
  powershell: "powershell",
  ps: "powershell",
  ps1: "powershell",
  proto: "proto",
  protobuf: "protobuf",
  py: "python",
  python: "python",
  raku: "raku",
  rb: "ruby",
  rs: "rust",
  ruby: "ruby",
  rust: "rust",
  scala: "scala",
  shell: "bash",
  shellscript: "bash",
  sh: "bash",
  solidity: "solidity",
  swift: "swift",
  terraform: "terraform",
  tf: "terraform",
  toml: "toml",
  ts: "typescript",
  typescript: "typescript",
  vb: "vb",
  vbnet: "vb",
  yml: "yaml",
  zig: "zig",
};

export const resolveSyntaxLanguage = (
  rawLanguage: string,
): SyntaxLanguage | null => {
  const normalized = rawLanguage.toLowerCase().trim();
  if (!normalized || normalized === "plaintext" || normalized === "text") {
    return null;
  }

  if (isSupportedSyntaxLanguage(normalized)) {
    return normalized as SyntaxLanguage;
  }

  return GITLAB_LANGUAGE_ALIASES[normalized] ?? null;
};

export const getLanguageFromPath = (filePath: string): SyntaxLanguage | null => {
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
